import React, { useState } from 'react';
import { fetchGraphData } from './api'; 
import GraphMap from './components/GraphMap'; // Наш холст для графа
import { getLayoutedElements } from './layoutUtils';
import Sidebar from './components/Sidebar';

function App() {
  // --- СОСТОЯНИЯ (Память нашего компонента) ---
  const [searchQuery, setSearchQuery] = useState(''); // То, что юзер вводит в поиск
  const [nodes, setNodes] = useState([]); // Узлы графа
  const [edges, setEdges] = useState([]); // Связи графа
  const [isLoading, setIsLoading] = useState(false); // Крутилка загрузки
  const [error, setError] = useState(null); // Текст ошибки, если что-то сломалось
  const [selectedNode, setSelectedNode] = useState(null); // Память для кликнутой статьи

  // --- ПАЛИТРА ИИ-КЛАСТЕРОВ ---
  // Эта функция берет номер группы от бэкенда и выдает красивый цвет
  const getClusterColor = (groupNumber) => {
    // Массив пастельных цветов для наших тем
    const colors = ['#FFD1DC', '#AEC6CF', '#77DD77', '#FDFD96', '#CDB4DB'];
    // Защита: если групп больше, чем цветов, идем по кругу
    return colors[groupNumber % colors.length];
  };

  // --- ФУНКЦИЯ ПОИСКА ---
  const handleSearch = async (e) => {
    e.preventDefault(); 

    if (!searchQuery.trim()) return; 

    setIsLoading(true);
    setError(null); 

    try {
      const data = await fetchGraphData(searchQuery);
      console.log("Данные от Бэкенда:", data);
      
      if (!data.nodes || data.nodes.length === 0) {
        setError("По вашему запросу ничего не найдено или сработал лимит API.");
        setNodes([]);
        setEdges([]);
        return;
      }

      //  БЕЗОПАСНЫЙ ПАРСИНГ И РАСКРАСКА УЗЛОВ
      const safeNodes = data.nodes.map((node, index) => {
        return {
          ...node, 
          // Ставим нули, так как Dagre всё равно их перезапишет
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

      //  ЗАЩИТА ОТ "ВЗРЫВА СВЯЗЕЙ" (EDGE FILTERING)
      // 1. Создаем сверхбыстрый список (Set) из ID тех 30 статей, которые мы реально скачали
      const existingNodeIds = new Set(safeNodes.map(node => node.id));

      // 2. Просеиваем связи. Оставляем ТОЛЬКО те, где оба конца линии существуют на экране
      const safeEdges = (data.edges || []).filter(edge => 
        existingNodeIds.has(edge.source) && existingNodeIds.has(edge.target)
      );

      // ПРОПУСКАЕМ ЧЕРЕЗ АЛГОРИТМ РАССТАНОВКИ 
      // Важно: передаем очищенные safeEdges, а не все подряд!
      const { layoutedNodes, layoutedEdges } = getLayoutedElements(
        safeNodes, 
        safeEdges 
      );

      // Сохраняем уже красивые, расставленные узлы и правильные связи
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
      <form onSubmit={handleSearch} style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Например: Blockchain..."
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
      <div style={{ position: 'relative' }}>
        <GraphMap 
          nodes={nodes} 
          edges={edges} 
          // React Flow сам передаст нам событие (event) и узел (node), на который кликнули
          onNodeClick={(event, node) => setSelectedNode(node)} 
        />
        
        {/* Выводим боковую панель. Если selectedNode пустой, она будет скрыта */}
        <Sidebar 
          node={selectedNode} 
          onClose={() => setSelectedNode(null)} 
        />
      </div>
    </div>
  );
}

export default App;