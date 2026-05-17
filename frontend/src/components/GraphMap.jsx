import React from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css'; // Обязательные стили

const GraphMap = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onNodeDoubleClick,
  onPaneClick,
  onInit,
}) => {
  return (
    <div className="graph-map">
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        onInit={onInit}
        fitView // Автоматически центрирует камеру при загрузке
        fitViewOptions={{ padding: 0.2 }} // Оставляем 20% отступа по краям
        nodesDraggable={true} // Разрешаем двигать карточки
        nodesConnectable={false}
        minZoom={0.18}
        maxZoom={1.8}
        theme="dark"
      >
        <Background color="#444" gap={16} />
        <Controls />
        {/* ИЗМЕНЕНИЕ: Умная мини-карта, реагирующая на режим фокуса! */}
        <MiniMap 
          nodeColor={(node) => {
            // Если узел "погашен" нашим режимом фокуса (прозрачность меньше 1),
            // мы красим его в темно-серый цвет, чтобы он не отвлекал на миникарте.
            if (node.style?.opacity && node.style.opacity < 1) return '#2a2a2a';
            
            // Если узел активен (или мы просто смотрим на весь граф без фокуса), 
            // берем цвет его ИИ-кластера. Если цвета вдруг нет - берем синий.
            return node.style?.backgroundColor || '#007bff';
          }}
          maskColor="rgba(0, 0, 0, 0.5)" 
          style={{ backgroundColor: '#1e1e1e' }} 
        />
      </ReactFlow>
    </div>
  );
};

export default GraphMap;
