// src/components/UsersAdmin.tsx
import React from "react"
import { inp, btnPrimary, btnSecondary, th, td, card, colors } from "../styles"
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
    <div style={card()}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
        <strong>User access</strong>
        <button onClick={reload} style={btnSecondary}>Refresh</button>
      </div>

      <input
        value={filter}
        onChange={(e)=>setFilter(e.target.value)}
        placeholder="Search by email or name…"
        style={{ ...inp, marginBottom:8 }}
      />

      {loading ? "Loading…" : (
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr>
              <th style={th}>Email</th>
              <th style={th}>Name</th>
              <th style={th}>Role</th>
              <th style={th}></th>
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
                    style={inp}
                  >
                    <option value="viewer">viewer (read/print)</option>
                    <option value="editor">editor (add/edit)</option>
                    <option value="admin">admin (manage users & settings)</option>
                  </select>
                </td>
                <td style={{ ...td, textAlign:"right", whiteSpace:"nowrap" }}>
                  <button onClick={()=>onRename(u.user_id)} style={btnPrimary}>Rename</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} style={{ ...td, color:colors.muted }}>No matches</td></tr>
            )}
          </tbody>
        </table>
      )}

      <p style={{ marginTop:10, fontSize:12, color:colors.muted }}>
        Invite flow: have new users visit the site and request a magic link to their email. Once they appear here, set their role.
      </p>
    </div>
  )
}
