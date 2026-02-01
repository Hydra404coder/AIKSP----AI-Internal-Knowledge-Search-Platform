/**
 * =============================================================================
 * COLLECTION DETAIL PAGE - VISUAL DOCUMENT RELATIONSHIP CANVAS
 * =============================================================================
 * 
 * Features:
 * - Draggable document nodes on a canvas
 * - Connection points on 4 sides of each document
 * - SVG lines connecting linked documents
 * - Yellow circle on links for relation text
 * - Colored badges showing document links
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ArrowLeft, FileText, Plus, X, MessageCircle, Link2, ExternalLink } from 'lucide-react';

// Generate a random color for link badges
const generateColor = (seed) => {
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
    '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
    '#A855F7', '#D946EF', '#EC4899', '#F43F5E'
  ];
  return colors[Math.abs(seed.charCodeAt(0) + seed.charCodeAt(1)) % colors.length];
};

// Document Node Component
function DocumentNode({
  doc,
  position,
  isSelected,
  onSelect,
  onDragStart,
  onDragEnd,
  onConnectionStart,
  onConnectionEnd,
  isDragging,
  links,
  allDocs,
  onViewDocument,
}) {
  const nodeRef = useRef(null);
  const [localPos, setLocalPos] = useState(position);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setLocalPos(position);
  }, [position]);

  // Get links where this doc is source (handle both populated and unpopulated)
  const getDocId = (docRef) => {
    if (!docRef) return null;
    return String(typeof docRef === 'object' ? docRef._id : docRef);
  };
  const docIdStr = String(doc._id);
  const outgoingLinks = links.filter(l => l && l.sourceDocument && getDocId(l.sourceDocument) === docIdStr);
  // Get links where this doc is target  
  const incomingLinks = links.filter(l => l && l.targetDocument && getDocId(l.targetDocument) === docIdStr);

  const handleMouseDown = (e) => {
    if (e.target.closest('.connection-point')) return;
    e.stopPropagation();
    const rect = nodeRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    onDragStart(doc._id);
  };

  const handleConnectionPointMouseDown = (e, side) => {
    e.stopPropagation();
    onConnectionStart(doc._id, side, {
      x: localPos.x + (side === 'left' ? 0 : side === 'right' ? 180 : 90),
      y: localPos.y + (side === 'top' ? 0 : side === 'bottom' ? 80 : 40),
    });
  };

  const handleConnectionPointMouseUp = (e, side) => {
    e.stopPropagation();
    onConnectionEnd(doc._id, side);
  };

  const nodeWidth = 180;
  const nodeHeight = 80;

  return (
    <div
      ref={nodeRef}
      className={`absolute select-none cursor-move transition-shadow ${
        isSelected ? 'ring-2 ring-primary-500' : ''
      } ${isDragging ? 'z-50 shadow-xl' : 'z-10'}`}
      style={{
        left: localPos.x,
        top: localPos.y,
        width: nodeWidth,
        height: nodeHeight,
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(doc._id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onViewDocument(doc._id);
      }}
    >
      {/* Document Card - Modern Glass Morphism Style */}
      <div className="bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 text-white rounded-xl p-3 h-full flex flex-col justify-between shadow-xl border border-slate-500/30 backdrop-blur-sm hover:shadow-2xl transition-all duration-200">
        {/* Title Row */}
        <div className="flex items-start gap-2">
          <div className="p-1.5 bg-white/10 rounded-lg">
            <FileText className="h-4 w-4 text-blue-300" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold leading-tight line-clamp-2" title="Double-click to view document">{doc.title}</span>
          </div>
        </div>

        {/* Bottom Row: Hash + Link Badges */}
        <div className="flex items-center justify-between gap-2 mt-1">
          {/* Hash Badge */}
          <div className="px-2 py-0.5 bg-white/10 rounded-md text-[10px] font-mono text-slate-300 border border-white/10">
            #{doc.hash || '---'}
          </div>
          
          {/* Link Badges */}
          <div className="flex items-center gap-1">
            {/* Outgoing link badges (gradient colored) */}
            {outgoingLinks.map((link) => {
              const targetId = getDocId(link.targetDocument);
              const targetDoc = allDocs.find(d => d._id === targetId);
              const targetData = typeof link.targetDocument === 'object' ? link.targetDocument : targetDoc;
              const hash = targetData?.hash || '???';
              const color = generateColor(hash);
              return (
                <div key={link._id} className="group relative">
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold cursor-pointer shadow-md border border-white/20 hover:scale-110 transition-transform"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
                    title={`Links to: ${targetDoc?.title || 'Unknown'}`}
                  >
                    {hash}
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-900/95 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none shadow-lg border border-slate-700">
                    <span className="text-emerald-400">→</span> {targetDoc?.title || 'Unknown'}
                  </div>
                </div>
              );
            })}
            {/* Incoming link badges (blue gradient) */}
            {incomingLinks.map((link) => {
              const sourceId = getDocId(link.sourceDocument);
              const sourceDoc = allDocs.find(d => d._id === sourceId);
              const sourceData = typeof link.sourceDocument === 'object' ? link.sourceDocument : sourceDoc;
              const hash = sourceData?.hash || '???';
              return (
                <div
                  key={`in-${link._id}`}
                  className="group relative"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDocument(sourceId);
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-[8px] font-bold cursor-pointer shadow-md border border-white/20 hover:scale-110 transition-transform"
                    title={`Linked from: ${sourceDoc?.title || 'Unknown'}`}
                  >
                    {hash}
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-900/95 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none shadow-lg border border-slate-700">
                    <span className="text-blue-400">←</span> {sourceDoc?.title || 'Unknown'}
                    <span className="text-slate-400 ml-1">(click)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Connection Points - 4 sides with glow effect */}
      {['top', 'right', 'bottom', 'left'].map((side) => {
        const posStyle = {
          top: { top: -10, left: '50%', transform: 'translateX(-50%)' },
          right: { right: -10, top: '50%', transform: 'translateY(-50%)' },
          bottom: { bottom: -10, left: '50%', transform: 'translateX(-50%)' },
          left: { left: -10, top: '50%', transform: 'translateY(-50%)' },
        };
        return (
          <div
            key={side}
            className="connection-point absolute w-5 h-5 bg-gradient-to-br from-slate-400 to-slate-500 hover:from-blue-400 hover:to-blue-600 rounded-full flex items-center justify-center cursor-crosshair border-2 border-white shadow-lg hover:shadow-blue-400/50 transition-all duration-200 hover:scale-125"
            style={posStyle[side]}
            onMouseDown={(e) => handleConnectionPointMouseDown(e, side)}
            onMouseUp={(e) => handleConnectionPointMouseUp(e, side)}
          >
            <Plus className="h-3 w-3 text-white drop-shadow" />
          </div>
        );
      })}
    </div>
  );
}

// SVG Link Line with Yellow Circle
function LinkLine({ link, sourcePos, targetPos, onClickCircle, isSelected }) {
  if (!sourcePos || !targetPos) return null;

  const nodeWidth = 180;
  const nodeHeight = 80;

  // Calculate connection point positions
  const getConnectionPoint = (pos, side) => {
    switch (side) {
      case 'top': return { x: pos.x + nodeWidth / 2, y: pos.y };
      case 'bottom': return { x: pos.x + nodeWidth / 2, y: pos.y + nodeHeight };
      case 'left': return { x: pos.x, y: pos.y + nodeHeight / 2 };
      case 'right': return { x: pos.x + nodeWidth, y: pos.y + nodeHeight / 2 };
      default: return { x: pos.x + nodeWidth / 2, y: pos.y + nodeHeight / 2 };
    }
  };

  const start = getConnectionPoint(sourcePos, link.sourceSide);
  const end = getConnectionPoint(targetPos, link.targetSide);
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

  // Calculate control points for curved line
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const controlOffset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.5 + 30;

  let cp1, cp2;
  if (link.sourceSide === 'top' || link.sourceSide === 'bottom') {
    const yDir = link.sourceSide === 'top' ? -1 : 1;
    cp1 = { x: start.x, y: start.y + yDir * controlOffset };
  } else {
    const xDir = link.sourceSide === 'left' ? -1 : 1;
    cp1 = { x: start.x + xDir * controlOffset, y: start.y };
  }

  if (link.targetSide === 'top' || link.targetSide === 'bottom') {
    const yDir = link.targetSide === 'top' ? -1 : 1;
    cp2 = { x: end.x, y: end.y + yDir * controlOffset };
  } else {
    const xDir = link.targetSide === 'left' ? -1 : 1;
    cp2 = { x: end.x + xDir * controlOffset, y: end.y };
  }

  const pathD = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;

  return (
    <g className="link-group">
      {/* Shadow/Glow effect for line */}
      <path
        d={pathD}
        fill="none"
        stroke={isSelected ? '#3B82F6' : '#64748B'}
        strokeWidth={isSelected ? 6 : 4}
        strokeOpacity={0.3}
        strokeLinecap="round"
      />
      {/* Main Link Line */}
      <path
        d={pathD}
        fill="none"
        stroke={isSelected ? '#3B82F6' : '#64748B'}
        strokeWidth={isSelected ? 3 : 2}
        strokeLinecap="round"
        className="transition-all duration-200"
      />
      
      {/* Arrow/End point with gradient */}
      <circle cx={end.x} cy={end.y} r={5} fill="#475569" />
      <circle cx={end.x} cy={end.y} r={3} fill="#94A3B8" />
      
      {/* Yellow Circle in Middle - Modernized */}
      <circle
        cx={mid.x}
        cy={mid.y}
        r={16}
        fill="url(#yellowGradient)"
        stroke="#F59E0B"
        strokeWidth={2}
        className="cursor-pointer transition-all duration-200"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(245, 158, 11, 0.4))' }}
        onClick={(e) => {
          e.stopPropagation();
          onClickCircle(link);
        }}
      />
      <title>{link.relationText ? link.relationText : 'Click to add relationship'}</title>
      {/* Inner highlight */}
      <circle
        cx={mid.x - 3}
        cy={mid.y - 3}
        r={4}
        fill="rgba(255,255,255,0.4)"
        className="pointer-events-none"
      />
      {/* Message icon or text indicator */}
      {link.relationText ? (
        <text
          x={mid.x}
          y={mid.y + 5}
          textAnchor="middle"
          fontSize="14"
          fill="#78350F"
          className="pointer-events-none"
          style={{ fontWeight: 600 }}
        >
          💬
        </text>
      ) : (
        <text
          x={mid.x}
          y={mid.y + 5}
          textAnchor="middle"
          fontSize="16"
          fill="#78350F"
          className="pointer-events-none"
          style={{ fontWeight: 700 }}
        >
          +
        </text>
      )}
    </g>
  );
}

