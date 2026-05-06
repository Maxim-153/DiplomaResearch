import React from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css'; // Обязательные стили

const GraphMap = ({ nodes, edges, onNodeClick, onNodeDoubleClick, onInit }) => {
  return (
    <div style={{ height: '75vh', width: '100%', backgroundColor: '#1e1e1e', borderRadius: '8px' }}>
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onInit={onInit}
        fitView // Автоматически центрирует камеру при загрузке
        fitViewOptions={{ padding: 0.2 }} // Оставляем 20% отступа по краям
        nodesDraggable={true} // Разрешаем двигать карточки
        theme="dark"
      >
        <Background color="#444" gap={16} />
        <Controls />
        {/* Добавляем мини-карту, чтобы всегда видеть, где находится граф! */}
        <MiniMap 
          nodeColor="#007bff" 
          maskColor="rgba(0, 0, 0, 0.5)" 
          style={{ backgroundColor: '#2a2a2a' }} 
        />
      </ReactFlow>
    </div>
  );
};

export default GraphMap;