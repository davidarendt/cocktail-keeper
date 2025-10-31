const STORAGE_KEY = 'ck_local_user'

export type LocalUserSession = {
  email: string
  role: 'viewer'|'editor'|'admin'
}

export function saveLocalSession(sess: LocalUserSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sess))
}

export function getLocalSession(): LocalUserSession | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function clearLocalSession() {
  localStorage.removeItem(STORAGE_KEY)
}

// password helpers removed


