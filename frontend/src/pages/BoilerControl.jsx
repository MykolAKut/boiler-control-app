import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

import { auth, db } from '../firebase';
import { ref, onValue } from 'firebase/database';

import SetpointsTable from '../components/SetpointsTable';
import ParametersTable from '../components/ParametersTable';

// Реєструємо всі необхідні компоненти Chart.js, додаємо Filler для фону
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const BOILER_STATUS = {
    OFF: 'OFF',
    STARTING_PRE_VENTILATION: 'STARTING_PRE_VENTILATION',
    STARTING_PURGE: 'STARTING_PURGE',
    IGNITING: 'IGNITING',
    RUNNING: 'RUNNING',
    STOPPING_PURGE: 'STOPPING_PURGE',
    ALARM: 'ALARM'
};

export default function BoilerControl() {
    const [boilerState, setBoilerState] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const sendCommand = async (endpoint, body = null) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Користувач не автентифікований");
            const token = await user.getIdToken();

            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            };
            
            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(`/api/boiler${endpoint}`, options);

            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.message || errorData.error || 'Невідома помилка сервера');
            } else {
                setError('');
            }
        } catch (err) {
            console.error(`Помилка відправки команди на ${endpoint}:`, err);
            setError(`Помилка: ${err.message}`);
        }
    };
    
    useEffect(() => {
        const boilerStateRef = ref(db, 'boiler/state');
        const unsubscribe = onValue(boilerStateRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setBoilerState(data);
            } else {
                setError('Не вдалося завантажити дані стану. Можливо, симулятор не запущено.');
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Firebase read failed: ", error);
            setError('Помилка з\'єднання з базою даних Firebase.');
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (err) { console.error('Error signing out: ', err); }
    };

    const handleSetpointChange = (param, value) => {
        sendCommand('/setpoints', { param, value });
    };

    const handleManualControlToggle = (control) => {
        const currentState = boilerState?.manualControls[control];
        sendCommand('/manual-control', { control: control, state: !currentState });
    };

    if (isLoading) return <div>{error || 'Підключення до бази даних...'}</div>;
    if (error && !boilerState) return <div>{error}</div>;
    if (!boilerState) return <div>Очікування даних з симулятора...</div>;

    const { status, statusMessage, manualMode, parameters, setpoints, norms, info, manualControls } = boilerState;
    const isRunning = status === BOILER_STATUS.RUNNING;
    const isOff = status === BOILER_STATUS.OFF;
    const isAlarm = status === BOILER_STATUS.ALARM;
    const isProcess = !isRunning && !isOff && !isAlarm;

    const manualControlNames = {
        waterValve: 'клапан води',
        fan: 'вентилятор',
        gasValve: 'газовий клапан',
        exhaustFan: 'витяжний вентилятор'
    };
    
    const chartableSetpointKeys = Object.keys(setpoints || {}).filter(key => info && info[key] && key !== 'gasAirRatio');

    const chartData = {
        labels: chartableSetpointKeys.map(key => info[key]?.name || key),
        datasets: [
            {
                label: 'Поточні значення',
                data: chartableSetpointKeys.map(key => parameters?.[key]),
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
                tension: 0.2,
            },
            {
                label: 'Задані значення (Setpoint)',
                data: chartableSetpointKeys.map(key => setpoints?.[key]),
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                tension: 0.2,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Динаміка параметрів котла',
                font: {
                    size: 16
                }
            },
        },
        scales: {
            y: {
                beginAtZero: false
            }
        }
    };

    return (
        <div className="boiler-control-page">
            <button onClick={handleLogout} className="logout-button">Вийти</button>
            <h2>Керування паровим котлом</h2>
            
            {error && <div className="error-message">{error}</div>}

            <div className="status-display" style={{ padding: '15px', backgroundColor: isAlarm ? '#ffcdd2' : '#e3f2fd', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
                <h3 style={{ color: isAlarm ? '#d32f2f' : '#1976d2', margin: 0 }}>Статус: {statusMessage}</h3>
            </div>

            <div className="control-panel">
                {isOff && (
                    <button onClick={() => sendCommand('/start')} className="power-button off">
                        Запустити котел
                    </button>
                )}
                {isRunning && (
                     <button onClick={() => sendCommand('/stop')} className="power-button on">
                        Планова зупинка
                    </button>
                )}
                {isAlarm && (
                    <button onClick={() => sendCommand('/reset-alarm')} className="mode-button manual">
                        Скинути аварію
                    </button>
                )}
                <button onClick={() => sendCommand('/toggle-mode')} className={`mode-button ${manualMode ? 'manual' : 'auto'}`} disabled={!isRunning}>
                    {manualMode ? 'Перейти в Авто-режим' : 'Перейти в Ручний режим'}
                </button>
                <button onClick={() => sendCommand('/emergency-stop')} className="emergency-button" disabled={isAlarm || isOff}>
                    АВАРІЙНА ЗУПИНКА
                </button>
            </div>

            <div className="main-grid-container">
                <ParametersTable parameters={parameters} norms={norms} info={info} />
                <SetpointsTable setpoints={setpoints} norms={norms} info={info} onSetpointChange={handleSetpointChange} />

                {isRunning && manualMode && (
                    <div className="manual-controls-section">
                        <h3>Ручне керування</h3>
                        <div className="manual-controls-grid">
                            {Object.keys(manualControls).map(key => (
                                <button
                                    key={key}
                                    className={`control-button ${manualControls[key] ? 'active' : ''}`}
                                    onClick={() => handleManualControlToggle(key)}
                                >
                                    {manualControls[key] ? `Вимкнути ${manualControlNames[key] || key}` : `Увімкнути ${manualControlNames[key] || key}`}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {isProcess && (
                    <div className="manual-controls-section" style={{textAlign: 'center', backgroundColor: '#fafafa'}}>
                         <h3>Виконується автоматичний процес</h3>
                         <p>Ручне керування недоступне.</p>
                    </div>
                )}

                <div className="chart-container">
                    <Line data={chartData} options={chartOptions} />
                </div>
            </div>
        </div>
    );
}
