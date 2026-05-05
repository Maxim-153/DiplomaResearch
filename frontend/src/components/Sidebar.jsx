import React from 'react';

const Sidebar = ({ node, onClose }) => {
  if (!node) return null;

  const authorsText = node.data.authors && node.data.authors.length > 0
    ? node.data.authors.map(a => a.name).join(', ')
    : 'Неизвестно';

  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: 0,
      width: '350px',
      height: '100%', // Занимает всю высоту экрана
      backgroundColor: '#f8f9fa',
      boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
      padding: '20px',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      // --- ИЗМЕНЕНИЕ 1: ДОБАВЛЯЕМ СКРОЛЛ ---
      overflowY: 'auto' 
    }}>
      
      {/* Шапка с кнопкой закрытия */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', paddingRight: '10px' }}>{node.data.label}</h3>
        <button 
          onClick={onClose} 
          style={{ cursor: 'pointer', border: 'none', background: '#eee', padding: '5px 10px', borderRadius: '4px', fontWeight: 'bold' }}
        >
          X
        </button>
      </div>

      {/* Метаданные (Карточка) */}
      <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e0e0e0', marginBottom: '20px' }}>
        <p style={{ margin: '0 0 10px 0' }}><strong>Год:</strong> {node.data.year || 'Нет данных'}</p>
        <p style={{ margin: '0 0 10px 0' }}><strong>Авторы:</strong> {authorsText}</p>
        <p style={{ margin: 0 }}><strong>ИИ Кластер:</strong> {node.data.group_name || 'Без группы'}</p>
      </div>

      {/* --- ИЗМЕНЕНИЕ 2: КНОПКА ССЫЛКИ ТЕПЕРЬ СВЕРХУ --- */}
      {node.data.url ? (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <a 
            href={node.data.url} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              display: 'block', // Кнопка на всю ширину
              padding: '12px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '6px',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              transition: 'background-color 0.2s'
            }}
          >
            Читать оригинал ↗
          </a>
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginBottom: '20px', padding: '12px', backgroundColor: '#e9ecef', color: '#6c757d', borderRadius: '6px' }}>
          Ссылка недоступна
        </div>
      )}

      {/* Абстракт */}
      <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '8px', marginTop: 0 }}>Абстракт:</h4>
      <p style={{ lineHeight: '1.6', fontSize: '14px', textAlign: 'justify', color: '#444', marginBottom: '30px' }}>
        {node.data.abstract || "Абстракт отсутствует для данной статьи."}
      </p>

    </div>
  );
};

export default Sidebar;