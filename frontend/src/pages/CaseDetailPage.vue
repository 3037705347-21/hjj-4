<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  FileSpreadsheet,
  FileDown,
  Folder,
  FileText,
  Calendar,
  User,
  Clock,
  HardDrive,
  Edit3,
  Info,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Settings,
  RefreshCw,
  ListChecks,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-vue-next'
import MaterialTree from '@/components/MaterialTree.vue'
import CaseTaskSummary from '@/components/CaseTaskSummary.vue'
import CaseTaskSection from '@/components/CaseTaskSection.vue'
import CaseEventSummary from '@/components/CaseEventSummary.vue'
import { mockCases, caseStatusMap, generateId } from '@/mock/data'
import { getTemplateByCaseType } from '@/mock/materialTemplates'
import { computeTaskSummary, refreshOverdueTasks } from '@/mock/tasks'
import { computeEventSummary, refreshOverdueEvents } from '@/mock/caseEvents'
import type { Case, MaterialNode, CaseStatus as CaseStatusType, StatusChangeRecord, TaskSummary, CaseEventSummary as EventSummaryType } from '@/types'
import { CaseStatus, MaterialNodeType as NodeType } from '@/types'
import { flattenMaterialTree, updateNodeById, findParentNode, hasDuplicateName, flattenSelectedNodes, findNodeById } from '@/utils/treeUtils'
import { exportToExcel, exportToPDF, exportMaterialList, defaultExportColumns, exportRangeLabels, type ExportRange, type ExportColumnConfig } from '@/utils/exportUtils'
import {
  checkMaterialCompleteness,
  validateStatusTransition,
  createStatusChangeRecord,
  getAvailableTransitions,
  type MaterialCompletenessResult,
} from '@/utils/caseWorkflow'

const route = useRoute()
const router = useRouter()

const currentCase = ref<Case | null>(null)
const selectedNode = ref<MaterialNode | null>(null)
const treeRef = ref<InstanceType<typeof MaterialTree> | null>(null)
const currentMaterials = ref<MaterialNode[]>([])
const showExportMenu = ref(false)
const filteredCounts = ref<{ files: number; folders: number } | null>(null)
const showExportDialog = ref(false)
const pendingExportFormat = ref<'excel' | 'pdf' | null>(null)
const exportRange = ref<ExportRange>('all')
const exportColumns = ref<ExportColumnConfig>({ ...defaultExportColumns })
const exportSortBy = ref<string>('')
const exportSortOrder = ref<'asc' | 'desc'>('asc')

const isEditing = ref(false)
const editForm = ref<Partial<MaterialNode>>({})
const originalNode = ref<MaterialNode | null>(null)
const formErrors = ref<Record<string, string>>({})

const showStatusDialog = ref(false)
const pendingStatus = ref<CaseStatusType | null>(null)
const statusRemark = ref('')
const statusValidationErrors = ref<string[]>([])

const showMaterialCheckPanel = ref(true)
const showCompletedList = ref(true)
const showMissingList = ref(true)

const statusHistory = ref<StatusChangeRecord[]>([])

const handleKeydown = (e: KeyboardEvent) => {
  if (!isEditing.value) return

  if (e.key === 'Escape') {
    e.preventDefault()
    if (hasChanges.value) {
      if (confirm('有未保存的更改，确定要取消吗？')) {
        cancelEdit()
      }
    } else {
      cancelEdit()
    }
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (hasChanges.value) {
      saveEdit()
    }
  }
}

