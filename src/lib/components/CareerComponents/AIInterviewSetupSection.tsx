"use client";

import CustomDropdown from "@/lib/components/CareerComponents/CustomDropdown";

/*
  AIInterviewSetupSection
  - Content-only body for the AI Interview Settings card (parent provides the card shell & header)
  - Sections: Screening dropdown, Require Video toggle, Secret Prompt textarea
*/
export default function AIInterviewSetupSection({ screeningSetting, setScreeningSetting, requireVideo, setRequireVideo, aiSecretPrompt, setAiSecretPrompt }: {
  screeningSetting: string; setScreeningSetting: (s: string) => void;
  requireVideo: boolean; setRequireVideo: (b: boolean) => void;
  aiSecretPrompt: string; setAiSecretPrompt: (s: string) => void;
}) {
  const settingList = [
    { name: "Good Fit and above" },
    { name: "Only Strong Fit" },
    { name: "No Automatic Promotion" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* AI Interview Screening */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#181D27", marginBottom: 6 }}>AI Interview Screening</div>
        <div style={{ color: "#667085", fontSize: 12, marginBottom: 8 }}>Jia automatically endorses candidates who meet the chosen criteria.</div>
        <CustomDropdown
          onSelectSetting={(setting) => { setScreeningSetting(setting); }}
          screeningSetting={screeningSetting}
          settingList={settingList}
        />
      </div>

      <div style={{ height: 1, background: "#F0F2F5" }} />

      {/* Require Video on Interview */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#181D27", marginBottom: 4 }}>Require Video on Interview</div>
        <div style={{ color: "#667085", fontSize: 12, marginBottom: 8 }}>Require candidates to keep their camera on. Recordings will appear on their analysis page.</div>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
          <label className="switch">
            <input type="checkbox" checked={requireVideo} onChange={() => setRequireVideo(!requireVideo)} />
            <span className="slider round"></span>
          </label>
          <span style={{ fontSize: 13 }}>{requireVideo ? "Yes" : "No"}</span>
        </div>
      </div>

      <div style={{ height: 1, background: "#F0F2F5" }} />

      {/* AI Interview Secret Prompt */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <i className="la la-user-secret" style={{ color: "#E63B7A" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#181D27" }}>AI Interview Secret Prompt (optional)</span>
          <i className="la la-question-circle" title="Secret Prompts help fine-tune Jia's interview evaluation" style={{ color: "#98A2B3", fontSize: 14 }} />
        </div>
        <div style={{ color: "#667085", fontSize: 12, marginBottom: 8 }}>
          Secret Prompts give you extra control over Jia’s evaluation style, complementing her assessment of requirements from the job description.
        </div>
        <textarea
          className="form-control"
          rows={5}
          placeholder="Enter a secret prompt (e.g., Focus on clarity and confidence rather than language preference or accent.)"
          value={aiSecretPrompt}
          onChange={(e) => setAiSecretPrompt(e.target.value)}
        />
      </div>
    </div>
  );
}
