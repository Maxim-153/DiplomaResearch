// Файл: /frontend/src/layoutUtils.js
import dagre from 'dagre';

// Функция, которая принимает узлы и связи, и возвращает их же, но с правильными координатами
export const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  
  // ИЗМЕНЕНИЕ: Создаем движок ВНУТРИ функции каждый раз с чистого листа!
  // Иначе он запоминает "призраки" старых вершин и ломает координаты при развертывании.
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // 1. ИЗМЕНЕНИЕ: НАСТРОЙКА ПЛОТНОСТИ ГРАФА
  // Жестко задаем отступы, чтобы 30 статей не разлетались на километры
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 150, // Отступ между карточками по горизонтали
    ranksep: 200, // Отступ между рядами по вертикали
    align: 'DL'   // Прижимаем "одинокие" узлы друг к другу
  });

  // Твои размеры (оставляем как есть, это важно для точности центрирования)
  const nodeWidth = 250; 
  const nodeHeight = 100;

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Запускаем просчет идеальных координат
  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  // 2. ИЗМЕНЕНИЕ (КРИТИЧЕСКОЕ): Правильные имена ключей на выходе
  // App.jsx ждет ключи "nodes" и "edges"
  return { nodes: layoutedNodes, edges: edges };
};