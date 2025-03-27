"use client";

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import styles from './GridGraph.styles';

const CELL_SIZE = 50;

function hexToRgba(hex: string, alpha: number = 0.3): string {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type HoverCellData = {
  row: number;
  col: number;
  colorIndex: number;
};

type NodeData = {
  row: number;
  col: number;
  color: string;
  id: number;
  subId: number;
};

const colorOptions = ['#7BFF00', '#FFFF61', '#FF18C8', '#972AFF', '#1BEAFF'];

const GridGraph = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [rows, setRows] = useState(1);
  const [cols] = useState(50);
  const [placedNodes, setPlacedNodes] = useState<NodeData[]>([]);
  const [hoveredCell, setHoveredCell] = useState<HoverCellData | null>(null);
  const [animationQueue, setAnimationQueue] = useState<NodeData[] | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    row: number;
    col: number;
    targetNode?: NodeData;
  } | null>(null);
  const dragNode = useRef<NodeData | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const newSocket = io(undefined, { path: '/api/socket' });
    setSocket(newSocket);
    newSocket.on('connect', () => {
      console.log('Socket connected, id:', newSocket.id);
    });
    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleAddUser = (row: number, col: number) => {
    if (!placedNodes.some((node) => node.row === row && node.col === col)) {
      const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      const newId = Date.now();
      const newNode: NodeData = {
        row,
        col,
        color: randomColor,
        id: newId,
        subId: 0,
      };
      setPlacedNodes([...placedNodes, newNode]);
      if (socket) {
        socket.emit('nodePlaced', newNode);
      }
    }
  };

  const handleAddNextNode = (origin: NodeData) => {
    const right = { row: origin.row, col: origin.col + 1 };
    const maxSubId = Math.max(
      0,
      ...placedNodes.filter((n) => n.id === origin.id).map((n) => n.subId)
    );
    const newNode: NodeData = {
      row: right.row,
      col: right.col,
      color: origin.color,
      id: origin.id,
      subId: maxSubId + 1,
    };
    setPlacedNodes([...placedNodes, newNode]);
    if (socket) {
      socket.emit('nodePlaced', newNode);
    }
  };

  const handleDragStart = (node: NodeData) => {
    dragNode.current = node;
  };

  const handleDrop = (row: number, col: number) => {
    if (!dragNode.current) return;
  
    const updatedNodes = placedNodes.map((node) => {
      if (
        node.row === dragNode.current!.row &&
        node.col === dragNode.current!.col &&
        node.id === dragNode.current!.id &&
        node.subId === dragNode.current!.subId
      ) {
        return { ...node, row, col }; // ✅ 위치만 변경, subId 그대로 유지
      }
      return node;
    });
  
    setPlacedNodes(updatedNodes); // 🧠 subId 순서 유지!
    dragNode.current = null;
  };
  

  const getCellCenter = (row: number, col: number) => {
    return { x: col * CELL_SIZE + CELL_SIZE / 2, y: row * CELL_SIZE + CELL_SIZE / 2 };
  };

  const groupedNodes = placedNodes.reduce((acc, node) => {
    if (!node || typeof node.id !== 'number') return acc;
    (acc[node.id] = acc[node.id] || []).push(node);
    return acc;
  }, {} as { [key: number]: NodeData[] });

  const addRow = () => {
    setRows(prev => prev + 1);
  };

  const downloadJson = () => {
    const json = JSON.stringify(placedNodes, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'graph-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const playNodesWithAnimation = (nodes: NodeData[]) => {
    setPlacedNodes([]);
    const maxRow = nodes.reduce((max, node) => Math.max(max, node.row), 0);
    setRows(maxRow + 1);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= nodes.length) {
        clearInterval(interval);
        return;
      }
      const next = nodes[i];
      if (next && typeof next.id === 'number') {
        setPlacedNodes(prev => [...prev, next]);
      }
      i++;
    }, 300);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (node: any) =>
              node &&
              typeof node.id === 'number' &&
              typeof node.row === 'number' &&
              typeof node.col === 'number' &&
              typeof node.color === 'string'
          );
          setAnimationQueue(cleaned);
          playNodesWithAnimation(cleaned);
        }
      } catch (err) {
        console.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const handlePlayClick = () => {
    if (animationQueue) {
      playNodesWithAnimation(animationQueue);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <button onClick={addRow}>+ 행 추가</button>
        <button onClick={downloadJson} style={styles.buttonMargin}>💾 저장</button>
        <input type="file" accept="application/json" onChange={handleFileUpload} style={styles.buttonMargin} />
        <button onClick={handlePlayClick} style={styles.buttonMargin}>▶️ 재생</button>
      </div>

      <div className="grid-container" style={styles.gridContainer(cols, rows)}>
        <div className="grid" style={styles.grid(cols, rows)}>
          {Array.from({ length: rows }).map((_, row) =>
            Array.from({ length: cols }).map((_, col) => {
              const node = placedNodes.find((node) => node.row === row && node.col === col);
              let cellStyle: React.CSSProperties = {};
              if (hoveredCell && hoveredCell.row === row && hoveredCell.col === col && !node) {
                cellStyle.backgroundColor = hexToRgba(colorOptions[hoveredCell.colorIndex], 0.3);
              }
              return (
                <div
                  key={`${row}-${col}`}
                  className="grid-cell"
                  style={cellStyle}
                  onMouseEnter={() => setHoveredCell({ row, col, colorIndex: 0 })}
                  onMouseLeave={() => setHoveredCell(null)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      visible: true,
                      x: e.clientX,
                      y: e.clientY,
                      row,
                      col,
                      targetNode: node,
                    });
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(row, col)}
                >
                  {node && (
                    <div
                      className="node-fixed"
                      style={styles.nodeFixed(node.color)}
                      draggable
                      onDragStart={() => handleDragStart(node)}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        <svg className="svg-overlay">
          {Object.keys(groupedNodes).map((groupKey) => {
            const group = groupedNodes[Number(groupKey)];
            if (group.length < 2) return null;
            const points = group
              .map((node) => {
                const { x, y } = getCellCenter(node.row, node.col);
                return `${x},${y}`;
              })
              .join(' ');

            return (
              <polyline
                key={`${groupKey}-${group.length}`}
                points={points}
                fill="none"
                stroke={group[0].color}
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>

      {contextMenu?.visible && (
        <ul style={styles.contextMenu(contextMenu.x, contextMenu.y)} onClick={() => setContextMenu(null)}>
          {!contextMenu.targetNode ? (
            <li style={styles.contextMenuItem} onClick={() => {
              handleAddUser(contextMenu.row, contextMenu.col);
              setContextMenu(null);
            }}>➕ Add user</li>
          ) : (
            <li style={styles.contextMenuItem} onClick={() => {
              handleAddNextNode(contextMenu.targetNode!);
              setContextMenu(null);
            }}>➕ Add next node</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default GridGraph;