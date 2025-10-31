import { createClient } from '@supabase/supabase-js'

// Expects POST body: { email: string, role: 'viewer'|'editor'|'admin', invited_by?: string }
// Requires env vars on Netlify:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY

const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { email, role, invited_by } = JSON.parse(event.body || '{}') as { email?: string; role?: string; invited_by?: string }
    if (!email || !role) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing email or role' }) }
    }

    const supabaseUrl = process.env.SUPABASE_URL as string
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) }
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    // Send invite - user will receive email, set password themselves
    const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { invited_by, intended_role: role }
    })
    if (inviteErr || !inviteData?.user?.id) {
      return { statusCode: 400, body: JSON.stringify({ error: inviteErr?.message || 'Failed to invite user' }) }
    }

    // Create or upsert profile with chosen role
    const userId = inviteData.user.id
    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert({ user_id: userId, role }, { onConflict: 'user_id' })

    if (profileErr) {
      return { statusCode: 200, body: JSON.stringify({ warning: `Invited, but profile role upsert failed: ${profileErr.message}`, userId }) }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, userId }) }
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err?.message || err) }) }
  }
}

export { handler }


