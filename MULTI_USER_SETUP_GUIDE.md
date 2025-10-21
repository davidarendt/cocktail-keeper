# Multi-User Setup Guide

## 🎯 Complete User Registration & Role Management System

This setup allows users to register with email/password and admins to manage user roles.

## 📋 Setup Steps

### Step 1: Run Database Setup
Execute `setup_user_registration.sql` in your Supabase SQL Editor. This creates:
- Automatic profile creation for new users
- Role management functions
- Your admin profile

### Step 2: Enable Email/Password Auth
1. Go to **Supabase Dashboard** → Authentication → Settings
2. **Enable "Email" provider**
3. **Optionally disable "Magic Link"** if you want to remove it

### Step 3: Update Your App
Replace the magic link authentication with the new components:

```typescript
// In your App.tsx, replace the auth section with:
import { AuthForm } from "./components/AuthForm"
import { UserRegistration } from "./components/UserRegistration"
import { UserManagement } from "./components/UserManagement"

// Add state for auth flow
const [showRegister, setShowRegister] = useState(false)

// Replace the sign-in UI with:
{!session ? (
  showRegister ? (
    <UserRegistration 
      onSuccess={() => setShowRegister(false)}
      onCancel={() => setShowRegister(false)}
    />
  ) : (
    <AuthForm 
      onSuccess={() => {}} 
      onShowRegister={() => setShowRegister(true)}
    />
  )
) : (
  // Your main app content
)}
```

### Step 4: Add User Management to Settings
In your settings menu, add the Users section:

```typescript
// In your settings content:
{settingsTab === "users" && (
  <UserManagement currentUserEmail={session?.user?.email ?? ""} />
)}
```

## 🚀 How It Works

### For New Users:
1. **Click "Create Account"** on the sign-in form
2. **Enter email and password**
3. **Account is created** with "viewer" role by default
4. **Can sign in immediately** with email/password

### For Admins:
1. **Go to Settings → Users**
2. **See all registered users**
3. **Change roles** (Viewer → Editor → Admin)
4. **Manage permissions** for each user

## 👥 User Roles

- **Viewer**: Can view cocktails, search, filter
- **Editor**: Can create/edit cocktails, manage ingredients
- **Admin**: Can manage users, catalog items, everything

## 🔧 Features Included

✅ **User Registration** with email/password  
✅ **Automatic Profile Creation** for new users  
✅ **Role Management** in settings  
✅ **Secure Functions** for role updates  
✅ **Admin-Only User Management**  
✅ **No More Magic Links**  

## 🎯 Benefits

- **Self-service registration** for new users
- **Admin control** over user permissions
- **Standard authentication** flow
- **Scalable** for multiple users
- **Secure** role-based access

## 🚨 Security Notes

- **New users start as "viewer"** by default
- **Only admins** can change roles
- **Database functions** enforce permissions
- **RLS policies** protect all data

This gives you a complete multi-user system with proper role management!
