// logic/boilerSimulation.js
const PIDController = require('./PIDController');
const { db, rtdb } = require('../config/firebase');
const { mqttClient, MQTT_STATE_TOPIC } = require('../config/mqtt');

const boilerStateRef = rtdb.ref('boiler/state');

const BOILER_STATUS = {
    OFF: 'OFF',
    STARTING_PRE_VENTILATION: 'STARTING_PRE_VENTILATION',
    STARTING_PURGE: 'STARTING_PURGE',
    IGNITING: 'IGNITING',
    RUNNING: 'RUNNING',
    STOPPING_PURGE: 'STOPPING_PURGE',
    ALARM: 'ALARM'
};

const parameterInfo = {
    steamPressure: { name: 'Тиск пари', unit: 'бар' },
    steamTemperature: { name: 'Температура пари', unit: '°C' },
    waterLevel: { name: 'Рівень води', unit: '%' },
    oxygenLevel: { name: 'Рівень кисню (O₂)', unit: '%' },
    gasPressure: { name: 'Тиск газу', unit: 'бар' },
    furnaceVacuum: { name: 'Розрядження у топці', unit: 'Па' },
    gasFlow: { name: 'Витрата газу', unit: 'м³/год' },
    airFlow: { name: 'Витрата повітря', unit: 'м³/год' },
    gasAirRatio: { name: 'Співвідношення Повітря/Газ', unit: '' }
};

let internalState = { thermalEnergy: 0 };

const initialParameters = {
    steamPressure: 0,
    steamTemperature: 20,
    waterLevel: 50,
    oxygenLevel: 21,
    gasPressure: 1,
    furnaceVacuum: -5,
    gasFlow: 0,
    airFlow: 0
};

let boilerState = {
    status: BOILER_STATUS.OFF,
    statusMessage: "Котел вимкнено",
    manualMode: false,
    timers: {
        purge: 0,
        ignition: 0,
        postPurge: 0
    },
    info: parameterInfo,
    parameters: { ...initialParameters },
    setpoints: {
        steamPressure: 10,
        steamTemperature: 180,
        waterLevel: 50,
        furnaceVacuum: -30,
        gasPressure: 5,
        oxygenLevel: 2.5,
        gasAirRatio: 1.1
    },
    manualControls: {
        waterValve: false,
        fan: false,
        gasValve: false,
        exhaustFan: false
    },
    norms: {
        steamPressure: { min: 0.5, max: 15 },
        steamTemperature: { min: 100, max: 250 },
        waterLevel: { min: 25, max: 75 },
        furnaceVacuum: { min: -100, max: 0 },
        gasPressure: { min: 1, max: 10 },
        oxygenLevel: { min: 1, max: 100 },
        gasAirRatio: { min: 1.05, max: 1.3 }
    }
};

const pidControllers = {
    steamPressure: new PIDController(2.5, 0.1, 0.2, boilerState.setpoints.steamPressure, 40),
    waterLevel: new PIDController(0.1, 0.015, 0.03, boilerState.setpoints.waterLevel, 20),
    furnaceVacuum: new PIDController(0.3, 0.04, 0.05, boilerState.setpoints.furnaceVacuum, 50)
};

// ========== ФУНКЦІЇ СИМУЛЯЦІЇ ==========

// --- Допоміжна функція для логування зміни стану ---
function logStateChange(newStatus, oldStatus = boilerState.status) {
    if (newStatus !== oldStatus) {
        console.log(`\n===== СТАН ЗМІНЕНО =====`);
        console.log(`  Старий статус: ${oldStatus}`);
        console.log(`  Новий статус:  ${newStatus}`);
        console.log(`=========================\n`);
        boilerState.status = newStatus;
    }
}


function updateSharedState() {
    boilerStateRef.set(boilerState)
        .catch(err => console.error('Помилка запису в Realtime Database:', err));

    if (mqttClient && mqttClient.connected) {
        mqttClient.publish(MQTT_STATE_TOPIC, JSON.stringify(boilerState), { qos: 0, retain: false }, (err) => {
            if (err) console.error('Помилка публікації MQTT:', err);
        });
    }
}

function applyCoolingLogic() {
    const { parameters } = boilerState;
    internalState.thermalEnergy *= 0.95;
    parameters.steamTemperature += (20 - parameters.steamTemperature) * 0.05;
    parameters.steamPressure += (0 - parameters.steamPressure) * 0.1;
    parameters.gasFlow *= 0.8;
    parameters.airFlow *= 0.8;
    parameters.gasPressure += (1 - parameters.gasPressure) * 0.1;
    parameters.furnaceVacuum += (-5 - parameters.furnaceVacuum) * 0.05;
    parameters.oxygenLevel += (21 - parameters.oxygenLevel) * 0.1;
}

