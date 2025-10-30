import { createClient } from '@supabase/supabase-js'

// This function requires the following environment variables on Netlify:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY (never expose in client)

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

    // Create the auth user
    const { data: createRes, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: 'temp_password_123',
      email_confirm: true,
      user_metadata: { role, invited_by }
    })

    if (createErr || !createRes?.user?.id) {
      return { statusCode: 400, body: JSON.stringify({ error: createErr?.message || 'Failed to create user' }) }
    }

    // Insert profile row
    const { error: profileErr } = await supabase
      .from('profiles')
      .insert({ user_id: createRes.user.id, role, display_name: null })

    if (profileErr) {
      return { statusCode: 200, body: JSON.stringify({ warning: `User created but profile failed: ${profileErr.message}` }) }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, userId: createRes.user.id }) }
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err?.message || err) }) }
  }
}

export { handler }


