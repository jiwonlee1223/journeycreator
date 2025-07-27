// pages/api/generateImagesLocal.ts
import type { NextApiRequest, NextApiResponse } from "next";

const SD_SERVER_URL = "http://143.248.107.38:8189/sdapi/v1/txt2img";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { storyboards } = req.body;

    if (!storyboards || !Array.isArray(storyboards)) {
      return res.status(400).json({ error: "Invalid request: storyboards is required and must be an array" });
    }

    const steps = storyboards
      .map((scene: any, index: number) => {
        const title = scene?.title ?? `Scene ${index + 1}`;
        const interactions = Array.isArray(scene?.keyInteractions) ? scene.keyInteractions.join(", ") : "";
        return `${title}: ${interactions}`;
      })
      .filter((step: string) => step.length > 10);

    const imageUrls: string[] = [];

    const baseStyle =
      "Generate a hyperrealistic photograph of the described moment. " +
      "Clearly depict the user's action and the surrounding environment. " +
      "Use natural lighting, realistic proportions, and contextual background. " +
      "Do not include any text, captions, or UI overlays.";

    for (let i = 0; i < steps.length; i++) {
      const stepText = steps[i];
      const previous = i > 0 ? steps[i - 1].split(":")[0] : null;
      const currentTitle = stepText.split(":")[0];
      const currentDetail = stepText.split(":")[1]?.trim() || "";

      const prompt = previous
        ? `After "${previous}", now depict: "${currentTitle}". The user is engaged in: ${currentDetail}. ${baseStyle}`
        : `Start of the sequence: "${currentTitle}". The user is engaged in: ${currentDetail}. ${baseStyle}`;

      console.log(`📸 이미지 생성 프롬프트 [${i + 1}]:`, prompt);

      const response = await fetch(SD_SERVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          steps: 40,
          width: 768,
          height: 512,
          sampler_index: "DPM++ 2M Karras",
        }),
      });

      const result = await response.json();

      const base64 = result?.images?.[0];
      if (base64) {
        imageUrls.push(`data:image/png;base64,${base64}`);
      } else {
        console.warn("⚠️ 이미지 응답 없음:", result);
      }
    }

    res.status(200).json({ imageUrls });
  } catch (err) {
    console.error("❌ Stable Diffusion 요청 실패:", err);
    res.status(500).json({ error: "Image generation failed", details: (err as Error).message });
  }
}
