"use client";

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

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
};

const colorOptions = ['#7BFF00', '#FFFF61', '#FF18C8', '#972AFF', '#1BEAFF'];

const GridGraph = () => {
  const [rows, setRows] = useState(1);
  const [cols] = useState(50);
  const [placedNodes, setPlacedNodes] = useState<NodeData[]>([]);
  const [hoveredCell, setHoveredCell] = useState<HoverCellData | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [animationQueue, setAnimationQueue] = useState<NodeData[] | null>(null);

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

  const handleCellClick = (row: number, col: number) => {
    if (!placedNodes.some((node) => node.row === row && node.col === col)) {
      const colorIndex = hoveredCell?.colorIndex ?? 0;
      const newNode: NodeData = {
        row,
        col,
        color: colorOptions[colorIndex],
        id: colorIndex + 1,
      };
      setPlacedNodes([...placedNodes, newNode]);
      if (socket) {
        socket.emit('nodePlaced', newNode);
      }
    }
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
      <style>{`
        @keyframes draw {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>

      <div style={{ marginBottom: 10 }}>
        <button onClick={addRow}>+ 행 추가</button>
        <button onClick={downloadJson} style={{ marginLeft: 10 }}>💾 저장</button>
        <input type="file" accept="application/json" onChange={handleFileUpload} style={{ marginLeft: 10 }} />
        <button onClick={handlePlayClick} style={{ marginLeft: 10 }}>▶️ 재생</button>
      </div>

      <div
        className="grid-container"
        style={{ width: cols * CELL_SIZE, height: rows * CELL_SIZE }}
      >
        <div
          className="grid"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`
          }}
        >
          {Array.from({ length: rows }).map((_, row) =>
            Array.from({ length: cols }).map((_, col) => {
              const isNodePlaced = placedNodes.some((node) => node.row === row && node.col === col);
              let cellStyle: React.CSSProperties = {};
              if (hoveredCell && hoveredCell.row === row && hoveredCell.col === col && !isNodePlaced) {
                cellStyle.backgroundColor = hexToRgba(colorOptions[hoveredCell.colorIndex], 0.3);
              }
              return (
                <div
                  key={`${row}-${col}`}
                  className="grid-cell"
                  style={cellStyle}
                  onMouseEnter={() => setHoveredCell({ row, col, colorIndex: 0 })}
                  onMouseLeave={() => setHoveredCell(null)}
                  onWheel={(e) => {
                    if (hoveredCell && hoveredCell.row === row && hoveredCell.col === col) {
                      const delta = e.deltaY > 0 ? 1 : -1;
                      setHoveredCell({
                        ...hoveredCell,
                        colorIndex: (hoveredCell.colorIndex + delta + colorOptions.length) % colorOptions.length,
                      });
                    }
                  }}
                  onClick={() => handleCellClick(row, col)}
                >
                  {isNodePlaced && (
                    <div
                      className="node-fixed"
                      style={{
                        backgroundColor: placedNodes.find(
                          (node) => node.row === row && node.col === col
                        )?.color,
                      }}
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
                ref={(el) => {
                  if (el) {
                    const length = el.getTotalLength();
                    el.style.strokeDasharray = `${length}`;
                    el.style.strokeDashoffset = `${length}`;
                    el.style.animation = 'draw 0.8s ease forwards';
                  }
                }}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default GridGraph;
