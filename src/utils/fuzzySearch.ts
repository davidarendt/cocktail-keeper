// src/utils/fuzzySearch.ts

/**
 * Fuzzy search utility for handling typos and partial matches
 */

export interface FuzzySearchOptions {
  threshold?: number // 0-1, higher = more strict matching
  caseSensitive?: boolean
  normalize?: boolean // Remove accents, special chars
}

export interface SearchResult<T> {
  item: T
  score: number
  matches: string[]
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      )
    }
  }
  
  return matrix[str2.length][str1.length]
}

/**
 * Normalize string for better matching
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Calculate similarity score between two strings
 */
function calculateSimilarity(str1: string, str2: string, options: FuzzySearchOptions = {}): number {
  const { caseSensitive = false, normalize = true } = options
  
  let s1 = str1
  let s2 = str2
  
  if (!caseSensitive) {
    s1 = s1.toLowerCase()
    s2 = s2.toLowerCase()
  }
  
  if (normalize) {
    s1 = normalizeString(s1)
    s2 = normalizeString(s2)
  }
  
  // Exact match
  if (s1 === s2) return 1.0
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.8
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(s1, s2)
  const maxLength = Math.max(s1.length, s2.length)
  
  if (maxLength === 0) return 0
  
  return 1 - (distance / maxLength)
}

/**
 * Find fuzzy matches in an array of items
 */
export function fuzzySearch<T>(
  items: T[],
  searchTerm: string,
  getSearchText: (item: T) => string,
  options: FuzzySearchOptions = {}
): SearchResult<T>[] {
  if (!searchTerm.trim()) return []
  
  const { threshold = 0.3 } = options
  const results: SearchResult<T>[] = []
  
  for (const item of items) {
    const text = getSearchText(item)
    const score = calculateSimilarity(searchTerm, text, options)
    
    if (score >= threshold) {
      results.push({
        item,
        score,
        matches: [text]
      })
    }
  }
  
  // Sort by score (highest first)
  return results.sort((a, b) => b.score - a.score)
}

/**
 * Find fuzzy matches with multiple search fields
 */
export function fuzzySearchMulti<T>(
  items: T[],
  searchTerm: string,
  getSearchTexts: (item: T) => string[],
  options: FuzzySearchOptions = {}
): SearchResult<T>[] {
  if (!searchTerm.trim()) return []
  
  const { threshold = 0.3 } = options
  const results: SearchResult<T>[] = []
  
  for (const item of items) {
    const texts = getSearchTexts(item)
    let bestScore = 0
    const matches: string[] = []
    
    for (const text of texts) {
      const score = calculateSimilarity(searchTerm, text, options)
      if (score > bestScore) {
        bestScore = score
        matches[0] = text
      }
    }
    
    if (bestScore >= threshold) {
      results.push({
        item,
        score: bestScore,
        matches
      })
    }
  }
  
  // Sort by score (highest first)
  return results.sort((a, b) => b.score - a.score)
}

/**
 * Quick fuzzy search for simple string arrays
 */
export function fuzzySearchStrings(
  items: string[],
  searchTerm: string,
  options: FuzzySearchOptions = {}
): SearchResult<string>[] {
  return fuzzySearch(items, searchTerm, (item) => item, options)
}

/**
 * Check if a string is a fuzzy match for another
 */
export function isFuzzyMatch(
  searchTerm: string,
  target: string,
  threshold: number = 0.6
): boolean {
  return calculateSimilarity(searchTerm, target) >= threshold
}
