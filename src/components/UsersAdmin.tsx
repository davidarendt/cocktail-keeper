// src/components/UsersAdmin.tsx
import React from "react"
import { inp, btnPrimary, btnSecondary, th, td, card, colors, textGradient, shadows } from "../styles"
import type { Role } from "../types"

export type UserRow = {
  user_id: string
  email: string | null
  role: Role
  display_name: string | null
  created_at: string
}

type Props = {
  meEmail: string | null
  users: UserRow[]
  loading: boolean
  reload: () => void
  onChangeRole: (user_id: string, newRole: Role) => Promise<void>
  onRename: (user_id: string) => Promise<void>
}

export function UsersAdmin({ meEmail, users, loading, reload, onChangeRole, onRename }: Props) {
  const [filter, setFilter] = React.useState("")
  const filtered = users.filter(u =>
    !filter.trim() ? true :
    (u.email || "").toLowerCase().includes(filter.toLowerCase()) ||
    (u.display_name || "").toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div style={{
      ...card(),
      background: colors.glass,
      backdropFilter: "blur(10px)",
      border: `1px solid ${colors.glassBorder}`,
      boxShadow: shadows.lg
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: `1px solid ${colors.border}`
      }}>
        <h3 style={{ 
          margin: 0,
          fontSize: 18,
          fontWeight: 700,
          ...textGradient(colors.textGradient)
        }}>
          👥 User Management
        </h3>
        <button onClick={reload} style={{
          ...btnSecondary,
          fontSize: 12,
          padding: "8px 16px"
        }}>
          🔄 Refresh
        </button>
      </div>

      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{ 
          position: "absolute", 
          left: 12, 
          top: "50%", 
          transform: "translateY(-50%)", 
          color: colors.muted 
        }}>
          🔍
        </span>
        <input
          value={filter}
          onChange={(e)=>setFilter(e.target.value)}
          placeholder="Search by email or name…"
          style={{ ...inp, paddingLeft: 40 }}
        />
      </div>

      {loading ? (
        <div style={{ 
          textAlign: "center", 
          padding: "40px 20px",
          color: colors.muted 
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          Loading users...
        </div>
      ) : (
        <table style={{ 
          width: "100%", 
          borderCollapse: "collapse",
          background: colors.panel,
          borderRadius: 8,
          overflow: "hidden"
        }}>
          <thead style={{ 
            background: `linear-gradient(135deg, ${colors.panel} 0%, ${colors.glass} 100%)`
          }}>
            <tr>
              <th style={th}>📧 Email</th>
              <th style={th}>👤 Name</th>
              <th style={th}>🔐 Role</th>
              <th style={th}>⚡ Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.user_id} style={{ borderTop:`1px solid ${colors.border}` }}>
                <td style={td}>
                  {u.email || "—"}
                  {u.email && u.email === meEmail ? <span style={{ marginLeft:8, color:colors.muted }}>(you)</span> : null}
                </td>
                <td style={td}>{u.display_name || "—"}</td>
                <td style={td}>
                  <select
                    value={u.role}
                    onChange={(e)=> onChangeRole(u.user_id, e.target.value as Role)}
                    style={{
                      ...inp,
                      fontSize: 12,
                      padding: "6px 8px",
                      minWidth: 140
                    }}
                  >
                    <option value="viewer">👁️ Viewer (read/print)</option>
                    <option value="editor">✏️ Editor (add/edit)</option>
                    <option value="admin">👑 Admin (manage users & settings)</option>
                  </select>
                </td>
                <td style={{ ...td, textAlign:"right", whiteSpace:"nowrap" }}>
                  <button 
                    onClick={()=>onRename(u.user_id)} 
                    style={{
                      ...btnPrimary,
                      fontSize: 11,
                      padding: "6px 12px"
                    }}
                  >
                    ✏️ Rename
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} style={{ ...td, color:colors.muted }}>No matches</td></tr>
            )}
          </tbody>
        </table>
      )}

      <div style={{ 
        marginTop: 16, 
        padding: 12, 
        background: colors.panel,
        borderRadius: 8,
        border: `1px solid ${colors.border}`
      }}>
        <p style={{ 
          margin: 0, 
          fontSize: 12, 
          color: colors.muted,
          lineHeight: 1.4
        }}>
          <strong>📋 User Management Guide:</strong><br/>
          • <strong>Viewers:</strong> Can read and print cocktails<br/>
          • <strong>Editors:</strong> Can add, edit, and delete cocktails<br/>
          • <strong>Admins:</strong> Can manage users and settings<br/><br/>
          <strong>🔄 Invite Flow:</strong> New users visit the site and request a magic link. Once they appear here, set their role.
        </p>
      </div>
    </div>
  )
}
