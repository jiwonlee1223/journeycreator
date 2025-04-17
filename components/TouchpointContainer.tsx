// components/TouchpointContainer.tsx
"use client";

import React from "react";

interface TouchpointContainerProps {
  onAddRow: () => void;
  rows: number;
  cellSize: number;
  rowTexts: string[];
  onRowTextChange: (index: number, value: string) => void;
}

const TouchpointContainer: React.FC<TouchpointContainerProps> = ({
  onAddRow,
  rows,
  cellSize,
  rowTexts,
  onRowTextChange,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        marginRight: 4,
      }}
    >
      {/* 세로 스택된 텍스트박스들 */}
      {rowTexts.map((text, i) => (
        <input
          key={i}
          value={text}
          onChange={(e) => onRowTextChange(i, e.target.value)}
          placeholder={`Context ${i + 1}`}
          style={{
            width: cellSize * 4,
            height: cellSize,
            marginBottom: 0,
            marginTop: 0,
            boxSizing: "border-box",
            padding: 4,
          }}
        />
      ))}

      {/* + 버튼: 항상 맨 아래 */}
      <button
        onClick={onAddRow}
        style={{
          width: cellSize*4,
          height: cellSize,
          border: "1px solid #ccc",
          background: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 4,
        }}
      >
        <span className="material-symbols-outlined">add_row_below</span>
      </button>
    </div>
  );
};

export default TouchpointContainer;
