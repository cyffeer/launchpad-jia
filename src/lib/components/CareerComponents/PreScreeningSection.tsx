"use client";

import { useState } from "react";

/*
  PreScreeningSection
  - Minimal CRUD for pre-screening questions
  - Each question: { id: string|number, type: 'Dropdown'|'Text', question: string, options: string[] }
*/
export default function PreScreeningSection({ questions, setQuestions, cvSecretPrompt, setCvSecretPrompt, hideSecretPrompt = false }: { questions: any[]; setQuestions: (q: any[]) => void; cvSecretPrompt: string; setCvSecretPrompt: (s: string) => void; hideSecretPrompt?: boolean; }) {
  // "Add custom" ephemeral editor state
  const [newQ, setNewQ] = useState<string>("");
  const [type, setType] = useState<string>("Dropdown");
  const [optionInput, setOptionInput] = useState<string>("");
  const [tempOptions, setTempOptions] = useState<string[]>(["Option 1"]);
  const [minValue, setMinValue] = useState<string>("");
  const [maxValue, setMaxValue] = useState<string>("");
  const [showCustomEditor, setShowCustomEditor] = useState<boolean>(false);

  // Suggested templates (from design reference)
  const suggestedTemplates = [
    {
      key: "notice_period",
      title: "Notice Period",
      question: "How long is your notice period?",
      type: "Dropdown",
      options: ["Immediately", "< 30 days", ">= 30 days"],
    },
    {
      key: "work_setup",
      title: "Work Setup",
      question: "How often are you willing to report to the office each week?",
      type: "Dropdown",
      options: ["At most 1-2x a week", "At most 3-4x a week", "Open to fully onsite work", "Only open to fully remote work"],
    },
    {
      key: "asking_salary",
      title: "Asking Salary",
      question: "How much is your expected monthly salary?",
      type: "Range",
      options: [],
    },
  ];

  const addOption = () => {
    const val = optionInput.trim();
    if (!val) return;
    setTempOptions([...tempOptions, val]);
    setOptionInput("");
  };

  const addQuestion = () => {
    const q = newQ.trim();
    if (!q) return;
    const id = Date.now();
    const entry: any = { id, type, question: q, options: [] };
    if (["Dropdown", "Checkboxes"].includes(type)) {
      entry.options = [...tempOptions];
    }
    if (type === "Range") {
      entry.minValue = minValue ? Number(minValue) : null;
      entry.maxValue = maxValue ? Number(maxValue) : null;
    }
    setQuestions([...(questions || []), entry]);
    // Reset custom editor
    setNewQ("");
    setTempOptions(["Option 1"]);
    setMinValue("");
    setMaxValue("");
    setType("Dropdown");
    setShowCustomEditor(false);
  };

  const addSuggested = (template: any) => {
    const already = (questions || []).some((q: any) => q.suggestionKey === template.key);
    if (already) return;
    const id = Date.now() + Math.random();
    const entry: any = {
      id,
      suggestionKey: template.key,
      type: template.type,
      question: template.question,
      options: template.type === "Dropdown" ? [...template.options] : [],
    };
    if (template.type === "Range") {
      entry.minValue = null;
      entry.maxValue = null;
    }
    setQuestions([...(questions || []), entry]);
  };

  const removeQuestion = (id: any) => setQuestions((questions || []).filter((q: any) => q.id !== id));

  const updateQuestion = (id: any, patch: any) => setQuestions((questions || []).map((q: any) => (q.id === id ? { ...q, ...patch } : q)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* CV Secret Prompt (rendered here unless hidden, e.g., when handled by parent CV Review Settings card) */}
      {!hideSecretPrompt && (
        <div className="layered-card-outer">
          <div className="layered-card-middle">
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, backgroundColor: "#181D27", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="la la-user-secret" style={{ color: "#FFFFFF", fontSize: 20 }}></i>
              </div>
              <span style={{ fontSize: 16, color: "#181D27", fontWeight: 700 }}>CV Secret Prompt (optional)</span>
            </div>
            <div className="layered-card-content">
              <textarea className="form-control" placeholder="Add a prompt to fine-tune how Jia scores CVs" value={cvSecretPrompt} onChange={(e) => setCvSecretPrompt(e.target.value)} rows={4} />
            </div>
          </div>
        </div>
      )}

      {/* Pre-screening questions */}
      <div className="layered-card-outer">
        <div className="layered-card-middle">
          {/* Header with Add custom button */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, backgroundColor: "#181D27", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="la la-list-ul" style={{ color: "#FFFFFF", fontSize: 20 }}></i>
              </div>
              <span style={{ fontSize: 16, color: "#181D27", fontWeight: 700 }}>2. Pre-Screening Questions <span style={{ fontWeight: 400 }}>(optional)</span></span>
            </div>
            <button
              onClick={() => { setShowCustomEditor(true); setType("Dropdown"); setTempOptions(["Option 1"]); setNewQ(""); }}
              style={{ background: "#181D27", color: "#FFFFFF", border: "1px solid #181D27", padding: "6px 14px", borderRadius: 24, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
              <i className="la la-plus" style={{ fontSize: 14 }}></i> Add custom
            </button>
          </div>

          <div className="layered-card-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Custom editor */}
            {showCustomEditor && (
              <div style={{ border: "1px solid #E9EAEB", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <input className="form-control" placeholder="Write your question..." value={newQ} onChange={(e) => setNewQ(e.target.value)} />
                  <select
                    className="form-control"
                    style={{ maxWidth: 160 }}
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value);
                      if (["Dropdown", "Checkboxes"].includes(e.target.value)) {
                        setTempOptions(["Option 1"]);
                      }
                    }}>
                    <option>Short Answer</option>
                    <option>Long Answer</option>
                    <option>Dropdown</option>
                    <option>Checkboxes</option>
                    <option>Range</option>
                  </select>
                  <button
                    className="btn btn-sm"
                    onClick={() => { setShowCustomEditor(false); setNewQ(""); }}
                    style={{ background: "#FFFFFF", border: "1px solid #D5D7DA", borderRadius: 24 }}
                    title="Cancel"
                  >
                    <i className="la la-times" />
                  </button>
                </div>
                {(["Dropdown", "Checkboxes"].includes(type)) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(tempOptions || []).map((opt, idx) => (
                      <div key={idx} style={{ display: "flex", flexDirection: "row", gap: 6, alignItems: "center" }}>
                        <div style={{ width: 28, textAlign: "center", fontSize: 12, color: "#667085" }}>{idx + 1}</div>
                        <input
                          className="form-control"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...tempOptions];
                            updated[idx] = e.target.value;
                            setTempOptions(updated);
                          }}
                        />
                        <button
                          className="btn btn-sm"
                          onClick={() => setTempOptions(tempOptions.filter((_: any, i: number) => i !== idx))}
                          style={{ background: "#FFFFFF", border: "1px solid #D5D7DA", borderRadius: 24 }}>
                          <i className="la la-times" />
                        </button>
                      </div>
                    ))}
                    <div style={{ display: "flex", flexDirection: "row", gap: 8, alignItems: "center" }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => setTempOptions([...tempOptions, `Option ${tempOptions.length + 1}`])}
                        style={{ background: "#FFFFFF", border: "1px solid #D5D7DA", borderRadius: 24 }}>
                        + Add Option
                      </button>
                    </div>
                  </div>
                )}
                {type === "Range" && (
                  <div style={{ display: "flex", flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>Minimum</span>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#6c757d" }}>P</span>
                        <input type="number" className="form-control" style={{ paddingLeft: 26 }} placeholder="0" value={minValue} onChange={(e) => setMinValue(e.target.value)} />
                        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#6c757d" }}>PHP</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>Maximum</span>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#6c757d" }}>P</span>
                        <input type="number" className="form-control" style={{ paddingLeft: 26 }} placeholder="0" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} />
                        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#6c757d" }}>PHP</span>
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "row", gap: 10 }}>
                  <button
                    disabled={!newQ.trim()}
                    className="btn btn-sm"
                    onClick={addQuestion}
                    style={{ background: !newQ.trim() ? "#D5D7DA" : "#181D27", color: "#FFFFFF", borderRadius: 24, padding: "6px 18px" }}>
                    Save question
                  </button>
                </div>
              </div>
            )}

            {/* Existing questions list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(questions || []).length === 0 && (
                <span style={{ color: "#475467" }}>No pre-screening questions added yet.</span>
              )}
              {(questions || []).map((q: any) => (
                <div key={q.id} style={{ border: "1px solid #E9EAEB", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input className="form-control" value={q.question} onChange={(e) => updateQuestion(q.id, { question: e.target.value })} />
                    <select
                      className="form-control"
                      style={{ maxWidth: 160 }}
                      value={q.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        const patch: any = { type: newType };
                        if (["Dropdown", "Checkboxes"].includes(newType) && !(q.options || []).length) {
                          patch.options = ["Option 1"]; 
                        }
                        if (newType === "Range") {
                          patch.minValue = q.minValue ?? null;
                          patch.maxValue = q.maxValue ?? null;
                        }
                        updateQuestion(q.id, patch);
                      }}>
                      <option>Short Answer</option>
                      <option>Long Answer</option>
                      <option>Dropdown</option>
                      <option>Checkboxes</option>
                      <option>Range</option>
                    </select>
                    <button className="btn btn-sm" onClick={() => removeQuestion(q.id)} style={{ background: "#FFFFFF", border: "1px solid #D5D7DA", borderRadius: 24 }} title="Delete Question">
                      <i className="la la-trash" />
                    </button>
                  </div>
                  {(["Dropdown", "Checkboxes"].includes(q.type)) && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {(q.options || []).map((opt: string, idx: number) => (
                        <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <div style={{ width: 28, textAlign: "center", fontSize: 12, color: "#667085" }}>{idx + 1}</div>
                          <input className="form-control" value={opt} onChange={(e) => {
                            const updated = [...(q.options || [])];
                            updated[idx] = e.target.value;
                            updateQuestion(q.id, { options: updated });
                          }} />
                          <button className="btn btn-sm" onClick={() => updateQuestion(q.id, { options: (q.options || []).filter((_: any, i: number) => i !== idx) })} style={{ background: "#FFFFFF", border: "1px solid #D5D7DA", borderRadius: 24 }}>
                            <i className="la la-times" />
                          </button>
                        </div>
                      ))}
                      <button className="btn btn-sm" onClick={() => updateQuestion(q.id, { options: [...(q.options || []), `Option ${(q.options || []).length + 1}`] })} style={{ background: "#FFFFFF", border: "1px solid #D5D7DA", borderRadius: 24, width: 140 }}>Add Option</button>
                    </div>
                  )}
                  {q.type === "Range" && (
                    <div style={{ display: "flex", flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>Minimum</span>
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#6c757d" }}>P</span>
                          <input type="number" className="form-control" style={{ paddingLeft: 26 }} placeholder="0" value={q.minValue ?? ''} onChange={(e) => updateQuestion(q.id, { minValue: e.target.value ? Number(e.target.value) : null })} />
                          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#6c757d" }}>PHP</span>
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>Maximum</span>
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#6c757d" }}>P</span>
                          <input type="number" className="form-control" style={{ paddingLeft: 26 }} placeholder="0" value={q.maxValue ?? ''} onChange={(e) => updateQuestion(q.id, { maxValue: e.target.value ? Number(e.target.value) : null })} />
                          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#6c757d" }}>PHP</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Suggested section */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <div style={{ height: 1, background: "#F0F2F5" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#181D27" }}>Suggested Pre-screening Questions:</span>
              {suggestedTemplates.map((t) => {
                const already = (questions || []).some((q: any) => q.suggestionKey === t.key);
                return (
                  <div key={t.key} style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: already ? "#98A2B3" : "#181D27" }}>{t.title}</span>
                      <span style={{ fontSize: 11, color: already ? "#D0D5DD" : "#475467" }}>{t.question}</span>
                    </div>
                    <button
                      disabled={already}
                      onClick={() => addSuggested(t)}
                      style={{ background: already ? "#F2F4F7" : "#FFFFFF", color: already ? "#98A2B3" : "#181D27", border: "1px solid #D5D7DA", padding: "4px 14px", borderRadius: 24, fontSize: 12, cursor: already ? "default" : "pointer" }}>
                      {already ? "Added" : "Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
