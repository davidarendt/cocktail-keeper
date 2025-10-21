// src/components/UserRegistration.tsx
import { useState } from "react"
import { supabase } from "../supabaseClient"
import { inp, btnPrimary, btnSecondary, colors, card } from "../styles"

type Props = {
  onSuccess: () => void
  onCancel: () => void
}

export function UserRegistration({ onSuccess, onCancel }: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (password !== confirmPassword) {
      setError("Passwords don't match")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      })

      if (error) {
        setError(error.message)
      } else {
        onSuccess()
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={card()}>
      <h2 style={{ margin: "0 0 20px 0", color: colors.text }}>
        🚀 Create Account
      </h2>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", "flexDirection": "column", gap: 16 }}>
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
            placeholder="Choose a secure password"
            style={inp}
            required
            minLength={6}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 8, color: colors.text, fontWeight: 500 }}>
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            style={inp}
            required
            minLength={6}
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
            type="button"
            onClick={onCancel}
            style={btnSecondary}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={btnPrimary}
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  )
}
