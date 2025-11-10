"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";

/*
  TeamAccessSection (segmented step)
  - Minimal, additive component used by CareerForm segmented flow
  - Allows selecting org members for the career with simple roles
  - Persists selection back to parent via setTeamMembers

  Props:
    - teamMembers: Array<{ id: string, name: string, email: string, role: string }>
    - setTeamMembers: (members) => void
    - user: current user (to default as Job Owner)
    - orgID: string (used to fetch members)
*/
export default function TeamAccessSection({ teamMembers, setTeamMembers, user, orgID }: { teamMembers: any[]; setTeamMembers: (m: any[]) => void; user: any; orgID: string; }) {
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        setIsLoading(true);
        const res = await axios.post("/api/fetch-members", { orgID });
  const rows = (res.data || []).map((m: any) => ({ id: m._id || m.id, name: m.name, email: m.email, image: m.image }));
        setAllMembers(rows);
      } catch (e) {
        // Non-blocking error – keep UI functional for manual entry
        console.error("Failed to fetch members", e);
      } finally {
        setIsLoading(false);
      }
    };
    if (orgID) loadMembers();
  }, [orgID]);

  const availableMembers = useMemo(() => {
    const selectedIds = new Set((teamMembers || []).map((m: any) => m.id));
    return (allMembers || []).filter((m: any) => !selectedIds.has(m.id));
  }, [allMembers, teamMembers]);

  const addMember = (member: any) => {
    if (!member) return;
    if (teamMembers.find((m: any) => m.id === member.id)) return;
    const role = member.email === user?.email && !teamMembers.some((m: any) => m.role === "Job Owner") ? "Job Owner" : "Collaborator";
    setTeamMembers([...(teamMembers || []), { ...member, role }]);
  };

  const removeMember = (id: string) => {
    setTeamMembers(teamMembers.filter((m: any) => m.id !== id));
  };

  const updateRole = (id: string, role: string) => {
    // Ensure only one Job Owner at a time
    if (role === "Job Owner") {
      setTeamMembers(teamMembers.map((m: any) => ({ ...m, role: m.id === id ? "Job Owner" : (m.role === "Job Owner" ? "Collaborator" : m.role) })));
      return;
    }
    setTeamMembers(teamMembers.map((m: any) => (m.id === id ? { ...m, role } : m)));
  };

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <span style={{ fontSize: 14, color: "#344054" }}>Add members who can collaborate on this career.</span>
      {/* Add member */}
      <div style={{ display: "flex", flexDirection: "row", gap: 8, alignItems: "center" }}>
        <select
          className="form-control"
          disabled={isLoading || availableMembers.length === 0}
          value=""
          onChange={(e) => {
            const id = e.target.value;
            const mem = availableMembers.find((m: any) => `${m.id}` === id);
            if (mem) addMember(mem);
          }}
          style={{ maxWidth: 360 }}
        >
          <option value="">{isLoading ? "Loading members..." : "Add member"}</option>
          {availableMembers.map((m: any) => (
            <option key={m.id} value={m.id}>{`${m.name || m.email} (${m.email})`}</option>
          ))}
        </select>
      </div>
      {/* Members list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(teamMembers || []).length === 0 && (
          <div style={{ color: "#475467" }}>No members added yet.</div>
        )}
        {(teamMembers || []).map((m: any) => (
          <div key={m.id} style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", border: "1px solid #E9EAEB", borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#F2F4F7", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid #E9EAEB" }}>
                {m.image ? (
                  <img src={m.image} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#344054" }}>{(m.name || m.email || "?").charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 600, color: "#181D27" }}>{m.name || m.email}</span>
                <span style={{ color: "#475467", fontSize: 12 }}>{m.email}</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "row", gap: 8, alignItems: "center" }}>
              <select className="form-control" value={m.role} onChange={(e) => updateRole(m.id, e.target.value)} style={{ minWidth: 140 }}>
                <option>Job Owner</option>
                <option>Collaborator</option>
                <option>Viewer</option>
              </select>
              <button
                className="btn btn-sm"
                onClick={() => removeMember(m.id)}
                style={{ background: "#FFFFFF", border: "1px solid #D5D7DA", borderRadius: 24 }}
                title="Remove member"
              >
                <i className="la la-trash" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
