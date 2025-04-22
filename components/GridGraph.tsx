"use client";

import React, { useState, useEffect, useRef } from 'react'; // React와 훅(useState, useEffect, useRef) 불러오기
import { io, Socket } from 'socket.io-client';             // Socket.IO 클라이언트와 타입(Socket) 불러오기
import {
  gridContainer,
  gridStyle,
  nodeFixedStyle,
  contextMenuStyle,
  contextMenuItemStyle,
} from "@/components/GridGraph.styles";
import ControlPanel from "./ControlPanel"; // 경로는 실제 위치에 맞춰 조정
import TouchpointContainer from "./TouchpointContainer";
import PromptBox from "./PromptBox";

const CELL_SIZE = 50; // 그리드 셀의 크기를 픽셀 단위로 상수화


// HEX 색상값을 RGBA 문자열로 변환해주는 유틸 함수
function hexToRgba(hex: string, alpha: number = 0.3): string {
  hex = hex.replace(/^#/, '');                // 앞의 ‘#’ 제거
  if (hex.length === 3) {                     // 축약형 e.g. ‘#abc’ 처리
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16); // R(적) 값 파싱
  const g = parseInt(hex.substring(2, 4), 16); // G(녹) 값 파싱
  const b = parseInt(hex.substring(4, 6), 16); // B(청) 값 파싱
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;  // 최종 RGBA 문자열 반환
}

// 호버 중인 셀 정보를 담는 타입 정의
type HoverCellData = {
  row: number;
  col: number;
  colorIndex: number;
};

type NodeData = {
  row: number;
  col: number;
  color: string;
  id: string;     // ✅ "001", "002", ...
  subId: number;  // nodeSubId로 저장됨
};


const colorOptions = ['#7BFF00', '#FFFF61', '#FF18C8', '#972AFF', '#1BEAFF']; // 랜덤 색상 옵션

const GridGraph = () => {
  // Socket.IO 소켓 상태 관리
  const [socket, setSocket] = useState<Socket | null>(null);
  // 그리드 행 개수 상태
  const [rows, setRows] = useState(1);
  const [rowTexts, setRowTexts] = useState<string[]>([""]);
  // 그리드 열 개수(고정)
  const [cols] = useState(50);
  // 배치된 노드 목록 상태
  const [placedNodes, setPlacedNodes] = useState<NodeData[]>([]);
  // 호버 중인 셀 정보 상태
  const [hoveredCell, setHoveredCell] = useState<HoverCellData | null>(null);
  // 업로드된 JSON 애니메이션 큐
  const [animationQueue, setAnimationQueue] = useState<NodeData[] | null>(null);
  // 컨텍스트 메뉴 상태
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    row: number;
    col: number;
    targetNode?: NodeData;
  } | null>(null);
  // 드래그 중인 노드 참조용 ref
  const dragNode = useRef<NodeData | null>(null);
  const [nextGroupId, setNextGroupId] = useState(1);

  const [prompt1, setPrompt1] = useState("");
  const [prompt2, setPrompt2] = useState("");


  // 페이지 바깥 클릭 시 컨텍스트 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Socket.IO 초기화 및 연결 관리
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

  // 빈 셀 클릭 시 새로운 노드 추가
  const handleAddUser = (row: number, col: number) => {
    if (!placedNodes.some(node => node.row === row && node.col === col)) {
      const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      const newNodeId = String(nextGroupId).padStart(3, "0");

      const newNode: NodeData = {
        row,
        col,
        color: randomColor,
        id: newNodeId, // ✅ 문자열 nodeId
        subId: 0,
      };

      setPlacedNodes(prev => [...prev, newNode]);
      setNextGroupId(prev => prev + 1);

      if (socket) socket.emit("nodePlaced", newNode);
    }
  };

  const handleAddNextNode = (origin: NodeData) => {
    const maxSubId = Math.max(
      0,
      ...placedNodes.filter((n) => n.id === origin.id).map((n) => n.subId)
    );

    const newNode: NodeData = {
      row: origin.row,
      col: origin.col + 1,
      color: origin.color,
      id: origin.id,              // ✅ 기존 nodeId 유지
      subId: maxSubId + 1,
    };

    setPlacedNodes(prev => [...prev, newNode]);

    if (socket) socket.emit("nodePlaced", newNode);
  };

  const handleDeleteNode = (node: NodeData) => {
    setPlacedNodes((prev) =>
      prev.filter(
        (n) =>
          !(
            n.row === node.row &&
            n.col === node.col &&
            n.id === node.id &&
            n.subId === node.subId
          )
      )
    );
    setContextMenu(null); // 삭제 후 메뉴 닫기
  };
  

  // 드래그 시작 시 해당 노드를 ref에 저장
  const handleDragStart = (node: NodeData) => {
    dragNode.current = node;
  };

  // 드롭된 위치로 노드 이동 (subId 유지)
  const handleDrop = (row: number, col: number) => {
    if (!dragNode.current) return;
    const updated = placedNodes.map(node => {
      if (
        node.row === dragNode.current!.row &&
        node.col === dragNode.current!.col &&
        node.id === dragNode.current!.id &&
        node.subId === dragNode.current!.subId
      ) {
        return { ...node, row, col };
      }
      return node;
    });
    setPlacedNodes(updated);
    dragNode.current = null;
  };

  // 셀 중심 좌표 계산
  const getCellCenter = (row: number, col: number) => ({
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: row * CELL_SIZE + CELL_SIZE / 2,
  });

  // 같은 id 그룹별로 노드 묶기
  const groupedNodes = placedNodes.reduce((acc, node) => {
    if (!node) return acc;
    (acc[node.id] = acc[node.id] || []).push(node);
    return acc;
  }, {} as Record<string, NodeData[]>);

  // 행 추가 버튼 핸들러
  const addRow = () => {
    setRows(prev => prev + 1);
    setRowTexts(prev => [...prev, ""]); // 새 row에 대응하는 빈 텍스트 추가
  };


  // 현재 노드 데이터를 JSON으로 다운로드
  const downloadJson = () => {
    const structured = rowTexts.map((text, rowIndex) => {
      const nodes = placedNodes
        .filter((node) => node.row === rowIndex)
        .map((node) => ({
          nodeId: node.id,
          row: node.row,
          col: node.col,
          nodeSubId: node.subId,
        }));

      return {
        touchpoints: text, // ✅ 여기를 변경
        "nodes info": nodes,
      };
    });

    const json = JSON.stringify(structured, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "graph-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };


  // 애니메이션 큐 재생 함수
  const playNodesWithAnimation = (nodes: NodeData[]) => {
    setPlacedNodes([]);
    const maxRow = nodes.reduce((max, n) => Math.max(max, n.row), 0);
    setRows(maxRow + 1);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= nodes.length) {
        clearInterval(interval);
        return;
      }
      const next = nodes[i];
      if (next) {
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
          const newRowTexts: string[] = parsed.map((item) => item.touchpoints ?? []);

          const nodeIdToColor: Record<string, string> = {};
          const colorOptions = ['#7BFF00', '#FFFF61', '#FF18C8', '#972AFF', '#1BEAFF'];

          const newPlacedNodes: NodeData[] = parsed.flatMap((item) =>
            item["nodes info"].map((node: any) => {
              const nodeId = node.nodeId;
              if (!nodeIdToColor[nodeId]) {
                nodeIdToColor[nodeId] = colorOptions[Math.floor(Math.random() * colorOptions.length)];
              }

              return {
                row: node.row,
                col: node.col,
                id: nodeId,
                subId: node.nodeSubId,
                color: nodeIdToColor[nodeId], // ✅ 랜덤으로 부여
              };
            })
          );

          setRowTexts(newRowTexts);
          setRows(newRowTexts.length);
          playNodesWithAnimation(newPlacedNodes);
        }
      } catch (err) {
        console.error("❌ Invalid JSON file", err);
      }
    };

    reader.readAsText(file);
  };


  // ‘▶ 재생’ 버튼 클릭 시 애니메이션 재생
  const handlePlayClick = () => {
    if (animationQueue) playNodesWithAnimation(animationQueue);
  };

  const handleRowTextChange = (index: number, value: string) => {
    setRowTexts(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };


  // 렌더링 부분: 버튼 그룹과 그리드 + SVG 오버레이 + 컨텍스트 메뉴
  return (

    <div>
      <PromptBox
        prompt1={prompt1}
        prompt2={prompt2}
        onChangePrompt1={setPrompt1}
        onChangePrompt2={setPrompt2}
      />

      <ControlPanel
        onDownload={downloadJson}
        onFileUpload={handleFileUpload}
        onPlay={handlePlayClick} onAddRow={function (): void {
          throw new Error('Function not implemented.');
        }} />

      <div style={{ display: "flex" }}>
        <TouchpointContainer
          onAddRow={addRow}
          rows={rows}
          cellSize={CELL_SIZE}
          rowTexts={rowTexts}
          onRowTextChange={handleRowTextChange}
        />

        {/* 그리드 컨테이너 */}
        <div className="grid-container" style={gridContainer(cols, rows)}>
          <div className="grid" style={gridStyle(cols, rows)}>
            {Array.from({ length: rows }).map((_, row) =>
              Array.from({ length: cols }).map((_, col) => {
                const node = placedNodes.find(n => n.row === row && n.col === col);
                let cellStyle: React.CSSProperties = {};
                // 호버 효과
                if (hoveredCell?.row === row && hoveredCell?.col === col && !node) {
                  cellStyle.backgroundColor = hexToRgba(colorOptions[hoveredCell.colorIndex], 0.3);
                }
                return (
                  <div
                    key={`${row}-${col}`}
                    className="grid-cell"
                    style={cellStyle}
                    onMouseEnter={() => setHoveredCell({ row, col, colorIndex: 0 })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onContextMenu={e => {
                      e.preventDefault();
                      setContextMenu({ visible: true, x: e.clientX, y: e.clientY, row, col, targetNode: node! });
                    }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDrop(row, col)}
                  >
                    {node && (
                      <div
                        className="node-fixed"
                        style={nodeFixedStyle(node.color)}
                        draggable
                        onDragStart={() => handleDragStart(node)}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 노드 그룹 선 연결용 SVG 오버레이 */}
          <svg className="svg-overlay">
            {Object.keys(groupedNodes).map((key) => {
              const group = groupedNodes[key];
              if (group.length < 2) return null;

              // ✅ nodeSubId 기준으로 정렬
              const sorted = [...group].sort((a, b) => a.subId - b.subId);

              const points = sorted.map((n) => {
                const { x, y } = getCellCenter(n.row, n.col);
                return `${x},${y}`;
              }).join(" ");

              return (
                <polyline
                  key={`${key}-${group.length}`}
                  points={points}
                  fill="none"
                  stroke={sorted[0].color}
                  strokeWidth="2"
                />
              );
            })}
          </svg>

        </div>

        {/* 컨텍스트 메뉴 */}
        {contextMenu?.visible && (
  <ul style={contextMenuStyle(contextMenu.x, contextMenu.y)}>
    {!contextMenu.targetNode ? (
      <li
        style={contextMenuItemStyle}
        onClick={() => {
          handleAddUser(contextMenu.row, contextMenu.col);
          setContextMenu(null);
        }}
      >
        ➕ Add user
      </li>
    ) : (
      <>
        <li
          style={contextMenuItemStyle}
          onClick={() => {
            handleAddNextNode(contextMenu.targetNode!);
            setContextMenu(null);
          }}
        >
          ➕ Add next node
        </li>
        <li
          style={contextMenuItemStyle}
          onClick={() => {
            handleDeleteNode(contextMenu.targetNode!);
          }}
        >
          ❌ Delete node
        </li>
      </>
    )}
  </ul>
)}
      </div>
    </div>
  );
};

export default GridGraph; // 컴포넌트 외부 노출
