// pages/api/socket.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!res.socket) {
      return res.status(500).json({ error: "Socket not available" });
    }

    const httpServer: NetServer = (res.socket as any).server;

    if (!(res.socket as any).server.io) {
      console.log("🧠 Initializing Socket.IO...");

      const io = new SocketIOServer(httpServer, {
        path: "/api/socket",
      });

      (res.socket as any).server.io = io;

      io.on("connection", (socket) => {
        console.log("⚡ 클라이언트 연결됨:", socket.id);

        if ((socket as any)._handlerRegistered) {
          console.log("🔁 리스너 중복 방지");
          return;
        }
        (socket as any)._handlerRegistered = true;

        socket.on("initialPrompt", async (prompt: string) => {
          console.log("📨 initialPrompt 수신:", prompt);

          try {
            const finalPrompt = `다음 시나리오를 기반으로 사용자 여정에서 발생하는 디자인 터치포인트를 식별하고, 
            다음 시나리오를 기반으로 구조화된 데이터를 JSON으로 변환하라.
            오직 JSON만, \`\`\`json ... \`\`\` 코드블록 안에 출력하라. 그 외 텍스트는 절대 포함하지 마라.
            \n
            - 시나리오:${prompt}
            \n
            - 디자인 터치포인트란 사용자가 여정에서 실제로 마주치는 **구체적 화면, 오브젝트, 공간** 등을 의미한다.
              예: "스마트폰 알람 화면", "택시 내부 스크린", "빌딩 로비 키오스크", "면접장 문 앞"

            ## 출력 규칙:
            1. JSON 형식을 정확히 준수하여 JSON 형식 파일로 즉시 저장 가능한 구조로 출력하라.
            2. 출력 JSON 구조는 배열이며, 각 항목은 시간 흐름상 하나의 시점을 의미하는 row 단위로 구성한다.
            3. 각 row 항목은 다음과 같은 필드를 갖는다:
              - "touchpoints": 시나리오 전체에서 오직 **단 한 번만 등장**할 수 있으며, 이미 출력된 터치포인트는 다시 등장하지 않아야 한다. 절대 중복해서는 안 된다. 터치포인트는 사용자가 실제로 만나는 화면, 오브젝트, 공간 등을 간결히 기술하며, 감정이나 상황 묘사 등은 포함하지 않는다.
              - "nodes info": 각 사용자 노드 정보 배열로, 다음과 같은 필드를 반드시 포함하라.
                - "nodeId": 사용자마다 "001", "002", ... 형식으로 고유 부여.
                - "row": 같은 시점(col)에 사용자의 선택이나 분기가 발생할 때마다 서로 다르게 부여한다. 예를 들어, 같은 시점에서 2명의 사용자가 서로 다른 행동을 하면 row는 0, 1로 구분한다.
                - "col": 반드시 시간 흐름을 나타내며, 처음(0)부터 하나씩 증가한다.
                - "nodeSubId": 각 사용자 여정의 단계 순서 번호 (0부터 시작하여 각 사용자별로 독립적 증가).
              - 전체 시나리오에서 같은 터치포인트는 단 한 번만 출력된다.
            4. 시나리오에 등장하는 사용자가 여러 명일 경우, 각 사용자에게 고유한 nodeId를 할당하여 nodes info에 함께 표현하라.
            5. 이 JSON은 하나의 사용자 시나리오를 기반으로 하여 유저 저니맵을 그리기 위한 좌표값을 담고 있다.
            만약 시나리오 내에서 명시되지 않은 흐름이 있어 그래프의 자연스러운 연결이 어렵다면, 어색한 흐름이 없도록 너(AI)의 자연스러운 가정을 통해 빈 부분을 보완하여 완전한 형태의 그래프가 되도록 구성하라.
            이때 반드시 출력 규칙을 지키고, 터치포인트 및 노드 정보의 일관성을 유지하라.

            ## JSON 출력 예시 (이 형식을 반드시 참고하여 구성하라):

            [
              {
                "touchpoints": "스마트폰 알람 화면",
                "nodes info": [
                  {"nodeId": "001", "row": 0, "col": 0, "nodeSubId": 0},
                  {"nodeId": "002", "row": 0, "col": 0, "nodeSubId": 0}
                ]
              },
              {
                "touchpoints": "택시 내부 화면",
                "nodes info": [
                  {"nodeId": "001", "row": 1, "col": 1, "nodeSubId": 1},
                  {"nodeId": "002", "row": 1, "col": 1, "nodeSubId": 1}
                ]
              },
              {
                "touchpoints": "빌딩 로비 키오스크",
                "nodes info": [
                  {"nodeId": "001", "row": 2, "col": 2, "nodeSubId": 2},
                  {"nodeId": "002", "row": 2, "col": 1, "nodeSubId": 2}
                ]
              }
            ]
              
            반드시 위 출력 규칙과 JSON 예시 형식을 엄수하여 출력하시오.
            `;
            const completion = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [{ role: "user", content: finalPrompt }],
            });

            const resultRaw = completion.choices[0]?.message?.content ?? "[빈 응답]";

            // 1. ```json 또는 ``` 제거
            const cleaned = resultRaw.replace(/```json|```/g, "").trim();

            // 2. JSON 파싱 시도
            try {
              const parsed = JSON.parse(cleaned);

              // 3. 유효하면 emit (클라이언트에서 다운로드 가능하도록 전송)
              socket.emit("completion", JSON.stringify(parsed, null, 2));
            } catch (e) {
              console.error("⚠️ JSON 파싱 실패:", e);
              socket.emit("completion", "[⚠️ JSON 형식이 잘못되었습니다. 응답을 다시 확인해주세요.]");
            }

          } catch (err) {
            console.error("❌ OpenAI 호출 실패:", err);
            socket.emit("completion", "[OpenAI 호출 중 오류 발생]");
          }
        });
      });
    }


    res.end();
  } catch (err) {
    console.error("❌ socket.ts 전체 오류:", err);
    res.status(500).end("Socket.IO 초기화 중 에러 발생");
  }
}
