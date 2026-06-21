import { ref, computed } from 'vue'
import type { Case, CaseStatus } from '@/types'

const RECENT_CASES_KEY = 'hjj-recent-cases'
const FAVORITE_CASES_KEY = 'hjj-favorite-cases'
const MAX_RECENT_COUNT = 20

export interface RecentCaseItem {
  caseId: string
  caseNumber: string
  name: string
  caseType: string
  status: CaseStatus
  responsibleLawyer: string
  client: string
  lastVisitedAt: string
  visitType: 'view' | 'material'
}

export interface FavoriteCaseItem {
  caseId: string
  caseNumber: string
  name: string
  caseType: string
  status: CaseStatus
  responsibleLawyer: string
  client: string
  pinnedAt: string
}

const recentCases = ref<RecentCaseItem[]>([])
const favoriteCases = ref<FavoriteCaseItem[]>([])
let isInitialized = false

const loadRecentCases = (): RecentCaseItem[] => {
  try {
    const raw = localStorage.getItem(RECENT_CASES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

const loadFavoriteCases = (): FavoriteCaseItem[] => {
  try {
    const raw = localStorage.getItem(FAVORITE_CASES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

const saveRecentCases = (data: RecentCaseItem[]) => {
  try {
    localStorage.setItem(RECENT_CASES_KEY, JSON.stringify(data))
  } catch {
    console.warn('Failed to save recent cases to localStorage')
  }
}

const saveFavoriteCases = (data: FavoriteCaseItem[]) => {
  try {
    localStorage.setItem(FAVORITE_CASES_KEY, JSON.stringify(data))
  } catch {
    console.warn('Failed to save favorite cases to localStorage')
  }
}

const buildRecentItem = (caseData: Case, visitType: 'view' | 'material'): RecentCaseItem => ({
  caseId: caseData.id,
  caseNumber: caseData.caseNumber,
  name: caseData.name,
  caseType: caseData.caseType,
  status: caseData.status,
  responsibleLawyer: caseData.responsibleLawyer,
  client: caseData.client,
  lastVisitedAt: new Date().toISOString(),
  visitType,
})

const buildFavoriteItem = (caseData: Case): FavoriteCaseItem => ({
  caseId: caseData.id,
  caseNumber: caseData.caseNumber,
  name: caseData.name,
  caseType: caseData.caseType,
  status: caseData.status,
  responsibleLawyer: caseData.responsibleLawyer,
  client: caseData.client,
  pinnedAt: new Date().toISOString(),
})

export const useCaseQuickAccess = () => {
  const initialize = () => {
    if (isInitialized) return
    recentCases.value = loadRecentCases()
    favoriteCases.value = loadFavoriteCases()
    isInitialized = true
  }

  const addRecentCase = (caseData: Case, visitType: 'view' | 'material' = 'view') => {
    initialize()
    const existingIndex = recentCases.value.findIndex(r => r.caseId === caseData.id)
    const newItem = buildRecentItem(caseData, visitType)

    if (existingIndex !== -1) {
      recentCases.value.splice(existingIndex, 1)
    }
    recentCases.value.unshift(newItem)

    if (recentCases.value.length > MAX_RECENT_COUNT) {
      recentCases.value = recentCases.value.slice(0, MAX_RECENT_COUNT)
    }
    saveRecentCases(recentCases.value)
  }

  const updateRecentCaseInfo = (caseData: Case) => {
    initialize()
    const recentIndex = recentCases.value.findIndex(r => r.caseId === caseData.id)
    if (recentIndex !== -1) {
      recentCases.value[recentIndex] = {
        ...recentCases.value[recentIndex],
        caseNumber: caseData.caseNumber,
        name: caseData.name,
        caseType: caseData.caseType,
        status: caseData.status,
        responsibleLawyer: caseData.responsibleLawyer,
        client: caseData.client,
      }
      saveRecentCases(recentCases.value)
    }

    const favIndex = favoriteCases.value.findIndex(f => f.caseId === caseData.id)
    if (favIndex !== -1) {
      favoriteCases.value[favIndex] = {
        ...favoriteCases.value[favIndex],
        caseNumber: caseData.caseNumber,
        name: caseData.name,
        caseType: caseData.caseType,
        status: caseData.status,
        responsibleLawyer: caseData.responsibleLawyer,
        client: caseData.client,
      }
      saveFavoriteCases(favoriteCases.value)
    }
  }

  const removeRecentCase = (caseId: string) => {
    initialize()
    recentCases.value = recentCases.value.filter(r => r.caseId !== caseId)
    saveRecentCases(recentCases.value)
  }

  const clearRecentCases = () => {
    initialize()
    recentCases.value = []
    saveRecentCases(recentCases.value)
  }

  const addFavoriteCase = (caseData: Case) => {
    initialize()
    if (favoriteCases.value.some(f => f.caseId === caseData.id)) return
    favoriteCases.value.unshift(buildFavoriteItem(caseData))
    saveFavoriteCases(favoriteCases.value)
  }

  const removeFavoriteCase = (caseId: string) => {
    initialize()
    favoriteCases.value = favoriteCases.value.filter(f => f.caseId !== caseId)
    saveFavoriteCases(favoriteCases.value)
  }

  const toggleFavoriteCase = (caseData: Case) => {
    initialize()
    const exists = favoriteCases.value.some(f => f.caseId === caseData.id)
    if (exists) {
      removeFavoriteCase(caseData.id)
    } else {
      addFavoriteCase(caseData)
    }
  }

  const isFavorite = (caseId: string) => {
    initialize()
    return favoriteCases.value.some(f => f.caseId === caseId)
  }

  const deleteCaseCleanup = (caseId: string) => {
    initialize()
    removeRecentCase(caseId)
    removeFavoriteCase(caseId)
  }

  const formattedRecentCases = computed(() => recentCases.value)
  const formattedFavoriteCases = computed(() => favoriteCases.value)

  return {
    initialize,
    recentCases: formattedRecentCases,
    favoriteCases: formattedFavoriteCases,
    addRecentCase,
    updateRecentCaseInfo,
    removeRecentCase,
    clearRecentCases,
    addFavoriteCase,
    removeFavoriteCase,
    toggleFavoriteCase,
    isFavorite,
    deleteCaseCleanup,
  }
}
