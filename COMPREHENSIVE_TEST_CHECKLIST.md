# 🧪 Comprehensive Test Checklist

## 🎯 Pre-Testing Setup

### Database Setup Verification
- [ ] Run `complete_fresh_schema.sql` in Supabase SQL Editor
- [ ] Run `setup_user_registration.sql` in Supabase SQL Editor
- [ ] Verify your admin profile exists: `SELECT * FROM profiles WHERE email = 'david@ologybrewing.com';`
- [ ] Check default data loaded: `SELECT kind, name FROM catalog_items ORDER BY kind;`
- [ ] Verify RLS policies: `SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';`

### Supabase Configuration
- [ ] Enable Email/Password authentication in Supabase Dashboard
- [ ] Disable Magic Link authentication (optional)
- [ ] Verify environment variables are set in Netlify

## 🔐 Authentication Testing

### Sign-In Flow
- [ ] **Open app** - should show sign-in form
- [ ] **Enter credentials** (david@ologybrewing.com + password)
- [ ] **Click "Sign In"** - should redirect to main app
- [ ] **Check console** - should show "Loaded role: admin"
- [ ] **Verify UI** - should show admin controls and settings

### User Registration Flow
- [ ] **Click "Create Account"** on sign-in form
- [ ] **Enter new user details** (test@example.com + password)
- [ ] **Submit registration** - should show success message
- [ ] **Check database** - verify new user profile created with "viewer" role
- [ ] **Sign in as new user** - should work and show viewer permissions

## 👥 User Role Testing

### Admin Capabilities
- [ ] **Access Settings** - should see all tabs (Methods, Glasses, Ice, Garnishes, Units, Tags, Ingredients, Users)
- [ ] **Manage Users** - go to Settings → Users, should see all registered users
- [ ] **Change User Roles** - promote/demote users between Viewer/Editor/Admin
- [ ] **Add Catalog Items** - should work for all types (methods, glasses, units, etc.)
- [ ] **Edit/Delete Items** - should work for all catalog items

### Editor Capabilities
- [ ] **Create Cocktails** - should be able to add new cocktails
- [ ] **Edit Cocktails** - should be able to modify existing cocktails
- [ ] **Manage Ingredients** - should work in ingredients admin
- [ ] **Access Settings** - should see most settings tabs (not Users)
- [ ] **Cannot manage users** - should not see Users tab or be able to change roles

### Viewer Capabilities
- [ ] **View Cocktails** - should see cocktail list/cards
- [ ] **Search/Filter** - should work with all search features
- [ ] **Cannot create cocktails** - should not see "Add Cocktail" button
- [ ] **Cannot access settings** - should not see Settings menu
- [ ] **Read-only access** - can view but not modify anything

## 🍸 Cocktail Management Testing

### Creating Cocktails
- [ ] **Basic Info** - name, method, glass, ice, garnish
- [ ] **Ingredients** - add multiple ingredients with amounts and units
- [ ] **Units** - test all unit types (oz, ml, dash, drop, etc.)
- [ ] **Tags** - assign multiple tags to cocktails
- [ ] **Price/Special Date** - set pricing and special occasion dates
- [ ] **Ology Menu Item** - mark as menu item
- [ ] **Save cocktail** - should save without UUID errors

### Editing Cocktails
- [ ] **Load existing cocktail** - should populate all fields correctly
- [ ] **Modify ingredients** - add/remove/change ingredient amounts
- [ ] **Update tags** - add/remove tags
- [ ] **Change details** - update name, method, glass, etc.
- [ ] **Save changes** - should update without errors

### Cocktail Display
- [ ] **Card view** - cocktails display properly with all info
- [ ] **List view** - toggle between card and list views
- [ ] **Search by name** - should find cocktails by name
- [ ] **Filter by ingredients** - should filter by ingredient search
- [ ] **Filter by tags** - should filter by selected tags
- [ ] **Sort options** - should sort by special date, name, etc.

## 🔍 Search & Filter Testing

### Compact Search
- [ ] **Main search bar** - search cocktails by name
- [ ] **View toggle** - switch between cards and list
- [ ] **Filters button** - should expand advanced search

### Advanced Search
- [ ] **Ingredient filters** - add multiple ingredient filters
- [ ] **Method filter** - filter by preparation method
- [ ] **Glass filter** - filter by glass type
- [ ] **Tag filter** - filter by cocktail tags
- [ ] **Special toggle** - show only special cocktails
- [ ] **Menu toggle** - show only Ology menu items
- [ ] **Sort options** - test all sorting methods
- [ ] **Clear filters** - should reset all filters

