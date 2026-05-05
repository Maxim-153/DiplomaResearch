import dagre from 'dagre';

// Создаем "движок" графа
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// Функция, которая принимает узлы и связи, и возвращает их же, но с правильными координатами
export const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  // TB = Top to Bottom (Сверху вниз). Можно поменять на 'LR' (Слева направо)
  dagreGraph.setGraph({ rankdir: direction });

  // Примерные размеры наших цветных карточек со статьями
  const nodeWidth = 250; 
  const nodeHeight = 100;

  // 1. Скармливаем алгоритму все наши карточки
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  // 2. Скармливаем алгоритму все связи между ними
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // 3. МАГИЯ: Запускаем просчет идеальных координат
  dagre.layout(dagreGraph);

  // 4. Достаем просчитанные координаты и отдаем их обратно React Flow
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        // Вычитаем половину ширины/высоты, чтобы алгоритм целился ровно в центр карточки
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { layoutedNodes, layoutedEdges: edges };
};