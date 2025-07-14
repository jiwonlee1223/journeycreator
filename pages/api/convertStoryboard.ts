import { Server, Socket } from "socket.io";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const registerOpenAISocketHandlers = (io: Server, socket: Socket) => {
  socket.on("convertStoryboard", async (scenario: string) => {
    console.log("🛰️ [socket] convertStoryboard 요청 수신:", scenario);

    const prompt = `
다음은 사용자 서비스 시나리오입니다. 이 시나리오를 바탕으로 '스토리보드'를 구성하세요.

출력 형식은 다음과 같습니다:
{
  "storyboards": [
    {
      "sceneId": 1,
      "title": "장면 제목",
      "keyInteractions": ["사용자의 핵심 행동 1", "핵심 행동 2"]
    },
    ...
  ]
}

규칙:
- 최대 5개의 장면만 생성하세요.
- 시간 순서대로 구성하세요.
- 반드시 유효한 JSON만 출력하십시오.
- 마크다운 없이 순수 JSON만 출력하십시오.

시나리오:
${scenario}
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      const raw = completion.choices[0]?.message?.content ?? "";
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      socket.emit("storyboardResult", parsed); // ✅ 응답 전송
    } catch (err) {
      console.error("❌ OpenAI storyboard 변환 실패:", err);
      socket.emit("storyboardResult", { error: "변환 실패" });
    }
  });
};
