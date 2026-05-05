import React from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';

// 1. ДОБАВИЛИ onNodeClick в параметры
const GraphMap = ({ nodes, edges, onNodeClick }) => {
  return (
    <div style={{ height: '70vh', width: '100%', border: '2px solid #ccc', borderRadius: '8px' }}>
      <ReactFlow 
        nodes={nodes} 
        edges={edges}
        fitView
        onNodeClick={onNodeClick} // 2. ПЕРЕДАЛИ его внутрь движка графа
      >
        <Background color="#aaa" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default GraphMap;