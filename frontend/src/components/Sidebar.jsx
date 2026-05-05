import React from 'react';

const Sidebar = ({ node, onClose }) => {
  if (!node) return null;

  // 🛡️ БЕЗОПАСНЫЙ ПАРСИНГ АВТОРОВ
  // Проверяем, есть ли авторы вообще, чтобы страница не упала с ошибкой
  const authorsText = node.data.authors && node.data.authors.length > 0
    ? node.data.authors.map(author => author.name).join(', ')
    : 'Авторы не указаны';

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, width: '350px', height: '100vh',
      backgroundColor: '#fff', borderLeft: '2px solid #ccc',
      boxShadow: '-2px 0 10px rgba(0,0,0,0.1)', padding: '20px',
      overflowY: 'auto', zIndex: 1000, color: '#333'
    }}>
      <button 
        onClick={onClose}
        style={{ float: 'right', cursor: 'pointer', padding: '5px 10px', background: '#eee', border: 'none', borderRadius: '4px' }}
      >
        Закрыть ✖
      </button>
      
      <h3 style={{ marginTop: '30px', fontSize: '18px' }}>{node.data.label}</h3>
      
      {/* Новый блок с мета-информацией статьи */}
      <div style={{ margin: '15px 0', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px', fontSize: '13px', border: '1px solid #e9ecef' }}>
        <p style={{ margin: '0 0 8px 0' }}><strong>📅 Год:</strong> {node.data.year || 'Неизвестно'}</p>
        <p style={{ margin: '0 0 8px 0' }}><strong>✍️ Авторы:</strong> {authorsText}</p>
        <p style={{ margin: '0' }}><strong>🤖 ИИ Кластер:</strong> Группа {node.data.group}</p>
      </div>
      
      <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Абстракт:</h4>
      <p style={{ lineHeight: '1.6', fontSize: '14px', textAlign: 'justify', color: '#555' }}>
        {node.data.abstract || "Абстракт отсутствует для данной статьи."}
      </p>
    </div>
  );
};

export default Sidebar;