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
            onImportJson(text); // ✅ 그래프에 바로 반영
        };

        socket.on("connect", handleConnect);
        socket.on("completion", handleCompletion);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("completion", handleCompletion);
        };
    }, [onChangePrompt2, onImportJson]); // ✅ 의존성 누락 주의!

    const handleSend = () => {
        socket.emit("initialPrompt", prompt1);         // 1차 OpenAI 호출
        convertToStructuredFormat(prompt1);            // 2차 구조화 변환 호출
    };

    // ✨ 두 번째 OpenAI API 호출
    const convertToStructuredFormat = async (originalJson: string) => {
        try {
            const res = await fetch("/api/convert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ json: originalJson }),
            });

            const result = await res.json();
            if (
                result &&
                result.context &&
                result.artifact &&
                result.userExperience
            ) {
                setStructuredData(result);
            } else {
                console.warn("🚫 구조화 변환 실패: 예상된 필드 없음", result);
            }
        } catch (err) {
            console.error("❌ 구조화 변환 에러:", err);
        }
    };

    return (
        <div className="prompt-container">
            {/* 프롬프트 입력 영역 */}
            <div className="third-width">
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

            {/* 구조화 데이터 편집기 */}
            <div className="third-width empty-box">
                {structuredData ? (
                    <StructuredScenarioEditor
                        data={structuredData}
                        onChange={(newData) => setStructuredData(newData)}
                    />
                ) : (
                    <p className="subtle-note">
                        시나리오를 입력하고, ▶︎ 버튼을 눌러 key elements를 출력하세요.
                    </p>
                )}
            </div>

            {/* 🔁 여기 추가할 3번째 박스 */}
            <div className="third-width empty-box">
                <div>
                    <p className="subtle-note">
스토리보드 이미지
                    </p>

                </div>
            </div>
        </div>
    );

};

export default PromptBox;