### Active Filters Display
- [ ] **Filter badges** - should show active filters as removable badges
- [ ] **Remove filters** - clicking X should remove individual filters
- [ ] **Clear all** - should remove all active filters

## ⚙️ Settings Management Testing

### Catalog Items (Methods, Glasses, Ice, Garnishes, Units)
- [ ] **Add new items** - should work for all types
- [ ] **Edit existing items** - rename items
- [ ] **Delete items** - remove items
- [ ] **Toggle active/inactive** - disable items without deleting
- [ ] **Drag to reorder** - change item order
- [ ] **Only one section visible** - clicking a settings tab should hide others

### Tags Management
- [ ] **Add new tags** - create tags with custom colors
- [ ] **Edit tags** - change name and color in popup
- [ ] **Delete tags** - remove tags
- [ ] **Color picker** - should work for tag colors
- [ ] **Tag display** - should show colors in cocktail forms

### Ingredients Management
- [ ] **Search and add** - use the new search-and-add functionality
- [ ] **Add from search** - type new ingredient, click "Add [name]"
- [ ] **Merge ingredients** - combine duplicate ingredients
- [ ] **Edit/delete** - modify existing ingredients

### User Management (Admin Only)
- [ ] **View all users** - see registered users list
- [ ] **Change user roles** - promote/demote users
- [ ] **Role restrictions** - users can't change their own role
- [ ] **Refresh users** - update user list

## 🚨 Error Handling Testing

### Permission Errors
- [ ] **Non-admin trying to access settings** - should be blocked
- [ ] **Viewer trying to create cocktails** - should be blocked
- [ ] **Invalid role operations** - should show appropriate errors

### Data Validation
- [ ] **Empty required fields** - should show validation errors
- [ ] **Invalid unit values** - should prevent UUID errors
- [ ] **Duplicate names** - should handle conflicts gracefully
- [ ] **Network errors** - should show user-friendly messages

### Authentication Errors
- [ ] **Invalid credentials** - should show error message
- [ ] **Expired sessions** - should redirect to sign-in
- [ ] **Permission denied** - should show appropriate messages

## 📱 UI/UX Testing

### Responsive Design
- [ ] **Mobile view** - should work on small screens
- [ ] **Tablet view** - should work on medium screens
- [ ] **Desktop view** - should work on large screens

### User Experience
- [ ] **Loading states** - should show loading indicators
- [ ] **Success messages** - should confirm successful operations
- [ ] **Error messages** - should be clear and helpful
- [ ] **Navigation** - should be intuitive and consistent

## 🎯 Performance Testing

### Database Performance
- [ ] **Fast loading** - app should load quickly
- [ ] **Smooth search** - search should be responsive
- [ ] **Efficient queries** - no slow database operations

### App Performance
- [ ] **Smooth interactions** - no lag in UI
- [ ] **Fast builds** - deployment should complete quickly
- [ ] **Optimized bundle** - app should be reasonably sized

## ✅ Success Criteria

### All Tests Pass When:
- [ ] **No permission errors** when using admin features
- [ ] **No UUID errors** when creating/editing cocktails
- [ ] **All user roles work** as expected
- [ ] **Search and filters work** smoothly
- [ ] **Settings management works** for all catalog items
- [ ] **User registration works** for new users
- [ ] **Role management works** for admins
- [ ] **App loads quickly** and runs smoothly

## 🐛 Common Issues & Solutions

### If you see permission errors:
1. Check your profile: `SELECT * FROM profiles WHERE email = 'david@ologybrewing.com';`
2. Verify role is 'admin'
3. Check RLS policies are active

### If you see UUID errors:
1. Check units are loaded: `SELECT * FROM catalog_items WHERE kind = 'unit';`
2. Verify app is using fresh schema
3. Check ingredient line validation

### If settings don't work:
1. Verify you're logged in as admin
2. Check browser console for errors
3. Verify database functions exist

## 📊 Test Results Tracking

**Date:** ___________  
**Tester:** ___________  
**Environment:** ___________  

**Passed:** ___ / ___ tests  
**Failed:** ___ / ___ tests  
**Issues Found:** ___________  
**Notes:** ___________  

---

## 🚀 Ready for Production?

- [ ] All tests pass
- [ ] No critical errors
- [ ] Performance is acceptable
- [ ] User experience is smooth
- [ ] Security is properly implemented

**Status:** ⏳ Testing in progress / ✅ Ready for production / ❌ Issues found
