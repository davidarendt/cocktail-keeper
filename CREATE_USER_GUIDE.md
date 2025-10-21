# Create User Account Guide

## 🎯 Easiest Solution: Create User in Supabase Dashboard

### Step 1: Create User Account
1. **Go to Supabase Dashboard** → Authentication → Users
2. **Click "Add User"**
3. **Fill in the form:**
   - Email: `david@ologybrewing.com`
   - Password: `your-chosen-password`
   - Auto Confirm User: ✅ (checked)
4. **Click "Create User"**

### Step 2: Set Admin Role
1. **Go to Table Editor** → `profiles` table
2. **Find your user** (or add if not exists)
3. **Set role to "admin"**

### Step 3: Update App Authentication
Replace the magic link sign-in with email/password:

```javascript
// Replace the signIn function in your app
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  })
  if (error) {
    setErr(error.message)
  } else {
    setSession(data.session)
  }
}
```

## 🚀 Benefits of This Approach

✅ **No more magic links**  
✅ **Faster development**  
✅ **More reliable testing**  
✅ **Standard authentication flow**  
✅ **Easy to add more users later**  

## 🔧 Alternative: Development Bypass

For even faster development, you can temporarily bypass authentication entirely (see `dev_auth_bypass.js`).

## ⚠️ Security Note

- **Development bypass**: Only use for local development
- **Email/password**: Perfect for production
- **Magic links**: Can be disabled in Supabase settings
