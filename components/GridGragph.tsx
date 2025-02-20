"use client";
import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const CELL_SIZE = 50; // 셀 크기 (px)

// 헥스 색상을 rgba 형식으로 변환하는 헬퍼 함수
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

// 마우스 오버 셀 데이터 타입
type HoverCellData = {
  row: number;
  col: number;
  colorIndex: number;
};

// 고정된 노드 데이터 타입
type NodeData = {
  row: number;
  col: number;
  color: string;
  id: number; // 같은 색상이면 같은 id (colorOptions의 인덱스 + 1)
};

interface GridGraphProps {
  rows?: number;
  cols?: number;
}

const colorOptions = ['#7BFF00', '#FFFF61', '#FF18C8', '#972AFF', '#1BEAFF'];

const GridGraph: React.FC<GridGraphProps> = ({ rows = 10, cols = 10 }) => {
  const [placedNodes, setPlacedNodes] = useState<NodeData[]>([]);
  const [hoveredCell, setHoveredCell] = useState<HoverCellData | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Socket.IO 연결 초기화
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

  // 셀 클릭 시, 노드 추가 및 서버에 전송
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
      // Socket.IO를 통해 서버에 노드 데이터 전송 (노드의 id 포함)
      if (socket) {
        socket.emit('nodePlaced', newNode);
      }
    }
  };

  // 셀 중앙 좌표 (SVG 선 연결에 사용)
  const getCellCenter = (row: number, col: number) => {
    return { x: col * CELL_SIZE + CELL_SIZE / 2, y: row * CELL_SIZE + CELL_SIZE / 2 };
  };

  // 같은 id (같은 색상)의 노드들을 그룹화
  const groupedNodes = placedNodes.reduce((acc, node) => {
    (acc[node.id] = acc[node.id] || []).push(node);
    return acc;
  }, {} as { [key: number]: NodeData[] });

  return (
    <div
      className="grid-container"
      style={{ width: cols * CELL_SIZE, height: rows * CELL_SIZE }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`,
        }}
      >
        {Array.from({ length: rows }).map((_, row) =>
          Array.from({ length: cols }).map((_, col) => {
            const isNodePlaced = placedNodes.some((node) => node.row === row && node.col === col);
            // 셀 전체의 배경색을 마우스 오버 시 지정된 색상(투명 30%)으로 변경
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
                  //e.preventDefault();
                  if (hoveredCell && hoveredCell.row === row && hoveredCell.col === col) {
                    const delta = e.deltaY > 0 ? 1 : -1;
                    setHoveredCell({
                      ...hoveredCell,
                      colorIndex:
                        (hoveredCell.colorIndex + delta + colorOptions.length) %
                        colorOptions.length,
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
      {/* SVG 오버레이: 같은 그룹(같은 색상의 노드들)끼리 연결하는 선 */}
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
              key={groupKey}
              points={points}
              fill="none"
              stroke={group[0].color}
              strokeWidth="2"
            />
          );
        })}
      </svg>
    </div>
  );
};

export default GridGraph;
