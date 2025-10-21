# 🧪 Fresh Setup Test Checklist

## ✅ Database Setup Tests

### 1. **Check Your Admin Profile**
Run this in Supabase SQL Editor:
```sql
SELECT user_id, email, role FROM profiles WHERE email = 'david@ologybrewing.com';
```
**Expected Result:** Should show your user ID, email, and role = 'admin'

### 2. **Check Default Data**
```sql
-- Check catalog items
SELECT kind, name FROM catalog_items ORDER BY kind, position;

-- Check tags
SELECT name, color FROM tags;
```
**Expected Result:** Should see methods, glasses, ice, garnishes, units, and default tags

### 3. **Check RLS Policies**
```sql
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```
**Expected Result:** Should see policies for all tables

## 🚀 App Functionality Tests

### 1. **Login & Role Detection**
- Open your app in browser
- Check browser console for role information
- **Expected:** Should see "Loaded role: admin" in console

### 2. **Settings Menu Access**
- Navigate to Settings
- **Expected:** Should see all settings tabs (Methods, Glasses, Ice, Garnishes, Units, Tags, Ingredients, Users)

### 3. **Units Management**
- Go to Settings → Units
- Try adding a new unit (e.g., "cup", "pint", "liter")
- **Expected:** Should add successfully without errors

### 4. **Cocktail Creation**
- Go back to main view
- Click "Add Cocktail" or "+" button
- Try creating a cocktail with ingredients
- **Expected:** Should work without UUID errors

### 5. **Search & Filter**
- Test the compact search interface
- Try the advanced search (click "🔍 Filters")
- **Expected:** Should work smoothly

## 🐛 Common Issues & Solutions

### If you see "Permission denied" errors:
1. Check your profile exists: `SELECT * FROM profiles WHERE email = 'david@ologybrewing.com';`
2. Verify role is 'admin': `SELECT role FROM profiles WHERE email = 'david@ologybrewing.com';`

### If you see UUID errors:
1. Check units are loaded: `SELECT * FROM catalog_items WHERE kind = 'unit';`
2. Verify app is using the fresh schema

### If settings don't show:
1. Check your role in browser console
2. Verify you're logged in as the correct user

## 📊 Success Indicators

✅ **Admin profile created successfully**  
✅ **Default data loaded**  
✅ **RLS policies active**  
✅ **App shows admin role**  
✅ **Can add units without errors**  
✅ **Can create cocktails without UUID errors**  
✅ **Search and filters work**  

## 🎯 Next Steps After Testing

If everything works:
- You're all set! The fresh setup is complete
- You can start using the app normally
- All permission issues should be resolved

If you encounter issues:
- Note the specific error messages
- Check the browser console for details
- Let me know what's not working and I'll help fix it
