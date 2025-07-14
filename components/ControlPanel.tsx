"use client";

import React from "react";

interface ControlPanelProps {
    onAddRow: () => void;
    onDownload: () => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    onAddRow,
    onDownload,
    onFileUpload,
}) => (
    <div className="control-panel">
        <button onClick={onDownload} className="dark-button">
            <span className="material-symbols-outlined">download</span>
        </button>

        <label className="dark-button" style={{ cursor: "pointer" }}>
            <span className="material-symbols-outlined">upload</span>
            <input
                type="file"
                accept="application/json"
                onChange={onFileUpload}
                className="hidden-input"
            />
        </label>
    </div>
);


export default ControlPanel;
