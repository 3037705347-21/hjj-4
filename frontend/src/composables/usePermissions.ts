import { useUserStore } from '@/stores/user'
import type { Permission } from '@/types'

export function usePermissions() {
  const userStore = useUserStore()

  const hasPermission = (permission: Permission): boolean => {
    return userStore.hasPermission(permission)
  }

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return userStore.hasAnyPermission(permissions)
  }

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return userStore.hasAllPermissions(permissions)
  }

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    switchRole: userStore.switchRole,
    currentUser: userStore.currentUser,
    currentRole: userStore.currentRole,
    currentRoleInfo: userStore.currentRoleInfo,
    isViewer: userStore.isViewer,
    isLawyer: userStore.isLawyer,
    isAdmin: userStore.isAdmin,
    canDeleteCase: userStore.canDeleteCase,
    canDeleteMaterial: userStore.canDeleteMaterial,
    canRenameMaterial: userStore.canRenameMaterial,
    canEditMaterial: userStore.canEditMaterial,
    canCreateMaterial: userStore.canCreateMaterial,
    canMoveMaterial: userStore.canMoveMaterial,
    canUploadMaterial: userStore.canUploadMaterial,
    canBatchOperate: userStore.canBatchOperate,
    canCreateCase: userStore.canCreateCase,
    canEditCase: userStore.canEditCase,
    canChangeCaseStatus: userStore.canChangeCaseStatus,
    canArchiveCase: userStore.canArchiveCase,
    canGenerateDocument: userStore.canGenerateDocument,
    canExportExcel: userStore.canExportExcel,
    canExportPdf: userStore.canExportPdf,
    canCreateArchive: userStore.canCreateArchive,
    canDeleteArchive: userStore.canDeleteArchive,
    canResetSystem: userStore.canResetSystem,
    canCreateFolder: userStore.canCreateFolder,
    canManageTemplate: userStore.canManageTemplate,
  }
}
