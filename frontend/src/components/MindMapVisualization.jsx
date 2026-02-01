/**
 * =============================================================================
 * MINDMAP VISUALIZATION - AI SEARCH KNOWLEDGE GRAPH
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * An interactive, Obsidian-style mindmap that visualizes:
 * - The user's question at the center
 * - Related documents as connected nodes
 * - Relationships between documents
 * 
 * VISUAL DESIGN:
 * - Dark gradient background with subtle grid pattern
 * - Glowing central question node (purple/blue gradient)
 * - Document nodes with category-based colors
 * - Animated connection lines with varying opacity
 * - Hover effects showing document details
 * 
 * =============================================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  MessageSquare, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Tag,
  X
} from 'lucide-react';

// Category color mapping
const CATEGORY_COLORS = {
  policy: { bg: 'from-blue-500 to-blue-600', border: 'border-blue-400', text: 'text-blue-400' },
  procedure: { bg: 'from-green-500 to-green-600', border: 'border-green-400', text: 'text-green-400' },
  technical: { bg: 'from-purple-500 to-purple-600', border: 'border-purple-400', text: 'text-purple-400' },
  hr: { bg: 'from-pink-500 to-pink-600', border: 'border-pink-400', text: 'text-pink-400' },
  finance: { bg: 'from-yellow-500 to-yellow-600', border: 'border-yellow-400', text: 'text-yellow-400' },
  legal: { bg: 'from-red-500 to-red-600', border: 'border-red-400', text: 'text-red-400' },
  training: { bg: 'from-indigo-500 to-indigo-600', border: 'border-indigo-400', text: 'text-indigo-400' },
  marketing: { bg: 'from-orange-500 to-orange-600', border: 'border-orange-400', text: 'text-orange-400' },
  product: { bg: 'from-cyan-500 to-cyan-600', border: 'border-cyan-400', text: 'text-cyan-400' },
  other: { bg: 'from-gray-500 to-gray-600', border: 'border-gray-400', text: 'text-gray-400' },
};

function MindMapVisualization({ mindmap, question, onClose }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ 
          width: rect.width || 800, 
          height: isFullscreen ? window.innerHeight - 100 : Math.min(500, window.innerHeight * 0.5) 
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isFullscreen]);

  // Calculate node positions
  const getNodePositions = useCallback(() => {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const minSide = Math.min(dimensions.width, dimensions.height);

    const rawNodes = mindmap?.nodes?.length
      ? mindmap.nodes
      : (mindmap?.documentNodes || []).map((doc, index, arr) => ({
          id: doc.id || `doc:${index}`,
          type: 'document',
          label: doc.title,
          ...doc,
          layer: 1,
          angle: (360 / (arr.length || 1)) * index,
          distance: doc.distance || 0.7,
        }));

    const byLayer = rawNodes.reduce((acc, node) => {
      const layer = node.layer ?? (node.type === 'question' ? 0 : 1);
      acc[layer] = acc[layer] || [];
      acc[layer].push(node);
      return acc;
    }, {});

    const radii = {
      0: 0,
      1: minSide * 0.28,
      2: minSide * 0.42,
      3: minSide * 0.56,
    };

    const nodes = rawNodes.map((node, index) => {
      if (node.type === 'question' || node.layer === 0) {
        return { ...node, x: centerX, y: centerY };
      }

      const layer = node.layer ?? 1;
      const layerNodes = byLayer[layer] || [];
      const angleDeg = typeof node.angle === 'number'
        ? node.angle
        : (360 / (layerNodes.length || 1)) * layerNodes.indexOf(node);
      const angle = (angleDeg * Math.PI) / 180;
      const distanceFactor = typeof node.distance === 'number' ? node.distance : 1;
      const radius = (radii[layer] || minSide * 0.3) * distanceFactor;

      return {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });

    return {
      center: { x: centerX, y: centerY },
      nodes,
    };
  }, [mindmap, dimensions]);

  const { center, nodes } = getNodePositions();
  const links = mindmap?.links || [];

  // Handle mouse events for panning
  const handleMouseDown = (e) => {
    if (e.target.closest('.node-card')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle zoom
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));

  // Get color for category
  const getCategoryColor = (category) => {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  };

  if (!nodes.length) {
    return null;
  }

  return (
    <div 
      className={`relative rounded-xl overflow-hidden border border-gray-700 ${
        isFullscreen ? 'fixed inset-4 z-50' : ''
      }`}
      style={{ backgroundColor: '#0f172a' }}
    >
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
        }}
      />

      {/* Header Controls */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400 bg-gray-800/80 px-3 py-1.5 rounded-lg backdrop-blur-sm">
            Knowledge Graph • {nodes.length} nodes
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg backdrop-blur-sm transition-all"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-gray-400 bg-gray-800/80 px-2 py-1.5 rounded-lg backdrop-blur-sm min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg backdrop-blur-sm transition-all"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg backdrop-blur-sm transition-all"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        ref={containerRef}
        className="w-full cursor-grab active:cursor-grabbing"
        style={{ height: isFullscreen ? 'calc(100% - 60px)' : '500px', marginTop: '50px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          style={{
            transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
            transformOrigin: 'center',
          }}
        >
          {/* Glow filter definitions */}
          <defs>
            <filter id="glow-purple" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="center-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Connection lines */}
          {links.map((link, index) => {
            const sourceNode = nodes.find((n) => n.id === link.source);
            const targetNode = nodes.find((n) => n.id === link.target);
            if (!sourceNode || !targetNode) return null;

            const isDocDoc = link.type === 'doc-doc';
            const stroke = isDocDoc ? '#fbbf24' : '#60a5fa';
            const dash = isDocDoc ? '5,5' : '0';

            return (
              <line
                key={`link-${index}`}
                x1={sourceNode.x}
                y1={sourceNode.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke={stroke}
                strokeWidth={isDocDoc ? 1.3 : 1.1}
                strokeOpacity={0.35}
                strokeDasharray={dash}
              />
            );
          })}

          {/* Center question node */}
          <g filter="url(#glow-purple)">
            <circle
              cx={center.x}
              cy={center.y}
              r="45"
              fill="url(#center-gradient)"
              className="animate-pulse"
              style={{ animationDuration: '3s' }}
            />
            <circle
              cx={center.x}
              cy={center.y}
              r="48"
              fill="none"
              stroke="#a78bfa"
              strokeWidth="2"
              strokeOpacity="0.5"
            />
          </g>

          {/* Center icon */}
          <foreignObject
            x={center.x - 20}
            y={center.y - 20}
            width="40"
            height="40"
          >
            <div className="flex items-center justify-center w-full h-full">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
          </foreignObject>

          {/* Nodes */}
          {nodes.filter((n) => n.type !== 'question').map((node) => {
            const colors = getCategoryColor(node.category);
            const isHovered = hoveredNode === node.id;
            const isSelected = selectedNode === node.id;
            const baseTransform = `translate(${node.x}px, ${node.y}px)`;
            const transform = isHovered ? `${baseTransform} scale(1.08)` : baseTransform;

            if (node.type === 'document') {
              return (
                <g
                  key={node.id}
                  className="node-card cursor-pointer transition-all duration-300"
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setSelectedNode(isSelected ? null : node.id)}
                  style={{ transform, transformOrigin: 'center' }}
                >
                  <foreignObject x={-80} y={-38} width="160" height="76">
                    <div
                      className={`bg-gray-800/90 backdrop-blur-sm rounded-lg border-2 p-2.5 h-full transition-all ${
                        isHovered ? 'border-purple-400 shadow-lg shadow-purple-500/30' : 'border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded bg-gradient-to-r ${colors.bg} text-white`}>
                          #{node.hash || '---'}
                        </span>
                        <span className={`text-[9px] ${colors.text}`}>
                          {node.category || 'other'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText className={`h-3 w-3 flex-shrink-0 ${colors.text}`} />
                        <span className="text-[11px] text-white truncate font-medium leading-tight">
                          {node.label?.length > 18 ? node.label.substring(0, 18) + '...' : node.label}
                        </span>
                      </div>
                    </div>
                  </foreignObject>
                </g>
              );
            }

            if (node.type === 'chunk') {
              return (
                <g
                  key={node.id}
                  className="node-card cursor-pointer transition-all duration-300"
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setSelectedNode(isSelected ? null : node.id)}
                  style={{ transform, transformOrigin: 'center' }}
                >
                  <foreignObject x={-60} y={-20} width="120" height="40">
                    <div
                      className={`rounded-full px-3 py-1.5 text-[10px] text-gray-100 bg-blue-900/70 border border-blue-500/40 text-center ${
                        isHovered ? 'shadow-md shadow-blue-400/40' : ''
                      }`}
                    >
                      {node.label}
                    </div>
                  </foreignObject>
                </g>
              );
            }

            if (node.type === 'keyword') {
              return (
                <g
                  key={node.id}
                  className="node-card cursor-pointer transition-all duration-300"
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setSelectedNode(isSelected ? null : node.id)}
                  style={{ transform, transformOrigin: 'center' }}
                >
                  <foreignObject x={-45} y={-16} width="90" height="32">
                    <div className="rounded-full px-3 py-1 text-[10px] text-gray-200 bg-gray-700/70 border border-gray-500/40 text-center">
                      {node.label}
                    </div>
                  </foreignObject>
                </g>
              );
            }

            return null;
          })}
        </svg>
      </div>

      {/* Selected node detail panel */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 right-4 bg-gray-800/95 backdrop-blur-sm rounded-xl border border-gray-700 p-4 z-30">
          {(() => {
            const node = nodes.find(n => n.id === selectedNode);
            if (!node) return null;
            const colors = getCategoryColor(node.category);
            
            return (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {node.type === 'document' && (
                      <span className={`text-xs font-mono px-2 py-1 rounded bg-gradient-to-r ${colors.bg} text-white`}>
                        #{node.hash || '---'}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded bg-gray-700 ${colors.text}`}>
                      {node.type}
                    </span>
                  </div>
                  <button 
                    onClick={() => setSelectedNode(null)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <h4 className="text-white font-semibold mb-2">{node.label || node.title}</h4>

                {node.description && (
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                    {node.description}
                  </p>
                )}

                {node.tags?.length > 0 && (
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Tag className="h-3 w-3 text-gray-500" />
                    {node.tags.slice(0, 5).map((tag, i) => (
                      <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {node.excerpts?.length > 0 && (
                  <div className="bg-gray-900/50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-1">Relevant excerpt:</p>
                    <p className="text-sm text-gray-300 italic">
                      "{node.excerpts[0]}"
                    </p>
                  </div>
                )}

                {node.excerpt && (
                  <div className="bg-gray-900/50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-1">Chunk excerpt:</p>
                    <p className="text-sm text-gray-300 italic">
                      "{node.excerpt}"
                    </p>
                  </div>
                )}

                {node.type === 'document' && (
                  <Link
                    to={`/documents/${node.documentId || node.id.replace('doc:', '')}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    View Document
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-blue-400 rounded"></div>
          <span>Links</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-yellow-500/50 rounded" style={{ borderStyle: 'dashed' }}></div>
          <span>Related Docs</span>
        </div>
      </div>
    </div>
  );
}

export default MindMapVisualization;
