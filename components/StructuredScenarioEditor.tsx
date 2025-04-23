"use client";

import React from "react";

interface StructuredData {
  context: string[];
  artifact: string[];
  userExperience: Record<string, string>;
}

interface StructuredScenarioEditorProps {
  data: StructuredData;
  onChange: (newData: StructuredData) => void;
}

const StructuredScenarioEditor: React.FC<StructuredScenarioEditorProps> = ({
  data,
  onChange,
}) => {
  const handleUpdateList = (
    key: "context" | "artifact",
    index: number,
    value: string
  ) => {
    const updated = [...data[key]];
    updated[index] = value;
    onChange({ ...data, [key]: updated });
  };

  const handleUpdateExperience = (userId: string, value: string) => {
    const updated = { ...data.userExperience, [userId]: value };
    onChange({ ...data, userExperience: updated });
  };

  return (
    <div className="structured-wrapper">
      {/* ✅ context와 artifact 나란히 */}
      <div className="structured-two-column">
        <div className="structured-column">
          <h3 className="structured-section-title">🧭 Context</h3>
          <ul className="structured-input-list">
            {data.context.map((item, idx) => (
              <li key={idx}>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleUpdateList("context", idx, e.target.value)}
                  className="structured-context-artifact-field"
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="structured-column">
          <h3 className="structured-section-title">🧱 Artifact</h3>
          <ul className="structured-input-list">
            {data.artifact.map((item, idx) => (
              <li key={idx}>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleUpdateList("artifact", idx, e.target.value)}
                  className="structured-context-artifact-field"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 👤 User Experience (하단) */}
      <h3 className="structured-section-title">👤 User Experience</h3>
      {Object.entries(data.userExperience).map(([userId, value]) => (
        <div key={userId} className="structured-user-block">
          <label className="structured-user-label"><strong>User {userId}</strong></label>
          <textarea
            value={value}
            onChange={(e) => handleUpdateExperience(userId, e.target.value)}
            rows={3}
            className="structured-ux-textarea"
          />
        </div>
      ))}
    </div>

  );
};

export default StructuredScenarioEditor;
