import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Case, MaterialNode, StatusChangeRecord, CaseStatus as CaseStatusType } from '@/types'
import { generateDemoCases, generateId, caseStatusMap } from '@/mock/data'

const STORAGE_KEY = 'hjj-cases-data'

const loadFromStorage = (): Case[] | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return null
  } catch {
    return null
  }
}

const saveToStorage = (cases: Case[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases))
  } catch {
    console.warn('Failed to save cases to localStorage')
  }
}

export const useCasesStore = defineStore('cases', () => {
  const cases = ref<Case[]>([])
  const isInitialized = ref(false)

  const initialize = () => {
    if (isInitialized.value) return

    const stored = loadFromStorage()
    if (stored && stored.length > 0) {
      cases.value = stored
    } else {
      cases.value = generateDemoCases()
      saveToStorage(cases.value)
    }
    isInitialized.value = true
  }

  const resetToDemoData = () => {
    cases.value = generateDemoCases()
    saveToStorage(cases.value)
  }

  const caseList = computed(() => cases.value)

  const getCaseById = (id: string): Case | undefined => {
    return cases.value.find(c => c.id === id)
  }

  const addCase = (caseData: Omit<Case, 'id' | 'materials'> & { id?: string }): Case => {
    const newCase: Case = {
      ...caseData,
      id: caseData.id || generateId(),
      materials: [],
    }
    cases.value = [...cases.value, newCase]
    return newCase
  }

  const updateCase = (id: string, updates: Partial<Omit<Case, 'id' | 'materials'>>): Case | undefined => {
    const index = cases.value.findIndex(c => c.id === id)
    if (index === -1) return undefined
    cases.value[index] = { ...cases.value[index], ...updates }
    cases.value = [...cases.value]
    return cases.value[index]
  }

  const deleteCase = (id: string): boolean => {
    const index = cases.value.findIndex(c => c.id === id)
    if (index === -1) return false
    cases.value = cases.value.filter(c => c.id !== id)
    return true
  }

  const updateCaseMaterials = (caseId: string, materials: MaterialNode[]): Case | undefined => {
    const index = cases.value.findIndex(c => c.id === caseId)
    if (index === -1) return undefined
    cases.value[index] = { ...cases.value[index], materials }
    cases.value = [...cases.value]
    return cases.value[index]
  }

  const updateCaseStatus = (
    caseId: string,
    newStatus: CaseStatusType,
    statusRecord: StatusChangeRecord
  ): Case | undefined => {
    const index = cases.value.findIndex(c => c.id === caseId)
    if (index === -1) return undefined
    const existingHistory = cases.value[index].statusHistory || []
    cases.value[index] = {
      ...cases.value[index],
      status: newStatus,
      statusHistory: [statusRecord, ...existingHistory],
    }
    cases.value = [...cases.value]
    return cases.value[index]
  }

  watch(
    cases,
    (newCases) => {
      if (isInitialized.value) {
        saveToStorage(newCases)
      }
    },
    { deep: true }
  )

  return {
    cases,
    caseList,
    isInitialized,
    initialize,
    resetToDemoData,
    getCaseById,
    addCase,
    updateCase,
    deleteCase,
    updateCaseMaterials,
    updateCaseStatus,
  }
})

export { caseStatusMap }
