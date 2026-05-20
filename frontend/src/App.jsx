import React, { useCallback, useMemo, useState } from 'react';
import { applyEdgeChanges, applyNodeChanges } from 'reactflow';
import { fetchGraphData, expandGraphData } from './api';
import ExportDialog from './components/ExportDialog';
import ExportMenu from './components/ExportMenu';
import GraphMap from './components/GraphMap';
import { getLayoutedElements } from './layoutUtils';
import Sidebar from './components/Sidebar';
import {
  GRAPH_MODES,
  buildAuthorGraph,
  buildResearchGaps,
  calculatePaperMetrics,
  decoratePaperNode,
  filterEdgesForNodes,
  filterGraphByYear,
  getTimelineRange,
  getTopInfluentialPapers,
  positionNodesAroundAnchor,
} from './graphUtils';
import { getConnectedPaperNodes, getPaperNodes } from './exportUtils';
import './App.css';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [sortMode, setSortMode] = useState('relevance');
  const [paperNodes, setPaperNodes] = useState([]);
  const [paperEdges, setPaperEdges] = useState([]);
  const [viewMode, setViewMode] = useState(GRAPH_MODES.PAPERS);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [expandedPaperIds, setExpandedPaperIds] = useState([]);
  const [timelineYear, setTimelineYear] = useState(null);
  const [rfInstance, setRfInstance] = useState(null);
  const [exportDialog, setExportDialog] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const timelineInfo = useMemo(() => getTimelineRange(paperNodes), [paperNodes]);
  const timelineGraph = useMemo(
    () => filterGraphByYear(paperNodes, paperEdges, timelineYear),
    [paperNodes, paperEdges, timelineYear],
  );
  const authorGraph = useMemo(() => buildAuthorGraph(timelineGraph.nodes), [timelineGraph.nodes]);
  const activeGraph = viewMode === GRAPH_MODES.AUTHORS
    ? authorGraph
    : timelineGraph;
  const topInfluentialPapers = useMemo(
    () => getTopInfluentialPapers(timelineGraph.nodes, 3),
    [timelineGraph.nodes],
  );
  const researchGaps = useMemo(
    () => buildResearchGaps(timelineGraph.nodes, timelineGraph.edges, 3),
    [timelineGraph.nodes, timelineGraph.edges],
  );

  const activeNodes = activeGraph.nodes;
  const activeEdges = activeGraph.edges;
  const visiblePaperNodes = useMemo(() => getPaperNodes(timelineGraph.nodes), [timelineGraph.nodes]);
  const expandedPaperSet = useMemo(() => new Set(expandedPaperIds), [expandedPaperIds]);

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

  const localExportNodes = useMemo(
    () => getConnectedPaperNodes(selectedNode, timelineGraph.nodes, timelineGraph.edges),
    [selectedNode, timelineGraph.nodes, timelineGraph.edges],
  );

  const selectedNodeExpanded = Boolean(selectedNode && expandedPaperSet.has(selectedNode.id));

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

  const handleOpenGlobalExport = (format) => {
    if (!visiblePaperNodes.length) return;
    setExportDialog({
      title: 'Экспорт всего графа',
      scopeLabel: 'all-graph',
      format,
      nodes: visiblePaperNodes,
    });
  };

  const handleOpenLocalExport = (format) => {
    if (!localExportNodes.length || selectedNode?.data?.type !== 'paper') return;
    setExportDialog({
      title: selectedNode.data.label,
      scopeLabel: 'paper-links',
      format,
      nodes: localExportNodes,
    });
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setSelectedNodeId(null);
    setExpandedPaperIds([]);

    try {
      const data = await fetchGraphData(searchQuery, yearFrom, yearTo, sortMode);
      if (data?.error) throw new Error(data.error);

      const fetchedNodes = data.nodes || [];
      if (fetchedNodes.length === 0) {
        setPaperNodes([]);
        setPaperEdges([]);
        setExpandedPaperIds([]);
        setError('По этому запросу ничего не найдено.');
        return;
      }

      const styledNodes = fetchedNodes.map((node) => decoratePaperNode({
        ...node,
        data: {
          ...node.data,
          origin: 'search',
        },
      }));
      const searchEdges = (data.edges || []).map((edge) => ({
        ...edge,
        data: {
          ...edge.data,
          origin: 'search',
        },
      }));
      const safeEdges = filterEdgesForNodes(searchEdges, styledNodes);
      const layouted = getLayoutedElements(styledNodes, safeEdges);
      const scoredNodes = calculatePaperMetrics(layouted.nodes, layouted.edges);
      const nextTimelineInfo = getTimelineRange(scoredNodes);

      setPaperNodes(scoredNodes);
      setPaperEdges(layouted.edges);
      setTimelineYear(nextTimelineInfo?.max || null);

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

  const handleCollapse = (paperId) => {
    const remainingExpandedIds = expandedPaperIds.filter((id) => id !== paperId);
    const remainingExpandedSet = new Set(remainingExpandedIds);
    const remainingEdges = paperEdges.filter((edge) => edge.data?.expandedBy !== paperId);
    const connectedIds = new Set();

    remainingEdges.forEach((edge) => {
      connectedIds.add(edge.source);
      connectedIds.add(edge.target);
    });

    const remainingNodes = paperNodes.filter((node) => {
      if (node.data?.origin !== 'expanded') return true;
      return connectedIds.has(node.id) || remainingExpandedSet.has(node.id);
    });
    const safeEdges = filterEdgesForNodes(remainingEdges, remainingNodes);
    const scoredNodes = calculatePaperMetrics(remainingNodes, safeEdges);
    const nextTimelineInfo = getTimelineRange(scoredNodes);

    setPaperNodes(scoredNodes);
    setPaperEdges(safeEdges);
    setExpandedPaperIds(remainingExpandedIds);
    setTimelineYear(nextTimelineInfo?.max || null);
    setSelectedNodeId(paperId);

    window.setTimeout(() => {
      rfInstance?.fitView({ padding: 0.18, duration: 500 });
    }, 80);
  };

  const handleExpand = async (paperId) => {
    if (viewMode !== GRAPH_MODES.PAPERS) return;

    if (expandedPaperSet.has(paperId)) {
      handleCollapse(paperId);
      return;
    }

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
        .map((node) => decoratePaperNode({
          ...node,
          data: {
            ...node.data,
            origin: 'expanded',
            expandedBy: paperId,
          },
        }, { isNew: true }));

      const positionedNewNodes = positionNodesAroundAnchor(paperNodes, uniqueNewNodes, paperId);
      const combinedNodes = [...paperNodes, ...positionedNewNodes];
      const scopedFetchedEdges = fetchedEdges.map((edge) => ({
        ...edge,
        data: {
          ...edge.data,
          origin: 'expanded',
          expandedBy: paperId,
        },
      }));
      const combinedEdges = filterEdgesForNodes([...paperEdges, ...scopedFetchedEdges], combinedNodes);
      const scoredCombinedNodes = calculatePaperMetrics(combinedNodes, combinedEdges);
      const nextTimelineInfo = getTimelineRange(scoredCombinedNodes);
      const addedEdgeCount = combinedEdges
        .filter((edge) => !existingEdgeKeys.has(`${edge.source}->${edge.target}`))
        .length;

      if (positionedNewNodes.length === 0 && addedEdgeCount === 0) {
        setError('Новых связей для этой статьи не найдено.');
        return;
      }

      setPaperNodes(scoredCombinedNodes);
      setPaperEdges(combinedEdges);
      setSelectedNodeId(paperId);
      setExpandedPaperIds((currentIds) => (
        currentIds.includes(paperId) ? currentIds : [...currentIds, paperId]
      ));
      setTimelineYear(nextTimelineInfo?.max || null);

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

    const influence = node.data.influence_score !== undefined
      ? ` · влияние ${node.data.influence_score}/100`
      : '';
    return `${node.data.year || 'год не указан'} · ${node.data.group_name || 'без кластера'}${influence}`;
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
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
            aria-label="Сортировка статей"
          >
            <option value="relevance">Релевантные</option>
            <option value="newest">Сначала новые</option>
            <option value="cited">Сначала цитируемые</option>
          </select>
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
              <div className="results-head-actions">
                <button type="button" onClick={() => rfInstance?.fitView({ padding: 0.18, duration: 500 })}>
                  Весь граф
                </button>
                <ExportMenu label="Экспорт графа" onSelect={handleOpenGlobalExport} disabled={!visiblePaperNodes.length} />
              </div>
            )}
          </div>

          {paperNodes.length > 0 && (
            <div className="analysis-panel">
              {timelineInfo && (
                <section className="analysis-section">
                  <div className="analysis-title">
                    <span>Timeline</span>
                    <strong>до {timelineYear || timelineInfo.max}</strong>
                  </div>
                  <input
                    type="range"
                    min={timelineInfo.min}
                    max={timelineInfo.max}
                    value={timelineYear || timelineInfo.max}
                    onChange={(event) => {
                      setSelectedNodeId(null);
                      setTimelineYear(Number(event.target.value));
                    }}
                  />
                  <div className="timeline-meta">
                    <span>{timelineInfo.min}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNodeId(null);
                        setTimelineYear(timelineInfo.max);
                      }}
                    >
                      Все годы
                    </button>
                    <span>{timelineInfo.max}</span>
                  </div>
                </section>
              )}

              <section className="analysis-section">
                <div className="analysis-title">
                  <span>Ключевые статьи</span>
                  <strong>Influence</strong>
                </div>
                <div className="mini-list">
                  {topInfluentialPapers.map((node) => (
                    <button type="button" key={node.id} onClick={() => handleSelectNode(node)}>
                      <span>{node.data.label}</span>
                      <strong>{node.data.influence_score}/100</strong>
                    </button>
                  ))}
                </div>
              </section>

              <section className="analysis-section">
                <div className="analysis-title">
                  <span>Research gaps</span>
                  <strong>{researchGaps.length}</strong>
                </div>
                <div className="gap-list">
                  {researchGaps.length === 0 ? (
                    <p>Нужно минимум два кластера.</p>
                  ) : researchGaps.map((gap) => (
                    <div className="gap-item" key={gap.id}>
                      <span>{gap.description}</span>
                      <strong>{gap.gapScore}/100</strong>
                      <small>Связей между кластерами: {gap.edgeCount}</small>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

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
            isExpanded={selectedNodeExpanded}
            onExport={handleOpenLocalExport}
          />
        </section>
      </main>

      <ExportDialog config={exportDialog} onClose={() => setExportDialog(null)} />
    </div>
  );
}

export default App;
