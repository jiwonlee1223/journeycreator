// utils/downloadJSON.ts
export function downloadJSON(jsonText: string, filename = "result.json") {
    try {
      const parsed = typeof jsonText === "string" ? JSON.parse(jsonText) : jsonText;
  
      const blob = new Blob([JSON.stringify(parsed, null, 2)], {
        type: "application/json",
      });
  
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ JSON 다운로드 실패:", err);
    }
  }
  