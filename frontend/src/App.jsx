import React, { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

// Ледаче завантаження компонентів сторінок
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const BoilerControl = lazy(() => import('./pages/BoilerControl'));

// Компонент для захищених маршрутів
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  let location = useLocation();

  useEffect(() => {
    // Слідкуємо за зміною стану аутентифікації
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user); // Встановлюємо true, якщо користувач є, інакше false
      setLoading(false);
    });

    // Відписуємось від слухача при розмонтуванні компонента
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Перевірка авторизації...</div>;
  }

  if (!isAuthenticated) {
    // Якщо користувач не автентифікований, перенаправляємо на сторінку входу
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children; // Якщо все добре, рендеримо дочірній компонент
};

const App = () => (
  <Router>
    <Suspense fallback={<div>Завантаження сторінки...</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/boiler" 
          element={
            <ProtectedRoute>
              <BoilerControl />
            </ProtectedRoute>
          } 
        />
        {/* Перенаправлення з головної сторінки на сторінку керування котлом */}
        <Route path="/" element={<Navigate to="/boiler" replace />} />
        <Route path="*" element={<div>404 - Сторінку не знайдено</div>} />
      </Routes>
    </Suspense>
  </Router>
);

export default App;
