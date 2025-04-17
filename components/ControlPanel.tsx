// components/ControlPanel.tsx
"use client";

import React from "react";
import styles from "./GridGraph.styles"; // 필요하다면 별도 스타일 파일로 분리해도 좋습니다.

interface ControlPanelProps {
    onAddRow: () => void;
    onDownload: () => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPlay: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    onAddRow,
    onDownload,
    onFileUpload,
    onPlay,
}) => (
    <div style={{ marginBottom: 10 }}>

        <button onClick={onDownload}>
            <span className="material-symbols-outlined">
                download
            </span>
        </button>
        <input
            type="file"
            accept="application/json"
            onChange={onFileUpload}
            style={styles.buttonMargin}
        />
        <button onClick={onPlay} style={styles.buttonMargin}>
            <span className="material-symbols-outlined">
                play_arrow
            </span>
        </button>
    </div>
);

export default ControlPanel;
