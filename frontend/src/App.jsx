import React, { useState } from 'react';
import { fetchGraphData } from './api'; 
import GraphMap from './components/GraphMap'; 
import { getLayoutedElements } from './layoutUtils';
import Sidebar from './components/Sidebar';

function App() {
  // --- СОСТОЯНИЯ (Память нашего компонента) ---
  const [searchQuery, setSearchQuery] = useState(''); 
  const [nodes, setNodes] = useState([]); 
  const [edges, setEdges] = useState([]); 
  const [isLoading, setIsLoading] = useState(false); 
  const [error, setError] = useState(null); 
  const [selectedNode, setSelectedNode] = useState(null); 

  // --- НОВЫЕ СОСТОЯНИЯ: Память для годов ---
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');

  // --- ПАЛИТРА ИИ-КЛАСТЕРОВ ---
  const getClusterColor = (groupNumber) => {
    const colors = ['#FFD1DC', '#AEC6CF', '#77DD77', '#FDFD96', '#CDB4DB'];
    return colors[groupNumber % colors.length];
  };

  // --- ФУНКЦИЯ ПОИСКА ---
  const handleSearch = async (e) => {
    e.preventDefault(); 

    if (!searchQuery.trim()) return; 

    setIsLoading(true);
    setError(null); 

    try {
      // ИЗМЕНЕНИЕ: Передаем года в нашу обновленную API-функцию
      const data = await fetchGraphData(searchQuery, yearFrom, yearTo);
      console.log("Данные от Бэкенда:", data);
      
      if (!data.nodes || data.nodes.length === 0) {
        setError("По вашему запросу ничего не найдено или все статьи отфильтрованы.");
        setNodes([]);
        setEdges([]);
        return;
      }

      // БЕЗОПАСНЫЙ ПАРСИНГ И РАСКРАСКА УЗЛОВ
      const safeNodes = data.nodes.map((node, index) => {
        return {
          ...node, 
          position: { x: 0, y: 0 },
          style: { 
            backgroundColor: getClusterColor(node.data.group),
            borderRadius: '8px',
            padding: '10px',
            border: '2px solid #333',
            boxShadow: '2px 2px 5px rgba(0,0,0,0.2)' 
          }
        };
      });

      // ЗАЩИТА ОТ "ВЗРЫВА СВЯЗЕЙ" (EDGE FILTERING)
      const existingNodeIds = new Set(safeNodes.map(node => node.id));
      const safeEdges = (data.edges || []).filter(edge => 
        existingNodeIds.has(edge.source) && existingNodeIds.has(edge.target)
      );

      // ПРОПУСКАЕМ ЧЕРЕЗ АЛГОРИТМ РАССТАНОВКИ 
      const { layoutedNodes, layoutedEdges } = getLayoutedElements(
        safeNodes, 
        safeEdges 
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      
    } catch (err) {
      console.error(err);
      setError("Не удалось загрузить граф. Проверь консоль браузера.");
    } finally {
      setIsLoading(false); 
    }
  };

  // --- ИНТЕРФЕЙС ---
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Semantic Research Graph</h2>
      
      {/* Форма поиска */}
      <form onSubmit={handleSearch} style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Например: Blockchain..."
          style={{ padding: '10px', fontSize: '16px', width: '300px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        
        {/* НОВЫЕ ПОЛЯ ВВОДА ДЛЯ ГОДОВ */}
        <input 
          type="number" 
          placeholder="Год от (напр. 2018)" 
          value={yearFrom} 
          onChange={(e) => setYearFrom(e.target.value)}
          style={{ padding: '10px', fontSize: '16px', width: '150px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input 
          type="number" 
          placeholder="Год до (напр. 2024)" 
          value={yearTo} 
          onChange={(e) => setYearTo(e.target.value)}
          style={{ padding: '10px', fontSize: '16px', width: '150px', borderRadius: '4px', border: '1px solid #ccc' }}
        />

        <button 
          type="submit" 
          disabled={isLoading}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: isLoading ? '#ccc' : '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
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
      <div style={{ position: 'relative', border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
        <GraphMap 
          nodes={nodes} 
          edges={edges} 
          onNodeClick={(event, node) => setSelectedNode(node)} 
        />
        
        <Sidebar 
          node={selectedNode} 
          onClose={() => setSelectedNode(null)} 
        />
      </div>
    </div>
  );
}

export default App;