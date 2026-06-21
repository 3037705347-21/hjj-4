import { ref, triggerRef } from 'vue'
import type { CaseOperationLog } from '@/types'
import { OperationType } from '@/types'
import { useUserStore } from '@/stores/user'
import { generateId } from '@/mock/data'

const STORAGE_KEY = 'hjj-case-operation-logs'

const loadFromStorage = (): Record<string, CaseOperationLog[]> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null) return parsed
    return {}
  } catch {
    return {}
  }
}

const saveToStorage = (logs: Record<string, CaseOperationLog[]>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  } catch {
    console.warn('Failed to save operation logs to localStorage')
  }
}

const allLogs = ref<Record<string, CaseOperationLog[]>>(loadFromStorage())

export function useCaseOperationLog(caseId: string) {
  const userStore = useUserStore()

  const getOperatorName = (): string => {
    return userStore.currentUser?.name || '未知用户'
  }

  const addLog = (
    operationType: OperationType,
    summary: string,
    details?: Record<string, unknown>
  ) => {
    const log: CaseOperationLog = {
      id: generateId(),
      caseId,
      operationType,
      operator: getOperatorName(),
      timestamp: new Date().toISOString(),
      summary,
      details,
    }

    const existing = allLogs.value[caseId] || []
    allLogs.value = { ...allLogs.value, [caseId]: [log, ...existing].slice(0, 200) }
    saveToStorage(allLogs.value)
  }

  const getLogs = (): CaseOperationLog[] => {
    return allLogs.value[caseId] || []
  }

  const getFilteredLogs = (filterType: OperationType | 'all'): CaseOperationLog[] => {
    const logs = allLogs.value[caseId] || []
    if (filterType === 'all') return logs
    return logs.filter(log => log.operationType === filterType)
  }

  const clearLogs = () => {
    allLogs.value = { ...allLogs.value, [caseId]: [] }
    saveToStorage(allLogs.value)
  }

  return {
    addLog,
    getLogs,
    getFilteredLogs,
    clearLogs,
  }
}
