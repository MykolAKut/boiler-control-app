// src/firebase.js

// Імпорт необхідних функцій з бібліотек Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Конфігурація Firebase проекту.
// Безпека забезпечується "Правилами безпеки" в консолі Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyBEchBVSqC4N-gf7Fg5Yfl06ON1S3XwLnQ",
  authDomain: "boiler-control-app.firebaseapp.com",
  projectId: "boiler-control-app",
  storageBucket: "boiler-control-app.appspot.com",
  messagingSenderId: "328174587365",
  appId: "1:328174587365:web:108d2c952d0ffdda73730c",
  // URL Realtime Database, яку ми додали для синхронізації стану котла
  databaseURL: "https://boiler-control-app-default-rtdb.europe-west1.firebasedatabase.app"
};

// Ініціалізація додатку Firebase з конфігурацією.
const app = initializeApp(firebaseConfig);

// Ініціалізація та експорт сервісу автентифікації.
// Він буде використовуватися для входу та реєстрації користувачів.
export const auth = getAuth(app);

// Ініціалізація та експорт сервісу Realtime Database.
// Він буде використовуватися для отримання даних про стан котла в реальному часі.
export const db = getDatabase(app);
