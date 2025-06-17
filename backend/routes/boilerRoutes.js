// backend/routes/boilerRoutes.js
const express = require('express');
const router = express.Router();

// Імпортуємо контролер, що містить логіку обробки запитів
const boilerController = require('../controllers/boilerController');
// Імпортуємо middleware для перевірки авторизації
const { checkAuth } = require('../config/firebase');

/**
 * @route   GET /api/boiler/state
 * @desc    Отримати поточний стан котла
 * @access  Public (або Private, якщо потрібно, додавши checkAuth)
 */
router.get('/state', boilerController.getState);

/**
 * @route   POST /api/boiler/start
 * @desc    Запустити котел (починає послідовність запуску)
 * @access  Private
 */
router.post('/start', checkAuth, boilerController.startBoiler);

/**
 * @route   POST /api/boiler/stop
 * @desc    Запустити планову зупинку котла
 * @access  Private
 */
router.post('/stop', checkAuth, boilerController.stopBoiler);

/**
 * @route   POST /api/boiler/toggle-mode
 * @desc    Перемкнути між автоматичним та ручним режимом
 * @access  Private
 */
router.post('/toggle-mode', checkAuth, boilerController.toggleMode);

/**
 * @route   POST /api/boiler/emergency-stop
 * @desc    Активувати аварійну зупинку
 * @access  Private
 */
router.post('/emergency-stop', checkAuth, boilerController.emergencyStop);

/**
 * @route   POST /api/boiler/reset-alarm
 * @desc    Скинути аварійний стан після усунення проблеми
 * @access  Private
 */
router.post('/reset-alarm', checkAuth, boilerController.resetAlarm);

/**
 * @route   POST /api/boiler/setpoints
 * @desc    Змінити задане значення
 * @access  Private
 */
router.post('/setpoints', checkAuth, boilerController.postSetpoints);

/**
 * @route   POST /api/boiler/manual-control
 * @desc    Перемкнути ручне керування
 * @access  Private
 */
router.post('/manual-control', checkAuth, boilerController.postManualControl);

module.exports = router;
