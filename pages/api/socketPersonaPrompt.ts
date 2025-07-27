// pages/api/socketPersonaPrompt.ts
import { Socket } from "socket.io";
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const SD_SERVER_URL = "http://143.248.107.38:8189/sdapi/v1/txt2img";

function extractStableDiffusionPromptFromProfile(profile: any): string {
    const gender = profile.gender ?? "";
    const age = profile.age ? `age ${profile.age}` : "";
    const role = profile.role ?? "";

    // personality subfields
    const x = profile.background?.slice(0, 120) ?? "";

    const promptParts = [
        gender,
        age,
        role,
        x,
        "looking at camera",
        "upper body portrait",
        "ethnicity-specific features",
        "detailed portrait",
        "8k",
        "ultra realistic",
        "depth of field"
    ].filter(part => String(part).trim() !== "");

    return promptParts.join(", ");
}


export function registerPersonaPromptHandler(socket: Socket) {
    socket.on("flourishPersona", async (brief: string) => {
        console.log("📨 입력된 Persona Prompt:", brief);

        try {
            //
            // ✅ Step 1: Persona Profile 텍스트 생성
            //
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: `You are a UX researcher assistant that expands a brief persona idea into a full, human-centered persona profile.`,
                    },
                    {
                        role: "user",
                        content: `Based on the following description, create a complete persona profile including name, age, gender, role, location, education, background, goals, pain points, personality, tech usage, and hobbies.\n\n${brief}`,
                    },
                ],
                temperature: 0.8,
            });

            const profileText = completion.choices[0]?.message?.content ?? "[no content]";
            console.log("✅ 생성된 Persona Description:", profileText);

            //
            // ✅ Step 1.1: Persona Profile JSON 구조화
            //
            const jsonCompletion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: `Convert the following persona profile into a well-structured JSON object with the following fields:

- name
- age
- gender
- role
- location
- education
- background
- goals (as a list of bullet points)
- painPoints (as a list of bullet points)
- personality:
    - traits (list of adjectives or behaviors)
    - drives (core motivations)
    - strengths (key abilities or qualities)
- techUsage (as a list of bullet points)
- hobbies (as a list of bullet points)

Ensure all list fields are arrays of strings.`
                    },
                    {
                        role: "user",
                        content: profileText,
                    },
                ],
                temperature: 0.2,
            });

            let profileJson: any = {};
            try {
                const rawJson = jsonCompletion.choices[0]?.message?.content ?? "{}";
                const cleaned = rawJson.replace(/```json|```/g, "").trim();
                profileJson = JSON.parse(cleaned);
                console.log("🧾 구조화된 JSON Persona:", profileJson);
            } catch (err) {
                console.warn("⚠️ JSON 파싱 실패:", err);
            }

            //
            // ✅ Step 2: SD 이미지 프롬프트 생성
            //
            const facePrompt = extractStableDiffusionPromptFromProfile(profileJson);
            console.log("🖼️ Persona Image Prompt:", facePrompt);

            //
            // ✅ Step 3: SD 이미지 생성 요청
            //
            let imageBase64: string | null = null;
            try {
                const sdResponse = await fetch(SD_SERVER_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt: facePrompt,
                        sampler_name: "DPM++ SDE",
                        scheduler: "Karras",
                        steps: 20,
                        seed: -1,
                        cfg_scale: 7,
                        width: 512,
                        height: 512,
                        enable_hr: true,
                        hr_scale: 2.0,
                        hr_upscaler: "Latent",
                        hr_second_pass_steps: 0,
                        denoising_strength: 0.7,
                    }),
                });

                const imageResult = await sdResponse.json();
                imageBase64 = imageResult?.images?.[0] ?? null;
            } catch (err) {
                console.warn("⚠️ SD 얼굴 생성 실패:", err);
            }

            //
            // ✅ Step 4: 클라이언트에 전송
            //
            socket.emit("personaFlourished", {
                profileText,
                profileJson,
                imageBase64,
            });
        } catch (err) {
            console.error("❌ personaFlourish error:", err);
            socket.emit("personaFlourished", {
                error: "[error generating persona]",
            });
        }
    });

    socket.on("generateMapData", async ({ profileJson }) => {
        try {
            const scenarioText = `This user aims to ${profileJson.goals?.[0]}. User is ${profileJson.personality?.traits?.slice(0, 2).join(", ")}.`;

            const mapPrompt = `다음 페르소나 설명을 기반으로 이 사용자가 경험할 서비스 여정에서 발생하는 디자인 터치포인트를 식별하고, 
            아래 ##Scenario를 기반으로 구조화된 데이터를 JSON으로 변환하라.
            오직 JSON만, \`\`\`json ... \`\`\` 코드블록 안에 출력하라. 그 외 텍스트는 절대 포함하지 마라.
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
                "touchpoints": "e.g. 스마트폰 알람 화면",
                "nodes info": [
                  {"nodeId": "001", "row": 0, "col": 0, "nodeSubId": 0}
                ]
              },
              {
                "touchpoints": "e.g. 대학 강의실",
                "nodes info": [
                  {"nodeId": "001", "row": 0, "col": 0, "nodeSubId": 0}
                ]
              },
         ...
            ]
              
            반드시 위 출력 규칙과 JSON 예시 형식을 엄수하여 출력하시오.
            
            ## Scenario: ${scenarioText}`.trim();
            ;

            const mapCompletion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "You generate JSON journey maps from scenarios." },
                    { role: "user", content: mapPrompt }
                ],
                temperature: 0.7,
            });


            const content = mapCompletion.choices[0]?.message?.content ?? "";
            const match = content.match(/```json\s*([\s\S]+?)\s*```/i);

            if (match) {
                const mapDataJson = JSON.parse(match[1]);
                console.log("🗺️ (generateMapData) 생성된 Map Data:", JSON.stringify(mapDataJson, null, 2));
                socket.emit("mapDataGenerated", mapDataJson);
            } else {
                socket.emit("mapDataGenerated", { error: "Invalid map data format." });
            }
        } catch (err) {
            console.error("❌ generateMapData error:", err);
            socket.emit("mapDataGenerated", { error: "Map generation failed." });
        }
    });

}
