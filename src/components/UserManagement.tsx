// src/components/UserManagement.tsx
import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"
import { inp, btnPrimary, btnSecondary, colors, card, th, td } from "../styles"

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
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor" | "admin">("viewer")
  const [inviteLoading, setInviteLoading] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    setError("")
    
    try {
      // Use a simpler query approach to avoid schema cache issues
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Profiles query error:', error)
        setError(`Database error: ${error.message}`)
      } else {
        console.log('Loaded profiles:', data)
        setUsers(data || [])
      }
    } catch (err) {
      console.error('Load users error:', err)
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

  async function createUser() {
    if (!inviteEmail.trim()) {
      setError("Please enter an email address")
      return
    }

    setInviteLoading(true)
    setError("")

    try {
      // Create user account directly with email/password
      const { data, error } = await supabase.auth.admin.createUser({
        email: inviteEmail,
        password: 'temp_password_123', // They'll need to change this
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          role: inviteRole,
          invited_by: currentUserEmail
        }
      })

      if (error) {
        setError(`Failed to create user: ${error.message}`)
      } else if (data.user) {
        // Create profile for the new user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            email: inviteEmail,
            role: inviteRole
          })

        if (profileError) {
          setError(`User created but profile failed: ${profileError.message}`)
        } else {
          setError("")
          setInviteEmail("")
          setInviteRole("viewer")
          // Refresh the user list
          await loadUsers()
          alert(`User account created for ${inviteEmail}! They can now sign in with their email and the temporary password: temp_password_123`)
        }
      }
    } catch (err) {
      setError("Failed to create user account")
    } finally {
      setInviteLoading(false)
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

      {/* Create New User Section */}
      <div style={{ 
        background: colors.panel, 
        padding: 16, 
        borderRadius: 8, 
        marginBottom: 20,
        border: `1px solid ${colors.border}`
      }}>
        <h3 style={{ margin: "0 0 12px 0", color: colors.text, fontSize: 16 }}>
          👤 Create New User
        </h3>
        <div style={{ display: "flex", gap: 12, alignItems: "end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: 12, color: colors.text }}>
              Email Address
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
              style={inp}
            />
          </div>
          <div style={{ minWidth: 120 }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: 12, color: colors.text }}>
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "viewer" | "editor" | "admin")}
              style={inp}
            >
              <option value="viewer">👁️ Viewer</option>
              <option value="editor">✏️ Editor</option>
              <option value="admin">👑 Admin</option>
            </select>
          </div>
          <button
            onClick={createUser}
            disabled={inviteLoading || !inviteEmail.trim()}
            style={{
              ...btnPrimary,
              opacity: inviteLoading || !inviteEmail.trim() ? 0.6 : 1,
              padding: "8px 16px"
            }}
          >
            {inviteLoading ? "⏳ Creating..." : "👤 Create User"}
          </button>
        </div>
        <div style={{ 
          marginTop: 8, 
          fontSize: 11, 
          color: colors.muted,
          fontStyle: "italic"
        }}>
          User will be created with temporary password: <strong>temp_password_123</strong>
        </div>
      </div>

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

      {/* User Management Guide */}
      <div style={{ 
        marginTop: 20, 
        padding: 16, 
        background: colors.panel,
        borderRadius: 8,
        border: `1px solid ${colors.border}`
      }}>
        <h4 style={{ margin: "0 0 12px 0", color: colors.text, fontSize: 14 }}>
          📋 User Management Guide
        </h4>
        <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.5 }}>
          <p style={{ margin: "0 0 8px 0" }}>
            <strong>👁️ Viewers:</strong> Can read and print cocktail recipes
          </p>
          <p style={{ margin: "0 0 8px 0" }}>
            <strong>✏️ Editors:</strong> Can add, edit, and delete cocktails and ingredients
          </p>
          <p style={{ margin: "0 0 8px 0" }}>
            <strong>👑 Admins:</strong> Can manage users, settings, and have full access
          </p>
          <p style={{ margin: "0 0 8px 0" }}>
            <strong>👤 User Creation:</strong> Create user accounts above with email and role. Users will be created with a temporary password (temp_password_123) that they should change on first login.
          </p>
        </div>
      </div>
    </div>
  )
}
