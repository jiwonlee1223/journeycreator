"use client";

import { useState, useEffect } from "react";
import socket from "@/utils/socket";
import { Rnd } from "react-rnd";

interface PersonaPromptBoxProps {
    node: {
        id: string;
        subId: number;
        row: number;
        col: number;
        color: string;
    };
    onGeneratePrompt: (node: PersonaPromptBoxProps["node"], mapData: any[]) => void;
    onClose?: () => void;
    flourished?: any;
}


function getPromptBoxPosition(node: { row: number; col: number }) {
    const CELL_SIZE = 50;
    const GAP = 200; // 노드와 박스 사이 간격

    return {
        x: (node.col + 1) * CELL_SIZE + GAP, // 오른쪽 셀 + 간격
        y: node.row * CELL_SIZE - 10,
    };
}

const PersonaPromptBox: React.FC<PersonaPromptBoxProps> = ({
    node,
    onGeneratePrompt,
    onClose,
    flourished: initialFlourished,
}) => {
    const [prompt, setPrompt] = useState("");
    const [flourished, setFlourished] = useState<any>(initialFlourished ?? null);
    const [mapData, setMapData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    useEffect(() => {
        if (initialFlourished) {
            setFlourished(initialFlourished);
        }
    }, [initialFlourished]);

    useEffect(() => {
        const handleFlourished = (data: any) => {
            setFlourished(data);
            setIsLoading(false);
        };

        const handleMapData = (serverMapData: any[]) => {
            // 🧩 initial node 기준 정보
            const baseRow = node.row;
            const baseCol = node.col;
            const nodeId = node.id;
            const color = node.color;

            // 🛠️ Generate the persona node + 이후 mapData 노드 연결
            const allNodes = serverMapData.flatMap((step, i) => {
                return step["nodes info"].map((n: any) => ({
                    row: baseRow,
                    col: baseCol + i,
                    id: nodeId,
                    subId: n.nodeSubId,
                    color,
                }));
            });

            console.log("✅ Parsed & aligned mapData:", allNodes);
            onGeneratePrompt(node, serverMapData);
        };


        socket.on("personaFlourished", handleFlourished);
        socket.on("mapDataGenerated", handleMapData);

        return () => {
            socket.off("personaFlourished", handleFlourished);
            socket.off("mapDataGenerated", handleMapData);
        };
    }, []);

    const handleAnalyze = () => {
        if (prompt.trim() !== "") {
            setIsLoading(true);
            socket.emit("flourishPersona", prompt);
        }
    };

    const handleGenerateMap = () => {
        if (flourished?.profileJson) {
            socket.emit("generateMapData", {
                profileJson: flourished.profileJson,
                nodeId: node.id,
            });
        }
    };
    const position = getPromptBoxPosition(node);

    return (
        <Rnd
            key={`${node.row}-${node.col}`}
            position={position}
            enableResizing={false}
            bounds="window"
            className="persona-box"
        >
            <div className="persona-box-header">
                <div className="persona-box-title">Persona (ID: {node.id})</div>
                <button onClick={onClose} className="close-button" aria-label="Close">×</button>
            </div>

            {!flourished && (
                <>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="이 페르소나에 대해 간략히 설명해주세요"
                        rows={5}
                        className="persona-textarea"
                    />
                    <div className="persona-buttons">
                        <button onClick={handleAnalyze} disabled={isLoading} className="generate-button">
                            <div className="button-inner">
                                {isLoading && <span className="spinner" />}
                                <span className="loading-text">{isLoading ? "Generating..." : "Generate the persona"}</span>
                            </div>
                        </button>
                    </div>
                </>
            )}

            {flourished && (
                <>
                    <div className="persona-result">
                        {flourished.imageBase64 && (
                            <div className="persona-result-image">
                                <img
                                    src={`data:image/png;base64,${flourished.imageBase64}`}
                                    alt="Persona Portrait"
                                    style={{ width: "100%", borderRadius: "8px" }}
                                />
                            </div>
                        )}
                        <div className="persona-result-text">
                            <h3>
                                {flourished.profileJson.name}, {flourished.profileJson.age}
                            </h3>
                            <p>
                                <strong>Role:</strong> {flourished.profileJson.role}
                            </p>
                            <p>
                                <strong>Location:</strong> {flourished.profileJson.location}
                            </p>

                            <h4>🎯 Goals</h4>
                            <ul>
                                {flourished.profileJson.goals?.map((goal: string, i: number) => (
                                    <li key={i}>{goal}</li>
                                ))}
                            </ul>

                            <h4>❌ Pain Points</h4>
                            <ul>
                                {flourished.profileJson.painPoints?.map((pt: string, i: number) => (
                                    <li key={i}>{pt}</li>
                                ))}
                            </ul>

                            <h4>🧠 Personality</h4>
                            <ul>
                                {flourished.profileJson.personality?.traits?.map((t: string, i: number) => (
                                    <li key={i}>{t}</li>
                                ))}
                            </ul>
                            <p>
                                <strong>Drives:</strong> {flourished.profileJson.personality?.drives}
                            </p>
                            <p>
                                <strong>Strengths:</strong> {flourished.profileJson.personality?.strengths}
                            </p>

                            <h4>🌿 Hobbies</h4>
                            <ul>
                                {flourished.profileJson.hobbies?.map((h: string, i: number) => (
                                    <li key={i}>{h}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="persona-buttons" style={{ marginTop: "12px" }}>
                        <button onClick={handleGenerateMap}>Generate Map</button>
                    </div>

                    {mapData.length > 0 && (
                        <div className="map-preview">
                            <h4>🗺️ Generated Journey Map</h4>
                            <pre style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>
                                {JSON.stringify(mapData, null, 2)}
                            </pre>
                        </div>
                    )}
                </>
            )}
        </Rnd>

    );
};

export default PersonaPromptBox;
