"use client";

import { useState } from "react";

/*
  ReviewCareerSection (Accordion style summary)
  - Mirrors final review design: each section in its own collapsible card
  - Adds badges, counts, and structured layout similar to provided reference images
*/
export default function ReviewCareerSection({ data, onEditSection }: { data: any, onEditSection?: (sectionId: string) => void }) {
  const {
    jobTitle,
    description,
    workSetup,
    workSetupRemarks,
    screeningSetting,
    employmentType,
    requireVideo,
    salaryNegotiable,
    minimumSalary,
    maximumSalary,
    country,
    province,
    city,
    teamMembers,
    cvSecretPrompt,
    preScreeningQuestions,
    aiSecretPrompt,
    pipelineStages,
    questions,
  } = data;

  // Collapsible section state
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  const totalInterviewQuestions = (questions || []).reduce(
    (acc: number, cat: any) => acc + (cat.questions?.length || 0),
    0
  );

  const renderBadge = (label: string) => (
    <span style={{
      background: "#F8F9FC",
      border: "1px solid #D5D7DA",
      color: "#181D27",
      fontSize: 11,
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: 24,
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    }}>{label}</span>
  );

  const Section = ({ id, title, children }: { id: string; title: string; children: any }) => (
    <div className="layered-card-outer" style={{ marginBottom: 8 }}>
      <div className="layered-card-middle" style={{ paddingTop: 6, paddingBottom: 10 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: collapsed[id] ? 0 : 6,
          }}
        >
          {/* Left side: Hide/Show toggle + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              aria-label={collapsed[id] ? "Show section" : "Hide section"}
              title={collapsed[id] ? "Show section" : "Hide section"}
              onClick={(e) => { e.stopPropagation(); toggle(id); }}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: '#FFFFFF',
                border: '1px solid #D5D7DA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <i className={`la la-eye${collapsed[id] ? '' : '-slash'}`} style={{ fontSize: 16, color: '#667085' }}></i>
            </button>
            <h4 style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{title}</h4>
          </div>
          {/* Right side: Edit pencil */}
          <button
            aria-label="Edit section"
            title="Edit section"
            onClick={(e) => { e.stopPropagation(); onEditSection?.(id); }}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: '#FFFFFF',
              border: '1px solid #D5D7DA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <i className="la la-pencil-alt" style={{ fontSize: 15, color: '#667085' }}></i>
          </button>
        </div>
        {!collapsed[id] && (
          <div className="layered-card-content" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Career Details */}
      <Section id="career" title="Career Details & Team Access">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#667085" }}>Job Title</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{jobTitle || "(No title)"}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#667085" }}>Employment Type</span>
            <span style={{ fontSize: 13 }}>{employmentType}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#667085" }}>Work Arrangement</span>
            <span style={{ fontSize: 13 }}>{workSetup}{workSetupRemarks && ` (${workSetupRemarks})`}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#667085" }}>Country</span>
            <span style={{ fontSize: 13 }}>{country}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#667085" }}>State / Province</span>
            <span style={{ fontSize: 13 }}>{province}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#667085" }}>City</span>
            <span style={{ fontSize: 13 }}>{city}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#667085" }}>Minimum Salary</span>
            <span style={{ fontSize: 13 }}>{salaryNegotiable ? "Negotiable" : (minimumSalary || 0)}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#667085" }}>Maximum Salary</span>
            <span style={{ fontSize: 13 }}>{salaryNegotiable ? "Negotiable" : (maximumSalary || 0)}</span>
          </div>
        </div>
        {/* Job Description */}
        {description && (
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#667085" }}>Job Description</span>
            <div
              style={{
                marginTop: 6,
                background: "#F8F9FC",
                border: "1px solid #E9EAEB",
                padding: 12,
                borderRadius: 8,
                fontSize: 13,
                lineHeight: 1.5,
              }}
              dangerouslySetInnerHTML={{ __html: description }}
            />
          </div>
        )}
        {/* Team Access */}
        <div style={{ marginTop: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#667085" }}>Team Access</span>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
            {(teamMembers || []).map((m: any) => (
              <div key={m.id || m.email} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '1px solid #E9EAEB', padding: '6px 10px', borderRadius: 40 }}>
                {m.image ? (
                  <img src={m.image} alt={m.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#181D27', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>{(m.name||'?').charAt(0)}</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{m.name}</span>
                  <span style={{ fontSize: 11, color: '#667085' }}>{m.role}</span>
                </div>
              </div>
            ))}
            {(!teamMembers || teamMembers.length === 0) && <span style={{ fontSize: 12, color: '#667085' }}>None</span>}
          </div>
        </div>
      </Section>

      {/* CV Review & Pre-Screening */}
      <Section id="cv" title="CV Review & Pre-Screening Questions">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#667085' }}>CV Screening</span>
            <span style={{ fontSize: 13 }}>Automatically endorse candidates who are {renderBadge(screeningSetting)} and above</span>
          </div>
          {cvSecretPrompt && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#667085', display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="la la-magic" style={{ color: '#E63B7A' }}></i> CV Secret Prompt
              </span>
              <ul style={{ marginLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
                {cvSecretPrompt.split(/\n+/).filter(Boolean).map((l: string, i: number) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#667085' }}>Pre-Screening Questions</span>
              {renderBadge(String((preScreeningQuestions || []).length))}
            </div>
            {(preScreeningQuestions || []).length > 0 ? (
              <ol style={{ marginLeft: 16, fontSize: 13, lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {preScreeningQuestions.map((q: any) => (
                  <li key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span>{q.question}</span>
                    {q.options && q.options.length > 0 && (
                      <ul style={{ marginLeft: 16 }}>
                        {q.options.map((o: string, i: number) => <li key={i}>{o}</li>)}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <span style={{ fontSize: 12, color: '#667085' }}>None</span>
            )}
          </div>
        </div>
      </Section>

      {/* AI Interview Setup */}
      <Section id="ai" title="AI Interview Setup">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#667085' }}>AI Interview Screening</span>
            <span style={{ fontSize: 13 }}>Automatically endorse candidates who are {renderBadge(screeningSetting)} and above</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#667085' }}>Require Video on Interview</span>
            <span style={{ fontSize: 13 }}>{requireVideo ? 'Yes' : 'No'}</span>
          </div>
          {aiSecretPrompt && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#667085', display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="la la-magic" style={{ color: '#E63B7A' }}></i> AI Interview Secret Prompt
              </span>
              <ul style={{ marginLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
                {aiSecretPrompt.split(/\n+/).filter(Boolean).map((l: string, i: number) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#667085' }}>Interview Questions</span>
              {renderBadge(String(totalInterviewQuestions))}
            </div>
            {totalInterviewQuestions > 0 ? (
              <div style={{ fontSize: 13, lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(questions || []).map((group: any) => (
                  group.questions?.length ? (
                    <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <strong style={{ fontSize: 12 }}>{group.category}</strong>
                      <ol style={{ marginLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {group.questions.map((q: any, i: number) => (
                          <li key={q.id}>{q.question}</li>
                        ))}
                      </ol>
                    </div>
                  ) : null
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12, color: '#667085' }}>None</span>
            )}
          </div>
        </div>
      </Section>

      {/* Pipeline Stages */}
      <Section id="pipeline" title="Pipeline Stages">
        <div style={{ display: 'flex', flexDirection: 'row', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {(pipelineStages || []).map((s: any) => (
            <div key={s.name} style={{ minWidth: 200, background: '#FFFFFF', border: '1px solid #E9EAEB', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <i className="la la-stream" style={{ fontSize: 16, color: '#181D27' }}></i>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {s.subStages.map((sub: string, i: number) => (
                  <div key={i} style={{ background: '#F8F9FC', border: '1px solid #E9EAEB', borderRadius: 24, padding: '6px 10px', fontSize: 12, fontWeight: 500, color: '#414651' }}>
                    {sub}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
