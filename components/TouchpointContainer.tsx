// components/TouchpointContainer.tsx
"use client";

import React from "react";

interface TouchpointContainerProps {
  onAddRow: () => void;
  rows: number;
  cellSize: number;
}

const TouchpointContainer: React.FC<TouchpointContainerProps> = ({ onAddRow, rows, cellSize }) => {
  const top = rows * cellSize;          // 마지막 row의 아래쪽
  const left = -cellSize - 4;           // 왼쪽 바깥으로 이동 (여유 margin 포함)

  return (
    <button
      onClick={onAddRow}
      style={{
        position: "absolute",
        top,
        left,
        width: cellSize,
        height: cellSize,
        padding: 4,
        border: "1px solid #ccc",
        background: "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "top 0.3s ease",
        zIndex: 10,
      }}
    >
      <span className="material-symbols-outlined">add_row_below</span>
    </button>
  );
};

export default TouchpointContainer;
