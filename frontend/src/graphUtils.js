import { getLayoutedElements } from './layoutUtils';

export const GRAPH_MODES = {
  PAPERS: 'papers',
  AUTHORS: 'authors',
};

const CLUSTER_COLORS = ['#f9c6d3', '#b9d8dc', '#bde7b0', '#f4e38a', '#d9c2ea', '#f2c38b'];
const AUTHOR_COLORS = ['#d9f2e6', '#d9e8ff', '#fff0c2', '#f8d8d8', '#e6ddff', '#d7f4f2'];

export const getClusterColor = (groupNumber = 0) => {
  const safeIndex = Number.isFinite(groupNumber) ? groupNumber : 0;
  return CLUSTER_COLORS[Math.abs(safeIndex) % CLUSTER_COLORS.length];
};

export const decoratePaperNode = (node, options = {}) => {
  const { isNew = false } = options;

  return {
    ...node,
    data: {
      ...node.data,
      type: 'paper',
    },
    position: node.position || { x: 0, y: 0 },
    style: {
      width: 260,
      minHeight: 92,
      backgroundColor: getClusterColor(node.data?.group),
      borderRadius: 8,
      padding: 12,
      border: isNew ? '2px solid #f59e0b' : '1px solid #475569',
      boxShadow: isNew
        ? '0 12px 26px rgba(245, 158, 11, 0.26)'
        : '0 10px 22px rgba(15, 23, 42, 0.14)',
      color: '#111827',
      fontSize: 13,
      lineHeight: 1.25,
    },
  };
};

export const dedupeEdges = (edges = []) => {
  const seen = new Set();
  const result = [];

  edges.forEach((edge) => {
    if (!edge?.source || !edge?.target || edge.source === edge.target) return;

    const id = edge.id || `e-${edge.source}-${edge.target}`;
    const key = `${edge.source}->${edge.target}`;
    if (seen.has(key)) return;

    seen.add(key);
    result.push({ ...edge, id });
  });

  return result;
};

export const filterEdgesForNodes = (edges = [], nodesOrIds = []) => {
  const nodeIds = nodesOrIds instanceof Set
    ? nodesOrIds
    : new Set(nodesOrIds.map((node) => node.id));

  return dedupeEdges(
    edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)),
  );
};

export const positionNodesAroundAnchor = (existingNodes, newNodes, anchorId) => {
  const anchorNode = existingNodes.find((node) => node.id === anchorId);
  const anchorPosition = anchorNode?.position || { x: 0, y: 0 };
  const anchorCenter = {
    x: anchorPosition.x + 130,
    y: anchorPosition.y + 46,
  };

  const perRing = 8;

  return newNodes.map((node, index) => {
    const ring = Math.floor(index / perRing);
    const itemIndex = index % perRing;
    const itemsInRing = Math.min(perRing, newNodes.length - ring * perRing);
    const radius = 300 + ring * 190;
    const angleOffset = ring % 2 === 0 ? -Math.PI / 2 : -Math.PI / 2 + Math.PI / perRing;
    const angle = angleOffset + (2 * Math.PI * itemIndex) / Math.max(itemsInRing, 1);

    return {
      ...node,
      position: {
        x: anchorCenter.x + Math.cos(angle) * radius - 130,
        y: anchorCenter.y + Math.sin(angle) * radius - 46,
      },
    };
  });
};

const getAuthorId = (author) => {
  const rawId = author?.id || author?.name || 'unknown';
  return `author:${String(rawId).trim().toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-')}`;
};

export const buildAuthorGraph = (paperNodes = []) => {
  const authorMap = new Map();
  const edgeMap = new Map();

  paperNodes.forEach((paperNode) => {
    const paperData = paperNode.data || {};
    const paperAuthors = (paperData.authors || [])
      .filter((author) => author?.name)
      .slice(0, 8);

    paperAuthors.forEach((author) => {
      const id = getAuthorId(author);
      if (!authorMap.has(id)) {
        authorMap.set(id, {
          id,
          data: {
            type: 'author',
            label: author.name,
            papers: [],
            years: new Set(),
          },
          position: { x: 0, y: 0 },
        });
      }

      const authorNode = authorMap.get(id);
      authorNode.data.papers.push({
        id: paperNode.id,
        title: paperData.label,
        year: paperData.year,
        url: paperData.url,
      });

      if (paperData.year) {
        authorNode.data.years.add(paperData.year);
      }
    });

    for (let i = 0; i < paperAuthors.length; i += 1) {
      for (let j = i + 1; j < paperAuthors.length; j += 1) {
        const source = getAuthorId(paperAuthors[i]);
        const target = getAuthorId(paperAuthors[j]);
        const [left, right] = [source, target].sort();
        const key = `${left}--${right}`;

        if (!edgeMap.has(key)) {
          edgeMap.set(key, {
            id: `author-edge-${left}-${right}`,
            source: left,
            target: right,
            data: {
              weight: 0,
              papers: [],
            },
          });
        }

        const edge = edgeMap.get(key);
        edge.data.weight += 1;
        edge.data.papers.push({
          id: paperNode.id,
          title: paperData.label,
        });
      }
    }
  });

  const nodes = Array.from(authorMap.values()).map((node, index) => {
    const papers = node.data.papers;
    const years = Array.from(node.data.years).sort((a, b) => a - b);

    return {
      ...node,
      data: {
        ...node.data,
        papers,
        paperCount: papers.length,
        years,
      },
      style: {
        width: 230,
        minHeight: 76,
        backgroundColor: AUTHOR_COLORS[index % AUTHOR_COLORS.length],
        borderRadius: 999,
        padding: 14,
        border: '1px solid #256d85',
        boxShadow: '0 10px 22px rgba(15, 23, 42, 0.12)',
        color: '#0f172a',
        fontSize: 13,
        lineHeight: 1.25,
      },
    };
  });

  const edges = Array.from(edgeMap.values()).map((edge) => ({
    ...edge,
    label: edge.data.weight > 1 ? String(edge.data.weight) : undefined,
    style: {
      stroke: '#64748b',
      strokeWidth: Math.min(5, 1 + edge.data.weight),
      opacity: 0.45,
    },
  }));

  return getLayoutedElements(nodes, filterEdgesForNodes(edges, nodes), 'LR');
};