// Temporary line while dragging connection - Animated dashed line
function TempConnectionLine({ start, end }) {
  if (!start || !end) return null;
  return (
    <g>
      {/* Glow effect */}
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="#3B82F6"
        strokeWidth={6}
        strokeOpacity={0.3}
        strokeLinecap="round"
      />
      {/* Main line */}
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="url(#blueGradient)"
        strokeWidth={3}
        strokeDasharray="8,6"
        strokeLinecap="round"
        style={{ animation: 'dash 0.5s linear infinite' }}
      />
      {/* End circle indicator */}
      <circle cx={end.x} cy={end.y} r={8} fill="#3B82F6" fillOpacity={0.3} />
      <circle cx={end.x} cy={end.y} r={4} fill="#3B82F6" />
    </g>
  );
}

function CollectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef(null);

  const [collection, setCollection] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [links, setLinks] = useState([]);
  const [positions, setPositions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Interaction state
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [selectedLinkId, setSelectedLinkId] = useState(null);
  const [draggingDocId, setDraggingDocId] = useState(null);
  const [dragMousePos, setDragMousePos] = useState(null);

  // Connection drawing state
  const [connecting, setConnecting] = useState(null); // { sourceId, sourceSide, startPos }
  const [connectMousePos, setConnectMousePos] = useState(null);

  // Relation text dialog
  const [editingLink, setEditingLink] = useState(null);
  const [relationText, setRelationText] = useState('');

  // Canvas size
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });

  // Fetch collection data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      // Fetch collection and documents first
      const collectionRes = await api.get(`/collections/${id}/documents`);
      setCollection(collectionRes.data?.collection || null);
      setDocuments(collectionRes.data?.documents || []);

      // Fetch links and positions separately to handle errors gracefully
      try {
        const linksRes = await api.get(`/document-links/collection/${id}`);
        setLinks(Array.isArray(linksRes) ? linksRes : []);
      } catch (linkErr) {
        console.error('Failed to fetch links:', linkErr);
        setLinks([]);
      }

      let positionsRes;
      try {
        positionsRes = await api.get(`/document-links/positions/${id}`);
      } catch (posErr) {
        console.error('Failed to fetch positions:', posErr);
        positionsRes = [];
      }

      // Convert positions array to object keyed by document ID (as string)
      const posObj = {};
      const posArray = Array.isArray(positionsRes) ? positionsRes : [];
      const docs = collectionRes.data?.documents || [];

      docs.forEach((doc, index) => {
        const docId = String(doc._id);
        // Compare as strings since MongoDB ObjectId may be object or string
        const saved = posArray.find(p => String(p.document) === docId);
        if (saved) {
          posObj[docId] = { x: saved.x, y: saved.y };
        } else {
          // Default grid layout
          const col = index % 4;
          const row = Math.floor(index / 4);
          posObj[docId] = { x: 50 + col * 220, y: 50 + row * 120 };
        }
      });
      setPositions(posObj);
    } catch (err) {
      console.error('Failed to load collection:', err);
      setError('Failed to load collection.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  // Handle mouse move for dragging and connecting
  useEffect(() => {
    const handleMouseMove = (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (draggingDocId) {
        const docIdStr = String(draggingDocId);
        setPositions(prev => ({
          ...prev,
          [docIdStr]: { x: Math.max(0, x - 90), y: Math.max(0, y - 40) },
        }));
      }

      if (connecting) {
        setConnectMousePos({ x, y });
      }
    };

    const handleMouseUp = async () => {
      if (draggingDocId) {
        const docIdStr = String(draggingDocId);
        const pos = positions[docIdStr];
        if (pos) {
          // Save position to backend
          try {
            await api.put('/document-links/position', {
              collectionId: id,
              documentId: draggingDocId,
              x: pos.x,
              y: pos.y,
            });
          } catch (err) {
            console.error('Failed to save position:', err);
          }
        }
      }
      setDraggingDocId(null);

      if (connecting) {
        setConnecting(null);
        setConnectMousePos(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingDocId, connecting, positions, id]);

  // Handle connection end
  const handleConnectionEnd = async (targetId, targetSide) => {
    if (!connecting || connecting.sourceId === targetId) {
      setConnecting(null);
      return;
    }

    try {
      const res = await api.post('/document-links', {
        collectionId: id,
        sourceDocumentId: connecting.sourceId,
        targetDocumentId: targetId,
        sourceSide: connecting.sourceSide,
        targetSide,
        relationText: '',
      });
      
      // The response should have populated documents
      // Only add if it has the required fields
      if (res && res.sourceDocument && res.targetDocument) {
        setLinks(prev => [...prev, res]);
      } else {
        // Refetch all links if response is incomplete
        const linksRes = await api.get(`/document-links/collection/${id}`);
        setLinks(Array.isArray(linksRes) ? linksRes : []);
      }
    } catch (err) {
      console.error('Failed to create link:', err);
      alert(err.response?.data?.message || 'Failed to create link');
    }

    setConnecting(null);
    setConnectMousePos(null);
  };

  // Save relation text
  const handleSaveRelationText = async () => {
    if (!editingLink) return;

    try {
      const res = await api.put(`/document-links/${editingLink._id}`, {
        relationText,
      });
      setLinks(prev => prev.map(l => l._id === editingLink._id ? res : l));
      setEditingLink(null);
      setRelationText('');
    } catch (err) {
      console.error('Failed to save relation text:', err);
    }
  };

  // Delete link
  const handleDeleteLink = async (linkId) => {
    if (!confirm('Delete this link?')) return;
    try {
      await api.delete(`/document-links/${linkId}`);
      setLinks(prev => prev.filter(l => l._id !== linkId));
      setSelectedLinkId(null);
    } catch (err) {
      console.error('Failed to delete link:', err);
    }
  };

  const handleViewDocument = (docId) => {
    navigate(`/documents/${docId}`);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse bg-white rounded-lg border border-gray-200 p-6">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-96 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-sm text-red-600">{error || 'Collection not found.'}</p>
        <Link to="/documents" className="mt-3 inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/documents" className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Link>
        <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
          <span className="flex items-center gap-1"><span className="text-slate-400">⟷</span> Drag to move</span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1"><span className="text-blue-500">+</span> Click to link</span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1"><span className="text-amber-500">●</span> Click for text</span>
        </div>
      </div>

      {/* Collection Info - Modern Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{collection.name}</h1>
            {collection.description && (
              <p className="mt-1 text-sm text-slate-600">{collection.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center px-3 py-1.5 bg-slate-50 rounded-lg">
              <div className="text-lg font-bold text-slate-700">{documents.length}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">Docs</div>
            </div>
            <div className="text-center px-3 py-1.5 bg-amber-50 rounded-lg">
              <div className="text-lg font-bold text-amber-600">{links.length}</div>
              <div className="text-[10px] text-amber-500 uppercase tracking-wide">Links</div>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas - Modern Grid Background */}
      <div
        ref={canvasRef}
        className="relative rounded-xl overflow-hidden shadow-inner"
        style={{ 
          width: '100%', 
          height: canvasSize.height, 
          minHeight: 600,
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          border: '2px solid #e2e8f0',
        }}
        onClick={() => {
          setSelectedDocId(null);
          setSelectedLinkId(null);
        }}
      >
        {/* SVG Layer for Links */}
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 1, pointerEvents: 'none' }}
        >
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="yellowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FCD34D" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
          <g style={{ pointerEvents: 'auto' }}>
            {links.filter(link => link && link.sourceDocument && link.targetDocument).map((link) => {
              // Get source/target IDs - handle both populated objects and plain IDs, always as strings
              const sourceId = String(typeof link.sourceDocument === 'object' 
                ? link.sourceDocument._id 
                : link.sourceDocument);
              const targetId = String(typeof link.targetDocument === 'object' 
                ? link.targetDocument._id 
                : link.targetDocument);
              const sourcePos = positions[sourceId];
              const targetPos = positions[targetId];
              
              return (
                <LinkLine
                  key={link._id}
                  link={link}
                  sourcePos={sourcePos}
                  targetPos={targetPos}
                  isSelected={selectedLinkId === link._id}
                  onClickCircle={(l) => {
                    const canEdit = user?.isOrgAdmin || String(l.createdBy) === String(user?._id);
                    if (!canEdit) {
                      alert('Only admins can edit relationships. Please request access from your admin.');
                      return;
                    }
                    setSelectedLinkId(l._id);
                    setEditingLink(l);
                    setRelationText(l.relationText || '');
                  }}
                />
              );
            })}
            {/* Temporary connection line */}
            {connecting && connectMousePos && (
              <TempConnectionLine start={connecting.startPos} end={connectMousePos} />
            )}
          </g>
        </svg>

        {/* Document Nodes */}
        {documents.map((doc) => (
          <DocumentNode
            key={doc._id}
            doc={doc}
            position={positions[String(doc._id)] || { x: 100, y: 100 }}
            isSelected={selectedDocId === doc._id}
            onSelect={setSelectedDocId}
            onDragStart={setDraggingDocId}
            onDragEnd={() => setDraggingDocId(null)}
            onConnectionStart={(docId, side, startPos) => {
              setConnecting({ sourceId: docId, sourceSide: side, startPos });
            }}
            onConnectionEnd={handleConnectionEnd}
            isDragging={draggingDocId === doc._id}
            links={links}
            allDocs={documents}
            onViewDocument={handleViewDocument}
          />
        ))}

        {/* Empty state */}
        {documents.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium mb-2">No documents in this collection</p>
              <Link to="/documents" className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline">
                Add documents from Documents page →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Relation Text Dialog - Modern Modal */}
      {editingLink && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl shadow-lg shadow-amber-200">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                Describe Relationship
              </h3>
              <button
                onClick={() => setEditingLink(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex-1 truncate font-medium text-slate-700">{links.find(l => l._id === editingLink._id)?.sourceDocument?.title}</div>
                <div className="flex-shrink-0 px-2 py-1 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full">
                  <span className="text-white text-xs font-bold">→</span>
                </div>
                <div className="flex-1 truncate font-medium text-slate-700 text-right">{links.find(l => l._id === editingLink._id)?.targetDocument?.title}</div>
              </div>
            </div>

            <input
              type="text"
              value={relationText}
              onChange={(e) => setRelationText(e.target.value)}
              placeholder="e.g., 'references', 'depends on', 'supersedes'"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all text-slate-700 placeholder-slate-400"
              maxLength={100}
              autoFocus
            />

            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={() => handleDeleteLink(editingLink._id)}
                className="px-4 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
              >
                Delete Link
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingLink(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRelationText}
                  className="px-5 py-2 text-sm bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-lg hover:from-amber-500 hover:to-amber-600 transition-all font-semibold shadow-md shadow-amber-200"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend - Modern Style */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Guide</h3>
        <div className="flex flex-wrap gap-5 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full flex items-center justify-center shadow">
              <Plus className="h-2.5 w-2.5 text-white" />
            </div>
            <span>Drag from + to connect</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full shadow" />
            <span>Click yellow to add text</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-md text-[8px] text-white font-bold flex items-center justify-center shadow">A1</div>
            <span>Links to (colored)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-blue-500 rounded-md text-[8px] text-white font-bold flex items-center justify-center shadow">B2</div>
            <span>Linked from (blue)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-500">#XXX</div>
            <span>Document hash ID</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CollectionDetailPage;
