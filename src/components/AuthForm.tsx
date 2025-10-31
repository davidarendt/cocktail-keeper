// src/components/AuthForm.tsx
import { useState } from "react"
import { supabase } from "../supabaseClient"
// Local auth fallback removed
import { inp, btnPrimary, colors, card } from "../styles"

type Props = { onSuccess: () => void }

export function AuthForm({ onSuccess }: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (!error) { onSuccess(); return }
      setError("Invalid login credentials")
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={card()}>
      <h2 style={{ margin: "0 0 20px 0", color: colors.text }}>
        🔐 Sign In
      </h2>
      
      <form onSubmit={handleSignIn} style={{ display: "flex", "flexDirection": "column", gap: 16 }}>
        <div>
          <label style={{ display: "block", marginBottom: 8, color: colors.text, fontWeight: 500 }}>
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your-email@example.com"
            style={inp}
            required
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 8, color: colors.text, fontWeight: 500 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            style={inp}
            required
          />
        </div>

        {error && (
          <div style={{ 
            padding: 12, 
            background: "#FEE2E2", 
            color: "#DC2626", 
            borderRadius: 6,
            fontSize: 14
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            type="submit"
            style={btnPrimary}
            disabled={loading}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </div>
      </form>
    </div>
  )
}