function runSimulationTick() {
    const { parameters, setpoints, norms, manualMode, manualControls } = boilerState;

    const isAlarmCondition = (parameters.steamPressure > norms.steamPressure.max || parameters.steamTemperature > norms.steamTemperature.max || parameters.waterLevel < norms.waterLevel.min || parameters.waterLevel > norms.waterLevel.max);
    if (isAlarmCondition && boilerState.status !== BOILER_STATUS.ALARM && boilerState.status !== BOILER_STATUS.OFF) {
        logStateChange(BOILER_STATUS.ALARM);
    }

    switch (boilerState.status) {
        case BOILER_STATUS.OFF:
            boilerState.statusMessage = "Котел вимкнено. Готовий до запуску.";
            applyCoolingLogic();
            break;

        case BOILER_STATUS.STARTING_PRE_VENTILATION:
            boilerState.statusMessage = "Запуск: Попередня вентиляція...";
            parameters.furnaceVacuum -= 10;
            if (parameters.furnaceVacuum <= setpoints.furnaceVacuum) {
                logStateChange(BOILER_STATUS.STARTING_PURGE);
                boilerState.timers.purge = 10;
                console.log(`[ТАЙМЕР] Продувка встановлена на ${boilerState.timers.purge}с`);
            }
            break;

        case BOILER_STATUS.STARTING_PURGE:
            boilerState.statusMessage = `Запуск: Продувка топки... (${boilerState.timers.purge}с)`;
            parameters.airFlow += 10;
            boilerState.timers.purge -= 1;
            if (boilerState.timers.purge <= 0) {
                logStateChange(BOILER_STATUS.IGNITING);
                boilerState.timers.ignition = 5;
                console.log(`[ТАЙМЕР] Розпалювання встановлено на ${boilerState.timers.ignition}с`);
            }
            break;

        case BOILER_STATUS.IGNITING:
            boilerState.statusMessage = `Запуск: Розпалювання... (${boilerState.timers.ignition}с)`;
            parameters.airFlow *= 0.8;
            parameters.gasFlow = 5;
            boilerState.timers.ignition -= 1;
            if (boilerState.timers.ignition <= 0) {
                logStateChange(BOILER_STATUS.RUNNING);
                Object.values(pidControllers).forEach(p => p.reset());
            }
            break;
            
        case BOILER_STATUS.RUNNING:
            boilerState.statusMessage = `Котел працює у ${manualMode ? 'ручному' : 'автоматичному'} режимі`;
            
            if (!manualMode) {
                const pressureControlSignal = pidControllers.steamPressure.update(parameters.steamPressure);
                parameters.gasFlow = pressureControlSignal;
                const MIN_AIR_FLOW = 5.0;
                parameters.airFlow = parameters.gasFlow * setpoints.gasAirRatio + MIN_AIR_FLOW;
                parameters.waterLevel += pidControllers.waterLevel.update(parameters.waterLevel);
                const suctionEffect = pidControllers.furnaceVacuum.update(parameters.furnaceVacuum) * 0.1;
                const inflowEffect = (parameters.airFlow + parameters.gasFlow) * 0.015;
                parameters.furnaceVacuum += suctionEffect + inflowEffect;
            } else {
                if (manualControls.gasValve) parameters.gasFlow += 2; else parameters.gasFlow *= 0.85;
                if (manualControls.fan) parameters.airFlow += 2.5; else parameters.airFlow *= 0.85;
                if (manualControls.waterValve) parameters.waterLevel += 0.5;
                if (manualControls.exhaustFan) parameters.furnaceVacuum -= 4;
            }

            parameters.gasFlow = Math.max(0, Math.min(parameters.gasFlow, 100));
            parameters.airFlow = Math.max(0, Math.min(parameters.airFlow, 120));
            parameters.gasPressure = 1 + parameters.gasFlow * 0.05;
            const effectiveGasBurn = Math.min(parameters.gasFlow, parameters.airFlow / setpoints.gasAirRatio);
            const heatGenerated = effectiveGasBurn * 0.05;
            const heatLoss = internalState.thermalEnergy * 0.01;
            internalState.thermalEnergy += heatGenerated - heatLoss;
            internalState.thermalEnergy = Math.max(0, internalState.thermalEnergy);
            if (parameters.waterLevel > 1) {
                parameters.steamTemperature = 20 + internalState.thermalEnergy * 2;
                parameters.steamPressure = Math.max(0, (parameters.steamTemperature - 100) / 8.5);
                parameters.waterLevel -= heatGenerated * 0.1;
            }
            let targetOxygenLevel = (effectiveGasBurn > 0.1) ? (1 - 1 / setpoints.gasAirRatio) * 21 : 21;
            parameters.oxygenLevel += (targetOxygenLevel - parameters.oxygenLevel) * 0.8;
            break;

        case BOILER_STATUS.STOPPING_PURGE:
            boilerState.statusMessage = `Зупинка: Пост-вентиляція... (${boilerState.timers.postPurge}с)`;
            parameters.gasFlow = 0;
            parameters.airFlow = 50;
            boilerState.timers.postPurge -= 1;
            if (boilerState.timers.postPurge <= 0) {
                logStateChange(BOILER_STATUS.OFF);
            }
            break;

        case BOILER_STATUS.ALARM:
            boilerState.statusMessage = "АВАРІЯ! Потрібне втручання оператора.";
            applyCoolingLogic();
            break;
    }
    
    parameters.waterLevel = Math.max(0, Math.min(parameters.waterLevel, 100));
    parameters.oxygenLevel = Math.max(0, Math.min(parameters.oxygenLevel, 21));
    parameters.furnaceVacuum = Math.max(-150, Math.min(parameters.furnaceVacuum, 10));

    updateSharedState();
}

