"use client";

import { useState } from "react";

export const defaultPipeline = [
  { name: "CV Screening", core: true, subStages: ["Waiting Submission", "For Review"] },
  { name: "AI Interview", core: true, subStages: ["Waiting Interview", "For Review"] },
  { name: "Final Human Interview", core: true, subStages: ["Waiting Schedule", "Waiting Interview", "For Review"] },
  { name: "Job Offer", core: true, subStages: ["For Final Review", "Waiting Offer Acceptance", "For Contract Signing", "Hired"] },
];

/*
  Minimal pipeline stages editor
  - Allows adding/removing sub-stages per stage
  - Keeps stage order fixed to stay minimal and compatible
*/
export default function PipelineStagesSection({ stages, setStages }: { stages: any[]; setStages: (s: any[]) => void; }) {
  const [newSub, setNewSub] = useState<string>("");
  const isCore = (stage: any) => !!stage.core;
  const COLUMN_WIDTH = 320;
  const CARD_MIN_HEIGHT = 420; // keeps columns visually uniform; substage list scrolls inside

  const addSubStage = (idx: number) => {
    const name = newSub.trim();
    if (!name) return;
    const updated = stages.map((s, i) => i === idx ? { ...s, subStages: [...s.subStages, name] } : s);
    setStages(updated);
    setNewSub("");
  };

  const removeSubStage = (idx: number, subIdx: number) => {
    const updated = stages.map((s, i) => i === idx ? { ...s, subStages: s.subStages.filter((_: any, j: number) => j !== subIdx) } : s);
    setStages(updated);
  };

  const renameSubStage = (idx: number, subIdx: number, value: string) => {
    const updated = stages.map((s, i) => {
      if (i !== idx) return s;
      const subs = [...s.subStages];
      subs[subIdx] = value;
      return { ...s, subStages: subs };
    });
    setStages(updated);
  };

  const addCustomStageAt = (insertIndex: number) => {
    const updated = [...stages];
    const newStage = {
      name: "Custom Stage",
      core: false,
      subStages: ["Waiting Interview", "For Review"],
    };
    updated.splice(insertIndex, 0, newStage);
    setStages(updated);
  };

  const renameStage = (idx: number, value: string) => {
    const updated = stages.map((s, i) => i === idx ? { ...s, name: value } : s);
    setStages(updated);
  };

  const removeStage = (idx: number) => {
    const stage = stages[idx];
    if (isCore(stage)) return; // guard
    const updated = stages.filter((_, i) => i !== idx);
    setStages(updated);
  };

  // Drag-and-drop reordering for custom stages (horizontal)
  const onDragStart = (e: any, idx: number) => {
    e.dataTransfer.setData("dragIndex", String(idx));
  };
  const onDragOver = (e: any) => {
    e.preventDefault();
  };
  const onDrop = (e: any, dropIndex: number) => {
    const dragIndex = Number(e.dataTransfer.getData("dragIndex"));
    if (isNaN(dragIndex) || dragIndex === dropIndex) return;
    const dragged = stages[dragIndex];
    if (isCore(dragged)) return; // don't move cores

    // Compute a safe insertion index: cannot replace a core; if target is core, adjust left/right
    let targetIndex = dropIndex;
    if (isCore(stages[targetIndex])) {
      // if dropping on a core column, place before for left half, after for right half
      // Simplify: insert before core if dragIndex < dropIndex, else after
      targetIndex = dragIndex < dropIndex ? targetIndex : targetIndex + 1;
    }

    const updated = [...stages];
    updated.splice(dragIndex, 1);
    // After removal, if targetIndex exceeds array length, clamp
    if (targetIndex > updated.length) targetIndex = updated.length;
    // If target points to a core, shift until non-core or end
    while (updated[targetIndex]?.core === true) targetIndex++;
    updated.splice(targetIndex, 0, dragged);
    setStages(updated);
  };

  const resetDefault = () => setStages(defaultPipeline);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#181D27" }}>Customize pipeline stages</span>
          <span style={{ fontSize: 12, color: "#667085" }}>Create, modify, reorder, and delete stages and sub-stages. Core stages are fixed and can’t be moved or edited.</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-sm" onClick={resetDefault} style={{ background: "#FFFFFF", border: "1px solid #D5D7DA", borderRadius: 24 }}>Restore to default</button>
          <button className="btn btn-sm" onClick={() => alert("Copy pipeline from existing job - coming soon") } style={{ background: "#FFFFFF", border: "1px solid #D5D7DA", borderRadius: 24 }}>Copy pipeline from existing job</button>
        </div>
      </div>

      {/* Horizontal scroll container for stages */}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "stretch", gap: 12, overflowX: "auto", padding: "6px 4px" }}>
        {stages.map((stage: any, idx: number) => (
          <>
            {/* Stage column */}
            <div
              key={`${stage.name}-${idx}`}
              style={{ minWidth: COLUMN_WIDTH - 20, flex: `0 0 ${COLUMN_WIDTH}px` }}
              draggable={!isCore(stage)}
              onDragStart={(e) => onDragStart(e, idx)}
              // Drop is handled on separators only to avoid accidental drops on core columns
            >
              <div className="layered-card-outer" style={{ height: "100%" }}>
                <div className="layered-card-middle" style={{ display: 'flex', flexDirection: 'column', minHeight: CARD_MIN_HEIGHT }}>
                  {/* Column header */}
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <i className={`la ${isCore(stage) ? 'la-lock' : 'la-grip-vertical'}`} style={{ color: isCore(stage) ? '#98A2B3' : '#181D27' }} />
                      {isCore(stage) ? (
                        <span style={{ fontSize: 16, color: "#181D27", fontWeight: 700 }}>{stage.name}</span>
                      ) : (
                        <input
                          className="form-control"
                          value={stage.name}
                          placeholder="Custom Stage"
                          onChange={(e) => renameStage(idx, e.target.value)}
                          style={{ fontWeight: 700 }}
                        />
                      )}
                    </div>
                    {!isCore(stage) && (
                      <button className="btn btn-sm" onClick={() => removeStage(idx)} style={{ background: "#FFFFFF", border: "1px solid #D5D7DA", borderRadius: 24 }}>Remove</button>
                    )}
                  </div>
                  {/* Core hint ribbon */}
                  {isCore(stage) ? (
                    <div style={{ fontSize: 11, color: "#98A2B3", marginTop: 4 }}>Core stage, cannot move</div>
                  ) : (
                    <div style={{ fontSize: 11, color: "#98A2B3", marginTop: 4 }}>Drag to reorder stage</div>
                  )}

                  {/* Substages list */}
                  <div className="layered-card-content" style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, overflowY: 'auto' }}>
                    <div style={{ fontSize: 12, color: "#667085" }}>Substages</div>
                    {stage.subStages.map((sub: string, sIdx: number) => (
                      <div key={`${stage.name}-${sIdx}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input className="form-control" value={sub} onChange={(e) => renameSubStage(idx, sIdx, e.target.value)} />
                        <button className="btn btn-sm" onClick={() => removeSubStage(idx, sIdx)} style={{ background: "#FFFFFF", border: "1px solid #D5D7DA", borderRadius: 24 }}>Remove</button>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input className="form-control" placeholder="Add sub-stage" value={newSub} onChange={(e) => setNewSub(e.target.value)} />
                      <button className="btn btn-sm" onClick={() => addSubStage(idx)} style={{ background: "#181D27", color: "#FFFFFF", borderRadius: 24 }}>Add</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Plus separator between columns */}
            {idx < stages.length - 1 && (
              <div key={`sep-${idx}`} style={{ width: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} onDragOver={onDragOver} onDrop={(e) => onDrop(e, idx + 1)}>
                <div style={{ flex: 1, width: 1, background: '#E9EAEB' }} />
                <button onClick={() => addCustomStageAt(idx + 1)} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #D5D7DA', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: 4 }}>+
                </button>
                <div style={{ flex: 1, width: 1, background: '#E9EAEB' }} />
              </div>
            )}
          </>
        ))}

        {/* Add stage at end */}
        <div style={{ width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => addCustomStageAt(stages.length)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #D5D7DA', background: '#FFFFFF', cursor: 'pointer' }}>+</button>
        </div>
      </div>
    </div>
  );
}
