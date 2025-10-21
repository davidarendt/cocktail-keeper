// DEVELOPMENT AUTH BYPASS
// Add this to your app for development only - REMOVE IN PRODUCTION

// In your App.tsx, replace the auth setup with this for development:

// Development bypass - REMOVE IN PRODUCTION
const [session, setSession] = useState({
  user: {
    id: '0dc4f9b0-bf09-4b54-ad5d-0b455858bc4f',
    email: 'david@ologybrewing.com'
  }
});
const [role, setRole] = useState('admin');

// Comment out the real auth setup for development:
/*
useEffect(() => {
  supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
  return () => subscription.unsubscribe()
}, [])
*/
