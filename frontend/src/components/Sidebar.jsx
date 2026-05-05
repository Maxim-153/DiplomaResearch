import React from 'react';

const Sidebar = ({ node, onClose }) => {
  // Если ни одна карточка не выбрана, ничего не рисуем
  if (!node) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: '350px',
      height: '100vh',
      backgroundColor: '#fff',
      borderLeft: '2px solid #ccc',
      boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
      padding: '20px',
      overflowY: 'auto', // Добавляем прокрутку, если текст очень длинный
      zIndex: 1000, // Поверх графа
      color: '#333'
    }}>
      <button 
        onClick={onClose}
        style={{ float: 'right', cursor: 'pointer', padding: '5px 10px', background: '#eee', border: 'none', borderRadius: '4px' }}
      >
        Закрыть ✖
      </button>
      
      <h3 style={{ marginTop: '30px' }}>{node.data.label}</h3>
      <div style={{ margin: '10px 0', padding: '5px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
        <strong>Кластер ИИ (Группа):</strong> {node.data.group}
      </div>
      
      <h4>Абстракт:</h4>
      <p style={{ lineHeight: '1.5', fontSize: '14px', textAlign: 'justify' }}>
        {node.data.abstract || "Абстракт отсутствует для данной статьи."}
      </p>
    </div>
  );
};

export default Sidebar;