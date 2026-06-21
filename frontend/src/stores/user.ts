import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CurrentUser } from '@/types'
import { UserRole, userRoleMap, rolePermissions, Permission } from '@/types'

const STORAGE_KEY = 'hjj-current-user'

const loadFromStorage = (): CurrentUser | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && parsed.id && parsed.role) return parsed
    return null
  } catch {
    return null
  }
}

const saveToStorage = (user: CurrentUser) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch {
    console.warn('Failed to save user to localStorage')
  }
}

const defaultUsers: Record<UserRole, CurrentUser> = {
  [UserRole.VIEWER]: {
    id: 'user-viewer-001',
    name: '张实习（查看者）',
    role: UserRole.VIEWER,
  },
  [UserRole.LAWYER]: {
    id: 'user-lawyer-001',
    name: '李律师（承办律师）',
    role: UserRole.LAWYER,
  },
  [UserRole.ADMIN]: {
    id: 'user-admin-001',
    name: '王主管（管理员）',
    role: UserRole.ADMIN,
  },
}

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<CurrentUser | null>(null)
  const isInitialized = ref(false)

  const initialize = () => {
    if (isInitialized.value) return

    const stored = loadFromStorage()
    if (stored !== null) {
      currentUser.value = stored
    } else {
      currentUser.value = { ...defaultUsers[UserRole.ADMIN] }
      saveToStorage(currentUser.value)
    }
    isInitialized.value = true
  }

  const switchRole = (role: UserRole) => {
    const newUser = { ...defaultUsers[role] }
    currentUser.value = newUser
    saveToStorage(newUser)
  }

  const currentRole = computed(() => currentUser.value?.role || UserRole.VIEWER)

  const currentRoleInfo = computed(() => {
    if (!currentUser.value) return null
    return userRoleMap[currentUser.value.role]
  })

  const hasPermission = (permission: Permission): boolean => {
    if (!currentUser.value) return false
    const permissions = rolePermissions[currentUser.value.role]
    return permissions.includes(permission)
  }

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(p => hasPermission(p))
  }

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(p => hasPermission(p))
  }

  const isViewer = computed(() => currentRole.value === UserRole.VIEWER)
  const isLawyer = computed(() => currentRole.value === UserRole.LAWYER)
  const isAdmin = computed(() => currentRole.value === UserRole.ADMIN)

  const canDeleteCase = computed(() => hasPermission(Permission.CASE_DELETE))
  const canDeleteMaterial = computed(() => hasPermission(Permission.MATERIAL_DELETE))
  const canRenameMaterial = computed(() => hasPermission(Permission.MATERIAL_RENAME))
  const canEditMaterial = computed(() => hasPermission(Permission.MATERIAL_EDIT))
  const canCreateMaterial = computed(() => hasPermission(Permission.MATERIAL_CREATE))
  const canMoveMaterial = computed(() => hasPermission(Permission.MATERIAL_MOVE))
  const canUploadMaterial = computed(() => hasPermission(Permission.MATERIAL_UPLOAD))
  const canBatchOperate = computed(() => hasPermission(Permission.MATERIAL_BATCH_OPERATE))
  const canCreateCase = computed(() => hasPermission(Permission.CASE_CREATE))
  const canEditCase = computed(() => hasPermission(Permission.CASE_EDIT))
  const canChangeCaseStatus = computed(() => hasPermission(Permission.CASE_STATUS_CHANGE))
  const canArchiveCase = computed(() => hasPermission(Permission.CASE_ARCHIVE))
  const canGenerateDocument = computed(() => hasPermission(Permission.DOCUMENT_GENERATE))
  const canExportExcel = computed(() => hasPermission(Permission.EXPORT_EXCEL))
  const canExportPdf = computed(() => hasPermission(Permission.EXPORT_PDF))
  const canCreateArchive = computed(() => hasPermission(Permission.ARCHIVE_CREATE))
  const canDeleteArchive = computed(() => hasPermission(Permission.ARCHIVE_DELETE))
  const canResetSystem = computed(() => hasPermission(Permission.SYSTEM_RESET))
  const canCreateFolder = computed(() => hasPermission(Permission.MATERIAL_CREATE))
  const canManageTemplate = computed(() => hasPermission(Permission.TEMPLATE_MANAGE))

  return {
    currentUser,
    currentRole,
    currentRoleInfo,
    isInitialized,
    initialize,
    switchRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isViewer,
    isLawyer,
    isAdmin,
    canDeleteCase,
    canDeleteMaterial,
    canRenameMaterial,
    canEditMaterial,
    canCreateMaterial,
    canMoveMaterial,
    canUploadMaterial,
    canBatchOperate,
    canCreateCase,
    canEditCase,
    canChangeCaseStatus,
    canArchiveCase,
    canGenerateDocument,
    canExportExcel,
    canExportPdf,
    canCreateArchive,
    canDeleteArchive,
    canResetSystem,
    canCreateFolder,
    canManageTemplate,
  }
})
