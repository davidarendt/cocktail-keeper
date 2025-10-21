// src/components/UserManagement.tsx
import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"
import { inp, btnSecondary, colors, card, th, td } from "../styles"

type User = {
  user_id: string
  email: string
  role: string
  created_at: string
}

type Props = {
  currentUserEmail: string
}

export function UserManagement({ currentUserEmail }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    setError("")
    
    try {
      const { data, error } = await supabase.rpc('get_all_users')
      
      if (error) {
        setError(error.message)
      } else {
        setUsers(data || [])
      }
    } catch (err) {
      setError("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  async function updateUserRole(userId: string, newRole: string) {
    try {
      const { error } = await supabase.rpc('update_user_role', {
        target_user_id: userId,
        new_role: newRole
      })
      
      if (error) {
        setError(error.message)
      } else {
        // Refresh the users list
        await loadUsers()
      }
    } catch (err) {
      setError("Failed to update user role")
    }
  }

  return (
    <div style={card()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: colors.text }}>
          👥 User Management
        </h2>
        <button onClick={loadUsers} style={btnSecondary}>
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div style={{ 
          padding: 12, 
          background: "#FEE2E2", 
          color: "#DC2626", 
          borderRadius: 6,
          marginBottom: 16,
          fontSize: 14
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div>Loading users...</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Email</th>
              <th style={th}>Role</th>
              <th style={th}>Joined</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id} style={{ borderTop: `1px solid ${colors.border}` }}>
                <td style={td}>
                  {user.email}
                  {user.email === currentUserEmail && (
                    <span style={{ 
                      marginLeft: 8, 
                      fontSize: 12, 
                      color: colors.accent,
                      fontWeight: 500
                    }}>
                      (You)
                    </span>
                  )}
                </td>
                <td style={td}>
                  <select
                    value={user.role}
                    onChange={(e) => updateUserRole(user.user_id, e.target.value)}
                    style={{
                      ...inp,
                      fontSize: 12,
                      padding: "4px 8px",
                      minWidth: 100
                    }}
                    disabled={user.email === currentUserEmail}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td style={td}>
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td style={td}>
                  {user.email !== currentUserEmail && (
                    <button
                      onClick={() => updateUserRole(user.user_id, user.role === 'admin' ? 'viewer' : 'admin')}
                      style={{
                        ...btnSecondary,
                        fontSize: 11,
                        padding: "4px 8px"
                      }}
                    >
                      {user.role === 'admin' ? '👑 Remove Admin' : '👑 Make Admin'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td style={{ ...td, color: colors.muted }} colSpan={4}>
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
