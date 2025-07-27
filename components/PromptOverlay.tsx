"use client";

import React, { useState, useRef, useEffect } from "react";
import Draggable from "react-draggable";
import StructuredScenarioEditor from "./StructuredScenarioEditor";
import socket from "@/utils/socket";
import { Rnd } from "react-rnd";

interface PromptOverlayProps {
  prompt1: string;
  prompt2: string;
  onChangePrompt1: (text: string) => void;
  onChangePrompt2: (text: string) => void;
  onImportJson: (json: string) => void;
  structuredData: any;
  storyboardImages: string[];
}

const PromptOverlay: React.FC<PromptOverlayProps> = ({
  prompt1,
  // prompt2,
  onChangePrompt1,
  onChangePrompt2,
  onImportJson,
  structuredData,
  storyboardImages,
}) => {
  const [localStructuredData, setLocalStructuredData] = useState(structuredData);
  const [localImages, setLocalImages] = useState(storyboardImages);

  const scenarioRef = useRef<HTMLDivElement>(null);
  const structuredRef = useRef<HTMLDivElement>(null);
  const storyboardRef = useRef<HTMLDivElement>(null);

  const [modalImage, setModalImage] = useState<string | null>(null);

  useEffect(() => {
    const handleConnect = () => {
      console.log("🟢 [socket] 연결됨:", socket.id);
    };

    const handleCompletion = (text: string) => {
      console.log("🟡 [socket] completion 응답 수신:", text);
      onChangePrompt2(text);
      onImportJson(text);
    };

    const handleStructuredResult = (data: any) => {
      console.log("🧩 [socket] structuredResult 수신:", data);
      setLocalStructuredData(data);
    };

    // const handleStoryboardResult = async (data: any) => {
    //   console.log("📦 storyboardResult 전체 응답 내용:", JSON.stringify(data, null, 2));
    //   if (Array.isArray(data?.storyboards)) {
    //     await generateStoryboardImages(data);
    //   } else {
    //     console.warn("🚫 [socket] storyboardResult: 유효한 storyboards 없음", data);
    //   }
    // };

    const handleConvertedScenario = (scenarioText: string) => {
      console.log("🟢 [convertedScenario] 시나리오 수신:", scenarioText);

      // 시나리오 입력창 채우기
      onChangePrompt1(scenarioText);

      // 이 시나리오를 기반으로 다음 단계 자동 실행
      socket.emit("initialPrompt", scenarioText);           // Graph
      socket.emit("phase4StoryboardFormat", scenarioText);  // Storyboard
    };


    socket.on("connect", handleConnect);
    socket.on("completion", handleCompletion);
    socket.on("structuredResult", handleStructuredResult);
    // socket.on("storyboardResult", handleStoryboardResult);
    socket.on("convertedScenario", handleConvertedScenario); // ✅ 추가됨

    return () => { 
      socket.off("connect", handleConnect);
      socket.off("completion", handleCompletion);
      socket.off("structuredResult", handleStructuredResult);
      // socket.off("storyboardResult", handleStoryboardResult);
      socket.off("convertedScenario", handleConvertedScenario); // ✅ 추가됨
    };
  }, [onChangePrompt2, onImportJson, onChangePrompt1]);


  const handleSend = async () => {
    console.log("📤 [handleSend] 사용자 입력 시나리오:", prompt1);

    socket.emit("initialPrompt", prompt1);   // 그래프 JSON
    socket.emit("phase1StructuredFormat", prompt1);  // 구조화 JSON
    socket.emit("phase4StoryboardFormat", prompt1);  // 스토리보드 JSON
  };

  const generateStoryboardImages = async (scenarioStructuredJson: any) => {
    try {
      console.log("📤 [generateStoryboardImages] API에 보낼 JSON:", scenarioStructuredJson);

      const res = await fetch("/api/generateImagesLocal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scenarioStructuredJson),
      });

      const result = await res.json();

      if (result && Array.isArray(result.imageUrls)) {
        console.log("🖼️ [generateStoryboardImages] 생성된 이미지 URL:", result.imageUrls);
        setLocalImages(result.imageUrls);
      } else {
        console.warn("🚫 [generateStoryboardImages] 이미지 생성 실패 응답:", result);
      }
    } catch (err) {
      console.error("❌ [generateStoryboardImages] 오류:", err);
    }
  };

  const handleStructuredSend = () => {
    if (!localStructuredData) return;
    console.log("📤 [Structured ▶ 전송] 구조화 데이터:", localStructuredData);

    socket.emit("convertStructuredToScenario", localStructuredData); // 이 한 줄이면 됨!
  };

  return (
    <>
      {/* Scenario */}
      <Rnd
        default={{ x: 50, y: 50, width: 320, height: 240 }}
        minWidth={280}
        minHeight={200}
        bounds="window"
        className="draggable-window"
      >
        <h3 style={{ marginBottom: "8px" }}>Scenario</h3>
        <textarea
          value={prompt1}
          onChange={(e) => onChangePrompt1(e.target.value)}
          className="prompt-textarea"
        />
        <button onClick={handleSend} className="send-button">▶</button>
      </Rnd>


      {/* Structured Editor */}
      {localStructuredData && (
        <Rnd
          default={{
            x: 400,
            y: 50,
            width: 400,
            height: 500,
          }}
          minWidth={400}
          minHeight={500}
          bounds="window"
          className="draggable-window structured"
        >
          <h3>Structured Editor</h3>
          <div className="structured-editor-wrapper">
            <StructuredScenarioEditor
              data={localStructuredData}
              onChange={(data) => setLocalStructuredData(data)}
            />
          </div>

          <button onClick={handleStructuredSend} className="send-button">▶</button>
        </Rnd>
      )}


      {/* Storyboard */}
      {localImages.length > 0 && (
        <Rnd
          default={{
            x: 50,
            y: 400,
            width: 500,
            height: 300,
          }}
          minWidth={300}
          minHeight={200}
          bounds="window"
          style={{
            background: "#1e1e1e",
            border: "1px solid #444",
            borderRadius: "8px",
            padding: "12px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            color: "white",
            zIndex: 10,
            overflow: "auto",
          }}
        >
          <h3>Storyboard</h3>
          <div className="storyboard-grid">
            {localImages.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Storyboard ${idx + 1}`}
                className="storyboard-image"
                onClick={() => setModalImage(url)}
              />
            ))}
          </div>
        </Rnd>
      )}

      {/* Modal */}
      {modalImage && (
        <div
          className="image-modal-overlay"
          onClick={() => setModalImage(null)}
        >
          <div className="image-modal-content">
            <img src={modalImage} alt="Preview" />
          </div>
        </div>
      )}
    </>
  );

};

export default PromptOverlay;
