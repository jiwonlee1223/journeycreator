// pages/api/convert.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  try {
    const { json } = req.body;

    const conversionPrompt = `
    다음 시나리오를 기반으로 구조화된 데이터를 JSON으로 변환하라.
    오직 JSON만, \`\`\`json ... \`\`\` 코드블록 안에 출력하라. 그 외 텍스트는 절대 포함하지 마라.
    다음 JSON은 사용자 여정의 터치포인트 정보입니다. 이 데이터를 기반으로 아래 형식에 맞게 정리된 JSON을 생성하시오.

    출력 형식은 다음과 같다:
    {
      "context": [물리적 장소 및 환경 요소],
      "artifact": [사용자가 직접 상호작용하는 제품, UI, 시스템 등],
      "userExperience": {
        "001": "사용자 001의 단계별 서비스 흐름",
        "002": "사용자 002의 단계별 서비스 흐름",
        ...
      }
    }

    규칙:
    - context는 물리적 공간 또는 환경 요소를 중심으로 정리
    - artifact는 인터페이스, 화면, 앱, 제품 등 사용자 경험의 구체적 매개체를 포함
    - userExperience는 각 사용자 ID 별로, 그 사용자가 겪는 여정을 시간 순으로 요약 (하나의 문자열로 서술)
    - 반드시 유효한 JSON을 출력할 것

    데이터:
    ${json}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: conversionPrompt }],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    const parsed = JSON.parse(cleaned);
    res.status(200).json(parsed);
  } catch (err) {
    console.error("❌ 변환 실패:", err);
    res.status(500).json({ error: "변환 실패", details: (err as Error).message });
  }
}