async function initializeBoilerSetpoints() {
    const defaultSetpointsRef = db.collection('userSettings').doc('defaultUserSetpoints');
    try {
        const docSnap = await defaultSetpointsRef.get();
        if (docSnap.exists && docSnap.data().setpoints) {
            const savedSetpoints = docSnap.data().setpoints;
            boilerState.setpoints = { ...boilerState.setpoints, ...savedSetpoints };
            for (const param in pidControllers) {
                if (boilerState.setpoints[param] !== undefined) {
                    pidControllers[param].setpoint = boilerState.setpoints[param];
                }
            }
        } else {
            await defaultSetpointsRef.set({ setpoints: boilerState.setpoints }, { merge: true });
        }
    } catch (error) {
        console.error('Помилка завантаження/збереження setpoints з Firestore:', error);
    }
}

const simulationService = {
    async startSimulation() {
        await initializeBoilerSetpoints();
        setInterval(runSimulationTick, 1000);
        console.log('Симуляцію котла запущено.');
    },

    getState() { return boilerState; },

    startBoiler() {
        if (boilerState.status === BOILER_STATUS.OFF) {
            console.log("[ДІЯ] Отримано команду на запуск котла.");
            logStateChange(BOILER_STATUS.STARTING_PRE_VENTILATION);
            return { success: true, message: 'Процес запуску котла розпочато.' };
        }
        console.warn("[УВАГА] Спроба запустити котел, який не у стані OFF.");
        return { success: false, message: 'Котел вже запущений або в процесі запуску.' };
    },

    stopBoiler() {
        if (boilerState.status === BOILER_STATUS.RUNNING) {
            console.log("[ДІЯ] Отримано команду на планову зупинку.");
            logStateChange(BOILER_STATUS.STOPPING_PURGE);
            boilerState.timers.postPurge = 10;
            console.log(`[ТАЙМЕР] Пост-вентиляція встановлена на ${boilerState.timers.postPurge}с`);
            return { success: true, message: 'Процес планової зупинки розпочато.' };
        }
        console.warn("[УВАГА] Спроба зупинити котел, який не в режимі RUNNING.");
        return { success: false, message: 'Неможливо зупинити котел, він не в штатному режимі.' };
    },
    
    toggleMode() {
        if (boilerState.status === BOILER_STATUS.RUNNING) {
            boilerState.manualMode = !boilerState.manualMode;
            if (!boilerState.manualMode) {
                 Object.values(pidControllers).forEach(pid => pid.reset());
            }
            return { success: true, message: `Режим змінено на ${boilerState.manualMode ? 'ручний' : 'автоматичний'}` };
        }
        return { success: false, message: 'Змінити режим можна тільки в штатному режимі роботи.'};
    },

    emergencyStop() {
        console.error("[ДІЯ] АКТИВОВАНО АВАРІЙНУ ЗУПИНКУ!");
        logStateChange(BOILER_STATUS.ALARM);
        return { success: true, message: 'Аварійна зупинка активована.' };
    },
    
    resetAlarm() {
        if (boilerState.status === BOILER_STATUS.ALARM) {
            console.log("[ДІЯ] Отримано команду на скидання аварії.");
            logStateChange(BOILER_STATUS.OFF);
            boilerState.parameters = { ...initialParameters };
            internalState.thermalEnergy = 0;
            return { success: true, message: 'Аварію скинуто. Котел готовий до запуску.' };
        }
        console.warn("[УВАГА] Спроба скинути аварію, коли система не в аварійному стані.");
        return { success: false, message: 'Система не в аварійному стані.' };
    },

    async updateSetpoint(param, value) {
        const numValue = Number(value);
        if (boilerState.setpoints[param] === undefined || isNaN(numValue)) {
            throw new Error('Invalid param or value');
        }
        boilerState.setpoints[param] = numValue;
        if (pidControllers[param]) {
            pidControllers[param].setpoint = numValue;
        }
        const defaultSetpointsRef = db.collection('userSettings').doc('defaultUserSetpoints');
        try {
            await defaultSetpointsRef.set({ setpoints: boilerState.setpoints }, { merge: true });
        } catch (error) {
            console.error('Помилка збереження setpoints у Firestore:', error);
            throw new Error('Failed to save setpoints to database.');
        }
    },

    setManualControl(control, state) {
        if (boilerState.manualControls[control] === undefined) {
            throw new Error('Invalid control');
        }
        boilerState.manualControls[control] = state;
    }
};

module.exports = simulationService;
