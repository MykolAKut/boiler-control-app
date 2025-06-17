// =================================================================
//                      ГОЛОВНИЙ ФАЙЛ СЕРВЕРА
// =================================================================

// 1. Ініціалізація змінних середовища з файлу .env
require('dotenv').config();

// 2. Імпорт базових модулів
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path'); // <-- Додано модуль path для надійної роботи зі шляхами

// 3. Імпорт кастомних модулів нашої архітектури
// Використовуємо path.join для створення абсолютних шляхів, щоб уникнути помилок
const boilerRoutes = require(path.join(__dirname, 'routes', 'boilerRoutes'));
const simulationService = require(path.join(__dirname, 'logic', 'boilerSimulation'));

// 4. Створення та конфігурація Express-додатку
const app = express();
const server = http.createServer(app);

// Middleware для обробки CORS запитів та JSON тіл
app.use(cors());
app.use(express.json());

// 5. Підключення маршрутів API
// Усі запити, що починаються з /api/boiler, будуть оброблятися у boilerRoutes
app.use('/api/boiler', boilerRoutes);

// 6. Запуск фонової симуляції котла
// Ця функція асинхронна, але нам не потрібно чекати її завершення тут
simulationService.startSimulation();

// 7. Запуск сервера
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 Бекенд-сервер успішно запущено на порті ${PORT}`);
    console.log(`Структура API доступна за адресою http://localhost:${PORT}/api/boiler`);
});
