const { createClient } = require("@supabase/supabase-js");

exports.handler = async () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: "Missing Supabase env vars" }),
      };
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // IMPORTANT: change "cocktails" if your table is named differently
    const { error } = await supabase
      .from("cocktails")
      .select("id")
      .limit(1);

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, ts: new Date().toISOString() }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: String(e) }),
    };
  }
};
