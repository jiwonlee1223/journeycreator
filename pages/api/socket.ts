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
            const finalPrompt = `다음 시나리오를 기반으로 사용자의 여정에서 발생하는 **디자인 터치포인트**를 식별하고, 
            각 터치포인트를 기반으로 사용자 여정을 시각화할 수 있는 JSON 형식으로 출력해줘.
            \n
            - 시나리오:${prompt}
            \n
            출력 규칙:
            - 각 시점은 하나의 row에 해당하며, **touchpoints 필드에는 구체적인 디자인 터치포인트**만 작성한다. 설명이 아니라 사용자가 만나는 오브젝트, 공간, 화면 등을 기술해야 한다.
            - nodes info에는 사용자 여정의 흐름을 nodeId와 nodeSubId를 기준으로 기술한다.
            - nodeId는 "001" 형식으로 하나의 사용자에 고유하게 부여되며, nodeSubId는 해당 사용자의 여정 단계 번호이다 (0부터 시작).
            - 시간 흐름이 생길 때마다 row와 col이 각각 +1씩 증가하도록 해줘. 즉, 각 노드는 (0,0), (1,1), (2,2) … 처럼 우하향 대각선 위치에 위치해야 한다.
            - 시나리오에 등장하는 사용자가 여러 명인 경우, 각 사용자마다 고유한 nodeId("001", "002", …)를 부여하라. 각 사용자의 여정은 독립적인 nodeSubId 흐름으로 구성하고, nodes info 내에 함께 출력하라.
            각 사용자의 여정은 독립적으로 표현되며, nodeId가 동일한 노드끼리는 하나의 사용자 여정 흐름을 구성한다.
            - 하나의 grid cell(row, col 조합)에는 하나의 노드만 배치할 수 있다. 동일한 row라도 사용자마다 col 값을 다르게 지정해 중복을 피해야 한다. 모든 노드는 서로 다른 (row, col) 좌표를 가져야 한다.
            - row는 시간 순서 기준, col은 같은 시간대에서의 분기 지점이나 선택지를 의미한다.
            - 출력은 JSON 형식이 정확히 맞아야 하며, 그대로 .json 파일로 저장 가능한 구조로 작성하라. 모든 문자열은 따옴표로 감싸고, 쉼표 및 괄호 누락 없이 완성된 JSON 문서를 출력해야 한다.
            - 출력 형식을 반드시 지키시오.
            출력 형식:
            [
              {
                "touchpoints": "",
                "nodes info": [
                  {
                    "nodeId": "",
                    "row": 0,
                    "col": 0,
                    "nodeSubId": 0
                  },
                  {
                    "nodeId": "",
                    "row": 0,
                    "col": 0,
                    "nodeSubId": 0
                  }
                ]
              },
              {
                "touchpoints": "",
                "nodes info": [
                  {
                    "nodeId": "",
                    "row": 0,
                    "col": 0,
                    "nodeSubId": 0
                  },
                  {
                    "nodeId": "",
                    "row": 0,
                    "col": 0,
                    "nodeSubId": 0
                  }
                ]
              },
              {
                "touchpoints": "",
                "nodes info": [
                  {
                    "nodeId": "",
                    "row": 0,
                    "col": 0,
                    "nodeSubId": 0
                  },
                  {
                    "nodeId": "",
                    "row": 0,
                    "col": 0,
                    "nodeSubId": 0
                  },
                  {
                    "nodeId": "",
                    "row": 0,
                    "col": 0,
                    "nodeSubId": 0
                  }
                ]
              },
              {
                "touchpoints": "",
                "nodes info": [
                  {
                    "nodeId": "",
                    "row": 0,
                    "col": 0,
                    "nodeSubId": 0
                  }
                ]
              }
            ]
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
