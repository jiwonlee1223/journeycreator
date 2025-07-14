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
import PromptOverlay from "./PromptOverlay";
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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [rows, setRows] = useState(1);
  const [rowTexts, setRowTexts] = useState<string[]>([""]);
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
  const [nextGroupId, setNextGroupId] = useState(1);

  const [prompt1, setPrompt1] = useState("");
  const [prompt2, setPrompt2] = useState("");

  // ✅ 추가된 상태 (PromptOverlay에 전달)
  const [structuredData, setStructuredData] = useState<any | null>(null);
  const [storyboardImages, setStoryboardImages] = useState<string[]>([]);

  function generateSmoothPath(points: { x: number; y: number }[]): string {
    if (points.length < 2) return "";

    const d = [`M ${points[0].x},${points[0].y}`];

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const controlPoint1 = {
        x: p1.x + (p2.x - p0.x) / 6,
        y: p1.y + (p2.y - p0.y) / 6,
      };
      const controlPoint2 = {
        x: p2.x - (p3.x - p1.x) / 6,
        y: p2.y - (p3.y - p1.y) / 6,
      };

      d.push(`C ${controlPoint1.x},${controlPoint1.y} ${controlPoint2.x},${controlPoint2.y} ${p2.x},${p2.y}`);
    }

    return d.join(" ");
  }

  function normalizeRowsByTouchpointIndex(json: any[]): any[] {
    return json.map((item, index) => {
      const updatedNodes = item["nodes info"].map((node: any) => ({
        ...node,
        row: index // ✅ 터치포인트 index를 row로 설정
      }));
      return {
        ...item,
        "nodes info": updatedNodes
      };
    });
  }

  const importFromPromptJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        console.error("Invalid JSON structure");
        if (typeof window !== "undefined") {
          alert("Invalid JSON structure. Expected an array of touchpoints.");
        }
        return;
      }
      const normalized = normalizeRowsByTouchpointIndex(parsed); // ✅ row 정규화

      const newRowTexts: string[] = normalized.map((item) => item.touchpoints ?? []);
      const nodeIdToColor: Record<string, string> = {};
      const colorOptions = ['#7BFF00', '#FFFF61', '#FF18C8', '#972AFF', '#1BEAFF', '#FF572E', '#3CFF99', '#FFD500', '#FF6AFF', '#14FFC9', '#FF0055', '#6E35FF', '#00FF8B', '#FF9A00', '#00C2FF', '#FF3D88', '#BAFF29', '#5800FF', '#FF375E', '#43FFD5'];

      const newPlacedNodes: NodeData[] = normalized.flatMap((item) =>
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
            color: nodeIdToColor[nodeId],
          };
        })
      );

      setRowTexts(newRowTexts);
      setRows(newRowTexts.length);
      playNodesWithAnimation(newPlacedNodes);
    } catch (err) {
      console.error("❌ PromptBox → GridGraph JSON 파싱 에러:", err);
    }
  };

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

  const getNodeCenter = (node: NodeData, placedNodes: NodeData[]): { x: number; y: number } => {
    const baseX = node.col * CELL_SIZE + CELL_SIZE / 2;
    const baseY = node.row * CELL_SIZE + CELL_SIZE / 2;

    // 셀 안에서 이 노드의 offsetIndex를 계산
    const siblings = placedNodes.filter(n => n.row === node.row && n.col === node.col);
    const offsetIndex = siblings.findIndex(n =>
      n.id === node.id && n.subId === node.subId
    );

    const offset = 4 * offsetIndex;

    return {
      x: baseX + offset,  // → 오른쪽으로 이동
      y: baseY - offset,  // ↑ 위로 이동
    };
  };

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
        const normalized = normalizeRowsByTouchpointIndex(parsed); // ✅ row 정규화

        if (Array.isArray(parsed)) {
          // ✅ row 값을 터치포인트 인덱스로 덮어쓰기
          const normalized = parsed.map((item, index) => {
            const updatedNodes = item["nodes info"].map((node: any) => ({
              ...node,
              row: index
            }));
            return {
              ...item,
              "nodes info": updatedNodes
            };
          });

          const newRowTexts: string[] = normalized.map((item) => item.touchpoints ?? []);
          const nodeIdToColor: Record<string, string> = {};
          const colorOptions = ['#7BFF00', '#FFFF61', '#FF18C8', '#972AFF', '#1BEAFF', '#FF572E', '#3CFF99', '#FFD500', '#FF6AFF', '#14FFC9', '#FF0055', '#6E35FF', '#00FF8B', '#FF9A00', '#00C2FF', '#FF3D88', '#BAFF29', '#5800FF', '#FF375E', '#43FFD5'];

          const newPlacedNodes: NodeData[] = normalized.flatMap((item) =>
            item["nodes info"].map((node: any) => {
              const nodeId = node.nodeId;
              if (!nodeIdToColor[nodeId]) {
                nodeIdToColor[nodeId] = colorOptions[Math.floor(Math.random() * colorOptions.length)];
              }

              return {
                row: node.row, // 이미 위에서 정규화됨
                col: node.col,
                id: nodeId,
                subId: node.nodeSubId,
                color: nodeIdToColor[nodeId],
              };
            })
          );

          setRowTexts(newRowTexts);
          setRows(newRowTexts.length); // ✅ now guaranteed to match
          playNodesWithAnimation(newPlacedNodes);
        }
      } catch (err) {
        console.error("❌ Invalid JSON file", err);
      }
    };

    reader.readAsText(file);
  };


  const handleMapSend = () => {
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
        touchpoints: text,
        "nodes info": nodes,
      };
    });

    const mapJson = structured;
    console.log("📤 [Map] ▶ 전송:", mapJson);
    if (socket) socket.emit("updateFromMap", mapJson);
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
      <PromptOverlay
        prompt1={prompt1}
        prompt2={prompt2}
        onChangePrompt1={setPrompt1}
        onChangePrompt2={setPrompt2}
        onImportJson={importFromPromptJson}
        structuredData={structuredData}
        storyboardImages={storyboardImages}
      />


      <ControlPanel
        onDownload={downloadJson}
        onFileUpload={handleFileUpload}
        onAddRow={addRow}
      />


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
                const cellNodes = placedNodes.filter(n => n.row === row && n.col === col); // ✅ 여러 노드 가져오기
                let cellStyle: React.CSSProperties = {};

                if (hoveredCell?.row === row && hoveredCell?.col === col && cellNodes.length === 0) {
                  cellStyle.backgroundColor = "var(--color-grid-hover)"; // ✅ 원하는 색상 변수 적용
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
                      setContextMenu({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        row,
                        col,
                        targetNode: cellNodes[0], // 첫 번째 노드를 컨텍스트 메뉴 타겟으로
                      });
                    }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDrop(row, col)}
                  >
                    {cellNodes.map((node, index) => (
                      <div
                        key={`${node.id}-${node.subId}`}
                        className="node-fixed"
                        style={nodeFixedStyle(node.color, index)} // ✅ offset index 전달
                        draggable
                        onDragStart={() => handleDragStart(node)}
                      />
                    ))}
                  </div>
                );
              })
            )}
          </div>

          <div style={{ marginTop: "12px", textAlign: "center" }}>
            <button onClick={handleMapSend} className="send-button">▶</button>
          </div>

          {/* 노드 그룹 선 연결용 SVG 오버레이 */}
          <svg className="svg-overlay">
            {Object.keys(groupedNodes).map((key) => {
              const group = groupedNodes[key];
              if (group.length < 2) return null;

              const sorted = [...group].sort((a, b) => a.subId - b.subId);

              const points = sorted.map((node) => getNodeCenter(node, placedNodes));
              const d = generateSmoothPath(points);

              return (
                <path
                  key={key}
                  d={d}
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
