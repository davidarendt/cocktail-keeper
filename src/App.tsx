// src/App.tsx
import { useEffect, useRef, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "./supabaseClient"

import {
  appWrap, container, inp, btnPrimary, btnSecondary, dangerBtn, th, td, card,
  cocktailCard, specialBadge, ologyBadge, priceDisplay, ingredientList, shadows
} from "./styles"
import { colors } from "./styles"

import { SettingsBlock } from "./components/SettingsBlock"
import { CocktailForm } from "./components/CocktailForm"
import { IngredientsAdmin } from "./components/IngredientsAdmin"
import { UsersAdmin, type UserRow } from "./components/UsersAdmin"
import { LoadingSpinner } from "./components/LoadingSpinner"
import { CocktailCardSkeleton } from "./components/SkeletonLoader"
import { TouchGestures } from "./components/TouchGestures"

import { ng, normalizeSearchTerm } from "./utils/text"

import type {
  Role, Cocktail as TCocktail, IngredientLine, CatalogItemRow as CatalogItem, Ingredient, Tag
} from "./types"

export default function App() {
  // ---------- AUTH ----------
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<Role>("viewer")
  const [showRegister, setShowRegister] = useState(false)
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  
  // Move these state declarations to the top to avoid hoisting issues
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('cocktail-keeper-theme')
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })
  const [formOpen, setFormOpen] = useState(false)
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // self-healing role loader
  useEffect(() => {
    (async () => {
      if (!session) { 
        console.log("No session, setting role to viewer")
        setRole("viewer"); 
        return 
      }

      console.log("Loading role for user:", session.user.id, session.user.email)

      const { data: rows, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .limit(1)

      if (error) { 
        console.warn("profiles select failed:", error.message); 
        setRole("viewer"); 
        return 
      }

      console.log("Profile query result:", rows)

      let currentRole: string | undefined = rows && (rows[0] as any)?.role
      if (!currentRole) {
        console.log("No role found, creating new profile with viewer role")
        const { error: insErr } = await supabase.from("profiles").insert({ user_id: session.user.id, role: "viewer" })
        if (insErr) { 
          console.warn("profiles insert failed:", insErr.message); 
          setRole("viewer"); 
          return 
        }
        currentRole = "viewer"
      }
      
      console.log("Setting role to:", currentRole)
      setRole(String(currentRole).trim().toLowerCase() as Role)
    })()
  }, [session])

  async function signOut() { await supabase.auth.signOut() }

  // ---------- THEME ----------
  function toggleTheme() {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    localStorage.setItem('cocktail-keeper-theme', newTheme ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light')
  }

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  // ---------- KEYBOARD SHORTCUTS ----------
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only handle shortcuts when not in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return
      }

      // Ctrl/Cmd + N: New cocktail
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        if (role === 'editor' || role === 'admin') {
          openAddForm()
        }
      }

      // Ctrl/Cmd + F: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
      }

      // Ctrl/Cmd + K: Focus name search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        const nameSearchInput = document.querySelector('input[placeholder*="Name"]') as HTMLInputElement
        if (nameSearchInput) {
          nameSearchInput.focus()
          nameSearchInput.select()
        }
      }

      // Escape: Close forms
      if (e.key === 'Escape') {
        if (formOpen) {
          setFormOpen(false)
        }
        if (showAdvancedSearch) {
          setShowAdvancedSearch(false)
        }
      }

      // Arrow keys for navigation (when not in forms)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const cocktailCards = document.querySelectorAll('.cocktail-card')
        if (cocktailCards.length > 0) {
          const currentIndex = Array.from(cocktailCards).findIndex(card => 
            card === document.activeElement || card.contains(document.activeElement)
          )
          const nextIndex = e.key === 'ArrowDown' 
            ? Math.min(currentIndex + 1, cocktailCards.length - 1)
            : Math.max(currentIndex - 1, 0)
          
          if (nextIndex >= 0 && nextIndex < cocktailCards.length) {
            (cocktailCards[nextIndex] as HTMLElement).focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [role, formOpen, showAdvancedSearch])


  // ---------- AUDIT LOGGING ----------
  async function logAudit(action: string, details: any, resourceType: string, resourceId?: string) {
    if (!session?.user?.id) return
    
    try {
      await supabase.from('audit_logs').insert({
        user_id: session.user.id,
        user_email: session.user.email,
        action,
        details,
        resource_type: resourceType,
        resource_id: resourceId,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to log audit:', error)
    }
  }

  // ---------- BACKUP/RESTORE ----------
  const [backupLoading, setBackupLoading] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [backupData, setBackupData] = useState<any>(null)

  async function createBackup() {
    setBackupLoading(true)
    setErr("")
    
    try {
      console.log("Creating backup...")
      
      // Get all data from all tables
      const [cocktailsResult, ingredientsResult, tagsResult, catalogResult, profilesResult] = await Promise.all([
        supabase.from("cocktails").select("*"),
        supabase.from("ingredients").select("*"),
        supabase.from("tags").select("*"),
        supabase.from("catalog_items").select("*"),
        supabase.from("profiles").select("*")
      ])
      
      // Get recipe ingredients and cocktail tags
      const [recipeIngredientsResult, cocktailTagsResult] = await Promise.all([
        supabase.from("recipe_ingredients").select("*"),
        supabase.from("cocktail_tags").select("*")
      ])
      
      const backup = {
        timestamp: new Date().toISOString(),
        version: "1.0",
        data: {
          cocktails: cocktailsResult.data || [],
          ingredients: ingredientsResult.data || [],
          tags: tagsResult.data || [],
          catalog_items: catalogResult.data || [],
          profiles: profilesResult.data || [],
          recipe_ingredients: recipeIngredientsResult.data || [],
          cocktail_tags: cocktailTagsResult.data || []
        }
      }
      
      setBackupData(backup)
      console.log("Backup created successfully")
      setErr("✅ Backup created successfully! You can download it below.")
      
    } catch (error) {
      console.error("Backup error:", error)
      setErr(`Backup failed: ${error}`)
    } finally {
      setBackupLoading(false)
    }
  }

  async function downloadBackup() {
    if (!backupData) {
      setErr("No backup data available. Please create a backup first.")
      return
    }
    
    try {
      const dataStr = JSON.stringify(backupData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `cocktail-keeper-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setErr("✅ Backup downloaded successfully!")
    } catch (error) {
      console.error("Download error:", error)
      setErr(`Download failed: ${error}`)
    }
  }

  async function restoreFromFile() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      setRestoreLoading(true)
      setErr("")
      
      try {
        const text = await file.text()
        const backup = JSON.parse(text)
        
        if (!backup.data || !backup.timestamp) {
          setErr("Invalid backup file format.")
          return
        }
        
        if (!confirm(`This will replace ALL current data with the backup from ${new Date(backup.timestamp).toLocaleString()}. This action cannot be undone. Continue?`)) {
          return
        }
        
        console.log("Starting restore...")
        
        // Clear existing data (in reverse order of dependencies)
        await Promise.all([
          supabase.from("cocktail_tags").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
          supabase.from("recipe_ingredients").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
          supabase.from("cocktails").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
          supabase.from("tags").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
          supabase.from("ingredients").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
          supabase.from("catalog_items").delete().neq("id", "00000000-0000-0000-0000-000000000000")
        ])
        
        // Restore data (in order of dependencies)
        await supabase.from("catalog_items").insert(backup.data.catalog_items).select()
        const { data: restoredIngredients } = await supabase.from("ingredients").insert(backup.data.ingredients).select()
        await supabase.from("tags").insert(backup.data.tags).select()
        const { data: restoredCocktails } = await supabase.from("cocktails").insert(backup.data.cocktails).select()
        
        if (restoredCocktails && restoredIngredients) {
          // Map old IDs to new IDs for relationships
          const cocktailIdMap = new Map()
          const ingredientIdMap = new Map()
          
          backup.data.cocktails.forEach((oldCocktail: any, index: number) => {
            if (restoredCocktails[index]) {
              cocktailIdMap.set(oldCocktail.id, restoredCocktails[index].id)
            }
          })
          
          backup.data.ingredients.forEach((oldIngredient: any, index: number) => {
            if (restoredIngredients[index]) {
              ingredientIdMap.set(oldIngredient.id, restoredIngredients[index].id)
            }
          })
          
          // Restore relationships with new IDs
          const recipeIngredients = backup.data.recipe_ingredients.map((ri: { cocktail_id: string, ingredient_id: string, amount: number, unit: string, position: number }) => ({
            ...ri,
            cocktail_id: cocktailIdMap.get(ri.cocktail_id),
            ingredient_id: ingredientIdMap.get(ri.ingredient_id)
          })).filter((ri: any) => ri.cocktail_id && ri.ingredient_id)
          
          const cocktailTags = backup.data.cocktail_tags.map((ct: { cocktail_id: string, tag_id: string }) => ({
            ...ct,
            cocktail_id: cocktailIdMap.get(ct.cocktail_id)
          })).filter((ct: any) => ct.cocktail_id)
          
          await Promise.all([
            supabase.from("recipe_ingredients").insert(recipeIngredients),
            supabase.from("cocktail_tags").insert(cocktailTags)
          ])
        }
        
        console.log("Restore completed successfully")
        setErr("✅ Data restored successfully! Please refresh the page.")
        
        // Reload all data
        await Promise.all([
          loadCatalog(),
          loadTags(),
          loadIngredients()
        ])
        
      } catch (error) {
        console.error("Restore error:", error)
        setErr(`Restore failed: ${error}`)
      } finally {
        setRestoreLoading(false)
      }
    }
    
    input.click()
  }

  // ---------- INGREDIENT SUBSTITUTIONS ----------
  
  // Common ingredient substitutions
  const ingredientSubstitutions: { [key: string]: string[] } = {
    'vodka': ['gin', 'white rum', 'tequila blanco'],
    'gin': ['vodka', 'white rum', 'tequila blanco'],
    'rum': ['bourbon', 'whiskey', 'brandy'],
    'bourbon': ['whiskey', 'rum', 'brandy'],
    'whiskey': ['bourbon', 'rum', 'brandy'],
    'tequila': ['mezcal', 'vodka', 'gin'],
    'mezcal': ['tequila', 'vodka', 'gin'],
    'brandy': ['cognac', 'whiskey', 'rum'],
    'cognac': ['brandy', 'whiskey', 'rum'],
    'triple sec': ['cointreau', 'grand marnier', 'orange liqueur'],
    'cointreau': ['triple sec', 'grand marnier', 'orange liqueur'],
    'grand marnier': ['cointreau', 'triple sec', 'orange liqueur'],
    'simple syrup': ['agave syrup', 'honey syrup', 'maple syrup'],
    'agave syrup': ['simple syrup', 'honey syrup', 'maple syrup'],
    'honey syrup': ['simple syrup', 'agave syrup', 'maple syrup'],
    'lime juice': ['lemon juice', 'citrus juice'],
    'lemon juice': ['lime juice', 'citrus juice'],
    'orange juice': ['grapefruit juice', 'pineapple juice'],
    'cranberry juice': ['pomegranate juice', 'cherry juice'],
    'club soda': ['tonic water', 'seltzer water'],
    'tonic water': ['club soda', 'seltzer water'],
    'ginger beer': ['ginger ale', 'ginger syrup + soda'],
    'ginger ale': ['ginger beer', 'ginger syrup + soda'],
    'angostura bitters': ['orange bitters', 'aromatic bitters'],
    'orange bitters': ['angostura bitters', 'aromatic bitters'],
    'mint': ['basil', 'cilantro', 'thyme'],
    'basil': ['mint', 'cilantro', 'thyme'],
    'cilantro': ['mint', 'basil', 'parsley'],
    'sugar': ['honey', 'agave', 'maple syrup'],
    'honey': ['sugar', 'agave', 'maple syrup'],
    'agave': ['honey', 'sugar', 'maple syrup']
  }

  function getSubstitutionSuggestions(ingredientName: string): string[] {
    const normalizedName = ingredientName.toLowerCase().trim()
    return ingredientSubstitutions[normalizedName] || []
  }

  // ---------- PHOTO MANAGEMENT ----------
  const [cocktailPhotos, setCocktailPhotos] = useState<{ [key: string]: string }>({})

  async function uploadPhoto(cocktailId: string, file: File) {
    setErr("")
    
    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${cocktailId}-${Date.now()}.${fileExt}`
      
      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('cocktail-photos')
        .upload(fileName, file)
      
      if (error) {
        setErr(`Upload failed: ${error.message}`)
        return
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('cocktail-photos')
        .getPublicUrl(fileName)
      
      if (urlData?.publicUrl) {
        // Update cocktail with photo URL
        const { error: updateError } = await supabase
          .from('cocktails')
          .update({ photo_url: urlData.publicUrl })
          .eq('id', cocktailId)
        
        if (updateError) {
          setErr(`Failed to save photo URL: ${updateError.message}`)
          return
        }
        
        // Update local state
        setCocktailPhotos(prev => ({
          ...prev,
          [cocktailId]: urlData.publicUrl
        }))
        
        setErr("✅ Photo uploaded successfully!")
        
        // Log audit
        await logAudit(
          'UPLOAD_PHOTO',
          { cocktail_id: cocktailId, photo_url: urlData.publicUrl },
          'cocktail',
          cocktailId
        )
      }
    } catch (error) {
      setErr(`Upload error: ${error}`)
    } finally {
    }
  }

  async function deletePhoto(cocktailId: string) {
    if (!confirm('Delete this photo?')) return
    
    setErr("")
    
    try {
      // Get current photo URL
      const { data: cocktail } = await supabase
        .from('cocktails')
        .select('photo_url')
        .eq('id', cocktailId)
        .single()
      
      if (cocktail?.photo_url) {
        // Extract filename from URL
        const fileName = cocktail.photo_url.split('/').pop()
        
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from('cocktail-photos')
          .remove([fileName])
        
        if (deleteError) {
          console.error('Storage delete error:', deleteError)
        }
      }
      
      // Remove photo URL from cocktail
      const { error: updateError } = await supabase
        .from('cocktails')
        .update({ photo_url: null })
        .eq('id', cocktailId)
      
      if (updateError) {
        setErr(`Failed to remove photo: ${updateError.message}`)
        return
      }
      
      // Update local state
      setCocktailPhotos(prev => {
        const newState = { ...prev }
        delete newState[cocktailId]
        return newState
      })
      
      setErr("✅ Photo deleted successfully!")
      
      // Log audit
      await logAudit(
        'DELETE_PHOTO',
        { cocktail_id: cocktailId },
        'cocktail',
        cocktailId
      )
    } catch (error) {
      setErr(`Delete error: ${error}`)
    } finally {
    }
  }

  // ---------- DATA MIGRATION ----------
  const [migrationLoading, setMigrationLoading] = useState(false)
  const [migrationResults, setMigrationResults] = useState<any>(null)

  async function findDuplicateIngredients() {
    setMigrationLoading(true)
    setErr("")
    
    try {
      const { data: ingredients } = await supabase
        .from('ingredients')
        .select('name')
        .order('name')
      
      if (!ingredients) return
      
      const duplicates: { [key: string]: string[] } = {}
      const normalized: { [key: string]: string } = {}
      
      ingredients.forEach(ing => {
        const normalizedName = ing.name.toLowerCase().trim()
        if (normalizedName in normalized) {
          if (!duplicates[normalizedName]) {
            duplicates[normalizedName] = [normalized[normalizedName]]
          }
          duplicates[normalizedName].push(ing.name)
        } else {
          normalized[normalizedName] = ing.name
        }
      })
      
      setMigrationResults({
        type: 'duplicate_ingredients',
        data: Object.entries(duplicates).map(([key, names]) => ({
          normalized: key,
          duplicates: names
        }))
      })
      
      setErr(`Found ${Object.keys(duplicates).length} sets of duplicate ingredients`)
    } catch (error) {
      setErr(`Migration error: ${error}`)
    } finally {
      setMigrationLoading(false)
    }
  }

  async function findInconsistentUnits() {
    setMigrationLoading(true)
    setErr("")
    
    try {
      const { data: recipeIngredients } = await supabase
        .from('recipe_ingredients')
        .select('unit')
        .not('unit', 'is', null)
      
      const { data: catalogUnits } = await supabase
        .from('catalog_items')
        .select('name')
        .eq('kind', 'unit')
        .eq('active', true)
      
      if (!recipeIngredients || !catalogUnits) return
      
      const activeUnits = new Set(catalogUnits.map(u => u.name))
      const inconsistentUnits = recipeIngredients
        .map(ri => ri.unit)
        .filter(unit => !activeUnits.has(unit))
        .filter((unit, index, arr) => arr.indexOf(unit) === index) // unique
      
      setMigrationResults({
        type: 'inconsistent_units',
        data: inconsistentUnits.map(unit => ({
          unit,
          count: recipeIngredients.filter(ri => ri.unit === unit).length
        }))
      })
      
      setErr(`Found ${inconsistentUnits.length} inconsistent units`)
    } catch (error) {
      setErr(`Migration error: ${error}`)
    } finally {
      setMigrationLoading(false)
    }
  }

  async function findOrphanedData() {
    setMigrationLoading(true)
    setErr("")
    
    try {
      const [cocktailsResult, ingredientsResult, recipeIngredientsResult] = await Promise.all([
        supabase.from('cocktails').select('id'),
        supabase.from('ingredients').select('id'),
        supabase.from('recipe_ingredients').select('cocktail_id, ingredient_id')
      ])
      
      if (!cocktailsResult.data || !ingredientsResult.data || !recipeIngredientsResult.data) return
      
      const cocktailIds = new Set(cocktailsResult.data.map(c => c.id))
      const ingredientIds = new Set(ingredientsResult.data.map(i => i.id))
      
      const orphanedRecipeIngredients = recipeIngredientsResult.data.filter(ri => 
        !cocktailIds.has(ri.cocktail_id) || !ingredientIds.has(ri.ingredient_id)
      )
      
      setMigrationResults({
        type: 'orphaned_data',
        data: {
          orphaned_recipe_ingredients: orphanedRecipeIngredients.length,
          total_cocktails: cocktailIds.size,
          total_ingredients: ingredientIds.size
        }
      })
      
      setErr(`Found ${orphanedRecipeIngredients.length} orphaned recipe ingredients`)
    } catch (error) {
      setErr(`Migration error: ${error}`)
    } finally {
      setMigrationLoading(false)
    }
  }

  async function cleanOrphanedData() {
    if (!confirm('This will delete orphaned recipe ingredients. Continue?')) return
    
    setMigrationLoading(true)
    setErr("")
    
    try {
      const [cocktailsResult, ingredientsResult] = await Promise.all([
        supabase.from('cocktails').select('id'),
        supabase.from('ingredients').select('id')
      ])
      
      if (!cocktailsResult.data || !ingredientsResult.data) return
      
      const cocktailIds = new Set(cocktailsResult.data.map(c => c.id))
      const ingredientIds = new Set(ingredientsResult.data.map(i => i.id))
      
      // Delete orphaned recipe ingredients
      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .not('cocktail_id', 'in', `(${Array.from(cocktailIds).join(',')})`)
        .or(`ingredient_id.not.in.(${Array.from(ingredientIds).join(',')})`)
      
      if (error) {
        setErr(`Cleanup error: ${error.message}`)
        return
      }
      
      setErr('✅ Orphaned data cleaned successfully')
      await findOrphanedData() // Refresh results
    } catch (error) {
      setErr(`Cleanup error: ${error}`)
    } finally {
      setMigrationLoading(false)
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setErr("")

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      })

      if (error) {
        setErr(error.message)
      }
    } catch (err) {
      setErr("An unexpected error occurred")
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setErr("")

    if (authPassword.length < 6) {
      setErr("Password must be at least 6 characters")
      setAuthLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
      })

      if (error) {
        setErr(error.message)
      } else {
        setErr("✅ Account created! You can now sign in.")
        setShowRegister(false)
        setAuthEmail("")
        setAuthPassword("")
      }
    } catch (err) {
      setErr("An unexpected error occurred")
    } finally {
      setAuthLoading(false)
    }
  }


  // ---------- ROUTING ----------
  const [route, setRoute] = useState<"main"|"settings">("main")
  const [settingsTab, setSettingsTab] = useState<"methods"|"glasses"|"ices"|"units"|"tags"|"ingredients"|"users"|"backup"|"migration">("ingredients")
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#3B82F6")


  // ---------- CATALOGS ----------
  const [methods, setMethods] = useState<string[]>([])
  const [glasses, setGlasses] = useState<string[]>([])
  const [ices, setIces] = useState<string[]>([])
  const [units, setUnits] = useState<string[]>(["oz","barspoon","dash","drop","ml"]) // default fallback

  useEffect(() => { loadCatalog(); loadTags() }, [])
  async function loadCatalog() {
    console.log("Loading catalog data...")
    const { data } = await supabase
      .from("catalog_items")
      .select("*")
      .eq("active", true)
      .order("kind")
      .order("position")
    
    if (data) {
      const rows = data as CatalogItem[]
      console.log("Loaded catalog items:", rows.length)
      
      const newMethods = rows.filter(r=>r.kind==="method").map(r=>r.name)
      const newGlasses = rows.filter(r=>r.kind==="glass").map(r=>r.name)
      const newIces = rows.filter(r=>r.kind==="ice").map(r=>r.name)
      
      console.log("Updating catalog state:", { 
        methods: newMethods.length, 
        glasses: newGlasses.length, 
        ices: newIces.length
      })
      
      setMethods(newMethods)
      setGlasses(newGlasses)
      setIces(newIces)
      
      // Load units with fallback to defaults
      const unitNames = rows.filter(r=>r.kind==="unit").map(r=>r.name)
      console.log("Loading units:", { unitNames, totalRows: rows.length, unitRows: rows.filter(r=>r.kind==="unit") })
      if (unitNames.length > 0) {
        setUnits(unitNames)
      } else {
        // Keep default units if none in database
        console.log("No units in database, using defaults")
        setUnits(["oz","barspoon","dash","drop","ml"])
      }
    } else {
      console.error("Failed to load catalog data")
    }
  }

  async function loadTags() {
    const { data } = await supabase
      .from("tags")
      .select("*")
      .order("name")
    setAvailableTags(data || [])
  }

  // ---------- COCKTAILS ----------
  const [rows, setRows] = useState<TCocktail[]>([])
  const [specs, setSpecs] = useState<Record<string, string[]>>({})
  const [cocktailTags, setCocktailTags] = useState<Record<string, Tag[]>>({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  // search / filters / view / sort
  const [q, setQ] = useState("")
  const [nameSearch, setNameSearch] = useState("")
  const [ingredientFilters, setIngredientFilters] = useState<string[]>([])
  const [fMethod, setFMethod] = useState("Any")
  const [fGlass, setFGlass] = useState("")
  const [specialOnly, setSpecialOnly] = useState(false)
  const [ologyOnly, setOlogyOnly] = useState(false)
  const [priceMin, setPriceMin] = useState("")
  const [priceMax, setPriceMax] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [view, setView] = useState<"cards"|"list">("cards")
  const [sortBy, setSortBy] = useState<"special_desc" | "special_asc" | "name_asc" | "name_desc">("special_desc")

  useEffect(() => { load() }, [q, nameSearch, fMethod, fGlass, specialOnly, ologyOnly, sortBy, ingredientFilters, selectedTags, priceMin, priceMax])
  async function load() {
    setLoading(true); setErr("")
    let query = supabase.from("cocktails").select("*")

    if (fMethod !== "Any" && fMethod.trim()) query = query.eq("method", fMethod)
    if (fGlass.trim()) query = query.eq("glass", fGlass.trim())
    if (specialOnly) query = query.not("last_special_on","is",null)
    if (ologyOnly) query = query.eq("is_ology_recipe", true)
    if (priceMin.trim()) query = query.gte("price", parseFloat(priceMin))
    if (priceMax.trim()) query = query.lte("price", parseFloat(priceMax))
    if (nameSearch.trim()) {
      // Use fuzzy search for cocktail names
      const { fuzzySearch } = await import('./utils/fuzzySearch')
      const allCocktails = await supabase.from("cocktails").select("*").limit(1000)
      
      if (allCocktails.data && allCocktails.data.length > 0) {
        const fuzzyResults = fuzzySearch(
          allCocktails.data,
          nameSearch.trim(),
          (cocktail: any) => cocktail.name,
          { threshold: 0.4, caseSensitive: false, normalize: true }
        )
        
        const fuzzyIds = fuzzyResults.map(r => r.item.id)
        if (fuzzyIds.length > 0) {
          query = query.in("id", fuzzyIds)
        } else {
          // Fallback to exact match if no fuzzy results
          query = query.ilike("name", `%${nameSearch.trim()}%`)
        }
      } else {
        query = query.ilike("name", `%${nameSearch.trim()}%`)
      }
    }
    
    // Tag filtering - cocktails must have ALL selected tags
    if (selectedTags.length > 0) {
      const { data: taggedCocktails } = await supabase
        .from("cocktail_tags")
        .select("cocktail_id")
        .in("tag_id", selectedTags)
      
      if (taggedCocktails?.length) {
        // Group by cocktail_id and count tags
        const cocktailTagCounts = taggedCocktails.reduce((acc: Record<string, number>, ct: any) => {
          acc[ct.cocktail_id] = (acc[ct.cocktail_id] || 0) + 1
          return acc
        }, {})
        
        // Only include cocktails that have ALL the selected tags
        const cocktailIds = Object.keys(cocktailTagCounts)
          .filter(id => cocktailTagCounts[id] === selectedTags.length)
        
        if (cocktailIds.length > 0) {
          query = query.in("id", cocktailIds)
        } else {
          query = query.eq("id", -1) // no results
        }
      } else {
        query = query.eq("id", -1) // no results
      }
    }

    if (sortBy === "name_asc") {
      query = query.order("name", { ascending: true })
    } else if (sortBy === "name_desc") {
      query = query.order("name", { ascending: false })
    } else {
      const asc = sortBy === "special_asc"
      query = query
        .order("last_special_on", { ascending: asc, nullsFirst: asc })
        .order("name", { ascending: true })
    }
    query = query.limit(500)

    const { data: base, error } = await query
    if (error) { setErr(error.message); setLoading(false); return }

    let finalRows = (base || []) as TCocktail[]

    // Ingredient search (multiple filters or single fuzzy)
    if (ingredientFilters.length > 0 && finalRows.length) {
      const ids = finalRows.map(c=>c.id)
      const { data: rec, error: rerr } = await supabase
        .from("recipe_ingredients")
        .select("cocktail_id, ingredient:ingredients(name)")
        .in("cocktail_id", ids)
      if (rerr) { setErr(rerr.message); setLoading(false); return }
      
      // Group by cocktail_id and count matching ingredients using fuzzy search
      const { isFuzzyMatch } = await import('./utils/fuzzySearch')
      const cocktailIngredientCounts = (rec || []).reduce((acc: Record<string, number>, r: any) => {
        const ingredientName = (r.ingredient?.name || "").toLowerCase()
        const matches = ingredientFilters.some(filter => {
          // Use fuzzy search for better typo tolerance
          return isFuzzyMatch(filter, ingredientName, 0.6) || 
                 ingredientName.includes(filter.toLowerCase()) ||
                 ingredientName.replace(/\s+/g,"").includes(normalizeSearchTerm(filter))
        })
        
        if (matches) {
          acc[r.cocktail_id] = (acc[r.cocktail_id] || 0) + 1
        }
        return acc
      }, {})
      
      // Only include cocktails that have ALL the filtered ingredients
      const matchIds = new Set(
        Object.keys(cocktailIngredientCounts)
          .filter(id => cocktailIngredientCounts[id] === ingredientFilters.length)
      )
      finalRows = finalRows.filter(c => matchIds.has(c.id))
    } else if (q.trim() && finalRows.length) {
      // Fallback to single ingredient search for backward compatibility
      const ids = finalRows.map(c=>c.id)
      const { data: rec, error: rerr } = await supabase
        .from("recipe_ingredients")
        .select("cocktail_id, ingredient:ingredients(name)")
        .in("cocktail_id", ids)
      if (rerr) { setErr(rerr.message); setLoading(false); return }
      const typed = q.trim().toLowerCase()
      const typedC = normalizeSearchTerm(q.trim())
      const { isFuzzyMatch } = await import('./utils/fuzzySearch')
      const matchIds = new Set(
        (rec || []).filter((r:any) => {
          const n = (r.ingredient?.name || "").toLowerCase()
          const words = n.split(/\s+/)
          const wordStart = words.some((w: string) => w.startsWith(typed))
          const contains = n.includes(typed) || n.replace(/\s+/g,"").includes(typedC)
          const fuzzyMatch = isFuzzyMatch(q.trim(), r.ingredient?.name || "", 0.6)
          return wordStart || contains || fuzzyMatch
        }).map((r:any)=> r.cocktail_id)
      )
      finalRows = finalRows.filter(c => matchIds.has(c.id))
    }

    setRows(finalRows)
    await loadSpecsFor(finalRows.map(c=>c.id))
    await loadTagsForCocktails(finalRows.map(c=>c.id))
    setLoading(false)
  }

  async function loadSpecsFor(ids: string[]) {
    if (!ids.length) { setSpecs({}); return }
    const { data } = await supabase
      .from("recipe_ingredients")
      .select("cocktail_id, amount, unit, position, ingredient:ingredients(name)")
      .in("cocktail_id", ids)
      .order("position", { ascending: true })
    
    console.log('Loading specs for cocktails:', ids.length, 'ingredients found:', data?.length)
    if (data && data.length > 0) {
      console.log('Sample ingredient data:', data.slice(0, 3))
    }
    
    const map: Record<string, string[]> = {}
    for (const r of (data || []) as any[]) {
      const k = r.cocktail_id as string
      const amtNum = Number(r.amount)
      const amtStr = Number.isFinite(amtNum) ? String(amtNum) : String(r.amount ?? "")
      const unit = r.unit ? ` ${r.unit}` : ""
      const ing = r.ingredient?.name ? ` ${r.ingredient.name}` : ""
      const line = `${amtStr}${unit}${ing}`.trim()
      ;(map[k] ||= []).push(line)
    }
    setSpecs(map)
  }

  async function loadTagsForCocktails(ids: string[]) {
    if (!ids.length) { setCocktailTags({}); return }
    const { data } = await supabase
      .from("cocktail_tags")
      .select("cocktail_id, tag:tags(id, name, color)")
      .in("cocktail_id", ids)
    const grouped = (data || []).reduce((acc: Record<string, Tag[]>, r: any) => {
      if (!acc[r.cocktail_id]) acc[r.cocktail_id] = []
      if (r.tag) acc[r.cocktail_id].push(r.tag)
      return acc
    }, {})
    setCocktailTags(grouped)
  }

  // ---------- FORM ----------
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [method, setMethod] = useState("")
  const [glass, setGlass] = useState("")
  const [ice, setIce] = useState("")
  const [notes, setNotes] = useState("")
  const [price, setPrice] = useState("")
  const [specialDate, setSpecialDate] = useState("") // YYYY-MM-DD
  const [isOlogyRecipe, setOlogyRecipe] = useState(false)
  const [lines, setLines] = useState<IngredientLine[]>([
    { ingredientName:"", amount:"", unit:"oz", position:1 }
  ])

  function resetForm() {
    setEditingId(null)
    setName(""); setMethod("")
    setGlass(""); setIce(""); setNotes("")
    setPrice(""); setSpecialDate(""); setOlogyRecipe(false)
    setLines([{ ingredientName:"", amount:"", unit:"oz", position:1 }])
    setSelectedTags([])
  }
  function openAddForm() { resetForm(); setFormOpen(true) }

  async function startEdit(c: TCocktail) {
    resetForm()
    setEditingId(c.id)
    setFormOpen(true)
    setName(c.name)
    setMethod(c.method || "")
    setGlass(c.glass || ""); setIce(c.ice || ""); setNotes(c.notes || "")
    setPrice(c.price == null ? "" : String(c.price))
    setSpecialDate(c.last_special_on || "")
    setOlogyRecipe(c.is_ology_recipe || false)
    
    // Load tags for this cocktail
    const { data: cocktailTags } = await supabase
      .from("cocktail_tags")
      .select("tag_id")
      .eq("cocktail_id", c.id)
    setSelectedTags(cocktailTags?.map(ct => ct.tag_id) || [])

    const { data } = await supabase
      .from("recipe_ingredients")
      .select("amount, unit, position, ingredient:ingredients(name)")
      .eq("cocktail_id", c.id)
      .order("position", { ascending: true })

    const mapped: IngredientLine[] = (data||[]).map((r:any,i:number)=>{
      // Ensure unit is valid - use first available unit or "oz" as fallback
      let unitValue = r.unit?.trim()
      if (!unitValue || unitValue === "" || unitValue === "-1" || !units.includes(unitValue)) {
        unitValue = units.length > 0 ? units[0] : "oz"
      }
      
      return {
        ingredientName: r.ingredient?.name || "",
        amount: String(r.amount ?? ""),
        unit: unitValue,
        position: typeof r.position === "number" ? r.position : (i + 1)
      }
    })
    setLines(mapped.length ? mapped : [{ ingredientName:"", amount:"", unit:"oz", position:1 }])
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function remove(cId: string) {
    if (!confirm("Delete this cocktail?")) return
    
    // Get cocktail details for audit log
    const { data: cocktail } = await supabase.from("cocktails").select("name").eq("id", cId).single()
    
    const { error } = await supabase.from("cocktails").delete().eq("id", cId)
    if (error) { setErr(error.message); return }
    
    // Log audit
    await logAudit(
      'DELETE_COCKTAIL',
      {
        cocktail_name: cocktail?.name || 'Unknown',
        cocktail_id: cId
      },
      'cocktail',
      cId
    )
    
    setRows(prev=> prev.filter(r=> r.id !== cId))
    if (editingId === cId) { resetForm(); setFormOpen(false) }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setErr("")
    if (!name.trim()) { setErr("Name required"); return }
    if (!method.trim()) { setErr("Choose a method"); return }
    
    // Validate cocktail name length
    if (name.trim().length < 2) {
      setErr("Cocktail name must be at least 2 characters long.");
      return;
    }
    
    if (name.trim().length > 100) {
      setErr("Cocktail name must be less than 100 characters.");
      return;
    }
    
    // Check for duplicate cocktail names (case-insensitive)
    if (!editingId) { // Only check for duplicates when creating new cocktails
      const { data: existingCocktails } = await supabase
        .from("cocktails")
        .select("name")
        .ilike("name", name.trim())
      
      if (existingCocktails && existingCocktails.length > 0) {
        setErr(`Cocktail "${name}" already exists. Please use a different name.`);
        return;
      }
    }

    // Check if user is authenticated
    if (!session) {
      setErr("You must be logged in to save cocktails");
      return;
    }

    // Debug: Log user info
    console.log("User session:", {
      userId: session.user.id,
      email: session.user.email,
      role: role
    });

    // Check if user has permission to create cocktails
    if (role !== "editor" && role !== "admin") {
      setErr("You don't have permission to create cocktails. Your role: " + role);
      return;
    }

    const cocktail = {
      id: editingId ?? undefined,
      name: name.trim(),
      method: method.trim(),
      glass: glass.trim() || null,
      ice: ice.trim() || null,
      notes: notes.trim() || null,
      price: price === "" ? null : Number(price),
      last_special_on: specialDate || null,
      is_ology_recipe: isOlogyRecipe
    }

    const { data: up, error } = await supabase
      .from("cocktails")
      .upsert(cocktail, { onConflict: "name" })
      .select()
      .single()
    
    if (error) {
      console.error("Save error:", error);
      if (error.message.includes("row-level security")) {
        setErr("Permission denied. Please check your user role and database policies.");
      } else {
        setErr(error.message || "Save failed");
      }
      return;
    }
    
    if (!up) { 
      setErr("Save failed - no data returned"); 
      return;
    }
    const cocktailId = (up as any).id as string

    await supabase.from("recipe_ingredients").delete().eq("cocktail_id", cocktailId)

    // Check for duplicate ingredients in the same cocktail
    const ingredientNames = lines
      .map(ln => ln.ingredientName.trim().toLowerCase())
      .filter(name => name.length > 0)
    
    const duplicates = ingredientNames.filter((name, index) => 
      ingredientNames.indexOf(name) !== index
    )
    
    if (duplicates.length > 0) {
      setErr(`Duplicate ingredients found: ${[...new Set(duplicates)].join(", ")}. Please remove duplicates.`);
      return;
    }
    
    let pos: number = 1
    for (const ln of lines) {
      const ingName = ln.ingredientName.trim()
      const amtNum = ln.amount === "" ? NaN : Number(ln.amount)
      if (!ng(ingName) || !Number.isFinite(amtNum)) continue
      
      // Validate unit - ensure it's not empty or invalid
      const unitValue = ln.unit?.trim()
      if (!unitValue || unitValue === "" || unitValue === "-1") {
        console.error("Invalid unit value:", unitValue);
        setErr(`Invalid unit for ingredient "${ingName}". Please select a valid unit.`);
        return;
      }
      
      // Validate unit is in the allowed units list
      if (!units.includes(unitValue)) {
        console.error("Unit not in allowed list:", unitValue, "Allowed:", units);
        setErr(`Unit "${unitValue}" is not valid. Please select from: ${units.join(", ")}`);
        return;
      }
      
      // Validate amount is positive
      if (amtNum <= 0) {
        setErr(`Amount for ingredient "${ingName}" must be greater than 0.`);
        return;
      }
      
      // Validate amount is reasonable (not too large)
      if (amtNum > 1000) {
        setErr(`Amount for ingredient "${ingName}" seems too large (${amtNum}). Please check the value.`);
        return;
      }
      
      // Insert ingredient with error handling
      const { error: ingError } = await supabase.from("ingredients").upsert({ name: ingName }, { onConflict: "name" })
      if (ingError) {
        console.error("Ingredient insert error:", ingError);
        setErr(`Failed to save ingredient "${ingName}": ${ingError.message}`);
        return;
      }
      
      const { data: ingRow, error: ingSelectError } = await supabase.from("ingredients").select("id").eq("name", ingName).single()
      if (ingSelectError || !(ingRow && (ingRow as any).id)) {
        console.error("Ingredient select error:", ingSelectError);
        setErr(`Failed to find ingredient "${ingName}"`);
        return;
      }
      
      // Insert recipe ingredient with error handling
      const { error: recipeError } = await supabase.from("recipe_ingredients").insert({
        cocktail_id: cocktailId,
        ingredient_id: (ingRow as any).id as string,
        amount: amtNum,
        unit: unitValue,
        position: pos
      })
      
      if (recipeError) {
        console.error("Recipe ingredient insert error:", recipeError);
        setErr(`Failed to save recipe ingredient: ${recipeError.message}`);
        return;
      }
      
      pos = pos + 1
    }

    // Handle tags
    await supabase.from("cocktail_tags").delete().eq("cocktail_id", cocktailId)
    if (selectedTags.length > 0) {
      const tagInserts = selectedTags.map(tagId => ({
        cocktail_id: cocktailId,
        tag_id: tagId
      }))
      const { error: tagError } = await supabase.from("cocktail_tags").insert(tagInserts)
      if (tagError) {
        console.error("Tag insert error:", tagError);
        setErr(`Failed to save tags: ${tagError.message}`);
        return;
      }
    }

    // Log audit
    await logAudit(
      editingId ? 'UPDATE_COCKTAIL' : 'CREATE_COCKTAIL',
      {
        cocktail_name: cocktail.name,
        method: cocktail.method,
        glass: cocktail.glass,
        ice: cocktail.ice,
        price: cocktail.price,
        is_ology_recipe: cocktail.is_ology_recipe,
        ingredient_count: lines.length
      },
      'cocktail',
      cocktailId
    )

    await load()
    resetForm()
    setFormOpen(false)
  }

  // ingredient suggestions
  async function queryIngredients(term: string): Promise<string[]> {
    const t = term.trim()
    if (!t) return []
    
    // Get all ingredients for fuzzy search
    const { data } = await supabase
      .from("ingredients")
      .select("name")
      .limit(200) // Get more ingredients for better fuzzy matching

    if (!data || data.length === 0) return []

    const ingredientNames = data.map((d: any) => d.name as string)
    
    // Use fuzzy search for better typo tolerance
    const { fuzzySearchStrings } = await import('./utils/fuzzySearch')
    const fuzzyResults = fuzzySearchStrings(ingredientNames, t, {
      threshold: 0.3, // Lower threshold for more results
      caseSensitive: false,
      normalize: true
    })

    // Also include exact matches for immediate results
    const exactMatches = ingredientNames.filter(name => 
      name.toLowerCase().includes(t.toLowerCase())
    )

    // Combine and deduplicate results
    const allResults = new Set([
      ...exactMatches,
      ...fuzzyResults.map(r => r.item)
    ])

    return Array.from(allResults).slice(0, 10)
  }

  // ---------- SETTINGS (catalogs) ----------
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [catLoading, setCatLoading] = useState(false)
  const [newName, setNewName] = useState<Partial<Record<"method"|"glass"|"ice"|"unit", string>>>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)

  useEffect(() => { if (route==="settings" && role==="admin") reloadSettings() }, [route, role])
  async function reloadSettings() {
    setCatLoading(true)
    console.log("Reloading settings...")
    const { data, error } = await supabase.from("catalog_items").select("*").order("kind").order("position")
    if (error) {
      console.error("Error loading catalog:", error)
      setErr(`Failed to load catalog: ${error.message}`)
    } else {
      console.log("Loaded catalog items:", data)
      setCatalog((data || []) as CatalogItem[])
    }
    setCatLoading(false)
  }

  // Force refresh all catalog data
  async function forceRefreshCatalog() {
    console.log("Force refreshing all catalog data...")
    await Promise.all([
      reloadSettings(),
      loadCatalog()
    ])
    console.log("Catalog refresh complete")
  }
  const handleNewNameChange = (k: "method"|"glass"|"ice"|"unit", v: string) =>
    setNewName(prev => ({ ...prev, [k]: v }))

  async function addCatalog(kind: "method"|"glass"|"ice"|"unit") {
    const n = (newName[kind] || "").trim()
    console.log("Adding catalog item:", { 
      kind, 
      name: n, 
      newName, 
      role, 
      session: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    })
    if (!n) {
      console.log("No name provided for", kind)
      return
    }
    
    // Check if user has permission
    if (role !== "admin") {
      console.log("User doesn't have admin role:", role)
      setErr(`Permission denied: Your role is "${role}". You need admin access to add ${kind}s. Please check your user profile in the database.`)
      return
    }
    
    const maxPos = Math.max(0, ...catalog.filter(c=>c.kind===kind).map(c=>c.position))
    console.log("Max position for", kind, ":", maxPos)
    
    const insertData = { kind, name: n, position: maxPos + 1, active: true }
    console.log("Inserting data:", insertData)
    
    const { error } = await supabase.from("catalog_items").insert(insertData)
    
    if (error) {
      console.error("Error adding catalog item:", error)
      if (error.message.includes("row-level security")) {
        setErr(`Permission denied: You need admin access to add ${kind}s. Please check your user role and database policies.`)
      } else {
        setErr(`Failed to add ${kind}: ${error.message}`)
      }
      return
    }
    
    console.log("Successfully added", kind, ":", n)
    setNewName(p => ({ ...p, [kind]: "" }))
    await reloadSettings()
    await loadCatalog()
  }

  async function addCatalogItem(kind: "method" | "glass" | "ice" | "unit", name: string) {
    try {
      const maxPos = Math.max(0, ...catalog.filter(c=>c.kind===kind).map(c=>c.position))
      const { error } = await supabase.from("catalog_items").insert({ kind, name, position: maxPos + 1, active: true })
      if (error) throw error
      await reloadSettings()
      await loadCatalog()
    } catch (err) {
      console.error("add catalog item error:", err)
      throw err
    }
  }

  // Ingredient filter management
  function addIngredientFilter(ingredient: string) {
    const trimmed = ingredient.trim()
    if (trimmed && !ingredientFilters.includes(trimmed)) {
      setIngredientFilters(prev => [...prev, trimmed])
    }
  }

  function removeIngredientFilter(ingredient: string) {
    setIngredientFilters(prev => prev.filter(f => f !== ingredient))
  }

  function clearAllIngredientFilters() {
    setIngredientFilters([])
  }

  // Tag management
  function toggleTag(tagId: string) {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  function clearAllTags() {
    setSelectedTags([])
  }

  // Tag management functions
  async function addTag(name: string, color: string = '#3B82F6') {
    try {
      const { error } = await supabase.from("tags").insert({ name: name.trim(), color })
      if (error) throw error
      await loadTags()
    } catch (err) {
      console.error("add tag error:", err)
      setErr(err instanceof Error ? err.message : "Failed to add tag")
    }
  }

  async function deleteTag(tag: Tag) {
    if (!confirm(`Delete tag "${tag.name}"? This will remove it from all cocktails.`)) return
    try {
      const { error } = await supabase.from("tags").delete().eq("id", tag.id)
      if (error) throw error
      await loadTags()
    } catch (err) {
      console.error("delete tag error:", err)
      setErr(err instanceof Error ? err.message : "Failed to delete tag")
    }
  }

  async function editTag(tag: Tag) {
    // Create a modal-like interface for editing
    const modal = document.createElement('div')
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `
    
    const content = document.createElement('div')
    content.style.cssText = `
      background: ${colors.panel};
      border: 1px solid ${colors.border};
      border-radius: 12px;
      padding: 24px;
      min-width: 400px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    `
    
    content.innerHTML = `
      <h3 style="margin: 0 0 20px 0; color: ${colors.text}; font-size: 18px; font-weight: 600;">
        ✏️ Edit Tag
      </h3>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; color: ${colors.text}; font-weight: 500;">
          Tag Name:
        </label>
        <input 
          id="tagNameInput" 
          type="text" 
          value="${tag.name}" 
          style="
            width: 100%; 
            padding: 8px 12px; 
            border: 1px solid ${colors.border}; 
            border-radius: 6px; 
            background: ${colors.glass}; 
            color: ${colors.text};
            font-size: 14px;
            box-sizing: border-box;
          "
        />
      </div>
      <div style="margin-bottom: 24px;">
        <label style="display: block; margin-bottom: 8px; color: ${colors.text}; font-weight: 500;">
          Tag Color:
        </label>
        <div style="display: flex; gap: 12px; align-items: center;">
          <input 
            id="tagColorInput" 
            type="color" 
            value="${tag.color}" 
            style="
              width: 50px; 
              height: 40px; 
              border: none; 
              border-radius: 6px; 
              cursor: pointer;
            "
          />
          <input 
            id="tagColorHex" 
            type="text" 
            value="${tag.color}" 
            placeholder="#FF0000"
            style="
              flex: 1; 
              padding: 8px 12px; 
              border: 1px solid ${colors.border}; 
              border-radius: 6px; 
              background: ${colors.glass}; 
              color: ${colors.text};
              font-size: 14px;
            "
          />
        </div>
      </div>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button 
          id="cancelBtn" 
          style="
            padding: 8px 16px; 
            border: 1px solid ${colors.border}; 
            border-radius: 6px; 
            background: ${colors.glass}; 
            color: ${colors.text}; 
            cursor: pointer;
            font-size: 14px;
          "
        >
          Cancel
        </button>
        <button 
          id="saveBtn" 
          style="
            padding: 8px 16px; 
            border: none; 
            border-radius: 6px; 
            background: ${colors.accent}; 
            color: white; 
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          "
        >
          Save Changes
        </button>
      </div>
    `
    
    modal.appendChild(content)
    document.body.appendChild(modal)
    
    const nameInput = content.querySelector('#tagNameInput') as HTMLInputElement
    const colorInput = content.querySelector('#tagColorInput') as HTMLInputElement
    const colorHex = content.querySelector('#tagColorHex') as HTMLInputElement
    const cancelBtn = content.querySelector('#cancelBtn') as HTMLButtonElement
    const saveBtn = content.querySelector('#saveBtn') as HTMLButtonElement
    
    // Sync color picker with hex input
    colorInput.addEventListener('input', () => {
      colorHex.value = colorInput.value
    })
    
    colorHex.addEventListener('input', () => {
      if (/^#[0-9A-Fa-f]{6}$/.test(colorHex.value)) {
        colorInput.value = colorHex.value
      }
    })
    
    // Handle cancel
    const cleanup = () => {
      document.body.removeChild(modal)
    }
    
    cancelBtn.addEventListener('click', cleanup)
    modal.addEventListener('click', (e) => {
      if (e.target === modal) cleanup()
    })
    
    // Handle save
    saveBtn.addEventListener('click', async () => {
      const newName = nameInput.value.trim()
      const newColor = colorHex.value.trim()
      
      if (!newName) {
        alert('Tag name cannot be empty')
        return
      }
      
      if (!/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
        alert('Please enter a valid hex color (e.g., #FF0000)')
        return
      }
      
      try {
        const updates: { name?: string; color?: string } = {}
        if (newName !== tag.name) updates.name = newName
        if (newColor !== tag.color) updates.color = newColor
        
        if (Object.keys(updates).length > 0) {
          const { error } = await supabase.from("tags").update(updates).eq("id", tag.id)
      if (error) throw error
      await loadTags()
        }
        cleanup()
    } catch (err) {
        console.error("edit tag error:", err)
        setErr(err instanceof Error ? err.message : "Failed to edit tag")
    }
    })
    
    // Focus the name input
    setTimeout(() => nameInput.focus(), 100)
  }
  async function renameCatalog(item: CatalogItem) {
    const n = prompt(`Rename ${item.kind}`, item.name)?.trim()
    if (!n || n === item.name) return
    
    try {
      console.log(`Renaming ${item.kind} "${item.name}" to "${n}"`)
      
      // Update the catalog item name
      await supabase.from("catalog_items").update({ name: n }).eq("id", item.id)
      
      // Update all cocktails that use this item
      if (item.kind === 'unit') {
        // Units are stored in recipe_ingredients table
        console.log(`Updating recipe ingredients unit from "${item.name}" to "${n}"`)
        
        const { data: ingredientsToUpdate, error: fetchError } = await supabase
          .from('recipe_ingredients')
          .select('id, cocktail_id')
          .eq('unit', item.name)

        if (fetchError) {
          console.error('Error fetching recipe ingredients to update:', fetchError)
          alert(`Error fetching recipe ingredients: ${fetchError.message}`)
          return
        }

        console.log(`Found ${ingredientsToUpdate?.length || 0} recipe ingredients to update`)

        if (ingredientsToUpdate && ingredientsToUpdate.length > 0) {
          const { error: updateError } = await supabase
            .from('recipe_ingredients')
            .update({ unit: n })
            .eq('unit', item.name)

          if (updateError) {
            console.error('Error updating recipe ingredients:', updateError)
            alert(`Error updating recipe ingredients: ${updateError.message}`)
            return
          }
          
          console.log(`Updated ${ingredientsToUpdate.length} recipe ingredients`)
          
          // Verify the update worked
          const { data: verifyData } = await supabase
            .from('recipe_ingredients')
            .select('id, unit')
            .eq('unit', n)
            .limit(5)
          console.log('Verification - ingredients now using new unit:', verifyData)
        }
      } else {
        // Methods, glasses, and ice are stored directly in cocktails table
        const updateField = item.kind === 'method' ? 'method' :
                           item.kind === 'glass' ? 'glass' :
                           item.kind === 'ice' ? 'ice' : null

        if (updateField) {
          console.log(`Updating cocktails field: ${updateField} from "${item.name}" to "${n}"`)
          
          const { data: cocktailsToUpdate, error: fetchError } = await supabase
            .from('cocktails')
            .select('id, name')
            .eq(updateField, item.name)

          if (fetchError) {
            console.error('Error fetching cocktails to update:', fetchError)
            alert(`Error fetching cocktails: ${fetchError.message}`)
            return
          }

          console.log(`Found ${cocktailsToUpdate?.length || 0} cocktails to update`)

          if (cocktailsToUpdate && cocktailsToUpdate.length > 0) {
            const { error: updateError } = await supabase
              .from('cocktails')
              .update({ [updateField]: n })
              .eq(updateField, item.name)

            if (updateError) {
              console.error('Error updating cocktails:', updateError)
              alert(`Error updating cocktails: ${updateError.message}`)
              return
            }
            
            console.log(`Updated ${cocktailsToUpdate.length} cocktails`)
          }
        }
      }
      
      // Reload data
      await reloadSettings()
      await loadCatalog()
      
      // Small delay to ensure database updates have propagated
      await new Promise(resolve => setTimeout(resolve, 100))
      
      await load() // Reload cocktails to show updated values
      
      console.log(`Successfully renamed "${item.name}" to "${n}"`)
    } catch (error) {
      console.error('Rename error:', error)
      alert(`Error during rename: ${error}`)
    }
  }
  async function toggleCatalog(item: CatalogItem) {
    console.log(`Toggling ${item.kind} "${item.name}" to ${!item.active ? 'active' : 'inactive'}`)
    await supabase.from("catalog_items").update({ active: !item.active }).eq("id", item.id)
    await forceRefreshCatalog()
    console.log("Catalog data reloaded after toggle")
  }
  async function deleteCatalog(item: CatalogItem) {
    if (!confirm(`Delete "${item.name}" from ${item.kind}?`)) return
    await supabase.from("catalog_items").delete().eq("id", item.id)
    await reloadSettings(); await loadCatalog()
  }

  async function mergeCatalog(sourceItem: CatalogItem, targetItem: CatalogItem) {
    if (sourceItem.id === targetItem.id) return
    
    const confirmMessage = `Merge "${sourceItem.name}" into "${targetItem.name}"?\n\nThis will:\n- Update all cocktails using "${sourceItem.name}" to use "${targetItem.name}"\n- Delete "${sourceItem.name}" from the catalog\n\nThis action cannot be undone.`
    
    if (!confirm(confirmMessage)) return

    try {
      console.log('Starting merge:', { sourceItem, targetItem })
      
      // Update all cocktails that use the source item
      if (sourceItem.kind === 'unit') {
        // Units are stored in recipe_ingredients table
        console.log('Updating recipe ingredients unit from', sourceItem.name, 'to', targetItem.name)
        
        const { data: ingredientsToUpdate, error: fetchError } = await supabase
          .from('recipe_ingredients')
          .select('id, cocktail_id')
          .eq('unit', sourceItem.name)

        if (fetchError) {
          console.error('Error fetching recipe ingredients to update:', fetchError)
          alert(`Error fetching recipe ingredients: ${fetchError.message}`)
          return
        }

        console.log(`Found ${ingredientsToUpdate?.length || 0} recipe ingredients to update`)

        if (ingredientsToUpdate && ingredientsToUpdate.length > 0) {
          const { error: updateError } = await supabase
            .from('recipe_ingredients')
            .update({ unit: targetItem.name })
            .eq('unit', sourceItem.name)

          if (updateError) {
            console.error('Error updating recipe ingredients:', updateError)
            alert(`Error updating recipe ingredients: ${updateError.message}`)
            return
          }
          
          console.log(`Updated ${ingredientsToUpdate.length} recipe ingredients`)
        }
      } else {
        // Methods, glasses, and ice are stored directly in cocktails table
        const updateField = sourceItem.kind === 'method' ? 'method' :
                           sourceItem.kind === 'glass' ? 'glass' :
                           sourceItem.kind === 'ice' ? 'ice' : null

        if (updateField) {
          console.log('Updating cocktails field:', updateField, 'from', sourceItem.name, 'to', targetItem.name)
          
          const { data: cocktailsToUpdate, error: fetchError } = await supabase
            .from('cocktails')
            .select('id, name')
            .eq(updateField, sourceItem.name)

          if (fetchError) {
            console.error('Error fetching cocktails to update:', fetchError)
            alert(`Error fetching cocktails: ${fetchError.message}`)
            return
          }

          console.log(`Found ${cocktailsToUpdate?.length || 0} cocktails to update`)

          if (cocktailsToUpdate && cocktailsToUpdate.length > 0) {
            const { error: updateError } = await supabase
              .from('cocktails')
              .update({ [updateField]: targetItem.name })
              .eq(updateField, sourceItem.name)

            if (updateError) {
              console.error('Error updating cocktails:', updateError)
              alert(`Error updating cocktails: ${updateError.message}`)
              return
            }
            
            console.log(`Updated ${cocktailsToUpdate.length} cocktails`)
          }
        }
      }

      // Delete the source item
      console.log('Deleting source item:', sourceItem.id)
      const { error: deleteError } = await supabase
        .from('catalog_items')
        .delete()
        .eq('id', sourceItem.id)

      if (deleteError) {
        console.error('Error deleting source item:', deleteError)
        alert(`Error deleting source item: ${deleteError.message}`)
        return
      }

      // Reload data
      await reloadSettings()
      await loadCatalog()
      
      // Small delay to ensure database updates have propagated
      await new Promise(resolve => setTimeout(resolve, 100))
      
      await load() // Reload cocktails to show updated values
      
      alert(`Successfully merged "${sourceItem.name}" into "${targetItem.name}"`)
    } catch (error) {
      console.error('Merge error:', error)
      alert(`Error during merge: ${error}`)
    }
  }
  function onDragStart(e: React.DragEvent<HTMLTableRowElement>, id: string) {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = "move"
  }
  function onDragOver(e: React.DragEvent<HTMLTableRowElement>) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }
  async function onDrop(kind: "method"|"glass"|"ice"|"unit", targetId: string) {
    if (!draggingId || draggingId === targetId) return
    const list = catalog.filter(c=>c.kind===kind).sort((a,b)=> a.position-b.position)
    const from = list.findIndex(x=>x.id===draggingId)
    const to = list.findIndex(x=>x.id===targetId)
    if (from < 0 || to < 0) return
    const newList = list.slice()
    const [moved] = newList.splice(from,1)
    newList.splice(to,0,moved)
    for (let i=0;i<newList.length;i++) {
      const item = newList[i]
      if (item.position !== i+1) {
        await supabase.from("catalog_items").update({ position: i+1 }).eq("id", item.id)
      }
    }
    setDraggingId(null)
    await reloadSettings(); await loadCatalog()
  }

  // ---------- INGREDIENTS ADMIN ----------
  const [ingAdmin, setIngAdmin] = useState<Ingredient[]>([])
  const [ingAdminLoading, setIngAdminLoading] = useState(false)
  const [ingAdminQ, setIngAdminQ] = useState("")
  const [mergeFrom, setMergeFrom] = useState("")
  const [mergeTo, setMergeTo] = useState("")
  const [mergeBusy, setMergeBusy] = useState(false)
  const [mergeMsg, setMergeMsg] = useState("")

  useEffect(() => { if (route==="settings" && settingsTab==="ingredients") loadIngredients() }, [route, settingsTab, ingAdminQ])
  async function loadIngredients() {
    setIngAdminLoading(true)
    const base = supabase.from("ingredients").select("id,name").order("name")
    const { data } = ingAdminQ.trim()
      ? await base.ilike("name", `%${ingAdminQ.trim()}%`)
      : await base
    setIngAdmin((data || []) as Ingredient[])
    setIngAdminLoading(false)
  }
  async function addIngredient(name: string) {
    try {
      console.log(`Adding ingredient: "${name}"`)
      console.log("User session:", { userId: session?.user?.id, email: session?.user?.email, role })
      
      // Check if user has permission to add ingredients
      if (role !== "editor" && role !== "admin") {
        setErr("Permission denied. Only editors and admins can add ingredients.")
        return
      }
      
      // Check for duplicate ingredients (case-insensitive)
      const { data: existingIngredients } = await supabase
        .from("ingredients")
        .select("name")
        .ilike("name", name.trim())
      
      if (existingIngredients && existingIngredients.length > 0) {
        setErr(`Ingredient "${name}" already exists. Please use a different name or check for similar ingredients.`)
        return
      }
      
      // Validate ingredient name
      if (!name.trim()) {
        setErr("Ingredient name cannot be empty.")
        return
      }
      
      if (name.trim().length < 2) {
        setErr("Ingredient name must be at least 2 characters long.")
        return
      }
      
      if (name.trim().length > 100) {
        setErr("Ingredient name must be less than 100 characters.")
        return
      }
      
      const { error } = await supabase.from("ingredients").insert({ name: name.trim() })
      
      if (error) {
        console.error("Ingredient insert error:", error)
        if (error.message.includes("row-level security")) {
          setErr("Permission denied. You may not have the required privileges to add ingredients.")
        } else if (error.message.includes("duplicate key")) {
          setErr(`Ingredient "${name}" already exists. Please use a different name.`)
        } else {
          setErr(`Failed to add ingredient: ${error.message}`)
        }
        return
      }
      
      console.log(`Successfully added ingredient: "${name}"`)
      
      // Log audit
      await logAudit(
        'CREATE_INGREDIENT',
        { ingredient_name: name },
        'ingredient'
      )
      
      setErr("") // Clear any previous errors
      await loadIngredients()
    } catch (err) {
      console.error("Unexpected error adding ingredient:", err)
      setErr("Failed to add ingredient. Please try again.")
    }
  }
  async function renameIngredient(it: Ingredient) {
    try {
      const n = prompt("Rename ingredient", it.name)?.trim()
      if (!n || n === it.name) return
      
      // Check if user has permission to rename ingredients
      if (role !== "editor" && role !== "admin") {
        setErr("Permission denied. Only editors and admins can rename ingredients.")
        return
      }
      
      console.log(`Renaming ingredient "${it.name}" to "${n}"`)
      const { error } = await supabase.from("ingredients").update({ name: n }).eq("id", it.id)
      
      if (error) {
        console.error("Ingredient rename error:", error)
        if (error.message.includes("row-level security")) {
          setErr("Permission denied. You may not have the required privileges to rename ingredients.")
        } else {
          setErr(`Failed to rename ingredient: ${error.message}`)
        }
        return
      }
      
      console.log(`Successfully renamed ingredient to "${n}"`)
      await loadIngredients()
    } catch (err) {
      console.error("Unexpected error renaming ingredient:", err)
      setErr("Failed to rename ingredient. Please try again.")
    }
  }
  async function deleteIngredient(it: Ingredient) {
    try {
      if (!confirm(`Delete "${it.name}"?`)) return
      
      // Check if user has permission to delete ingredients
      if (role !== "editor" && role !== "admin") {
        setErr("Permission denied. Only editors and admins can delete ingredients.")
        return
      }
      
      console.log(`Deleting ingredient: "${it.name}"`)
      const { error } = await supabase.from("ingredients").delete().eq("id", it.id)
      
      if (error) {
        console.error("Ingredient delete error:", error)
        if (error.message.includes("row-level security")) {
          alert("Permission denied. You may not have the required privileges to delete ingredients.")
        } else {
          alert(`Failed to delete ingredient: ${error.message}`)
        }
        return
      }
      
      console.log(`Successfully deleted ingredient: "${it.name}"`)
      await loadIngredients()
    } catch (err) {
      console.error("Unexpected error deleting ingredient:", err)
      alert("Failed to delete ingredient. Please try again.")
    }
  }
  async function doMergeWith(from: string, to: string) {
    setMergeMsg("")
    const s = from.trim(), t = to.trim()
    if (!s || !t) { setMergeMsg("Pick both ingredients."); return }
    if (s.toLowerCase() === t.toLowerCase()) { setMergeMsg("Source and target are the same."); return }
    if (!confirm(`Merge "${s}" INTO "${t}"?\nAll uses of "${s}" will be changed to "${t}".`)) return
    setMergeBusy(true)
    const { data, error } = await supabase.rpc("merge_ingredients", { source_name: s, target_name: t })
    setMergeBusy(false)
    if (error) { setMergeMsg(error.message); return }
    setMergeMsg(`Merged. ${data?.moved ?? 0} specs updated.`)
    setMergeFrom(""); setMergeTo("")
    await loadIngredients()
    await load()
  }

  // ---------- USERS (ADMIN) ----------
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  useEffect(() => {
    if (route === "settings" && role === "admin") { loadUsers() }
  }, [route, role])

  async function loadUsers() {
    setUsersLoading(true)
    try {
      // Try the RPC function first
      const { data, error } = await supabase.rpc("admin_list_profiles")
      if (error) {
        console.warn("RPC function failed, trying direct query:", error.message)
        // Fallback to direct query if RPC fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("profiles")
          .select(`
            user_id,
            role,
            display_name,
            created_at,
            auth_users:user_id(email)
          `)
          .order("created_at", { ascending: false })
        
        if (fallbackError) {
          console.error("Fallback query failed:", fallbackError)
          setErr(`Failed to load users: ${fallbackError.message}`)
          setUsersLoading(false)
          return
        }
        
        // Transform the fallback data to match UserRow format
        const transformedData = (fallbackData || []).map((row: any) => ({
          user_id: row.user_id,
          email: row.auth_users?.email || null,
          role: row.role,
          display_name: row.display_name,
          created_at: row.created_at
        }))
        
        setUsers(transformedData as UserRow[])
      } else {
        setUsers((data || []) as UserRow[])
      }
    } catch (err) {
      console.error("Unexpected error loading users:", err)
      setErr("Failed to load users. Please check your database permissions.")
    }
    setUsersLoading(false)
  }
  async function changeUserRole(user_id: string, newRole: Role) {
    try {
      console.log(`Changing user ${user_id} role to ${newRole}`)
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("user_id", user_id)
      
      if (error) {
        console.error("Role change error:", error)
        if (error.message.includes("row-level security")) {
          setErr("Permission denied. You may not have admin privileges to change user roles.")
        } else {
          setErr(`Failed to change user role: ${error.message}`)
        }
        return
      }
      
      // Reload users to show the change
      await loadUsers()
      console.log(`Successfully changed user role to ${newRole}`)
    } catch (err) {
      console.error("Unexpected error changing user role:", err)
      setErr("Failed to change user role. Please try again.")
    }
  }
  async function renameUser(user_id: string) {
    try {
      const current = users.find(u => u.user_id === user_id)
      const n = prompt("Display name", current?.display_name || "")?.trim()
      if (!n) return
      
      console.log(`Renaming user ${user_id} to ${n}`)
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: n })
        .eq("user_id", user_id)
      
      if (error) {
        console.error("Rename error:", error)
        if (error.message.includes("row-level security")) {
          setErr("Permission denied. You may not have admin privileges to rename users.")
        } else {
          setErr(`Failed to rename user: ${error.message}`)
        }
        return
      }
      
      await loadUsers()
      console.log(`Successfully renamed user to ${n}`)
    } catch (err) {
      console.error("Unexpected error renaming user:", err)
      setErr("Failed to rename user. Please try again.")
    }
  }

  // ---------- CARDS GRID REF ----------
  const cardsRef = useRef<HTMLDivElement | null>(null)

  // ---------- DEBUG: Test database permissions ----------
  async function testDatabasePermissions() {
    if (!session) return;
    
    try {
      // Test basic select
      const { data: testData, error: testError } = await supabase
        .from("cocktails")
        .select("id")
        .limit(1);
      
      console.log("Database test - Select:", { testData, testError });
      
      // Test profile access
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();
      
      console.log("Database test - Profile:", { profileData, profileError });
      
    } catch (error) {
      console.error("Database test error:", error);
    }
  }

  // Run test when session changes
  useEffect(() => {
    if (session) {
      testDatabasePermissions();
    }
  }, [session]);

  // ---------- RENDER ----------
  return (
    <div style={appWrap}>
        <div style={container} className="responsive-container">
        {/* ENHANCED HEADER */}
        <header className="animate-fade-in-up" style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: 32,
          padding: "24px 0",
          borderBottom: `1px solid ${colors.border}`,
          position: "relative",
          flexWrap: "wrap",
          gap: 16
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div 
              onClick={() => setRoute("main")}
              style={{ 
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 16
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)"
                e.currentTarget.style.opacity = "0.8"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)"
                e.currentTarget.style.opacity = "1"
              }}
            >
              <img 
                src="/Ology B+D Black on White v01.png" 
                alt="Ology Brewing + Distilling" 
                style={{
                  height: "60px",
                  width: "auto"
                }}
              />
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: colors.muted,
                letterSpacing: "0.5px",
                textTransform: "uppercase"
              }}>
                Cocktail Keeper
              </div>
            </div>
            {session && (
              <div style={{
                background: colors.glass,
                border: `1px solid ${colors.glassBorder}`,
                borderRadius: 20,
                padding: "8px 16px",
                fontSize: 12,
                color: colors.muted,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 12
              }}>
                <span>
                {session.user.email} • <span style={{ color: colors.primarySolid, fontWeight: 600 }}>{role}</span>
                </span>
              </div>
            )}
          </div>
          
          <nav style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button 
              onClick={()=> setRoute("main")} 
              style={{
                ...btnSecondary,
                background: route === "main" ? colors.primarySolid : colors.glass,
                color: route === "main" ? "white" : colors.text,
                boxShadow: route === "main" ? shadows.lg : "none"
              }}
            >
              🏠 Home
            </button>

            {role==="admin" && (
              <button 
                onClick={()=> setRoute("settings")} 
                style={{
                  ...btnSecondary,
                  background: route === "settings" ? colors.primarySolid : colors.glass,
                  color: route === "settings" ? "white" : colors.text,
                  boxShadow: route === "settings" ? shadows.lg : "none"
                }}
                title="Manage dropdown lists and user access"
              >
                ⚙️ Settings
              </button>
            )}


            {/* Keyboard Shortcuts Help */}
            <button 
              onClick={() => alert(`Keyboard Shortcuts:
• Ctrl/Cmd + N: New cocktail
• Ctrl/Cmd + F: Focus search
• Ctrl/Cmd + K: Focus name search
• ↑/↓ Arrow keys: Navigate cocktails
• Enter/Space: Edit focused cocktail
• Escape: Close forms`)}
              style={{
                ...btnSecondary,
                marginRight: 12,
                minWidth: 40,
                padding: "8px 12px"
              }}
              title="Keyboard shortcuts help"
            >
              ⌨️
            </button>

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme} 
              style={{
                ...btnSecondary,
                marginRight: 12,
                minWidth: 40,
                padding: "8px 12px"
              }}
              title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            {session ? (
              <button onClick={signOut} style={btnSecondary}>
                🚪 Sign out
              </button>
            ) : showRegister ? (
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button onClick={() => setShowRegister(false)} style={btnSecondary}>
                  ← Back to Sign In
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button onClick={() => setShowRegister(true)} style={btnPrimary}>
                  🚀 Create Account
                </button>
                <span style={{ color: colors.muted }}>or</span>
                <button onClick={() => setShowRegister(false)} style={btnSecondary}>
                  🔐 Sign In
                </button>
              </div>
            )}
          </nav>
        </header>

        {/* ENHANCED ERROR BOX */}
        {err && (
          <div style={{
            ...card({ 
              border: `1px solid ${colors.dangerSolid}`, 
              background: "rgba(239, 68, 68, 0.1)",
              color: "#fecaca",
              marginBottom: 24
            }),
            boxShadow: `0 0 20px rgba(239, 68, 68, 0.2)`
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <span style={{ fontWeight: 500 }}>{err}</span>
            </div>
          </div>
        )}

        {/* AUTHENTICATION FORMS */}
        {!session && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
            {showRegister ? (
              <div style={{ maxWidth: 400, width: "100%" }}>
                <h2 style={{ textAlign: "center", marginBottom: 24, color: colors.text }}>
                  🚀 Create Account
                </h2>
                <form onSubmit={handleSignUp} style={{ 
                  ...card(), 
                  padding: 24,
                  background: colors.glass,
                  border: `1px solid ${colors.glassBorder}`
                }}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 8, color: colors.text, fontWeight: 500 }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="your-email@example.com"
                      style={inp}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", marginBottom: 8, color: colors.text, fontWeight: 500 }}>
                      Password
                    </label>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Choose a secure password"
                      style={inp}
                      required
                      minLength={6}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
                    <button
                      type="button"
                      onClick={() => setShowRegister(false)}
                      style={btnSecondary}
                      disabled={authLoading}
                    >
                      ← Back to Sign In
                    </button>
                    <button
                      type="submit"
                      style={btnPrimary}
                      disabled={authLoading}
                    >
                      {authLoading ? "Creating..." : "Create Account"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div style={{ maxWidth: 400, width: "100%" }}>
                <h2 style={{ textAlign: "center", marginBottom: 24, color: colors.text }}>
                  🔐 Sign In
                </h2>
                <form onSubmit={handleSignIn} style={{ 
                  ...card(), 
                  padding: 24,
                  background: colors.glass,
                  border: `1px solid ${colors.glassBorder}`
                }}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", marginBottom: 8, color: colors.text, fontWeight: 500 }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="your-email@example.com"
                      style={inp}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", marginBottom: 8, color: colors.text, fontWeight: 500 }}>
                      Password
                    </label>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Enter your password"
                      style={inp}
                      required
                    />
                  </div>

                  <div style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
                    <button
                      type="button"
                      onClick={() => setShowRegister(true)}
                      style={btnSecondary}
                      disabled={authLoading}
                    >
                      🚀 Create Account
                    </button>
                    <button
                      type="submit"
                      style={btnPrimary}
                      disabled={authLoading}
                    >
                      {authLoading ? "Signing In..." : "Sign In"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ROUTES */}
        {route === "settings" && (
          role !== "admin" ? (
            <div style={{ color: colors.muted }}>Settings are admin-only.</div>
          ) : (
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <h2 style={{ 
                marginBottom: 24, 
                fontSize: 24, 
                fontWeight: 700,
                color: colors.text,
                textAlign: "center"
              }}>
                ⚙️ Settings
              </h2>
              
              {/* Settings Menu */}
              <div style={{
                ...card({ marginBottom: 24 }),
                background: colors.glass
              }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  padding: 20
                }}>
                  <button
                    onClick={() => setSettingsTab("ingredients")}
                    style={{
                      ...btnSecondary,
                      padding: "16px 20px",
                      background: settingsTab === "ingredients" ? colors.accent : colors.glass,
                      color: settingsTab === "ingredients" ? "white" : colors.text,
                      border: `2px solid ${settingsTab === "ingredients" ? colors.accent : colors.glassBorder}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🧪</span>
                    <span>Ingredients</span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      Manage Ingredient Database
                    </span>
                  </button>

                  <button
                    onClick={() => setSettingsTab("methods")}
                    style={{
                      ...btnSecondary,
                      padding: "16px 20px",
                      background: settingsTab === "methods" ? colors.accent : colors.glass,
                      color: settingsTab === "methods" ? "white" : colors.text,
                      border: `2px solid ${settingsTab === "methods" ? colors.accent : colors.glassBorder}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🔄</span>
                    <span>Methods</span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      Shake, Stir, Build, etc.
                    </span>
                  </button>

                  <button
                    onClick={() => setSettingsTab("glasses")}
                    style={{
                      ...btnSecondary,
                      padding: "16px 20px",
                      background: settingsTab === "glasses" ? colors.accent : colors.glass,
                      color: settingsTab === "glasses" ? "white" : colors.text,
                      border: `2px solid ${settingsTab === "glasses" ? colors.accent : colors.glassBorder}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🥃</span>
                    <span>Glasses</span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      Coupe, Highball, etc.
                    </span>
                  </button>

                  <button
                    onClick={() => setSettingsTab("ices")}
                    style={{
                      ...btnSecondary,
                      padding: "16px 20px",
                      background: settingsTab === "ices" ? colors.accent : colors.glass,
                      color: settingsTab === "ices" ? "white" : colors.text,
                      border: `2px solid ${settingsTab === "ices" ? colors.accent : colors.glassBorder}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🧊</span>
                    <span>Ice</span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      Cubed, Crushed, etc.
                    </span>
                  </button>


                  <button
                    onClick={() => setSettingsTab("tags")}
                    style={{
                      ...btnSecondary,
                      padding: "16px 20px",
                      background: settingsTab === "tags" ? colors.accent : colors.glass,
                      color: settingsTab === "tags" ? "white" : colors.text,
                      border: `2px solid ${settingsTab === "tags" ? colors.accent : colors.glassBorder}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🏷️</span>
                    <span>Tags</span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      Cocktail Categories & Labels
                    </span>
                  </button>

                  <button
                    onClick={() => setSettingsTab("units")}
                    style={{
                      ...btnSecondary,
                      padding: "16px 20px",
                      background: settingsTab === "units" ? colors.accent : colors.glass,
                      color: settingsTab === "units" ? "white" : colors.text,
                      border: `2px solid ${settingsTab === "units" ? colors.accent : colors.glassBorder}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 24 }}>📏</span>
                    <span>Units</span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      oz, ml, dash, etc.
                    </span>
                  </button>

                  <button
                    onClick={() => setSettingsTab("users")}
                    style={{
                      ...btnSecondary,
                      padding: "16px 20px",
                      background: settingsTab === "users" ? colors.accent : colors.glass,
                      color: settingsTab === "users" ? "white" : colors.text,
                      border: `2px solid ${settingsTab === "users" ? colors.accent : colors.glassBorder}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 24 }}>👥</span>
                    <span>Users</span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      Manage User Roles & Access
                    </span>
                  </button>

                  <button
                    onClick={() => setSettingsTab("backup")}
                    style={{
                      ...btnSecondary,
                      padding: "16px 20px",
                      background: settingsTab === "backup" ? colors.accent : colors.glass,
                      color: settingsTab === "backup" ? "white" : colors.text,
                      border: `2px solid ${settingsTab === "backup" ? colors.accent : colors.glassBorder}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 24 }}>💾</span>
                    <span>Backup</span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      Backup & Restore Data
                    </span>
                  </button>

                  <button
                    onClick={() => setSettingsTab("migration")}
                    style={{
                      ...btnSecondary,
                      padding: "16px 20px",
                      background: settingsTab === "migration" ? colors.accent : colors.glass,
                      color: settingsTab === "migration" ? "white" : colors.text,
                      border: `2px solid ${settingsTab === "migration" ? colors.accent : colors.glassBorder}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🧹</span>
                    <span>Migration</span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      Clean & Standardize Data
                    </span>
                  </button>
                </div>
              </div>

              {/* Settings Content */}
              {settingsTab === "methods" && (
                <SettingsBlock
                  catalog={catalog}
                  catLoading={catLoading}
                  newName={newName}
                  onNewNameChange={handleNewNameChange}
                  addCatalog={addCatalog}
                  renameCatalog={renameCatalog}
                  toggleCatalog={toggleCatalog}
                  deleteCatalog={deleteCatalog}
                  mergeCatalog={mergeCatalog}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  draggingId={draggingId}
                  selectedKind="method"
                />
              )}

              {settingsTab === "glasses" && (
                <SettingsBlock
                  catalog={catalog}
                  catLoading={catLoading}
                  newName={newName}
                  onNewNameChange={handleNewNameChange}
                  addCatalog={addCatalog}
                  renameCatalog={renameCatalog}
                  toggleCatalog={toggleCatalog}
                  deleteCatalog={deleteCatalog}
                  mergeCatalog={mergeCatalog}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  draggingId={draggingId}
                  selectedKind="glass"
                />
              )}

              {settingsTab === "ices" && (
                <SettingsBlock
                  catalog={catalog}
                  catLoading={catLoading}
                  newName={newName}
                  onNewNameChange={handleNewNameChange}
                  addCatalog={addCatalog}
                  renameCatalog={renameCatalog}
                  toggleCatalog={toggleCatalog}
                  deleteCatalog={deleteCatalog}
                  mergeCatalog={mergeCatalog}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  draggingId={draggingId}
                  selectedKind="ice"
                />
              )}


              {settingsTab === "units" && (
                <SettingsBlock
                  catalog={catalog}
                  catLoading={catLoading}
                  newName={newName}
                  onNewNameChange={handleNewNameChange}
                  addCatalog={addCatalog}
                  renameCatalog={renameCatalog}
                  toggleCatalog={toggleCatalog}
                  deleteCatalog={deleteCatalog}
                  mergeCatalog={mergeCatalog}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  draggingId={draggingId}
                  selectedKind="unit"
                />
              )}

              {settingsTab === "tags" && (
                <div style={{
                  ...card({ marginBottom: 24 }),
                  background: colors.panel,
                  padding: 24
                }}>
                  <h3 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 600, color: colors.text }}>
                    🏷️ Tag Management
                  </h3>
                  
                  {/* Add New Tag */}
                  <div style={{ marginBottom: 24, padding: 16, background: colors.glass, borderRadius: 8 }}>
                    <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600, color: colors.text }}>
                      Add New Tag
                    </h4>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <input
                        value={newTagName}
                        onChange={e => setNewTagName(e.target.value)}
                        placeholder="Tag name..."
                        style={{ ...inp, flex: 1 }}
                      />
                      <input
                        type="color"
                        value={newTagColor}
                        onChange={e => setNewTagColor(e.target.value)}
                        style={{ width: 50, height: 50, border: "none", borderRadius: 8, cursor: "pointer" }}
                      />
                      <button
                        onClick={() => {
                          if (newTagName.trim()) {
                            addTag(newTagName.trim(), newTagColor)
                            setNewTagName("")
                            setNewTagColor("#3B82F6")
                          }
                        }}
                        style={{
                          ...btnPrimary,
                          padding: "8px 16px",
                          fontSize: 14
                        }}
                      >
                        Add Tag
                      </button>
                    </div>
                  </div>

                  {/* Tags List */}
                  <div style={{ display: "grid", gap: 12 }}>
                    {availableTags.map(tag => (
                      <div
                        key={tag.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: 12,
                          background: colors.glass,
                          borderRadius: 8,
                          border: `1px solid ${colors.glassBorder}`
                        }}
                      >
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            background: tag.color
                          }}
                        />
                        <span style={{ flex: 1, fontWeight: 500, color: colors.text }}>
                          {tag.name}
                        </span>
                        <button
                          onClick={() => editTag(tag)}
                          style={{
                            ...btnSecondary,
                            fontSize: 12,
                            padding: "4px 8px"
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteTag(tag)}
                          style={{
                            ...dangerBtn,
                            fontSize: 12,
                            padding: "4px 8px"
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settingsTab === "ingredients" && (
                <IngredientsAdmin
                  items={ingAdmin}
                  loading={ingAdminLoading}
                  q={ingAdminQ}
                  setQ={setIngAdminQ}
                  onAdd={addIngredient}
                  onRename={renameIngredient}
                  onDelete={deleteIngredient}
                  mergeFrom={mergeFrom}
                  setMergeFrom={setMergeFrom}
                  mergeTo={mergeTo}
                  setMergeTo={setMergeTo}
                  onMerge={doMergeWith}
                  mergeBusy={mergeBusy}
                  mergeMsg={mergeMsg}
                />
              )}

              {settingsTab === "users" && (
              <UsersAdmin
                meEmail={session?.user?.email ?? null}
                users={users}
                loading={usersLoading}
                reload={loadUsers}
                onChangeRole={changeUserRole}
                onRename={renameUser}
              />
              )}

              {settingsTab === "backup" && (
                <div style={{ ...card(), background: colors.glass }}>
                  <h3 style={{ 
                    margin: "0 0 20px 0", 
                    fontSize: 18, 
                    fontWeight: 600, 
                    color: colors.text,
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}>
                    💾 Data Backup & Restore
                  </h3>
                  
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ color: colors.muted, marginBottom: 16 }}>
                      Create backups of all your cocktail data and restore from previous backups. 
                      This is useful for data migration, sharing data between instances, or disaster recovery.
                    </p>
                    
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                      gap: 16 
                    }}>
                      {/* Create Backup */}
                      <div style={{ 
                        ...card(), 
                        background: colors.panel,
                        border: `1px solid ${colors.border}`
                      }}>
                        <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: colors.text }}>
                          📦 Create Backup
                        </h4>
                        <p style={{ color: colors.muted, fontSize: 14, marginBottom: 16 }}>
                          Export all your data to a JSON file
                        </p>
                        <button
                          onClick={createBackup}
                          disabled={backupLoading}
                          style={{
                            ...btnPrimary,
                            width: "100%",
                            opacity: backupLoading ? 0.7 : 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8
                          }}
                        >
                          {backupLoading && <LoadingSpinner size="sm" />}
                          {backupLoading ? "Creating..." : "Create Backup"}
                        </button>
                      </div>
                      
                      {/* Download Backup */}
                      <div style={{ 
                        ...card(), 
                        background: colors.panel,
                        border: `1px solid ${colors.border}`
                      }}>
                        <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: colors.text }}>
                          ⬇️ Download Backup
                        </h4>
                        <p style={{ color: colors.muted, fontSize: 14, marginBottom: 16 }}>
                          Download the created backup file
                        </p>
                        <button
                          onClick={downloadBackup}
                          disabled={!backupData}
                          style={{
                            ...btnSecondary,
                            width: "100%",
                            opacity: !backupData ? 0.5 : 1
                          }}
                        >
                          Download Backup
                        </button>
                      </div>
                      
                      {/* Restore Backup */}
                      <div style={{ 
                        ...card(), 
                        background: colors.panel,
                        border: `1px solid ${colors.border}`
                      }}>
                        <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: colors.text }}>
                          ⬆️ Restore Backup
                        </h4>
                        <p style={{ color: colors.muted, fontSize: 14, marginBottom: 16 }}>
                          Restore data from a backup file
                        </p>
                        <button
                          onClick={restoreFromFile}
                          disabled={restoreLoading}
                          style={{
                            ...dangerBtn,
                            width: "100%",
                            opacity: restoreLoading ? 0.7 : 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8
                          }}
                        >
                          {restoreLoading && <LoadingSpinner size="sm" />}
                          {restoreLoading ? "Restoring..." : "Restore from File"}
                        </button>
                      </div>
                    </div>
                    
                    {backupData && (
                      <div style={{ 
                        marginTop: 20, 
                        padding: 16, 
                        background: colors.panel, 
                        borderRadius: 8,
                        border: `1px solid ${colors.border}`
                      }}>
                        <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: colors.text }}>
                          📊 Backup Information
                        </h4>
                        <p style={{ color: colors.muted, fontSize: 12, margin: 0 }}>
                          Created: {new Date(backupData.timestamp).toLocaleString()}<br/>
                          Cocktails: {backupData.data.cocktails.length}<br/>
                          Ingredients: {backupData.data.ingredients.length}<br/>
                          Tags: {backupData.data.tags.length}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {settingsTab === "migration" && (
                <div style={{ ...card(), background: colors.glass }}>
                  <h3 style={{ 
                    margin: "0 0 20px 0", 
                    fontSize: 18, 
                    fontWeight: 600, 
                    color: colors.text,
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}>
                    🧹 Data Migration & Cleanup
                  </h3>
                  
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ color: colors.muted, marginBottom: 16 }}>
                      Tools to clean up and standardize your cocktail data. Use these tools to find and fix data inconsistencies.
                    </p>
                    
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
                      gap: 16 
                    }}>
                      {/* Find Duplicate Ingredients */}
                      <div style={{ 
                        ...card(), 
                        background: colors.panel,
                        border: `1px solid ${colors.border}`
                      }}>
                        <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: colors.text }}>
                          🔍 Find Duplicate Ingredients
                        </h4>
                        <p style={{ color: colors.muted, fontSize: 14, marginBottom: 16 }}>
                          Find ingredients with similar names that might be duplicates
                        </p>
                        <button
                          onClick={findDuplicateIngredients}
                          disabled={migrationLoading}
                          style={{
                            ...btnSecondary,
                            width: "100%",
                            opacity: migrationLoading ? 0.7 : 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8
                          }}
                        >
                          {migrationLoading && <LoadingSpinner size="sm" />}
                          {migrationLoading ? "Scanning..." : "Find Duplicates"}
                        </button>
                      </div>
                      
                      {/* Find Inconsistent Units */}
                      <div style={{ 
                        ...card(), 
                        background: colors.panel,
                        border: `1px solid ${colors.border}`
                      }}>
                        <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: colors.text }}>
                          📏 Find Inconsistent Units
                        </h4>
                        <p style={{ color: colors.muted, fontSize: 14, marginBottom: 16 }}>
                          Find recipe ingredients using units not in the catalog
                        </p>
                        <button
                          onClick={findInconsistentUnits}
                          disabled={migrationLoading}
                          style={{
                            ...btnSecondary,
                            width: "100%",
                            opacity: migrationLoading ? 0.7 : 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8
                          }}
                        >
                          {migrationLoading && <LoadingSpinner size="sm" />}
                          {migrationLoading ? "Scanning..." : "Find Inconsistent Units"}
                        </button>
                      </div>
                      
                      {/* Find Orphaned Data */}
                      <div style={{ 
                        ...card(), 
                        background: colors.panel,
                        border: `1px solid ${colors.border}`
                      }}>
                        <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: colors.text }}>
                          🗑️ Find Orphaned Data
                        </h4>
                        <p style={{ color: colors.muted, fontSize: 14, marginBottom: 16 }}>
                          Find recipe ingredients linked to deleted cocktails/ingredients
                        </p>
                        <button
                          onClick={findOrphanedData}
                          disabled={migrationLoading}
                          style={{
                            ...btnSecondary,
                            width: "100%",
                            opacity: migrationLoading ? 0.7 : 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8
                          }}
                        >
                          {migrationLoading && <LoadingSpinner size="sm" />}
                          {migrationLoading ? "Scanning..." : "Find Orphaned Data"}
                        </button>
                      </div>
                      
                      {/* Clean Orphaned Data */}
                      <div style={{ 
                        ...card(), 
                        background: colors.panel,
                        border: `1px solid ${colors.border}`
                      }}>
                        <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: colors.text }}>
                          🧽 Clean Orphaned Data
                        </h4>
                        <p style={{ color: colors.muted, fontSize: 14, marginBottom: 16 }}>
                          Remove orphaned recipe ingredients
                        </p>
                        <button
                          onClick={cleanOrphanedData}
                          disabled={migrationLoading}
                          style={{
                            ...dangerBtn,
                            width: "100%",
                            opacity: migrationLoading ? 0.7 : 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8
                          }}
                        >
                          {migrationLoading && <LoadingSpinner size="sm" />}
                          {migrationLoading ? "Cleaning..." : "Clean Orphaned Data"}
                        </button>
                      </div>
                    </div>
                    
                    {/* Migration Results */}
                    {migrationResults && (
                      <div style={{ 
                        marginTop: 20, 
                        padding: 16, 
                        background: colors.panel, 
                        borderRadius: 8,
                        border: `1px solid ${colors.border}`
                      }}>
                        <h4 style={{ margin: "0 0 12px 0", fontSize: 16, color: colors.text }}>
                          📊 Migration Results
                        </h4>
                        
                        {migrationResults.type === 'duplicate_ingredients' && (
                          <div>
                            <p style={{ color: colors.muted, fontSize: 14, marginBottom: 12 }}>
                              Found {migrationResults.data.length} sets of duplicate ingredients:
                            </p>
                            {migrationResults.data.map((duplicate: any, index: number) => (
                              <div key={index} style={{ 
                                marginBottom: 8, 
                                padding: 8, 
                                background: colors.glass,
                                borderRadius: 4,
                                border: `1px solid ${colors.border}`
                              }}>
                                <strong style={{ color: colors.text }}>{duplicate.normalized}:</strong>
                                <div style={{ marginTop: 4 }}>
                                  {duplicate.duplicates.map((name: string, i: number) => (
                                    <span key={i} style={{ 
                                      display: "inline-block",
                                      margin: "2px 4px 2px 0",
                                      padding: "2px 6px",
                                      background: colors.accent,
                                      color: "white",
                                      borderRadius: 4,
                                      fontSize: 12
                                    }}>
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {migrationResults.type === 'inconsistent_units' && (
                          <div>
                            <p style={{ color: colors.muted, fontSize: 14, marginBottom: 12 }}>
                              Found {migrationResults.data.length} inconsistent units:
                            </p>
                            {migrationResults.data.map((unit: any, index: number) => (
                              <div key={index} style={{ 
                                marginBottom: 8, 
                                padding: 8, 
                                background: colors.glass,
                                borderRadius: 4,
                                border: `1px solid ${colors.border}`
                              }}>
                                <span style={{ color: colors.text, fontWeight: 600 }}>{unit.unit}</span>
                                <span style={{ color: colors.muted, marginLeft: 8 }}>
                                  ({unit.count} recipes)
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {migrationResults.type === 'orphaned_data' && (
                          <div>
                            <p style={{ color: colors.muted, fontSize: 14, marginBottom: 12 }}>
                              Data integrity check:
                            </p>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                              <div style={{ textAlign: "center", padding: 12, background: colors.glass, borderRadius: 4 }}>
                                <div style={{ fontSize: 24, fontWeight: 600, color: colors.text }}>
                                  {migrationResults.data.total_cocktails}
                                </div>
                                <div style={{ fontSize: 12, color: colors.muted }}>Cocktails</div>
                              </div>
                              <div style={{ textAlign: "center", padding: 12, background: colors.glass, borderRadius: 4 }}>
                                <div style={{ fontSize: 24, fontWeight: 600, color: colors.text }}>
                                  {migrationResults.data.total_ingredients}
                                </div>
                                <div style={{ fontSize: 12, color: colors.muted }}>Ingredients</div>
                              </div>
                              <div style={{ textAlign: "center", padding: 12, background: colors.glass, borderRadius: 4 }}>
                                <div style={{ fontSize: 24, fontWeight: 600, color: colors.danger }}>
                                  {migrationResults.data.orphaned_recipe_ingredients}
                                </div>
                                <div style={{ fontSize: 12, color: colors.muted }}>Orphaned</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        )}


        {route === "main" && (
          <>
            {/* COMPACT FILTER CONTROLS */}
            <div className="animate-slide-in-right" style={{
              ...card({ marginBottom: 24 }),
              background: colors.glass
            }}>
              {/* Header */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: `1px solid ${colors.glassBorder}`
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: colors.text,
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}>
                  🔍 Search & Filter
                </h3>
                <div style={{ fontSize: 12, color: colors.muted }}>
                  {rows.length} cocktail{rows.length !== 1 ? 's' : ''}
                </div>
              </div>
              {/* Compact Search Bar */}
              <div style={{ 
                display: "flex", 
                gap: 8, 
                alignItems: "center",
                marginBottom: 8
              }}>
                {/* Main Search Input */}
                <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                  <input 
                    value={nameSearch} 
                    onChange={e=>setNameSearch(e.target.value)} 
                    placeholder="🔍 Search cocktails by name..." 
                    style={{ 
                      ...inp, 
                      paddingLeft: 12,
                      paddingRight: nameSearch ? 32 : 12,
                      fontSize: 14,
                      width: "100%"
                    }}
                  />
                  {nameSearch && (
                    <button
                      onClick={() => setNameSearch("")}
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: colors.muted,
                        cursor: "pointer",
                        fontSize: 12,
                        padding: 2
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* View Toggle */}
                <button 
                  onClick={()=>setView(v=> v==="cards" ? "list" : "cards")} 
                  style={{
                    ...btnSecondary,
                    fontSize: 12,
                    padding: "6px 8px",
                    background: view === "cards" ? colors.accent : colors.glass,
                    color: view === "cards" ? "white" : colors.text,
                    border: `1px solid ${view === "cards" ? colors.accent : colors.glassBorder}`,
                    borderRadius: 6,
                    minWidth: 40
                  }}
                >
                  {view==="cards" ? "📋" : "🎴"}
                </button>

                {/* Advanced Search Toggle */}
                <button
                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                  style={{
                    ...btnSecondary,
                    fontSize: 12,
                    padding: "6px 12px",
                    background: showAdvancedSearch ? colors.primarySolid : colors.glass,
                    color: showAdvancedSearch ? "white" : colors.text,
                    border: `1px solid ${showAdvancedSearch ? colors.primarySolid : colors.glassBorder}`,
                    borderRadius: 6,
                    minWidth: 60
                  }}
                >
                  {showAdvancedSearch ? "🔽 Hide" : "🔍 Filters"}
                </button>
              </div>

              {/* Advanced Search Panel */}
              {showAdvancedSearch && (
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "auto auto auto auto auto auto auto auto", 
                  gap: 8, 
                  alignItems: "center",
                  padding: 12,
                  background: colors.glass,
                  borderRadius: 8,
                  border: `1px solid ${colors.glassBorder}`
                }}>
                  {/* Ingredients Search */}
                  <div style={{ position: "relative" }}>
                    <input 
                      value={q} 
                      onChange={e=>setQ(e.target.value)} 
                      onKeyDown={e => {
                        if (e.key === "Enter" && q.trim()) {
                          addIngredientFilter(q.trim())
                          setQ("")
                        }
                      }}
                      placeholder="🔍 Ingredient..." 
                      style={{ 
                        ...inp, 
                        paddingLeft: 8,
                        paddingRight: q ? 24 : 8,
                        fontSize: 12,
                        minWidth: 100
                      }}
                    />
                    {q && (
                      <button
                        onClick={() => {
                          if (q.trim()) {
                            addIngredientFilter(q.trim())
                            setQ("")
                          } else {
                            setQ("")
                          }
                        }}
                        style={{
                          position: "absolute",
                          right: 6,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: colors.muted,
                          cursor: "pointer",
                          fontSize: 10,
                          padding: 1
                        }}
                      >
                        {q.trim() ? "➕" : "✕"}
                      </button>
                    )}
                  </div>
                  
                  {/* Method Filter */}
                  <select value={fMethod} onChange={e=>setFMethod(e.target.value)} style={{...inp, fontSize: 12, minWidth: 80}}>
                    <option value="">Method</option>
                    {methods.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  
                  {/* Glass Filter */}
                  <select value={fGlass} onChange={e=>setFGlass(e.target.value)} style={{...inp, fontSize: 12, minWidth: 80}}>
                    <option value="">Glass</option>
                    {glasses.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  
                  {/* Price Range Filter */}
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input
                      type="number"
                      placeholder="Min $"
                      value={priceMin}
                      onChange={e=>setPriceMin(e.target.value)}
                      style={{...inp, fontSize: 12, width: 60, textAlign: "center"}}
                    />
                    <span style={{ fontSize: 12, color: colors.muted }}>-</span>
                    <input
                      type="number"
                      placeholder="Max $"
                      value={priceMax}
                      onChange={e=>setPriceMax(e.target.value)}
                      style={{...inp, fontSize: 12, width: 60, textAlign: "center"}}
                    />
                  </div>
                  
                  {/* Tags Filter */}
                  <select 
                    value="" 
                    onChange={e => {
                      if (e.target.value) {
                        toggleTag(e.target.value)
                        e.target.value = ""
                      }
                    }}
                    style={{...inp, fontSize: 12, minWidth: 80}}
                  >
                    <option value="">🏷️ Tags</option>
                    {availableTags.map(tag => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                  
                  {/* Sort */}
                  <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} style={{...inp, fontSize: 12, minWidth: 100}}>
                    <option value="special_desc">📅 Special</option>
                    <option value="special_asc">📅 Old Special</option>
                    <option value="name_asc">🔤 A-Z</option>
                    <option value="name_desc">🔤 Z-A</option>
                  </select>
                  
                  {/* Special Toggle */}
                  <button
                    onClick={() => setSpecialOnly(!specialOnly)}
                    style={{
                      ...btnSecondary,
                      fontSize: 11,
                      padding: "4px 8px",
                      background: specialOnly ? colors.primarySolid : colors.glass,
                      color: specialOnly ? "white" : colors.text,
                      border: `1px solid ${specialOnly ? colors.primarySolid : colors.glassBorder}`,
                      borderRadius: 4,
                      minWidth: 50
                    }}
                  >
                    ⭐ Special
                  </button>

                  {/* Menu Items Toggle */}
                  <button
                    onClick={() => setOlogyOnly(!ologyOnly)}
                    style={{
                      ...btnSecondary,
                      fontSize: 11,
                      padding: "4px 8px",
                      background: ologyOnly ? colors.accent : colors.glass,
                      color: ologyOnly ? "white" : colors.text,
                      border: `1px solid ${ologyOnly ? colors.accent : colors.glassBorder}`,
                      borderRadius: 4,
                      minWidth: 50
                    }}
                  >
                    🍸 Menu
                  </button>

                  {/* Clear All Filters */}
                  <button
                    onClick={() => {
                      setQ("")
                      setNameSearch("")
                      setFMethod("")
                      setFGlass("")
                      setSpecialOnly(false)
                      setOlogyOnly(false)
                      setIngredientFilters([])
                      setSelectedTags([])
                      setPriceMin("")
                      setPriceMax("")
                    }}
                    style={{
                      ...btnSecondary,
                      fontSize: 11,
                      padding: "4px 8px",
                      background: colors.glass,
                      color: colors.muted,
                      border: `1px solid ${colors.glassBorder}`,
                      borderRadius: 4,
                      minWidth: 60
                    }}
                  >
                    🗑️ Clear
                  </button>
                </div>
              )}


              {/* Active Filters Row */}
              {(ingredientFilters.length > 0 || nameSearch || fMethod || fGlass || specialOnly || ologyOnly || selectedTags.length > 0 || priceMin || priceMax) && (
                <div style={{ 
                  display: "flex", 
                  gap: 8, 
                  alignItems: "center",
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: `1px solid ${colors.glassBorder}`
                }}>
                  <span style={{ fontSize: 12, color: colors.muted, marginRight: 8 }}>Active:</span>
                  
                  {ingredientFilters.map((ingredient, index) => (
                    <span key={index} style={{
                      background: colors.primarySolid,
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      🔍 {ingredient}
                      <button
                        onClick={() => removeIngredientFilter(ingredient)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "white",
                  cursor: "pointer",
                          fontSize: 10,
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  
                  {selectedTags.map((tagId) => {
                    const tag = availableTags.find(t => t.id === tagId)
                    return tag ? (
                      <span key={tagId} style={{
                        background: colors.accent,
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: 12,
                        fontSize: 11,
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}>
                        🏷️ {tag.name}
                        <button
                          onClick={() => toggleTag(tagId)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "white",
                            cursor: "pointer",
                            fontSize: 10,
                            padding: 0
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ) : null
                  })}
                  
                  {nameSearch && (
                    <span style={{
                      background: colors.accent,
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      🍸 {nameSearch}
                      <button
                        onClick={() => setNameSearch("")}
                        style={{
                          background: "none",
                          border: "none",
                          color: "white",
                          cursor: "pointer",
                          fontSize: 10,
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  )}

                  {q && (
                    <span style={{
                      background: colors.primarySolid,
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      🔍 {q}
                <button 
                        onClick={() => setQ("")}
                        style={{
                          background: "none",
                          border: "none",
                          color: "white",
                          cursor: "pointer",
                          fontSize: 10,
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  )}

                  {fMethod && (
                    <span style={{
                      background: colors.glassBorder,
                      color: colors.text,
                      padding: "4px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      🥃 {fMethod}
                      <button
                        onClick={() => setFMethod("")}
                        style={{
                          background: "none",
                          border: "none",
                          color: colors.text,
                          cursor: "pointer",
                          fontSize: 10,
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  )}

                  {fGlass && (
                    <span style={{
                      background: colors.glassBorder,
                      color: colors.text,
                      padding: "4px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      🥃 {fGlass}
                      <button
                        onClick={() => setFGlass("")}
                        style={{
                          background: "none",
                          border: "none",
                          color: colors.text,
                          cursor: "pointer",
                          fontSize: 10,
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  )}

                  {specialOnly && (
                    <span style={{
                      background: colors.primarySolid,
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      ⭐ Special
                      <button
                        onClick={() => setSpecialOnly(false)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "white",
                          cursor: "pointer",
                          fontSize: 10,
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  )}

                  {ologyOnly && (
                    <span style={{
                      background: colors.accent,
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      🍸 Menu
                      <button
                        onClick={() => setOlogyOnly(false)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "white",
                          cursor: "pointer",
                          fontSize: 10,
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  )}

                  {(priceMin || priceMax) && (
                    <span style={{
                      background: colors.primarySolid,
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      💰 ${priceMin || "0"} - ${priceMax || "∞"}
                      <button
                        onClick={() => {
                          setPriceMin("")
                          setPriceMax("")
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "white",
                          cursor: "pointer",
                          fontSize: 10,
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  )}

                  <button
                    onClick={() => {
                      setQ("")
                      setNameSearch("")
                      setFMethod("")
                      setFGlass("")
                      setSpecialOnly(false)
                      setOlogyOnly(false)
                      clearAllIngredientFilters()
                      clearAllTags()
                      setPriceMin("")
                      setPriceMax("")
                    }}
                  style={{
                    ...btnSecondary,
                      fontSize: 11,
                      padding: "4px 8px",
                    background: colors.glass,
                      border: `1px solid ${colors.glassBorder}`,
                      borderRadius: 6,
                      marginLeft: "auto"
                  }}
                >
                    🗑️ Clear All
                </button>
              </div>
              )}
            </div>

            {/* ENHANCED ADD BUTTON */}
            {(role === "editor" || role === "admin") && !formOpen && (
              <div style={{ marginBottom: 24, textAlign: "center" }}>
                <button 
                  onClick={openAddForm} 
                  style={{
                    ...btnPrimary,
                    background: colors.accent,
                    fontSize: 16,
                    padding: "16px 32px",
                    borderRadius: 12,
                    boxShadow: shadows.lg
                  }}
                >
                  ✨ Create New Cocktail
                </button>
              </div>
            )}

            {/* FORM */}
            {(role === "editor" || role === "admin") && formOpen && (
              <CocktailForm
                editingId={editingId}
                methods={methods}
                glasses={glasses}
                ices={ices}
                availableTags={availableTags}
                units={units}
                name={name} setName={setName}
                method={method} setMethod={setMethod}
                glass={glass} setGlass={setGlass}
                ice={ice} setIce={setIce}
                notes={notes} setNotes={setNotes}
                price={price} setPrice={setPrice}
                specialDate={specialDate} setSpecialDate={setSpecialDate}
                isOlogyRecipe={isOlogyRecipe} setOlogyRecipe={setOlogyRecipe}
                lines={lines} setLines={(updater)=> setLines(prev => updater(prev))}
                selectedTags={selectedTags} setSelectedTags={setSelectedTags}
                onClose={()=>{ resetForm(); setFormOpen(false) }}
                onSubmit={save}
            onQueryIngredients={queryIngredients}
            onAddCatalogItem={addCatalogItem}
            onAddTag={addTag}
              />
            )}

            {/* RESULTS */}
            {loading ? (
              <div>
                <LoadingSpinner text="Loading cocktails..." />
                <div style={{ display: "grid", gap: 16 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <CocktailCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            ) : rows.length === 0 ? (
              <div style={{ color: colors.muted }}>No results.</div>
            ) : view==="cards" ? (
              <div
                ref={cardsRef}
                className="cocktail-grid"
                style={{
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))"
                }}
              >
                {rows.map((c, index) => (
                  <TouchGestures
                    key={c.id}
                    onSwipeLeft={() => {
                      if (role === 'editor' || role === 'admin') {
                        if (confirm(`Delete "${c.name}"?`)) {
                          remove(c.id)
                        }
                      }
                    }}
                    onSwipeRight={() => startEdit(c)}
                    onPinch={(scale) => {
                      // Zoom functionality for mobile
                      if (scale > 1.2) {
                        startEdit(c)
                      }
                    }}
                  >
                    <div
                      className="card-hover animate-fade-in-up cocktail-card"
                      tabIndex={0}
                      onClick={() => startEdit(c)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          startEdit(c)
                        }
                      }}
                      style={{
                        ...cocktailCard,
                        position: "relative",
                        overflow: "hidden",
                        cursor: "pointer",
                        background: c.last_special_on ? 
                          colors.special : 
                          colors.panel,
                        border: c.last_special_on ? 
                          `1px solid ${colors.specialSolid}` : 
                          `1px solid ${colors.border}`,
                        boxShadow: c.last_special_on ? 
                          shadows.glow : 
                          shadows.md,
                        animationDelay: `${index * 0.1}s`,
                        outline: "none"
                      }}
                      title="Click to edit (or press Enter/Space) • Swipe right to edit, swipe left to delete"
                    >
                    {/* Header with name, price, and special badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div style={{ flex: 1, marginRight: 16 }}>
                        <h3 style={{ 
                          fontWeight: 700, 
                          fontSize: 18, 
                          margin: "0 0 8px 0",
                          color: colors.accent
                        }}>
                          {c.name}
                        </h3>
                        <div style={{ 
                          fontSize: 13, 
                          color: colors.muted,
                          display: "flex",
                          alignItems: "center",
                          gap: 8
                        }}>
                          {c.method && <span>🔄 {c.method}</span>}
                          {c.glass && <span>🥃 {c.glass}</span>}
                        </div>
                      </div>
                      <div style={{ 
                        display: "flex", 
                        flexDirection: "column", 
                        alignItems: "flex-end",
                        gap: 8
                      }}>
                        {/* Badges */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {c.last_special_on && (
                          <div style={specialBadge}>
                            ⭐ Special
                          </div>
                        )}
                          {c.is_ology_recipe && (
                            <div style={ologyBadge}>
                              🍸 Menu
                            </div>
                          )}
                        </div>
                        
                        {/* Tags */}
                {cocktailTags[c.id] && cocktailTags[c.id].length > 0 && (
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    marginTop: 8
                  }}>
                    {cocktailTags[c.id].map(tag => (
                      <span
                        key={tag.id}
                        style={{
                          background: colors.accent,
                          color: "white",
                          padding: "2px 6px",
                          borderRadius: 8,
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em"
                        }}
                      >
                        🏷️ {tag.name}
                      </span>
                    ))}
                  </div>
                )}
                        {/* Price */}
                        {c.price != null && (
                          <div style={priceDisplay}>
                            ${Number(c.price).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Photo */}
                    {(c.photo_url || cocktailPhotos[c.id]) && (
                      <div style={{ marginBottom: 16 }}>
                        <img
                          src={c.photo_url || cocktailPhotos[c.id]}
                          alt={`${c.name} photo`}
                          style={{
                            width: "100%",
                            height: 200,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: `1px solid ${colors.border}`
                          }}
                          onError={(e) => {
                            // Hide broken images
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                        {(role === 'editor' || role === 'admin') && (
                          <div style={{ 
                            display: "flex", 
                            gap: 8, 
                            marginTop: 8,
                            justifyContent: "center"
                          }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const input = document.createElement('input')
                                input.type = 'file'
                                input.accept = 'image/*'
                                input.onchange = (event) => {
                                  const file = (event.target as HTMLInputElement).files?.[0]
                                  if (file) uploadPhoto(c.id, file)
                                }
                                input.click()
                              }}
                              style={{
                                ...btnSecondary,
                                fontSize: 12,
                                padding: "4px 8px"
                              }}
                            >
                              📸 Replace
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deletePhoto(c.id)
                              }}
                              style={{
                                ...dangerBtn,
                                fontSize: 12,
                                padding: "4px 8px"
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Add Photo Button (for cocktails without photos) */}
                    {!c.photo_url && !cocktailPhotos[c.id] && (role === 'editor' || role === 'admin') && (
                      <div style={{ 
                        marginBottom: 16,
                        textAlign: "center",
                        padding: 20,
                        border: `2px dashed ${colors.border}`,
                        borderRadius: 8,
                        background: colors.panel
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const input = document.createElement('input')
                            input.type = 'file'
                            input.accept = 'image/*'
                            input.onchange = (event) => {
                              const file = (event.target as HTMLInputElement).files?.[0]
                              if (file) uploadPhoto(c.id, file)
                            }
                            input.click()
                          }}
                          style={{
                            ...btnSecondary,
                            fontSize: 14,
                            padding: "8px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            margin: "0 auto"
                          }}
                        >
                          📸 Add Photo
                        </button>
                      </div>
                    )}

                    {/* Ingredients */}
                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ 
                        fontSize: 12, 
                        color: colors.muted, 
                        margin: "0 0 8px 0",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontWeight: 600
                      }}>
                        🧪 Ingredients
                      </h4>
                      <ul style={{
                        ...ingredientList,
                        fontSize: 13,
                        color: colors.text
                      }}>
                        {(specs[c.id] || []).map((l, i) => {
                          const ingredientName = l.split(' ').slice(1).join(' ').trim()
                          const suggestions = getSubstitutionSuggestions(ingredientName)
                          
                          return (
                            <li key={i} style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              gap: 8,
                              padding: "4px 0"
                            }}>
                              <span style={{ color: colors.primarySolid }}>•</span>
                              <span style={{ flex: 1 }}>{l}</span>
                              {suggestions.length > 0 && (
                                <div style={{ 
                                  position: "relative",
                                  display: "inline-block"
                                }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      const tooltip = e.currentTarget.nextElementSibling as HTMLElement
                                      if (tooltip) {
                                        tooltip.style.display = tooltip.style.display === 'block' ? 'none' : 'block'
                                      }
                                    }}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: colors.muted,
                                      cursor: "pointer",
                                      fontSize: 10,
                                      padding: "2px 4px",
                                      borderRadius: 4
                                    }}
                                    title="Substitution suggestions"
                                  >
                                    🔄
                                  </button>
                                  <div style={{
                                    display: "none",
                                    position: "absolute",
                                    top: "100%",
                                    right: 0,
                                    background: colors.panel,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: 6,
                                    padding: 8,
                                    minWidth: 150,
                                    zIndex: 1000,
                                    boxShadow: shadows.md
                                  }}>
                                    <div style={{ 
                                      fontSize: 11, 
                                      color: colors.muted, 
                                      marginBottom: 4,
                                      fontWeight: 600
                                    }}>
                                      Substitutions:
                                    </div>
                                    {suggestions.map((suggestion, idx) => (
                                      <div key={idx} style={{
                                        fontSize: 10,
                                        color: colors.text,
                                        padding: "2px 0",
                                        cursor: "pointer"
                                      }}
                                      onClick={() => {
                                        // Could implement substitution logic here
                                        console.log(`Substitute ${ingredientName} with ${suggestion}`)
                                      }}
                                      >
                                        • {suggestion}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>

                    {/* Notes */}
                    {c.notes && (
                      <div style={{ marginBottom: 16 }}>
                        <h4 style={{ 
                          fontSize: 12, 
                          color: colors.muted, 
                          margin: "0 0 8px 0",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          fontWeight: 600
                        }}>
                          📝 Notes
                        </h4>
                        <div style={{
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: colors.text,
                          background: colors.panel,
                          padding: 12,
                          borderRadius: 8,
                          border: `1px solid ${colors.border}`,
                          fontStyle: "italic"
                        }}>
                          {c.notes}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {(role==="editor" || role==="admin") && (
                      <div style={{ 
                        display: "flex", 
                        gap: 8, 
                        marginTop: "auto",
                        paddingTop: 16,
                        borderTop: `1px solid ${colors.border}`
                      }}>
                        <button 
                          onClick={(e)=>{ e.stopPropagation(); startEdit(c) }} 
                          style={{
                            ...btnSecondary,
                            flex: 1,
                            fontSize: 12,
                            padding: "8px 12px"
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={(e)=>{ e.stopPropagation(); remove(c.id) }} 
                          style={{
                            ...dangerBtn,
                            flex: 1,
                            fontSize: 12,
                            padding: "8px 12px"
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>
                  </TouchGestures>
                ))}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table-responsive" style={{ 
                  minWidth: 800, 
                  width: "100%", 
                  borderCollapse: "collapse", 
                  ...card({ padding: 0 }),
                  background: colors.glass
                }}>
                  <thead style={{ 
                    background: colors.panel,
                    color: colors.text
                  }}>
                    <tr>
                      <th style={th}>🍸 Name</th>
                      <th style={th}>🔄 Method</th>
                      <th style={th}>🥃 Glass</th>
                      <th style={th}>💰 Price</th>
                      <th style={th}>🧪 Specs</th>
                      <th style={th}>📝 Notes</th>
                      <th style={th}>⚡ Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(c => (
                      <tr 
                        key={c.id} 
                        style={{ 
                          borderTop: `1px solid ${colors.border}`,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          background: c.last_special_on ? 
                            colors.special : 
                            "transparent"
                        }} 
                        onClick={() => startEdit(c)} 
                        title="Click to edit"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = c.last_special_on ? 
                            colors.special : 
                            colors.panelHover
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = c.last_special_on ? 
                            colors.special : 
                            "transparent"
                        }}
                      >
                        <td style={td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {c.last_special_on && <span style={{ color: colors.specialSolid }}>⭐</span>}
                            {c.is_ology_recipe && <span style={{ color: colors.accent }}>🍸</span>}
                            <span style={{ 
                              fontWeight: 600,
                              color: colors.accent
                            }}>
                              {c.name}
                            </span>
                          </div>
                        </td>
                        <td style={td}>{c.method || "—"}</td>
                        <td style={td}>{c.glass || "—"}</td>
                        <td style={td}>
                          {c.price != null ? (
                            <span style={priceDisplay}>
                              ${Number(c.price).toFixed(2)}
                            </span>
                          ) : "—"}
                        </td>
                        <td style={td}>
                          <ul style={{ 
                            margin: 0, 
                            paddingLeft: 0,
                            listStyle: "none"
                          }}>
                            {(specs[c.id] || []).slice(0, 3).map((l, i) => (
                              <li key={i} style={{ 
                                fontSize: 12,
                                color: colors.muted,
                                padding: "2px 0"
                              }}>
                                • {l}
                              </li>
                            ))}
                            {(specs[c.id] || []).length > 3 && (
                              <li style={{ 
                                fontSize: 11,
                                color: colors.muted,
                                fontStyle: "italic"
                              }}>
                                +{(specs[c.id] || []).length - 3} more...
                              </li>
                            )}
                          </ul>
                        </td>
                        <td style={td}>
                          {c.notes ? (
                            <div style={{
                              fontSize: 12,
                              lineHeight: 1.4,
                              color: colors.text,
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }} title={c.notes}>
                              {c.notes}
                            </div>
                          ) : "—"}
                        </td>
                        <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                          {(role==="editor" || role==="admin") && (
                            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                              <button 
                                onClick={(e)=>{ e.stopPropagation(); startEdit(c) }} 
                                style={{
                                  ...btnSecondary,
                                  fontSize: 11,
                                  padding: "6px 10px"
                                }}
                              >
                                ✏️
                              </button>
                              <button 
                                onClick={(e)=>{ e.stopPropagation(); remove(c.id) }} 
                                style={{
                                  ...dangerBtn,
                                  fontSize: 11,
                                  padding: "6px 10px"
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
