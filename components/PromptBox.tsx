"use client";

import React, { useState, useEffect } from "react";
import socket from "@/utils/socket";
import { downloadJSON } from "@/utils/downloadJSON";

interface PromptBoxProps {
  prompt1: string;
  prompt2: string;
  onChangePrompt1: (text: string) => void;
  onChangePrompt2: (text: string) => void;
}

const PromptBox: React.FC<PromptBoxProps> = ({
  prompt1,
  prompt2,
  onChangePrompt1,
  onChangePrompt2,
}) => {
  useEffect(() => {
    const handleConnect = () => {
      console.log("🟢 Socket connected:", socket.id);
    };

    const handleCompletion = (text: string) => {
      console.log("🟡 응답 수신:", text);
      onChangePrompt2(text);
      downloadJSON(
        text,
        `touchpoints_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`
      );
    };

    socket.on("connect", handleConnect);
    socket.on("completion", handleCompletion);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("completion", handleCompletion);
    };
  }, [onChangePrompt2]);

  const handleSend = () => {
    socket.emit("initialPrompt", prompt1);
    onChangePrompt2("🔄 응답 생성 중...");
  };

  return (
    <div className="prompt-container">
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

      {/* 🔁 JSON 출력 영역 → 테이블로 대체 */}
      <div className="half-width" style={{ marginTop: "16px" }}>
        <TableEditor prompt2={prompt2} onChangePrompt2={onChangePrompt2} />
      </div>
    </div>
  );
};

interface TableEditorProps {
  prompt2: string;
  onChangePrompt2: (text: string) => void;
}

const TableEditor: React.FC<TableEditorProps> = ({ prompt2, onChangePrompt2 }) => {
  const [data, setData] = useState<any[]>([]);
  const [userIds, setUserIds] = useState<string[]>([]);

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
                  <td key={userId} style={{ textAlign: "center", border: "1px solid #ccc" }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => toggleUserForRow(rowIndex, userId, e.target.checked)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PromptBox;
