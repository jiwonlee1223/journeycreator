import React from "react";

interface StructuredScenarioEditorProps {
  data: {
    context: string[];
    artifact: string[];
    userExperience: Record<string, string>;
  };
  onChange: (newData: StructuredScenarioEditorProps["data"]) => void;
}

const StructuredScenarioEditor: React.FC<StructuredScenarioEditorProps> = ({
  data,
  onChange
}) => {
  const updateArrayItem = (section: "context" | "artifact", index: number, value: string) => {
    const updated = { ...data };
    updated[section][index] = value;
    onChange(updated);
  };

  const updateUserExperience = (userId: string, value: string) => {
    const updated = { ...data };
    updated.userExperience[userId] = value;
    onChange(updated);
  };

  return (
    <div className="structured-editor">
      <h3>🧱 Context</h3>
      {data.context.map((ctx, i) => (
        <input key={i} value={ctx} onChange={(e) => updateArrayItem("context", i, e.target.value)} />
      ))}

      <h3>📦 Artifact</h3>
      {data.artifact.map((art, i) => (
        <input key={i} value={art} onChange={(e) => updateArrayItem("artifact", i, e.target.value)} />
      ))}

      <h3>👥 User Experience</h3>
      {Object.entries(data.userExperience).map(([userId, text]) => (
        <div key={userId} style={{ marginBottom: "1em" }}>
          <strong>User {userId}</strong>
          <textarea
            value={text}
            onChange={(e) => updateUserExperience(userId, e.target.value)}
            rows={3}
            style={{ width: "100%" }}
          />
        </div>
      ))}
    </div>
  );
};

export default StructuredScenarioEditor;
