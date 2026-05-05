import React, { useState } from 'react';
import { fetchGraphData } from './api'; // Наш почтальон к Python
import GraphMap from './components/GraphMap'; // Наш холст для графа

function App() {
  // --- СОСТОЯНИЯ (Память нашего компонента) ---
  const [searchQuery, setSearchQuery] = useState(''); // То, что юзер вводит в поиск
  const [nodes, setNodes] = useState([]); // Узлы графа
  const [edges, setEdges] = useState([]); // Связи графа[cite: 1]
  const [isLoading, setIsLoading] = useState(false); // Крутилка загрузки
  const [error, setError] = useState(null); // Текст ошибки, если что-то сломалось

  // --- ФУНКЦИЯ ПОИСКА ---
const handleSearch = async (e) => {
    e.preventDefault(); 

    if (!searchQuery.trim()) return; 

    setIsLoading(true);
    setError(null); 

    try {
      const data = await fetchGraphData(searchQuery);
      
      if (!data.nodes || data.nodes.length === 0) {
        setError("По вашему запросу ничего не найдено или сработал лимит API.");
        setNodes([]);
        setEdges([]);
        return;
      }

      // БЕЗОПАСНЫЙ ПАРСИНГ (Защита от падения)
      // Проходимся по всем узлам. Если у узла нет поля position, добавляем его сами
      const safeNodes = data.nodes.map((node, index) => {
        return {
          ...node, // Берем все старые данные (id, data с title и abstract)
          // Располагаем их "лесенкой", умножая индекс на 150, чтобы они не слиплись в одной точке
          position: node.position || { x: index * 150, y: index * 100 } 
        };
      });

      setNodes(safeNodes);
      setEdges(data.edges || []);
      
    } catch (err) {
      setError("Не удалось загрузить граф. Проверь консоль браузера.");
    } finally {
      setIsLoading(false); 
    }
  };

  // --- ИНТЕРФЕЙС ---
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>🎓 Semantic Research Graph</h2>
      
      {/* Форма поиска */}
      <form onSubmit={handleSearch} style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Например: Machine Learning..."
          style={{ padding: '10px', fontSize: '16px', width: '300px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button 
          type="submit" 
          disabled={isLoading}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          {isLoading ? 'Ищем...' : 'Построить граф'}
        </button>
      </form>

      {/* Вывод ошибок */}
      {error && (
        <div style={{ color: 'red', marginBottom: '20px', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {/* Отрисовка холста графа */}
      <GraphMap nodes={nodes} edges={edges} />
    </div>
  );
}

export default App;