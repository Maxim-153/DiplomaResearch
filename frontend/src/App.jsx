import React, { useState, useCallback } from 'react';
import { applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { fetchGraphData, expandGraphData } from './api'; 
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
  const [rfInstance, setRfInstance] = useState(null); // Хранилище для пульта от камеры

  // --- НОВЫЕ СОСТОЯНИЯ: Память для годов ---
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');

  // --- ПАЛИТРА ИИ-КЛАСТЕРОВ ---
  const getClusterColor = (groupNumber) => {
    const colors = ['#FFD1DC', '#AEC6CF', '#77DD77', '#FDFD96', '#CDB4DB'];
    return colors[groupNumber % colors.length];
  };

  // --- ОБРАБОТЧИКИ СОСТОЯНИЯ REACT FLOW (Защита от сброса координат) ---
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // --- ФУНКЦИЯ ПОИСКА ---
 const handleSearch = async (e) => {
    e.preventDefault(); 

    if (!searchQuery.trim()) return; 

    setIsLoading(true);
    setError(null); 

    try {
      // Идем на бэкенд за статьями
      const data = await fetchGraphData(searchQuery, yearFrom, yearTo);
      console.log("Данные от Бэкенда:", data);
      
      if (!data.nodes || data.nodes.length === 0) {
        setError("По вашему запросу ничего не найдено или все статьи отфильтрованы.");
        setNodes([]);
        setEdges([]);
        return;
      }

      // БЕЗОПАСНЫЙ ПАРСИНГ И РАСКРАСКА УЗЛОВ
      const safeNodes = data.nodes.map((node) => {
        return {
          ...node, 
          position: { x: 0, y: 0 },
          style: { 
            // Убедись, что у тебя есть функция getClusterColor в App.jsx!
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
      // --- ИЗМЕНЕНИЕ: Ждем ключи nodes и edges! ---
      const layouted = getLayoutedElements(safeNodes, safeEdges);

      // Сохраняем правильные данные в стейт React
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
      
      // --- ИЗМЕНЕНИЕ: Добавили полет камеры ---
      // Даем React чуть-чуть времени на рендер карточек (100 мс), а затем летим к графу
      setTimeout(() => {
        if (rfInstance) {
          rfInstance.fitView({ padding: 0.2, duration: 800 });
        }
      }, 100);

    } catch (err) {
      console.error(err);
      setError("Не удалось загрузить граф. Проверь консоль браузера.");
    } finally {
      setIsLoading(false); 
    }
  };

// НОВАЯ ФУНКЦИЯ: Догрузка связей по клику на статью (С КАМЕРОЙ, ЛОГАМИ И СТИЛЯМИ)
  const handleExpand = async (paperId) => {
    setIsLoading(true); // Включаем крутилку загрузки
    setError(null);

    try {
      // 1. Идем на бэкенд за новыми данными
      const newData = await expandGraphData(paperId);
      const fetchedNodes = newData?.nodes || [];
      const fetchedEdges = newData?.edges || [];

      if (fetchedNodes.length === 0) {
        alert("Для этой статьи не найдено цитирований в нашей базе OpenAlex.");
        setIsLoading(false);
        return;
      }

      // 2. БЕЗОПАСНОЕ ОТСЕИВАНИЕ ДУБЛИКАТОВ
      const safeNodes = nodes || [];
      const safeEdges = edges || [];

      const existingNodeIds = new Set(safeNodes.map(n => n.id));
      
      // Сначала просто фильтруем, чтобы оставить только уникальные (новые) статьи
      const rawUniqueNodes = fetchedNodes.filter(n => !existingNodeIds.has(n.id));

      // --- ИЗМЕНЕНИЕ 1: "Одеваем" новые узлы в НЕОНОВУЮ РАМКУ перед тем, как добавить на экран ---
      const styledNewNodes = rawUniqueNodes.map((node) => {
        return {
          ...node,
          position: { x: 0, y: 0 }, // Обязательное поле для React Flow
          style: { 
            backgroundColor: getClusterColor(node.data.group), // Красим по ML-кластеру
            borderRadius: '8px',
            padding: '10px',
            // Делаем толстую пунктирную границу золотого цвета и свечение для НОВЫХ карточек!
            border: '3px dashed #FFD700', 
            boxShadow: '0px 0px 15px rgba(255, 215, 0, 0.6)',
            transition: 'all 0.5s ease' // Плавное появление
          }
        };
      });

      const existingEdgeIds = new Set(safeEdges.map(e => e.id));
      const uniqueNewEdges = fetchedEdges.filter(e => !existingEdgeIds.has(e.id));

      console.log(`Пришло узлов: ${fetchedNodes.length}. Из них уникальных (новых): ${styledNewNodes.length}`);
      if (styledNewNodes.length === 0) {
        alert("Новые цитирования найдены, но все эти статьи УЖЕ отображены на экране!");
        setIsLoading(false);
        return;
      }

      // 3. Склеиваем старый граф и новые УЖЕ ОДЕТЫЕ данные
      const combinedNodes = [...safeNodes, ...styledNewNodes];
      const rawCombinedEdges = [...safeEdges, ...uniqueNewEdges];

      // --- КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: ЗАЩИТА ОТ "ВЗРЫВА СВЯЗЕЙ" ---
      // Убиваем связи-призраки, из-за которых рисовались бесконечные нитки
      const allCombinedNodeIds = new Set(combinedNodes.map(n => n.id));
      const combinedEdges = rawCombinedEdges.filter(edge => 
        allCombinedNodeIds.has(edge.source) && allCombinedNodeIds.has(edge.target)
      );

      // 4. Пересчитываем координаты через Dagre
      const layouted = getLayoutedElements(combinedNodes, combinedEdges);

      // 5. Обновляем состояния React
      setNodes(layouted.nodes);
      setEdges(layouted.edges);

      // --- ИЗМЕНЕНИЕ 2: Четкое уведомление для пользователя ---
      alert(`Связи успешно развернуты!\nДобавлено новых статей: ${styledNewNodes.length}`);

      // Полет камеры к обновленному графу
      setTimeout(() => {
        if (rfInstance) {
          rfInstance.fitView({ padding: 0.2, duration: 800 });
        }
      }, 100);

    } catch (err) {
      console.error("Ошибка при расширении графа:", err);
      setError("Не удалось загрузить связи для этой статьи.");
    } finally {
      setIsLoading(false); 
    }
  };
  // --- ИНТЕРФЕЙС --

  // --- ОБРАБОТЧИКИ КЛИКОВ (Сброс золотых рамок) ---
  const handlePaneClick = () => {
    setSelectedNode(null);
    setNodes(prev => prev.map(n => ({
      ...n,
      style: { ...n.style, border: '2px solid #333', boxShadow: '2px 2px 5px rgba(0,0,0,0.2)' }
    })));
  };

  const handleNodeClick = (event, node) => {
    setSelectedNode(node);
    setNodes(prev => prev.map(n => ({
      ...n,
      style: { ...n.style, border: '2px solid #333', boxShadow: '2px 2px 5px rgba(0,0,0,0.2)' }
    })));
  };

  // --- ДИНАМИЧЕСКИЙ РЕНДЕР: РЕЖИМ ФОКУСА (БОРЬБА С ПАУТИНОЙ) ---
  // Вычисляем, как должны выглядеть узлы ПРЯМО СЕЙЧАС (зависит от клика)
  const displayNodes = nodes.map(node => {
    const isCurrent = selectedNode && node.id === selectedNode.id;

    // Если ни одна статья не выбрана, показываем все ярко
    if (!selectedNode) return { ...node, style: { ...node.style, opacity: 1 } };

    // Или она связана с выбранной напрямую? (Проверяем по массиву edges)
    const isConnected = edges.some(e => 
      (e.source === selectedNode.id && e.target === node.id) || 
      (e.target === selectedNode.id && e.source === node.id)
    );

    // Базовые настройки для фокусного режима (гасим чужие узлы)
    const dynamicStyle = {
      ...node.style,
      opacity: isCurrent || isConnected ? 1 : 0.15, // Сильно гасим всех "чужих"
      transition: 'all 0.3s ease'
    };

    // ЯВНАЯ ПОДСВЕТКА ВЫБРАННОЙ СТАТЬИ
    if (isCurrent) {
      dynamicStyle.border = '3px solid #007bff';
      dynamicStyle.boxShadow = '0px 0px 20px rgba(0, 123, 255, 0.8)';
    }

    return {
      ...node,
      style: dynamicStyle
    };
  });

  // Вычисляем, как должны выглядеть связи (Используем свойство hidden)
  const displayEdges = edges.map(edge => {
    // Если ничего не выбрано - показываем все связи (режим обзора)
    if (!selectedNode) {
      return { ...edge, hidden: false, animated: false, style: { stroke: '#666', strokeWidth: 1, opacity: 0.4 } };
    }

    // Если статья выбрана - оставляем в памяти React Flow все связи, но чужие скрываем визуально
    const isConnected = edge.source === selectedNode.id || edge.target === selectedNode.id;
    return {
      ...edge,
      hidden: !isConnected, // Прячем связь, не удаляя её физически (спасает от глюка 0,0)
      animated: isConnected,
      style: { stroke: isConnected ? '#007bff' : '#666', strokeWidth: isConnected ? 3 : 1, opacity: 1 }
    };
  });

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
      <div style={{ display: 'flex', flexDirection: 'row', height: '85vh', border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
        
        {/* Контейнер графа занимает всё свободное место (flex: 1) */}
        <div style={{ flex: 1, position: 'relative' }}>
          <GraphMap 
            nodes={displayNodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick} 
            onNodeDoubleClick={(event, node) => handleExpand(node.id)} 
            onPaneClick={handlePaneClick} // Клик по фону сбрасывает фокус и рамки
            onInit={setRfInstance}
          />
        </div>
        
        <Sidebar 
          node={selectedNode} 
          onClose={handlePaneClick} 
          onExpand={handleExpand}
        />
      </div>
    </div>
  );
}

export default App;