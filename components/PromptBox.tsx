// components/PromptBox.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

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
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
      if (!socketRef.current) {
        const socket = io(undefined, { path: "/api/socket" });
        socketRef.current = socket;
    
        socket.on("connect", () => {
          console.log("🟢 Socket connected:", socket.id);
        });
    
        socket.on("completion", (text: string) => {
          console.log("🟡 응답 수신:", text);
          onChangePrompt2(text);
        });
    
        return () => {
          socket.disconnect();
        };
      }
    }, []);

  const handleSend = () => {
    if (socketRef.current) {
        socketRef.current.emit("initialPrompt", prompt1); 
      onChangePrompt2("🔄 응답 생성 중..."); // 로딩 텍스트
    }
  };

  return (
    <div style={{ display: "flex", width: "100%", gap: 8, marginBottom: 20 }}>
      <div style={{ width: "50%" }}>
        <textarea
          value={prompt1}
          onChange={(e) => onChangePrompt1(e.target.value)}
          placeholder="프롬프트 입력"
          style={{
            width: "100%",
            height: "25vh",
            resize: "none",
            padding: 12,
            fontSize: 16,
            boxSizing: "border-box",
          }}
        />
        <button onClick={handleSend} style={{ marginTop: 8 }}>
          전송 ▶
        </button>
      </div>
      <textarea
        value={prompt2}
        readOnly
        placeholder="응답 출력"
        style={{
          width: "50%",
          height: "25vh",
          resize: "none",
          padding: 12,
          fontSize: 16,
          boxSizing: "border-box",
        }}
      />
    </div>
  );
};

export default PromptBox;
