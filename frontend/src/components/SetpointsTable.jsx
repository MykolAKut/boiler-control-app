import React from 'react';

// Компонент для відображення таблиці ЗАДАНИХ значень (норм)
function SetpointsTable({ setpoints, norms, info, onSetpointChange }) {
  return (
    <div className="setpoints-section">
      <h3>Задані значення (Setpoints)</h3>
      <table>
        <thead>
          <tr>
            <th>Параметр</th>
            <th>Оптимальне значення</th> {}
            <th>Норма (Min-Max)</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(setpoints).map((key) => (
            <tr key={key}>
              <td>{info[key]?.name || key}</td>
              <td>
                <input
                  type="number"
                  value={setpoints[key]}
                  onChange={(e) => onSetpointChange(key, e.target.value)}
                  step="1"
                />
                <span className="unit-label">{info[key]?.unit || ''}</span>
              </td>
              <td>
                {norms[key]
                    ? `${norms[key].min} - ${norms[key].max}`
                    : 'N/A'
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SetpointsTable;
