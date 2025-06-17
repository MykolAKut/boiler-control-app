// config/mqtt.js
const mqtt = require('mqtt');

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_STATE_TOPIC = 'boiler/state';

let mqttClient;

function connectMqtt() {
    mqttClient = mqtt.connect(MQTT_BROKER_URL);

    mqttClient.on('connect', () => {
        console.log('Бекенд підключено до MQTT брокера');
    });

    mqttClient.on('error', (err) => {
        console.error('Помилка MQTT з\'єднання:', err);
    });

    mqttClient.on('close', () => {
        console.log('Бекенд відключено від MQTT брокера.');
    });
}

// Запускаємо підключення при завантаженні модуля
connectMqtt();

module.exports = {
    mqttClient,
    MQTT_STATE_TOPIC
};