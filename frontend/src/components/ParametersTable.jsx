import React from 'react';

// Функція для визначення класу стилю на основі значення та норми
function getStatusClass(value, norm) {
    if (!norm) return '';
    if (value < norm.min || value > norm.max) {
        return 'danger';
    }
    // Можна додати логіку для 'warning', якщо значення наближається до критичного
    return 'normal';
}

// Компонент для відображення таблиці ПОТОЧНИХ значень
function ParametersTable({ parameters, norms, info }) {
  return (
    <div className="parameters-section">
      <h3>Поточні параметри</h3>
      <table>
        <thead>
          <tr>
            <th>Датчик</th>
            <th>Значення</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(parameters).map((key) => {
            const norm = norms[key];
            const statusClass = getStatusClass(parameters[key], norm);

            return (
              <tr key={key}>
                <td>{info[key]?.name || key}</td>
                <td className={`parameter-value ${statusClass}`}>
                  {parameters[key].toFixed(2)}
                  <span className="unit-label">{info[key]?.unit || ''}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ParametersTable;
