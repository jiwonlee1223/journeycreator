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
    <div className="touchpoint-container">
      {rowTexts.map((text, i) => (
        <input
          key={i}
          value={text}
          onChange={(e) => onRowTextChange(i, e.target.value)}
          placeholder={`Context ${i + 1}`}
          className="touchpoint-input"
          style={{
            width: cellSize * 4,
            height: cellSize,
          }}
        />
      ))}

      <button
        onClick={onAddRow}
        className="touchpoint-button"
        style={{
          width: cellSize * 4,
          height: cellSize,
        }}
      >
        <span className="material-symbols-outlined">add_row_below</span>
      </button>
    </div>
  );
};

export default TouchpointContainer;
