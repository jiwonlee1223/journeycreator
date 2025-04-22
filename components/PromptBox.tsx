// components/PromptBox.tsx
"use client"; // Next.js의 Client Component임을 명시

import React, { useEffect, useRef } from "react";
import socket from "@/utils/socket"; // 클라이언트에서 사용하는 Socket.IO 인스턴스
import { downloadJSON } from "@/utils/downloadJSON"; // JSON 다운로드 유틸 함수

// 컴포넌트에 전달될 props 타입 정의
interface PromptBoxProps {
    prompt1: string; // 사용자 입력 프롬프트
    prompt2: string; // 응답 텍스트
    onChangePrompt1: (text: string) => void; // prompt1 변경 핸들러
    onChangePrompt2: (text: string) => void; // prompt2 변경 핸들러
}

// PromptBox 함수형 컴포넌트 정의
const PromptBox: React.FC<PromptBoxProps> = ({
    prompt1,
    prompt2,
    onChangePrompt1,
    onChangePrompt2,
}) => {
    // 소켓 이벤트 리스너 등록은 컴포넌트 마운트 시 1회만 실행
    useEffect(() => {
        // 소켓 연결되었을 때 실행되는 함수
        const handleConnect = () => {
            console.log("🟢 Socket connected:", socket.id);
        };

        // 서버에서 completion 이벤트를 통해 응답이 오면 실행됨
        const handleCompletion = (text: string) => {
            console.log("🟡 응답 수신:", text);
            onChangePrompt2(text); // 받은 응답을 prompt2에 저장
            downloadJSON(
                text,
                `touchpoints_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`
            ); // 응답을 JSON 파일로 자동 저장
        };

        // 소켓 이벤트 등록
        socket.on("connect", handleConnect);
        socket.on("completion", handleCompletion);

        // 컴포넌트 언마운트 시 이벤트 제거 (메모리 누수 방지)
        return () => {
            socket.off("connect", handleConnect);
            socket.off("completion", handleCompletion);
        };
    }, [onChangePrompt2]); // 의존성: onChangePrompt2가 바뀔 때만 재실행

    // 프롬프트 전송 함수
    const handleSend = () => {
        socket.emit("initialPrompt", prompt1); // 서버로 프롬프트 전송
        onChangePrompt2("🔄 응답 생성 중..."); // 사용자에게 응답 대기 중임을 표시
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
                    <button
                        onClick={handleSend}
                        className="send-button"
                    >
                        <span className="material-symbols-outlined">play_arrow</span>
                    </button>
                </div>
            </div>

            <textarea
                value={prompt2}
                readOnly
                placeholder="응답 출력"
                className="prompt-textarea half-width"
            />
        </div>


    );
};


export default PromptBox; // PromptBox 컴포넌트를 기본 내보내기
