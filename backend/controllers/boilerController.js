// backend/controllers/boilerController.js
const simulation = require('../logic/boilerSimulation');

/**
 * Отримати поточний стан котла.
 */
const getState = (req, res) => {
    try {
        const state = simulation.getState();
        res.status(200).json(state);
    } catch (error) {
        console.error("Error in getState controller:", error);
        res.status(500).send({ error: 'Failed to get boiler state' });
    }
};

/**
 * Запустити послідовність роботи котла.
 */
const startBoiler = (req, res) => {
    try {
        const result = simulation.startBoiler();
        res.status(result.success ? 200 : 400).send(result);
    } catch(error) {
        console.error("Error in startBoiler controller:", error);
        res.status(500).send({ error: 'An unexpected error occurred while starting the boiler.' });
    }
};

/**
 * Запустити послідовність планової зупинки.
 */
const stopBoiler = (req, res) => {
    try {
        const result = simulation.stopBoiler();
        res.status(result.success ? 200 : 400).send(result);
    } catch(error) {
        console.error("Error in stopBoiler controller:", error);
        res.status(500).send({ error: 'An unexpected error occurred while stopping the boiler.' });
    }
};

/**
 * Перемкнути режим роботи (авто/ручний).
 */
const toggleMode = (req, res) => {
    try {
        const result = simulation.toggleMode();
        res.status(result.success ? 200 : 400).send(result);
    } catch(error) {
        console.error("Error in toggleMode controller:", error);
        res.status(500).send({ error: 'An unexpected error occurred while toggling mode.' });
    }
};

/**
 * Активувати аварійну зупинку.
 */
const emergencyStop = (req, res) => {
    try {
        const result = simulation.emergencyStop();
        res.status(result.success ? 200 : 400).send(result);
    } catch(error) {
        console.error("Error in emergencyStop controller:", error);
        res.status(500).send({ error: 'An unexpected error occurred during emergency stop.' });
    }
};

/**
 * Скинути аварійний стан.
 */
const resetAlarm = (req, res) => {
    try {
        const result = simulation.resetAlarm();
        res.status(result.success ? 200 : 400).send(result);
    } catch(error) {
        console.error("Error in resetAlarm controller:", error);
        res.status(500).send({ error: 'An unexpected error occurred while resetting the alarm.' });
    }
};

/**
 * Оновити задані значення (setpoints).
 */
const postSetpoints = async (req, res) => {
    const { param, value } = req.body;
    try {
        await simulation.updateSetpoint(param, value);
        res.status(200).send({ success: true, message: `Setpoint for '${param}' updated.` });
    } catch (error) {
        console.error("Error in postSetpoints controller:", error);
        res.status(400).send({ error: error.message });
    }
};

/**
 * Керувати ручними перемикачами.
 */
const postManualControl = (req, res) => {
    const { control, state } = req.body;
    try {
    
        if (!simulation.getState().manualMode) {
            return res.status(400).send({ error: 'Manual control is only available in manual mode' });
        }
        simulation.setManualControl(control, state);
        res.status(200).send({ success: true, message: `Manual control '${control}' set to ${state}.` });
    } catch (error) {
        console.error("Error in postManualControl controller:", error);
        res.status(400).send({ error: error.message });
    }
};

module.exports = {
    getState,
    startBoiler,
    stopBoiler,
    toggleMode,
    emergencyStop,
    resetAlarm,
    postSetpoints,
    postManualControl
};
