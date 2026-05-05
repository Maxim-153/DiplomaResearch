import React from 'react';
// Актуальный импорт компонентов из библиотеки reactflow
import ReactFlow, { Background, Controls } from 'reactflow';
// Обязательные стили для графов, без них всё сломается
import 'reactflow/dist/style.css';

// Наш компонент принимает два параметра (пропсы): массивы узлов и связей
const GraphMap = ({ nodes, edges }) => {
  return (
    // Использование компонента: родительский контейнер обязательно должен иметь высоту и ширину
    <div style={{ height: '70vh', width: '100%', border: '2px solid #ccc', borderRadius: '8px' }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        {/* Добавляем фон в точку и кнопки масштабирования[cite: 1] */}
        <Background color="#aaa" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default GraphMap;