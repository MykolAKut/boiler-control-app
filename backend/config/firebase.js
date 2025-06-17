// config/firebase.js
const admin = require('firebase-admin');

// Ініціалізація Firebase Admin SDK
try {
    const serviceAccount = require('../serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://boiler-control-app-default-rtdb.europe-west1.firebasedatabase.app"
    });
    console.log('Firebase Admin SDK успішно ініціалізовано.');
} catch (error) {
    console.error("ПОМИЛКА: Не знайдено serviceAccountKey.json або невірна конфігурація.", error);
    process.exit(1);
}

// Ініціалізація клієнтів
const db = admin.firestore();       // Firestore для довготривалих налаштувань
const rtdb = admin.database();      // Realtime Database для даних стану
const auth = admin.auth();          // Сервіс автентифікації

// Middleware для перевірки токена автентифікації
const checkAuth = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        return res.status(401).send({ error: 'No token provided' });
    }
    try {
        // Верифікуємо токен, отриманий від клієнта
        req.user = await auth.verifyIdToken(token);
        next(); // Якщо токен валідний, передаємо керування наступному обробнику
    } catch (e) {
        res.status(403).send({ error: 'Invalid or expired token' });
    }
};

module.exports = {
    db,
    rtdb,
    auth,
    checkAuth
};