onMounted(() => {
  const caseId = route.params.id as string
  const found = mockCases.find(c => c.id === caseId)
  if (found) {
    currentCase.value = found
    currentMaterials.value = JSON.parse(JSON.stringify(found.materials))
    statusHistory.value = found.statusHistory ? JSON.parse(JSON.stringify(found.statusHistory)) : []
  }
  refreshOverdueTasks()
  refreshOverdueEvents()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const goBack = () => {
  if (isEditing.value && hasChanges.value) {
    if (confirm('有未保存的更改，确定要离开吗？')) {
      cancelEdit()
    } else {
      return
    }
  }
  router.push({ name: 'case-list' })
}

const handleSelectNode = (node: MaterialNode | null) => {
  if (isEditing.value) {
    if (hasChanges.value) {
      if (confirm('有未保存的更改，确定要切换节点吗？')) {
        cancelEdit()
      } else {
        if (selectedNode.value && treeRef.value) {
          treeRef.value.setSelectedNodeId(selectedNode.value.id)
        }
        return
      }
    } else {
      cancelEdit()
    }
  }
  selectedNode.value = node
}

const handleMaterialsUpdate = (materials: MaterialNode[]) => {
  currentMaterials.value = materials
}

const availableExportRanges = computed(() => {
  const ranges: Array<{ value: ExportRange; label: string; disabled?: boolean; hint?: string }> = [
    { value: 'all', label: exportRangeLabels.all },
    { value: 'filesOnly', label: exportRangeLabels.filesOnly },
  ]

  if (treeRef.value?.getIsFilterActive()) {
    ranges.push({ value: 'filtered', label: exportRangeLabels.filtered })
  } else {
    ranges.push({ value: 'filtered', label: exportRangeLabels.filtered, disabled: true, hint: '当前未应用筛选条件' })
  }

  const selectedIds = treeRef.value?.getSelectedIds() || []
  if (selectedIds.length > 0) {
    ranges.push({ value: 'selected', label: `${exportRangeLabels.selected}（${selectedIds.length} 项）` })
  } else {
    ranges.push({ value: 'selected', label: exportRangeLabels.selected, disabled: true, hint: '当前未选择任何节点' })
  }

  return ranges
})

const openExportConfig = (format: 'excel' | 'pdf') => {
  pendingExportFormat.value = format
  exportRange.value = 'all'
  exportColumns.value = { ...defaultExportColumns }
  exportSortBy.value = ''
  exportSortOrder.value = 'asc'
  showExportMenu.value = false
  showExportDialog.value = true
}

const handleExport = (format: 'excel' | 'pdf') => {
  openExportConfig(format)
}

const confirmExport = () => {
  if (!currentCase.value || !pendingExportFormat.value) return

  const filterOptions = treeRef.value?.getFilterOptions()
  const selectedIds = treeRef.value?.getSelectedIds() || []

  const exportCase = { ...currentCase.value, materials: currentMaterials.value }

  exportMaterialList(exportCase, currentMaterials.value, pendingExportFormat.value, {
    range: exportRange.value,
    columns: exportColumns.value,
    filterOptions: exportRange.value === 'filtered' ? filterOptions : undefined,
    selectedIds: exportRange.value === 'selected' ? selectedIds : undefined,
    sortBy: exportSortBy.value || undefined,
    sortOrder: exportSortOrder.value,
  })

  showExportDialog.value = false
  pendingExportFormat.value = null
}

const toggleAllColumns = (checked: boolean) => {
  exportColumns.value = {
    description: checked,
    uploader: checked,
    uploadDate: checked,
    fileSize: checked,
    path: checked,
  }
}

const allColumnsSelected = computed(() => {
  return Object.values(exportColumns.value).every(v => v)
})

const materialCount = computed(() => {
  if (filteredCounts.value !== null) return filteredCounts.value.files
  const flat = flattenMaterialTree(currentMaterials.value)
  return flat.filter(m => m.type === NodeType.FILE).length
})

const folderCount = computed(() => {
  if (filteredCounts.value !== null) return filteredCounts.value.folders
  const flat = flattenMaterialTree(currentMaterials.value)
  return flat.filter(m => m.type === NodeType.FOLDER).length
})

const handleFilteredCount = (counts: { files: number; folders: number }) => {
  filteredCounts.value = counts
}

const handleBatchExport = (_selectedIds: string[], format: 'excel' | 'pdf') => {
  openExportConfig(format)
  exportRange.value = 'selected'
}

const handleMultiSelectChange = (_nodes: MaterialNode[]) => {
}

const startEdit = () => {
  if (!selectedNode.value) return
  originalNode.value = JSON.parse(JSON.stringify(selectedNode.value))
  editForm.value = { ...selectedNode.value }
  formErrors.value = {}
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
  editForm.value = {}
  formErrors.value = {}
  originalNode.value = null
}

const validateForm = (): boolean => {
  const errors: Record<string, string> = {}
  const form = editForm.value

  if (!form.name || !form.name.trim()) {
    errors.name = '名称不能为空'
  } else if (form.name.trim() !== form.name) {
    errors.name = '名称不能包含首尾空格'
  } else if (originalNode.value && form.name.trim() !== originalNode.value.name) {
    const parent = findParentNode(currentMaterials.value, originalNode.value.id)
    const parentId = parent ? parent.id : null
    if (hasDuplicateName(currentMaterials.value, parentId, form.name.trim(), originalNode.value.id)) {
      errors.name = '当前父级下已存在同名节点'
    }
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveEdit = () => {
  if (!selectedNode.value || !originalNode.value) return

  if (!validateForm()) return

  const trimmedName = editForm.value.name?.trim() || ''
  const updates: Partial<MaterialNode> = {
    name: trimmedName,
    description: editForm.value.description?.trim(),
  }

  if (selectedNode.value.type === NodeType.FILE) {
    updates.uploader = editForm.value.uploader?.trim() || undefined
    updates.uploadDate = editForm.value.uploadDate || undefined
    updates.fileSize = editForm.value.fileSize?.trim() || undefined
  }

  if (selectedNode.value.type === NodeType.FOLDER) {
    updates.expanded = editForm.value.expanded
  }

  currentMaterials.value = updateNodeById(currentMaterials.value, originalNode.value.id, updates)

  const updatedNode = findNodeById(currentMaterials.value, originalNode.value.id)
  if (updatedNode) {
    selectedNode.value = updatedNode
    if (treeRef.value) {
      treeRef.value.setSelectedNode(updatedNode)
    }
  }

  handleMaterialsUpdate(currentMaterials.value)

  isEditing.value = false
  editForm.value = {}
  formErrors.value = {}
  originalNode.value = null
}

const hasChanges = computed(() => {
  if (!originalNode.value || !editForm.value) return false

  const o = originalNode.value
  const e = editForm.value

  if ((e.name?.trim() || '') !== o.name) return true
  if ((e.description?.trim() || '') !== (o.description || '')) return true

  if (o.type === NodeType.FILE) {
    if ((e.uploader?.trim() || '') !== (o.uploader || '')) return true
    if ((e.uploadDate || '') !== (o.uploadDate || '')) return true
    if ((e.fileSize?.trim() || '') !== (o.fileSize || '')) return true
  }

  if (o.type === NodeType.FOLDER) {
    if (!!e.expanded !== !!o.expanded) return true
  }

  return false
})

const materialCompleteness = computed<MaterialCompletenessResult>(() => {
  if (!currentCase.value) {
    return {
      totalRequired: 0,
      completedRequired: 0,
      totalItems: 0,
      completedItems: 0,
      missingRequired: 0,
      missingCount: 0,
      completedList: [],
      missingList: [],
    }
  }
  const caseWithMaterials = { ...currentCase.value, materials: currentMaterials.value }
  return checkMaterialCompleteness(caseWithMaterials)
})

const hasTemplate = computed(() => {
  if (!currentCase.value) return false
  return !!getTemplateByCaseType(currentCase.value.caseType)
})

const completenessPercent = computed(() => {
  if (materialCompleteness.value.totalRequired === 0) return 0
  return Math.round(
    (materialCompleteness.value.completedRequired / materialCompleteness.value.totalRequired) * 100
  )
})

const availableStatusOptions = computed(() => {
  if (!currentCase.value) return []
  return getAvailableTransitions(currentCase.value.status)
})

const openStatusChange = () => {
  if (!currentCase.value) return
  pendingStatus.value = currentCase.value.status
  statusRemark.value = ''
  statusValidationErrors.value = []
  showStatusDialog.value = true
}

const cancelStatusChange = () => {
  showStatusDialog.value = false
  pendingStatus.value = null
  statusRemark.value = ''
  statusValidationErrors.value = []
}

const handlePendingStatusChange = (status: CaseStatusType) => {
  if (!currentCase.value) return
  pendingStatus.value = status
  const validation = validateStatusTransition(
    currentCase.value,
    currentCase.value.status,
    status,
    currentMaterials.value
  )
  statusValidationErrors.value = validation.errors
}

const confirmStatusChange = () => {
  if (!currentCase.value || !pendingStatus.value) return

  const validation = validateStatusTransition(
    currentCase.value,
    currentCase.value.status,
    pendingStatus.value,
    currentMaterials.value
  )

  if (!validation.valid) {
    statusValidationErrors.value = validation.errors
    return
  }

  if (currentCase.value.status !== pendingStatus.value) {
    const record = createStatusChangeRecord(
      currentCase.value.status,
      pendingStatus.value,
      statusRemark.value.trim() || '状态变更'
    )
    statusHistory.value = [record, ...statusHistory.value]

    currentCase.value.status = pendingStatus.value
    currentCase.value.statusHistory = statusHistory.value

    const idx = mockCases.findIndex(c => c.id === currentCase.value!.id)
    if (idx !== -1) {
      mockCases[idx].status = pendingStatus.value
      mockCases[idx].statusHistory = statusHistory.value
    }
  }

  cancelStatusChange()
}

const formatTimestamp = (ts: string): string => {
  try {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return ts
  }
}

const getStatusLabel = (status: CaseStatusType | null): string => {
  if (!status) return '新建'
  return caseStatusMap[status]?.label || status
}

const taskSummary = computed<TaskSummary>(() => {
  if (!currentCase.value) {
    return {
      total: 0, pending: 0, assigned: 0, inProgress: 0,
      completed: 0, overdue: 0, cancelled: 0,
    }
  }
  return computeTaskSummary(currentCase.value.id)
})

const eventSummary = computed<EventSummaryType>(() => {
  if (!currentCase.value) {
    return {
      total: 0, pending: 0, inProgress: 0,
      completed: 0, cancelled: 0, overdue: 0, upcoming: [],
    }
  }
  return computeEventSummary(currentCase.value.id)
})

const goToTaskList = () => {
  if (!currentCase.value) return
  router.push({ name: 'task-list', query: { caseId: currentCase.value.id } })
}

const goToTimeline = () => {
  if (!currentCase.value) return
  router.push({ name: 'case-timeline', query: { caseId: currentCase.value.id } })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div v-if="!currentCase" class="flex flex-col items-center justify-center py-32">
      <FileText class="w-16 h-16 text-gray-300 mb-4" />
      <p class="text-lg text-gray-500 mb-2">案件不存在或已被删除</p>
      <button
        class="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        @click="goBack"
      >
        返回案件列表
      </button>
    </div>
    <template v-else>
    <header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
      <div class="max-w-[1600px] mx-auto px-6 py-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-4 min-w-0">
            <button
              class="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              @click="goBack"
            >
              <ArrowLeft class="w-5 h-5" />
            </button>
            <div class="min-w-0">
              <div class="flex items-center gap-3 mb-1 flex-wrap">
                <button
                  class="px-2.5 py-0.5 text-xs font-medium rounded-full border flex-shrink-0 flex items-center gap-1.5 hover:ring-2 hover:ring-offset-1 hover:ring-blue-300 transition-all group"
                  :class="caseStatusMap[currentCase.status].class"
                  @click="openStatusChange"
                  title="点击变更状态"
                >
                  {{ caseStatusMap[currentCase.status].label }}
                  <RefreshCw class="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </button>
                <span class="text-xs text-gray-400 font-mono truncate">{{ currentCase.caseNumber }}</span>
                <span class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded flex-shrink-0">
                  {{ currentCase.caseType }}
                </span>
                <span
                  v-if="hasTemplate && materialCompleteness.missingRequired > 0"
                  class="px-2 py-0.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded flex items-center gap-1 flex-shrink-0"
                >
                  <AlertTriangle class="w-3 h-3" />
                  材料缺失 {{ materialCompleteness.missingRequired }} 项
                </span>
              </div>
              <h1 class="text-lg font-bold text-gray-900 truncate">{{ currentCase.name }}</h1>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <div class="relative">
              <button
                class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                @click="showExportMenu = !showExportMenu"
              >
                <FileDown class="w-4 h-4" />
                导出清单
              </button>
              <div
                v-if="showExportMenu"
                class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20"
              >
                <button
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  @click="handleExport('excel')"
                >
                  <FileSpreadsheet class="w-4 h-4 text-green-600" />
                  导出 Excel 文件
                </button>
                <button
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  @click="handleExport('pdf')"
                >
                  <FileText class="w-4 h-4 text-red-600" />
                  导出 PDF 文件
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="max-w-[1600px] mx-auto px-6 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-blue-50 rounded-lg">
              <User class="w-5 h-5 text-blue-600" />
            </div>
            <div class="min-w-0">
              <p class="text-xs text-gray-500">当事人（我方）</p>
              <p class="text-sm font-semibold text-gray-900 truncate">{{ currentCase.client }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-red-50 rounded-lg">
              <User class="w-5 h-5 text-red-600" />
            </div>
            <div class="min-w-0">
              <p class="text-xs text-gray-500">对方当事人</p>
              <p class="text-sm font-semibold text-gray-900 truncate">{{ currentCase.opposingParty }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-purple-50 rounded-lg">
              <Info class="w-5 h-5 text-purple-600" />
            </div>
            <div class="min-w-0">
              <p class="text-xs text-gray-500">承办律师</p>
              <p class="text-sm font-semibold text-gray-900 truncate">{{ currentCase.responsibleLawyer }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-green-50 rounded-lg">
              <Calendar class="w-5 h-5 text-green-600" />
            </div>
            <div class="min-w-0">
              <p class="text-xs text-gray-500">立案日期</p>
              <p class="text-sm font-semibold text-gray-900 truncate">{{ currentCase.filingDate }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <div class="flex items-center gap-2 mb-2">
          <Info class="w-4 h-4 text-gray-400" />
          <h2 class="text-sm font-semibold text-gray-700">案件描述</h2>
        </div>
        <p class="text-sm text-gray-600 leading-relaxed">{{ currentCase.description }}</p>
      </div>

      <div v-if="hasTemplate" class="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
        <button
          class="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          @click="showMaterialCheckPanel = !showMaterialCheckPanel"
        >
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg" :class="completenessPercent === 100 ? 'bg-green-50' : 'bg-orange-50'">
              <ListChecks class="w-5 h-5" :class="completenessPercent === 100 ? 'text-green-600' : 'text-orange-600'" />
            </div>
            <div class="text-left">
              <h2 class="text-sm font-semibold text-gray-900">材料完整性校验</h2>
              <p class="text-xs text-gray-500 mt-0.5">
                根据「{{ currentCase.caseType }}」标准模板校验 · 必填 {{ materialCompleteness.completedRequired }}/{{ materialCompleteness.totalRequired }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-3">
              <div class="w-40 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="completenessPercent === 100 ? 'bg-green-500' : completenessPercent >= 60 ? 'bg-blue-500' : 'bg-orange-500'"
                  :style="{ width: `${completenessPercent}%` }"
                ></div>
              </div>
              <span class="text-sm font-semibold" :class="completenessPercent === 100 ? 'text-green-600' : completenessPercent >= 60 ? 'text-blue-600' : 'text-orange-600'">
                {{ completenessPercent }}%
              </span>
            </div>
            <ChevronUp v-if="showMaterialCheckPanel" class="w-5 h-5 text-gray-400" />
            <ChevronDown v-else class="w-5 h-5 text-gray-400" />
          </div>
        </button>

        <div v-if="showMaterialCheckPanel" class="border-t border-gray-100 px-5 py-4 space-y-4">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="bg-blue-50 rounded-lg p-3">
              <p class="text-xs text-blue-600 font-medium">标准目录项</p>
              <p class="text-xl font-bold text-blue-700 mt-1">{{ materialCompleteness.totalItems }}</p>
            </div>
            <div class="bg-green-50 rounded-lg p-3">
              <p class="text-xs text-green-600 font-medium">已完成</p>
              <p class="text-xl font-bold text-green-700 mt-1">{{ materialCompleteness.completedItems }}</p>
            </div>
            <div class="bg-orange-50 rounded-lg p-3">
              <p class="text-xs text-orange-600 font-medium">缺失总数</p>
              <p class="text-xl font-bold text-orange-700 mt-1">{{ materialCompleteness.missingCount }}</p>
            </div>
            <div class="bg-red-50 rounded-lg p-3">
              <p class="text-xs text-red-600 font-medium">必填缺失</p>
              <p class="text-xl font-bold text-red-700 mt-1">{{ materialCompleteness.missingRequired }}</p>
            </div>
          </div>

          <div>
            <button
              class="flex items-center gap-2 mb-3 text-sm"
              @click="showCompletedList = !showCompletedList"
            >
              <CheckCircle class="w-4 h-4 text-green-500" />
              <span class="font-medium text-gray-700">已完成清单</span>
              <span class="text-xs text-gray-500">({{ materialCompleteness.completedList.length }})</span>
              <ChevronUp v-if="showCompletedList" class="w-4 h-4 text-gray-400 ml-auto" />
              <ChevronDown v-else class="w-4 h-4 text-gray-400 ml-auto" />
            </button>
            <div v-if="showCompletedList && materialCompleteness.completedList.length > 0" class="space-y-1.5 max-h-48 overflow-y-auto">
              <div
                v-for="item in materialCompleteness.completedList"
                :key="item.path"
                class="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
              >
                <Folder v-if="item.type === 'folder'" class="w-4 h-4 text-yellow-500 flex-shrink-0" />
                <FileText v-else class="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span class="text-sm text-gray-700 truncate flex-1">{{ item.path }}</span>
                <CheckCircle2 class="w-4 h-4 text-green-500 flex-shrink-0" />
              </div>
            </div>
            <div v-if="showCompletedList && materialCompleteness.completedList.length === 0" class="text-sm text-gray-400 px-3 py-2">
              暂无已完成的材料
            </div>
          </div>

          <div>
            <button
              class="flex items-center gap-2 mb-3 text-sm"
              @click="showMissingList = !showMissingList"
            >
              <XCircle class="w-4 h-4 text-red-500" />
              <span class="font-medium text-gray-700">缺失清单</span>
              <span class="text-xs text-gray-500">({{ materialCompleteness.missingList.length }})</span>
              <ChevronUp v-if="showMissingList" class="w-4 h-4 text-gray-400 ml-auto" />
              <ChevronDown v-else class="w-4 h-4 text-gray-400 ml-auto" />
            </button>
            <div v-if="showMissingList && materialCompleteness.missingList.length > 0" class="space-y-1.5 max-h-48 overflow-y-auto">
              <div
                v-for="item in materialCompleteness.missingList"
                :key="item.path"
                class="flex items-center gap-2 px-3 py-2 rounded-lg"
                :class="item.required ? 'bg-red-50' : 'bg-gray-50'"
              >
                <Folder v-if="item.type === 'folder'" class="w-4 h-4 flex-shrink-0" :class="item.required ? 'text-red-500' : 'text-gray-400'" />
                <FileText v-else class="w-4 h-4 flex-shrink-0" :class="item.required ? 'text-red-500' : 'text-gray-400'" />
                <span class="text-sm truncate flex-1" :class="item.required ? 'text-red-700' : 'text-gray-600'">{{ item.path }}</span>
                <span v-if="item.required" class="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded flex-shrink-0">必填</span>
                <span v-else class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded flex-shrink-0">可选</span>
              </div>
            </div>
            <div v-if="showMissingList && materialCompleteness.missingList.length === 0" class="text-sm text-green-600 px-3 py-2 flex items-center gap-1.5">
              <CheckCircle2 class="w-4 h-4" />
              所有材料均已齐备
            </div>
          </div>

          <div v-if="statusHistory.length > 0">
            <div class="flex items-center gap-2 mb-3 pt-2 border-t border-gray-100">
              <Clock class="w-4 h-4 text-gray-400" />
              <span class="text-sm font-medium text-gray-700">状态变更历史</span>
            </div>
            <div class="space-y-2">
              <div
                v-for="record in statusHistory"
                :key="record.id"
                class="flex items-start gap-3 px-3 py-2.5 bg-gray-50 rounded-lg"
              >
                <div class="flex flex-col items-center pt-0.5">
                  <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs px-2 py-0.5 rounded border" :class="record.fromStatus ? caseStatusMap[record.fromStatus].class : 'bg-gray-100 text-gray-600 border-gray-200'">
                      {{ getStatusLabel(record.fromStatus) }}
                    </span>
                    <span class="text-xs text-gray-400">→</span>
                    <span class="text-xs px-2 py-0.5 rounded border" :class="caseStatusMap[record.toStatus].class">
                      {{ getStatusLabel(record.toStatus) }}
                    </span>
                    <span class="text-xs text-gray-400 ml-auto">{{ formatTimestamp(record.timestamp) }}</span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">{{ record.remark }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">操作人：{{ record.operator }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CaseTaskSummary
        v-if="currentCase"
        :summary="taskSummary"
        class="mb-6"
        @go-to-task-list="goToTaskList"
      />

      <CaseEventSummary
        v-if="currentCase"
        :case-id="currentCase.id"
        :summary="eventSummary"
        class="mb-6"
        @go-to-timeline="goToTimeline"
      />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6" style="min-height: 600px;">
        <div class="lg:col-span-2 flex flex-col">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Folder class="w-5 h-5 text-yellow-500" />
              案件材料管理
            </h2>
            <div class="flex items-center gap-4 text-sm text-gray-500">
              <span class="flex items-center gap-1.5">
                <Folder class="w-4 h-4" />
                {{ folderCount }} 个文件夹
              </span>
              <span class="flex items-center gap-1.5">
                <FileText class="w-4 h-4" />
                {{ materialCount }} 个文件
              </span>
            </div>
          </div>
          <MaterialTree
            ref="treeRef"
            :materials="currentMaterials"
            class="flex-1"
            @update:materials="handleMaterialsUpdate"
            @select="handleSelectNode"
            @filtered-count="handleFilteredCount"
            @multi-select-change="handleMultiSelectChange"
            @batch-export="handleBatchExport"
          />
        </div>

        <div class="flex flex-col">
          <h2 class="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Info class="w-5 h-5 text-gray-500" />
            材料详情
          </h2>
          <div class="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div v-if="selectedNode" class="p-5 flex flex-col h-full">
              <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div class="p-3 rounded-xl"
                  :class="selectedNode.type === NodeType.FOLDER ? 'bg-yellow-50' : 'bg-blue-50'">
                  <Folder v-if="selectedNode.type === NodeType.FOLDER" class="w-8 h-8 text-yellow-500" />
                  <FileText v-else class="w-8 h-8 text-blue-500" />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-gray-900 truncate">
                    {{ isEditing ? editForm.name : selectedNode.name }}
                  </h3>
                  <p class="text-sm text-gray-500 mt-0.5">
                    {{ selectedNode.type === NodeType.FOLDER ? '文件夹' : '文件' }}
                  </p>
                </div>
                <template v-if="!isEditing">
                  <button
                    class="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-colors"
                    title="编辑"
                    @click="startEdit"
                  >
                    <Edit3 class="w-4 h-4" />
                  </button>
                </template>
                <template v-else>
                  <button
                    class="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-colors"
                    title="取消"
                    @click="cancelEdit"
                  >
                    <X class="w-4 h-4" />
                  </button>
                  <button
                    class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="保存"
                    :disabled="!hasChanges"
                    @click="saveEdit"
                  >
                    <Save class="w-4 h-4" />
                  </button>
                </template>
              </div>

              <template v-if="!isEditing">
                <div class="mt-4 space-y-4 flex-1 overflow-y-auto">
                  <div>
                    <p class="text-xs text-gray-500 mb-1.5">类型</p>
                    <p class="text-sm text-gray-900">
                      {{ selectedNode.type === NodeType.FOLDER ? '文件夹' : '文件' }}
                    </p>
                  </div>

                  <div>
                    <p class="text-xs text-gray-500 mb-1.5">名称</p>
                    <p class="text-sm text-gray-900">{{ selectedNode.name }}</p>
                  </div>

                  <template v-if="selectedNode.type === NodeType.FILE">
                    <div>
                      <p class="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                        <User class="w-3 h-3" />
                        上传人
                      </p>
                      <p class="text-sm text-gray-900">{{ selectedNode.uploader || '-' }}</p>
                    </div>

                    <div>
                      <p class="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                        <Clock class="w-3 h-3" />
                        上传日期
                      </p>
                      <p class="text-sm text-gray-900">{{ selectedNode.uploadDate || '-' }}</p>
                    </div>

                    <div>
                      <p class="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                        <HardDrive class="w-3 h-3" />
                        文件大小
                      </p>
                      <p class="text-sm text-gray-900">{{ selectedNode.fileSize || '-' }}</p>
                    </div>
                  </template>

                  <div v-if="selectedNode.type === NodeType.FOLDER">
                    <p class="text-xs text-gray-500 mb-1.5">包含内容</p>
                    <p class="text-sm text-gray-900">
                      {{ selectedNode.children?.length || 0 }} 项
                    </p>
                  </div>

                  <div v-if="selectedNode.type === NodeType.FOLDER">
                    <p class="text-xs text-gray-500 mb-1.5">展开状态</p>
                    <p class="text-sm text-gray-900">
                      {{ selectedNode.expanded ? '已展开' : '已折叠' }}
                    </p>
                  </div>

                  <div>
                    <p class="text-xs text-gray-500 mb-1.5">备注说明</p>
                    <p class="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      {{ selectedNode.description || '暂无备注' }}
                    </p>
                  </div>
                </div>
              </template>

              <template v-else>
                <div class="mt-4 space-y-4 flex-1 overflow-y-auto">
                  <div>
                    <p class="text-xs text-gray-500 mb-1.5">类型</p>
                    <p class="text-sm text-gray-900">
                      {{ selectedNode.type === NodeType.FOLDER ? '文件夹' : '文件' }}
                    </p>
                  </div>

                  <div>
                    <label class="text-xs text-gray-500 mb-1.5 block">名称 <span class="text-red-500">*</span></label>
                    <input
                      v-model="editForm.name"
                      type="text"
                      class="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      :class="formErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'"
                      placeholder="请输入名称"
                      @blur="validateForm"
                    />
                    <p v-if="formErrors.name" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle class="w-3 h-3" />
                      {{ formErrors.name }}
                    </p>
                  </div>

                  <template v-if="selectedNode.type === NodeType.FILE">
                    <div>
                      <label class="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                        <User class="w-3 h-3" />
                        上传人
                      </label>
                      <input
                        v-model="editForm.uploader"
                        type="text"
                        class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="请输入上传人"
                      />
                    </div>

                    <div>
                      <label class="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                        <Clock class="w-3 h-3" />
                        上传日期
                      </label>
                      <input
                        v-model="editForm.uploadDate"
                        type="date"
                        class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label class="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                        <HardDrive class="w-3 h-3" />
                        文件大小
                      </label>
                      <input
                        v-model="editForm.fileSize"
                        type="text"
                        class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="例如：2.5 MB"
                      />
                    </div>
                  </template>

                  <div v-if="selectedNode.type === NodeType.FOLDER">
                    <p class="text-xs text-gray-500 mb-1.5">包含内容</p>
                    <p class="text-sm text-gray-900">
                      {{ selectedNode.children?.length || 0 }} 项
                    </p>
                  </div>

                  <div v-if="selectedNode.type === NodeType.FOLDER">
                    <label class="text-xs text-gray-500 mb-1.5 block">展开状态</label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        v-model="editForm.expanded"
                        type="checkbox"
                        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span class="text-sm text-gray-700">在树中默认展开</span>
                    </label>
                  </div>

                  <div>
                    <label class="text-xs text-gray-500 mb-1.5 block">备注说明</label>
                    <textarea
                      v-model="editForm.description"
                      rows="4"
                      class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="请输入备注说明"
                    ></textarea>
                  </div>
                </div>

                <div v-if="isEditing" class="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                  <div class="text-xs text-gray-500">
                    <span v-if="hasChanges" class="text-amber-600 flex items-center gap-1">
                      <AlertCircle class="w-3 h-3" />
                      有未保存的更改
                    </span>
                    <span v-else class="text-green-600 flex items-center gap-1">
                      <CheckCircle2 class="w-3 h-3" />
                      暂无更改
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      class="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      @click="cancelEdit"
                    >
                      取消
                    </button>
                    <button
                      class="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      :disabled="!hasChanges"
                      @click="saveEdit"
                    >
                      <Save class="w-4 h-4" />
                      保存
                    </button>
                  </div>
                </div>
              </template>
            </div>

            <div v-else class="h-full flex flex-col items-center justify-center p-8 text-center">
              <FileText class="w-12 h-12 text-gray-300 mb-3" />
              <p class="text-sm text-gray-500">请在左侧选择材料</p>
              <p class="text-xs text-gray-400 mt-1">查看文件或文件夹的详细信息</p>
            </div>
          </div>
        </div>
      </div>

      <CaseTaskSection
        v-if="currentCase"
        :case-id="currentCase.id"
        :materials="currentMaterials"
        class="mt-6"
      />
    </div>

    <div
      v-if="showExportMenu && currentCase"
      class="fixed inset-0 z-10"
      @click="showExportMenu = false"
    ></div>

    <Teleport to="body">
      <div
        v-if="showExportDialog"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="showExportDialog = false"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Settings class="w-5 h-5 text-blue-600" />
              导出配置
              <span class="text-sm font-normal text-gray-500">
                （{{ pendingExportFormat === 'excel' ? 'Excel' : 'PDF' }}）
              </span>
            </h3>
            <button
              class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              @click="showExportDialog = false"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="px-6 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">导出范围</label>
              <div class="space-y-2">
                <label
                  v-for="range in availableExportRanges"
                  :key="range.value"
                  class="flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors"
                  :class="[
                    exportRange === range.value
                      ? 'border-blue-500 bg-blue-50'
                      : range.disabled
                      ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:bg-gray-50'
                  ]"
                >
                  <input
                    type="radio"
                    :value="range.value"
                    v-model="exportRange"
                    :disabled="range.disabled"
                    class="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div class="flex-1 min-w-0">
                    <span class="text-sm font-medium" :class="range.disabled ? 'text-gray-400' : 'text-gray-900'">
                      {{ range.label }}
                    </span>
                    <p v-if="range.hint" class="text-xs text-gray-400 mt-0.5">
                      {{ range.hint }}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-medium text-gray-700">导出列</label>
                <label class="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    :checked="allColumnsSelected"
                    @change="toggleAllColumns(($event.target as HTMLInputElement).checked)"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  全选
                </label>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <label class="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    v-model="exportColumns.description"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-700">备注说明</span>
                </label>
                <label class="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    v-model="exportColumns.uploader"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-700">上传人</span>
                </label>
                <label class="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    v-model="exportColumns.uploadDate"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-700">上传日期</span>
                </label>
                <label class="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    v-model="exportColumns.fileSize"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-700">文件大小</span>
                </label>
                <label class="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors col-span-2">
                  <input
                    type="checkbox"
                    v-model="exportColumns.path"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-700">完整路径</span>
                </label>
              </div>
              <p class="text-xs text-gray-400 mt-2">
                「序号」「类型」「名称」为固定列，始终导出
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">排序方式</label>
              <div class="grid grid-cols-2 gap-2">
                <select
                  v-model="exportSortBy"
                  class="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">默认顺序</option>
                  <option value="name">按名称</option>
                  <option value="path">按路径</option>
                  <option value="uploadDate">按上传日期</option>
                  <option value="uploader">按上传人</option>
                  <option value="fileSize">按文件大小</option>
                  <option value="type">按类型</option>
                </select>
                <select
                  v-model="exportSortOrder"
                  :disabled="!exportSortBy"
                  class="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="asc">升序</option>
                  <option value="desc">降序</option>
                </select>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              class="px-4 py-2 text-sm text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
              @click="showExportDialog = false"
            >
              取消
            </button>
            <button
              class="px-5 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              @click="confirmExport"
            >
              <FileDown class="w-4 h-4" />
              确认导出
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="showStatusDialog && currentCase"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="cancelStatusChange"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <RefreshCw class="w-5 h-5 text-blue-600" />
              变更案件状态
            </h3>
            <button
              class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              @click="cancelStatusChange"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="px-6 py-5 space-y-5">
            <div>
              <p class="text-sm text-gray-500 mb-1">当前状态</p>
              <span class="inline-block px-2.5 py-1 text-sm font-medium rounded-full border"
                :class="caseStatusMap[currentCase.status].class">
                {{ caseStatusMap[currentCase.status].label }}
              </span>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">目标状态 <span class="text-red-500">*</span></label>
              <div class="space-y-2">
                <label
                  v-for="status in availableStatusOptions"
                  :key="status"
                  class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors"
                  :class="[
                    pendingStatus === status
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  ]"
                >
                  <input
                    type="radio"
                    :value="status"
                    v-model="pendingStatus"
                    @change="handlePendingStatusChange(status)"
                    class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span class="px-2 py-0.5 text-xs font-medium rounded-full border"
                    :class="caseStatusMap[status].class">
                    {{ caseStatusMap[status].label }}
                  </span>
                  <span v-if="status === currentCase.status" class="text-xs text-gray-400 ml-auto">（当前）</span>
                </label>
              </div>
            </div>

            <div v-if="pendingStatus && pendingStatus !== currentCase.status">
              <label class="block text-sm font-medium text-gray-700 mb-2">变更说明 <span class="text-red-500">*</span></label>
              <textarea
                v-model="statusRemark"
                rows="3"
                class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="请输入状态变更的原因或说明..."
              ></textarea>
              <p class="text-xs text-gray-400 mt-1">建议简要说明本次状态变更的背景和原因</p>
            </div>

            <div v-if="statusValidationErrors.length > 0" class="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div class="flex items-start gap-2">
                <AlertCircle class="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div class="space-y-1">
                  <p class="text-sm font-medium text-red-800">无法完成状态变更：</p>
                  <ul class="text-xs text-red-700 space-y-0.5 list-disc list-inside">
                    <li v-for="(err, idx) in statusValidationErrors" :key="idx">{{ err }}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div v-if="pendingStatus === CaseStatus.IN_PROGRESS && pendingStatus !== currentCase.status" class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="flex items-start gap-2">
                <Info class="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p class="text-xs text-blue-700">
                  <strong>校验规则：</strong>从「待处理」切换到「进行中」时，案件至少需要存在一个根级材料目录。
                </p>
              </div>
            </div>

            <div v-if="pendingStatus === CaseStatus.CLOSED && pendingStatus !== currentCase.status" class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="flex items-start gap-2">
                <Info class="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div class="text-xs text-blue-700 space-y-1">
                  <p><strong>校验规则：</strong>从「进行中」切换到「已结案」时需满足：</p>
                  <ul class="list-disc list-inside space-y-0.5 pl-1">
                    <li>材料文件总数必须大于 0</li>
                    <li>关键字段（当事人、对方当事人、承办律师、立案日期、案件描述）不得为空</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              class="px-4 py-2 text-sm text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
              @click="cancelStatusChange"
            >
              取消
            </button>
            <button
              class="px-5 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              :disabled="!pendingStatus || statusValidationErrors.length > 0 || (pendingStatus !== currentCase.status && !statusRemark.trim())"
              @click="confirmStatusChange"
            >
              <CheckCircle2 class="w-4 h-4" />
              确认变更
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    </template>
  </div>
</template>
