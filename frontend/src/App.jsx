import React, { useCallback, useMemo, useState } from 'react';
import { applyEdgeChanges, applyNodeChanges } from 'reactflow';
import { fetchGraphData, expandGraphData } from './api';
import GraphMap from './components/GraphMap';
import { getLayoutedElements } from './layoutUtils';
import Sidebar from './components/Sidebar';
import {
  GRAPH_MODES,
  buildAuthorGraph,
  decoratePaperNode,
  filterEdgesForNodes,
  positionNodesAroundAnchor,
} from './graphUtils';
import './App.css';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [paperNodes, setPaperNodes] = useState([]);
  const [paperEdges, setPaperEdges] = useState([]);
  const [viewMode, setViewMode] = useState(GRAPH_MODES.PAPERS);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [rfInstance, setRfInstance] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const authorGraph = useMemo(() => buildAuthorGraph(paperNodes), [paperNodes]);
  const activeGraph = viewMode === GRAPH_MODES.AUTHORS
    ? authorGraph
    : { nodes: paperNodes, edges: paperEdges };

  const activeNodes = activeGraph.nodes;
  const activeEdges = activeGraph.edges;

  const selectedNode = useMemo(
    () => activeNodes.find((node) => node.id === selectedNodeId) || null,
    [activeNodes, selectedNodeId],
  );

  const connectedNodeIds = useMemo(() => {
    if (!selectedNode) return null;

    const ids = new Set([selectedNode.id]);
    activeEdges.forEach((edge) => {
      if (edge.source === selectedNode.id) ids.add(edge.target);
      if (edge.target === selectedNode.id) ids.add(edge.source);
    });

    return ids;
  }, [activeEdges, selectedNode]);

  const handleNodesChange = useCallback((changes) => {
    if (viewMode !== GRAPH_MODES.PAPERS) return;
    setPaperNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }, [viewMode]);

  const handleEdgesChange = useCallback((changes) => {
    if (viewMode !== GRAPH_MODES.PAPERS) return;
    setPaperEdges((currentEdges) => applyEdgeChanges(changes, currentEdges));
  }, [viewMode]);

  const displayNodes = useMemo(() => activeNodes.map((node) => {
    const isSelected = node.id === selectedNode?.id;
    const isConnected = connectedNodeIds?.has(node.id);

    return {
      ...node,
      style: {
        ...node.style,
        opacity: !selectedNode || isConnected ? 1 : 0.16,
        outline: isSelected ? '3px solid #0ea5e9' : 'none',
        transition: 'opacity 0.2s ease, outline 0.2s ease',
      },
    };
  }), [activeNodes, connectedNodeIds, selectedNode]);

  const displayEdges = useMemo(() => activeEdges.map((edge) => {
    const isConnected = selectedNode
      ? edge.source === selectedNode.id || edge.target === selectedNode.id
      : false;
    const baseStyle = edge.style || {};

    return {
      ...edge,
      hidden: selectedNode ? !isConnected : false,
      animated: Boolean(isConnected),
      style: {
        ...baseStyle,
        stroke: selectedNode ? (isConnected ? '#0ea5e9' : '#334155') : (baseStyle.stroke || '#64748b'),
        strokeWidth: selectedNode ? (isConnected ? Math.max(baseStyle.strokeWidth || 1, 3) : 1) : (baseStyle.strokeWidth || 1.5),
        opacity: selectedNode ? (isConnected ? 1 : 0) : (baseStyle.opacity ?? 0.5),
        transition: 'opacity 0.2s ease, stroke-width 0.2s ease',
      },
    };
  }), [activeEdges, selectedNode]);

  const centerNode = (node) => {
    if (!rfInstance || !node?.position) return;

    rfInstance.setCenter(node.position.x + 130, node.position.y + 50, {
      zoom: 1.05,
      duration: 500,
    });
  };

  const handleSelectNode = (node) => {
    setSelectedNodeId(node.id);
    window.setTimeout(() => centerNode(node), 0);
  };

  const handlePaneClick = () => {
    setSelectedNodeId(null);
  };

  const handleModeChange = (mode) => {
    setViewMode(mode);
    setSelectedNodeId(null);
    window.setTimeout(() => rfInstance?.fitView({ padding: 0.18, duration: 500 }), 80);
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setSelectedNodeId(null);

    try {
      const data = await fetchGraphData(searchQuery, yearFrom, yearTo);
      if (data?.error) throw new Error(data.error);

      const fetchedNodes = data.nodes || [];
      if (fetchedNodes.length === 0) {
        setPaperNodes([]);
        setPaperEdges([]);
        setError('По этому запросу ничего не найдено.');
        return;
      }

      const styledNodes = fetchedNodes.map((node) => decoratePaperNode(node));
      const safeEdges = filterEdgesForNodes(data.edges || [], styledNodes);
      const layouted = getLayoutedElements(styledNodes, safeEdges);

      setPaperNodes(layouted.nodes);
      setPaperEdges(layouted.edges);

      window.setTimeout(() => {
        rfInstance?.fitView({ padding: 0.18, duration: 700 });
      }, 120);
    } catch (err) {
      console.error(err);
      setError('Бэкенд недоступен или вернул ошибку. Проверьте терминал с uvicorn.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpand = async (paperId) => {
    if (viewMode !== GRAPH_MODES.PAPERS) return;

    setIsLoading(true);
    setError(null);

    try {
      const newData = await expandGraphData(paperId);
      if (newData?.error) throw new Error(newData.error);

      const fetchedNodes = newData.nodes || [];
      const fetchedEdges = newData.edges || [];
      const existingNodeIds = new Set(paperNodes.map((node) => node.id));
      const existingEdgeKeys = new Set(paperEdges.map((edge) => `${edge.source}->${edge.target}`));

      const uniqueNewNodes = fetchedNodes
        .filter((node) => node?.id && !existingNodeIds.has(node.id))
        .map((node) => decoratePaperNode(node, { isNew: true }));

      const positionedNewNodes = positionNodesAroundAnchor(paperNodes, uniqueNewNodes, paperId);
      const combinedNodes = [...paperNodes, ...positionedNewNodes];
      const combinedEdges = filterEdgesForNodes([...paperEdges, ...fetchedEdges], combinedNodes);
      const addedEdgeCount = combinedEdges
        .filter((edge) => !existingEdgeKeys.has(`${edge.source}->${edge.target}`))
        .length;

      if (positionedNewNodes.length === 0 && addedEdgeCount === 0) {
        setError('Новых связей для этой статьи не найдено.');
        return;
      }

      setPaperNodes(combinedNodes);
      setPaperEdges(combinedEdges);
      setSelectedNodeId(paperId);

      const anchorNode = paperNodes.find((node) => node.id === paperId);
      window.setTimeout(() => {
        if (anchorNode) {
          rfInstance?.setCenter(anchorNode.position.x + 130, anchorNode.position.y + 50, {
            zoom: 0.78,
            duration: 650,
          });
        }
      }, 120);
    } catch (err) {
      console.error('Ошибка при расширении графа:', err);
      setError('Не удалось загрузить связи. Проверьте терминал с uvicorn.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderListMeta = (node) => {
    if (node.data.type === 'author') {
      const years = node.data.years?.length
        ? `${node.data.years[0]}-${node.data.years[node.data.years.length - 1]}`
        : 'годы не указаны';
      return `${node.data.paperCount} статей · ${years}`;
    }

    return `${node.data.year || 'год не указан'} · ${node.data.group_name || 'без кластера'}`;
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">SR</div>
          <div>
            <h1>Semantic Research Graph</h1>
            <p>OpenAlex · ML-кластеры · граф цитирований</p>
          </div>
        </div>

        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Blockchain, neural networks..."
          />
          <input
            type="number"
            value={yearFrom}
            onChange={(event) => setYearFrom(event.target.value)}
            placeholder="От"
          />
          <input
            type="number"
            value={yearTo}
            onChange={(event) => setYearTo(event.target.value)}
            placeholder="До"
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Ищем...' : 'Построить'}
          </button>
        </form>

        <div className="mode-switch" role="tablist" aria-label="Режим графа">
          <button
            type="button"
            className={viewMode === GRAPH_MODES.PAPERS ? 'active' : ''}
            onClick={() => handleModeChange(GRAPH_MODES.PAPERS)}
          >
            Статьи
          </button>
          <button
            type="button"
            className={viewMode === GRAPH_MODES.AUTHORS ? 'active' : ''}
            onClick={() => handleModeChange(GRAPH_MODES.AUTHORS)}
          >
            Авторы
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="results-panel">
          <div className="results-head">
            <div>
              <h2>{viewMode === GRAPH_MODES.AUTHORS ? 'Авторы' : 'Статьи'}</h2>
              <p>{activeNodes.length} элементов</p>
            </div>
            {paperNodes.length > 0 && (
              <button type="button" onClick={() => rfInstance?.fitView({ padding: 0.18, duration: 500 })}>
                Весь граф
              </button>
            )}
          </div>

          <div className="results-list">
            {activeNodes.length === 0 ? (
              <div className="empty-list">Нет данных</div>
            ) : activeNodes.map((node) => (
              <button
                type="button"
                key={node.id}
                className={`result-item ${selectedNodeId === node.id ? 'selected' : ''}`}
                onClick={() => handleSelectNode(node)}
              >
                <span className="result-title">{node.data.label}</span>
                <span className="result-meta">{renderListMeta(node)}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="graph-stage">
          {activeNodes.length > 0 ? (
            <GraphMap
              nodes={displayNodes}
              edges={displayEdges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onNodeClick={(event, node) => handleSelectNode(node)}
              onNodeDoubleClick={(event, node) => {
                if (node.data.type === 'paper') handleExpand(node.id);
              }}
              onPaneClick={handlePaneClick}
              onInit={setRfInstance}
            />
          ) : (
            <div className="empty-graph">
              <h2>Граф появится здесь</h2>
              <p>Ожидание данных OpenAlex.</p>
            </div>
          )}

          {isLoading && (
            <div className="loading-overlay">
              <div className="loader" />
              <span>Загрузка данных</span>
            </div>
          )}

          {error && (
            <div className="status-message">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)}>Закрыть</button>
            </div>
          )}

          <Sidebar
            node={selectedNode}
            onClose={handlePaneClick}
            onExpand={handleExpand}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
