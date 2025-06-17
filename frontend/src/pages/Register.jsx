import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Пароль повинен містити щонайменше 6 символів');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/boiler'); // Перенаправлення на головну сторінку після успішної реєстрації
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Цей email вже зареєстровано.');
      } else {
        setError('Помилка реєстрації. Спробуйте ще раз.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <form onSubmit={handleSubmit} className="auth-form">
        <h2>Реєстрація</h2>
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
            placeholder="Пароль (мін. 6 символів)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
        />
        <button type="submit" disabled={loading}>
            {loading ? 'Реєстрація...' : 'Зареєструватися'}
        </button>
        <p>
            Вже є акаунт? <Link to="/login">Увійти</Link>
        </p>
        </form>
    </div>
  );
}
