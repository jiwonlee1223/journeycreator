"use client";

import React, { useState, useEffect } from "react";
import socket from "@/utils/socket"; // Socket.IO 클라이언트
import StructuredScenarioEditor from "./StructuredScenarioEditor"; // ✅ 추가

// PromptBox 컴포넌트에 전달되는 props 타입 정의
interface PromptBoxProps {
    prompt1: string;
    prompt2: string;
    onChangePrompt1: (text: string) => void;
    onChangePrompt2: (text: string) => void;
    onImportJson: (json: string) => void; // ✅ GridGraph로 JSON 전달
}

// PromptBox 컴포넌트 정의
const PromptBox: React.FC<PromptBoxProps> = ({
    prompt1,
    prompt2,
    onChangePrompt1,
    onChangePrompt2,
    onImportJson,
}) => {

    const [structuredData, setStructuredData] = useState<any | null>(null); // ✅ 새 구조용 상태

    // 소켓 연결 및 응답 처리
    useEffect(() => {
        const handleConnect = () => {
            console.log("🟢 Socket connected:", socket.id);
        };

        const handleCompletion = (text: string) => {
            console.log("🟡 응답 수신:", text);
            onChangePrompt2(text); // 텍스트 영역 반영
            onImportJson(text);    // ✅ GridGraph로 즉시 시각화 전달
        };

        socket.on("connect", handleConnect);
        socket.on("completion", handleCompletion);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("completion", handleCompletion);
        };
    }, [onChangePrompt2, onImportJson]); // ✅ 의존성 누락 주의!

    const handleSend = () => {
        socket.emit("initialPrompt", prompt1);
        onChangePrompt2("🔄 응답 생성 중...");
    };

    return (
        <div className="prompt-container">
            {/* 프롬프트 입력 영역 */}
            <div className="half-width">
                <div className="prompt-textarea-wrapper">
                    <textarea
                        value={prompt1}
                        onChange={(e) => onChangePrompt1(e.target.value)}
                        placeholder="프롬프트 입력"
                        className="prompt-textarea"
                    />
                    <button onClick={handleSend} className="send-button">
                        <span className="material-symbols-outlined">play_arrow</span>
                    </button>
                </div>
            </div>

            {/* JSON 결과 → 수정 가능한 테이블로 표시 */}
            <div className="half-width" style={{ marginTop: "16px" }}>
                <TableEditor
                    prompt2={prompt2}
                    onChangePrompt2={onChangePrompt2}
                    onImportJson={onImportJson} // ✅ 저장 → 맵 반영 연결
                />
            </div>
        </div>
    );
};

// TableEditor 컴포넌트 prop 타입 정의
interface TableEditorProps {
    prompt2: string;
    onChangePrompt2: (text: string) => void;
    onImportJson: (json: string) => void;
}

// TableEditor: 체크박스 기반 테이블 편집기
const TableEditor: React.FC<TableEditorProps> = ({
    prompt2,
    onChangePrompt2,
    onImportJson,
}) => {
    const [data, setData] = useState<any[]>([]);
    const [userIds, setUserIds] = useState<string[]>([]);

    // JSON이 들어오면 파싱 → 상태 초기화
    useEffect(() => {
        if (!prompt2 || prompt2.trim() === "" || !prompt2.trim().startsWith("[")) {
            console.warn("🚫 유효하지 않은 JSON 입력:", prompt2);
            setData([]);
            setUserIds([]);
            return;
        }

        try {
            const parsed = JSON.parse(prompt2);
            setData(parsed);

            // 모든 참여자(nodeId) 수집
            const users = new Set<string>();
            parsed.forEach((item: any) => {
                item["nodes info"].forEach((node: any) => users.add(node.nodeId));
            });
            setUserIds(Array.from(users).sort());
        } catch (err) {
            console.error("❌ JSON 파싱 에러:", err);
            setData([]);
            setUserIds([]);
        }
    }, [prompt2]);

    // 체크박스 상태 토글
    const toggleUserForRow = (rowIndex: number, userId: string, checked: boolean) => {
        const updated = [...data];
        const nodeList = updated[rowIndex]["nodes info"];
        const hasUser = nodeList.some((n: any) => n.nodeId === userId);

        if (checked && !hasUser) {
            nodeList.push({
                nodeId: userId,
                row: rowIndex,
                col: 0,
                nodeSubId: nodeList.length,
            });
        } else if (!checked && hasUser) {
            updated[rowIndex]["nodes info"] = nodeList.filter((n: any) => n.nodeId !== userId);
        }

        setData(updated);
        onChangePrompt2(JSON.stringify(updated, null, 2));
    };

    // 터치포인트 텍스트 수정
    const updateTouchpointText = (rowIndex: number, newText: string) => {
        const updated = [...data];
        updated[rowIndex].touchpoints = newText;
        setData(updated);
        onChangePrompt2(JSON.stringify(updated, null, 2));
    };

    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                    <tr>
                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Touchpoints</th>
                        {userIds.map((userId) => (
                            <th key={userId} style={{ border: "1px solid #ccc", padding: "8px" }}>
                                User {userId}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                                <input
                                    type="text"
                                    value={row.touchpoints}
                                    onChange={(e) => updateTouchpointText(rowIndex, e.target.value)}
                                    style={{ width: "100%" }}
                                />
                            </td>
                            {userIds.map((userId) => {
                                const isChecked = row["nodes info"].some((n: any) => n.nodeId === userId);
                                return (
                                    <td
                                        key={userId}
                                        style={{ textAlign: "center", border: "1px solid #ccc" }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) =>
                                                toggleUserForRow(rowIndex, userId, e.target.checked)
                                            }
                                        />
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* ✅ 저장 → GridGraph에 업로드 */}
            <div className="send-button-phase2-wrapper">
                <button
                    onClick={() => onImportJson(JSON.stringify(data, null, 2))}
                    className="send-button-phase2"
                >
                    <span className="material-symbols-outlined">play_arrow</span>
                </button>
            </div>
        </div>
    );
};

export default PromptBox;
