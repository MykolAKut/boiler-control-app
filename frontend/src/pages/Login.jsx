import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, Link, useLocation } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Визначаємо, куди перенаправити користувача після входу
  const from = location.state?.from?.pathname || "/boiler";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Будь ласка, заповніть усі поля');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate(from, { replace: true });
    } catch (err) {
      switch (err.code) {
        case 'auth/user-not-found':
          setError('Користувача з таким email не знайдено.');
          break;
        case 'auth/wrong-password':
          setError('Невірний пароль.');
          break;
        case 'auth/invalid-credential':
          setError('Невірні дані для входу.');
          break;
        default:
          setError('Помилка входу. Спробуйте ще раз.');
          break;
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <form onSubmit={handleSubmit} className="auth-form">
        <h2>Вхід до системи</h2>
        {error && <div className="error-message">{error}</div>}
        <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
        />
        <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
        />
        <button type="submit" disabled={loading}>
            {loading ? 'Вхід...' : 'Увійти'}
        </button>
        <p>
            Немає акаунта? <Link to="/register">Зареєструватися</Link>
        </p>
        </form>
    </div>
  );
}
