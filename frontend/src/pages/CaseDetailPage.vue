<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
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
  MessageSquare,
  FileText as FileTextIcon,
  Plus,
  Archive,
  ExternalLink,
  MapPin,
  FileSignature,
  History,
  FileType,
  FileImage,
  FileArchive,
  Music,
  Video,
  File,
  Download,
  Eye,
  Maximize2,
  Filter,
  Shield,
} from 'lucide-vue-next'
import MaterialTree from '@/components/MaterialTree.vue'
import CaseTaskSummary from '@/components/CaseTaskSummary.vue'
import CaseTaskSection from '@/components/CaseTaskSection.vue'
import CaseEventSummary from '@/components/CaseEventSummary.vue'
import CommunicationRecordSummary from '@/components/CommunicationRecordSummary.vue'
import CommunicationRecordList from '@/components/CommunicationRecordList.vue'
import CommunicationRecordFormModal from '@/components/CommunicationRecordFormModal.vue'
import { useCasesStore, caseStatusMap } from '@/stores/cases'
import { generateId } from '@/mock/data'
import { getTemplateByCaseType } from '@/mock/materialTemplates'
import { computeTaskSummary, refreshOverdueTasks } from '@/mock/tasks'
import { computeEventSummary, refreshOverdueEvents } from '@/mock/caseEvents'
import { getArchiveByCaseId, createArchive, generateArchiveCode } from '@/mock/archives'
import type { Case, MaterialNode, CaseStatus as CaseStatusType, StatusChangeRecord, TaskSummary, CaseEventSummary as EventSummaryType } from '@/types'
import { CaseStatus, MaterialNodeType as NodeType, ArchiveStatus, archiveStatusMap } from '@/types'
import { flattenMaterialTree, updateNodeById, findParentNode, hasDuplicateName, flattenSelectedNodes, findNodeById, expandPathToNode } from '@/utils/treeUtils'
import { exportToExcel, exportToPDF, exportMaterialList, defaultExportColumns, exportRangeLabels, type ExportRange, type ExportColumnConfig } from '@/utils/exportUtils'
import {
  checkMaterialCompleteness,
  validateStatusTransition,
  createStatusChangeRecord,
  getAvailableTransitions,
  type MaterialCompletenessResult,
} from '@/utils/caseWorkflow'
import { generateDocument } from '@/utils/documentGenerator'
import { getTemplates, getGenerationRecordsByCaseId } from '@/mock/documentTemplates'
import type { DocumentTemplate, TemplateType, GenerationRecord } from '@/types'
import { TemplateType as TT, templateTypeMap, OutputFormat, outputFormatMap } from '@/types'
import {
  canPreview,
  canActuallyPreview,
  getFile,
  downloadFile,
  openFileInNewTab,
  getFileIconType,
  formatFileSize,
  deleteFile,
} from '@/utils/fileStorage'
import { usePermissions } from '@/composables/usePermissions'

type DetailTab = 'case-info' | 'communication'

const route = useRoute()
const router = useRouter()
const store = useCasesStore()
const permissions = usePermissions()

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

const showDocumentDialog = ref(false)
const showDocumentMenu = ref(false)
const selectedTemplate = ref<DocumentTemplate | null>(null)
const availableTemplates = ref<DocumentTemplate[]>([])
const generationRecords = ref<GenerationRecord[]>([])
const filterTemplateType = ref<TemplateType | 'all'>('all')

const templateTypeOptions = [
  { value: 'all', label: '全部类型' },
  ...Object.entries(templateTypeMap).map(([value, { label }]) => ({ value, label })),
]

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

const activeTab = ref<DetailTab>('case-info')
const showCommunicationForm = ref(false)
const communicationFormMode = ref<'create' | 'edit'>('create')
const editingCommunicationRecordId = ref<string | null>(null)

const showArchiveModal = ref(false)
const archiveForm = ref({
  archiveCode: '',
  physicalLocation: '',
  keeper: '档案管理员-李芳',
  remark: '',
})
const archiveFormErrors = ref<Record<string, string>>({})
const archiveVersion = ref(0)

const showFilePreview = ref(false)
const previewFileData = ref<{ dataUrl: string; mimeType: string; name: string; type: 'image' | 'pdf' | 'text' } | null>(null)
const previewTextContent = ref<string>('')

const tabs: Array<{ key: DetailTab; label: string; icon: any }> = [
  { key: 'case-info', label: '案件详情', icon: FileTextIcon },
  { key: 'communication', label: '沟通记录', icon: MessageSquare },
]

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

const loadCaseData = (caseId: string) => {
  if (isEditing.value && hasChanges.value) {
    if (!confirm('有未保存的更改，确定要离开当前案件吗？')) {
      router.push({ name: 'case-detail', params: { id: currentCase.value?.id || caseId } })
      return false
    }
    cancelEdit()
  }

  const found = store.getCaseById(caseId)
  if (found) {
    currentCase.value = { ...found }
    currentMaterials.value = JSON.parse(JSON.stringify(found.materials))
    statusHistory.value = found.statusHistory ? JSON.parse(JSON.stringify(found.statusHistory)) : []
    loadGenerationRecords()
  } else {
    currentCase.value = null
    currentMaterials.value = []
    statusHistory.value = []
    generationRecords.value = []
  }
  selectedNode.value = null
  showMaterialCheckPanel.value = true
  showCompletedList.value = true
  showMissingList.value = true
  activeTab.value = 'case-info'
  isEditing.value = false

  const highlightNodeId = route.query.highlight as string | undefined
  if (highlightNodeId && found) {
    currentMaterials.value = expandPathToNode(currentMaterials.value, highlightNodeId)
    handleMaterialsUpdate(currentMaterials.value)
    nextTick(() => {
      const node = findNodeById(currentMaterials.value, highlightNodeId)
      if (node) {
        selectedNode.value = node
        if (treeRef.value) {
          treeRef.value.setSelectedNodeId(highlightNodeId)
        }
      }
    })
    nextTick(() => {
      setTimeout(() => {
        if (treeRef.value) {
          treeRef.value.scrollToNodeId(highlightNodeId)
          treeRef.value.flashHighlightNodeId(highlightNodeId)
        }
      }, 200)
    })
  }

  archiveVersion.value++
  return true
}

const handleHighlightChange = (highlightId: string) => {
  if (!highlightId || currentMaterials.value.length === 0) return
  currentMaterials.value = expandPathToNode(currentMaterials.value, highlightId)
  handleMaterialsUpdate(currentMaterials.value)
  nextTick(() => {
    const node = findNodeById(currentMaterials.value, highlightId)
    if (node) {
      selectedNode.value = node
      if (treeRef.value) {
        treeRef.value.setSelectedNodeId(highlightId)
      }
    }
  })
  nextTick(() => {
    setTimeout(() => {
      if (treeRef.value) {
        treeRef.value.scrollToNodeId(highlightId)
        treeRef.value.flashHighlightNodeId(highlightId)
      }
    }, 200)
  })
}

onMounted(() => {
  availableTemplates.value = getTemplates()
  refreshOverdueTasks()
  refreshOverdueEvents()
  window.addEventListener('keydown', handleKeydown)

  const caseId = route.params.id as string
  loadCaseData(caseId)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

watch(
  () => route.params.id,
  (newCaseId, oldCaseId) => {
    if (newCaseId && newCaseId !== oldCaseId) {
      loadCaseData(newCaseId as string)
    }
  }
)

watch(() => route.query.highlight, (newHighlight, oldHighlight) => {
  if (newHighlight && typeof newHighlight === 'string' && newHighlight !== oldHighlight) {
    handleHighlightChange(newHighlight)
  }
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
  if (currentCase.value) {
    store.updateCaseMaterials(currentCase.value.id, materials)
  }
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

    store.updateCaseStatus(currentCase.value.id, pendingStatus.value, record)
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

const openCreateCommunication = () => {
  communicationFormMode.value = 'create'
  editingCommunicationRecordId.value = null
  showCommunicationForm.value = true
}

const handleCommunicationFormSubmit = () => {
  showCommunicationForm.value = false
  editingCommunicationRecordId.value = null
}

const handleCommunicationFormCancel = () => {
  showCommunicationForm.value = false
  editingCommunicationRecordId.value = null
}

const goToCommunicationList = () => {
  activeTab.value = 'communication'
}

const currentArchive = computed(() => {
  void archiveVersion.value
  if (!currentCase.value) return null
  return getArchiveByCaseId(currentCase.value.id) || null
})

const isCaseClosed = computed(() => {
  return currentCase.value?.status === CaseStatus.CLOSED
})

const hasArchive = computed(() => {
  return currentArchive.value !== null
})

const openArchiveModal = () => {
  archiveForm.value = {
    archiveCode: generateArchiveCode(),
    physicalLocation: '',
    keeper: '档案管理员-李芳',
    remark: '',
  }
  archiveFormErrors.value = {}
  showArchiveModal.value = true
}

const closeArchiveModal = () => {
  showArchiveModal.value = false
  archiveForm.value = {
    archiveCode: '',
    physicalLocation: '',
    keeper: '',
    remark: '',
  }
  archiveFormErrors.value = {}
}

const validateArchiveForm = (): boolean => {
  const errors: Record<string, string> = {}

  if (!archiveForm.value.archiveCode || !archiveForm.value.archiveCode.trim()) {
    errors.archiveCode = '请输入归档编号'
  }
  if (!archiveForm.value.physicalLocation || !archiveForm.value.physicalLocation.trim()) {
    errors.physicalLocation = '请输入存放位置'
  }
  if (!archiveForm.value.keeper || !archiveForm.value.keeper.trim()) {
    errors.keeper = '请输入保管人'
  }

  archiveFormErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleArchiveSubmit = () => {
  if (!currentCase.value || !validateArchiveForm()) return

  createArchive(currentCase.value.id, {
    archiveCode: archiveForm.value.archiveCode.trim(),
    physicalLocation: archiveForm.value.physicalLocation.trim(),
    keeper: archiveForm.value.keeper.trim(),
    remark: archiveForm.value.remark.trim() || undefined,
  })

  archiveVersion.value++
  closeArchiveModal()
}

const goToArchiveDetail = () => {
  if (!currentArchive.value) return
  router.push({ name: 'archive-detail', params: { id: currentArchive.value.archiveId } })
}

const loadGenerationRecords = () => {
  if (!currentCase.value) return
  generationRecords.value = getGenerationRecordsByCaseId(currentCase.value.id)
}

const filteredTemplates = computed(() => {
  return availableTemplates.value.filter(t => {
    if (filterTemplateType.value !== 'all' && t.type !== filterTemplateType.value) return false
    return true
  })
})

const openDocumentDialog = () => {
  showDocumentDialog.value = true
  selectedTemplate.value = null
  filterTemplateType.value = 'all'
}

const closeDocumentDialog = () => {
  showDocumentDialog.value = false
  selectedTemplate.value = null
}

const selectTemplate = (template: DocumentTemplate) => {
  selectedTemplate.value = template
}

const getTypeIcon = (type: TemplateType) => {
  switch (type) {
    case TT.CASE_COVER:
      return FileText
    case TT.EVIDENCE_LIST:
      return FileSpreadsheet
    case TT.MATERIAL_TRANSFER:
      return FileType
    case TT.ENTRUSTMENT_LIST:
      return FileText
    default:
      return FileText
  }
}

const getTypeColor = (type: TemplateType) => {
  switch (type) {
    case TT.CASE_COVER:
      return 'text-blue-600 bg-blue-50'
    case TT.EVIDENCE_LIST:
      return 'text-purple-600 bg-purple-50'
    case TT.MATERIAL_TRANSFER:
      return 'text-green-600 bg-green-50'
    case TT.ENTRUSTMENT_LIST:
      return 'text-orange-600 bg-orange-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

const handleGenerateDocument = () => {
  if (!currentCase.value || !selectedTemplate.value) return

  const flatMaterials = flattenMaterialTree(currentMaterials.value)

  generateDocument({
    caseInfo: { ...currentCase.value, materials: currentMaterials.value },
    materials: flatMaterials,
    template: selectedTemplate.value,
    generatedBy: currentCase.value.responsibleLawyer || '当前用户',
  })

  loadGenerationRecords()
  closeDocumentDialog()
}

const goToGenerationRecords = () => {
  if (!currentCase.value) return
  router.push({ name: 'generation-records', query: { caseId: currentCase.value.id } })
}

const getFormatIcon = (format?: OutputFormat) => {
  switch (format) {
    case OutputFormat.EXCEL:
      return FileSpreadsheet
    case OutputFormat.PDF:
      return FileType
    case OutputFormat.WORD:
      return FileText
    default:
      return FileText
  }
}

const getFormatColor = (format?: OutputFormat) => {
  switch (format) {
    case OutputFormat.EXCEL:
      return 'text-green-600 bg-green-50'
    case OutputFormat.PDF:
      return 'text-red-600 bg-red-50'
    case OutputFormat.WORD:
      return 'text-blue-600 bg-blue-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

const getNodeFileIcon = (node: MaterialNode) => {
  if (node.type !== NodeType.FILE) return null
  const iconType = getFileIconType(node.mimeType || '', node.fileExtension || '')
  switch (iconType) {
    case 'pdf': return FileType
    case 'excel': return FileSpreadsheet
    case 'word': return FileText
    case 'image': return FileImage
    case 'zip': return FileArchive
    case 'audio': return Music
    case 'video': return Video
    case 'text': return FileText
    default: return File
  }
}

const getNodeFileIconColor = (node: MaterialNode) => {
  if (node.type !== NodeType.FILE) return 'text-blue-500'
  const iconType = getFileIconType(node.mimeType || '', node.fileExtension || '')
  switch (iconType) {
    case 'pdf': return 'text-red-500'
    case 'excel': return 'text-green-600'
    case 'word': return 'text-blue-600'
    case 'image': return 'text-purple-500'
    case 'zip': return 'text-amber-600'
    case 'audio': return 'text-pink-500'
    case 'video': return 'text-orange-500'
    case 'text': return 'text-gray-500'
    default: return 'text-blue-500'
  }
}

const isFilePlaceholder = (node: MaterialNode | null): boolean => {
  if (!node || node.type !== NodeType.FILE || !node.fileDataId) return false
  const fileItem = getFile(node.fileDataId)
  return !!fileItem?.isPlaceholder || !fileItem?.data
}

const isFileActuallyPreviewable = (node: MaterialNode | null): { previewable: boolean; type: 'image' | 'pdf' | 'text' | 'none' } => {
  if (!node || node.type !== NodeType.FILE || !node.fileDataId) return { previewable: false, type: 'none' }
  const fileItem = getFile(node.fileDataId)
  return canActuallyPreview(fileItem)
}

const handlePreviewFile = async (node: MaterialNode) => {
  if (!node.fileDataId || node.type !== NodeType.FILE) return

  const fileItem = getFile(node.fileDataId)
  if (!fileItem) {
    alert('文件不存在或已被清理')
    return
  }

  if (fileItem.isPlaceholder || !fileItem.data) {
    alert('该文件仅存储了元数据，无法预览原始内容。\n\n' +
      `文件名：${fileItem.name}\n` +
      `大小：${formatFileSize(fileItem.fileSize)}\n` +
      `类型：${fileItem.mimeType}\n` +
      `上传日期：${fileItem.uploadDate}`)
    return
  }

  const previewInfo = canPreview(fileItem.mimeType)
  if (!previewInfo.previewable) {
    if (confirm('该文件类型暂不支持在线预览，是否下载？')) {
      downloadFile(node.fileDataId, node.name)
    }
    return
  }

  if (previewInfo.type === 'text') {
    try {
      const base64Data = fileItem.data.split(',')[1]
      previewTextContent.value = atob(base64Data)
    } catch (e) {
      previewTextContent.value = '无法解析文本内容'
    }
  }

  previewFileData.value = {
    dataUrl: fileItem.data,
    mimeType: fileItem.mimeType,
    name: node.name,
    type: previewInfo.type as 'image' | 'pdf' | 'text',
  }
  showFilePreview.value = true
}

const decodeBase64Text = (base64DataUrl: string): string => {
  try {
    const base64Data = base64DataUrl.split(',')[1]
    return atob(base64Data)
  } catch {
    return '无法解析文本'
  }
}

const handleDownloadFile = (node: MaterialNode) => {
  if (!node.fileDataId || node.type !== NodeType.FILE) return
  downloadFile(node.fileDataId, node.name)
}

const handleOpenFileNewTab = (node: MaterialNode) => {
  if (!node.fileDataId || node.type !== NodeType.FILE) return
  openFileInNewTab(node.fileDataId)
}

const closeFilePreview = () => {
  showFilePreview.value = false
  previewFileData.value = null
  previewTextContent.value = ''
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
                  v-if="permissions.canChangeCaseStatus"
                  class="px-2.5 py-0.5 text-xs font-medium rounded-full border flex-shrink-0 flex items-center gap-1.5 hover:ring-2 hover:ring-offset-1 hover:ring-blue-300 transition-all group"
                  :class="caseStatusMap[currentCase.status].class"
                  @click="openStatusChange"
                  title="点击变更状态"
                >
                  {{ caseStatusMap[currentCase.status].label }}
                  <RefreshCw class="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </button>
                <span
                  v-else
                  class="px-2.5 py-0.5 text-xs font-medium rounded-full border flex-shrink-0 flex items-center gap-1.5"
                  :class="caseStatusMap[currentCase.status].class"
                >
                  {{ caseStatusMap[currentCase.status].label }}
                </span>
                <span class="text-xs text-gray-400 font-mono truncate">{{ currentCase.caseNumber }}</span>
                <span class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded flex-shrink-0">
                  {{ currentCase.caseType }}
                </span>
                <div class="flex items-center gap-2 px-2.5 py-0.5 bg-blue-50 border border-blue-200 rounded-full">
                  <Shield class="w-3 h-3 text-blue-600" />
                  <span class="text-xs font-medium text-blue-700">
                    {{ permissions.currentRoleInfo?.label }}
                  </span>
                </div>
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
            <template v-if="isCaseClosed && permissions.canArchiveCase">
              <template v-if="hasArchive">
                <button
                  class="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                  @click="goToArchiveDetail"
                >
                  <ExternalLink class="w-4 h-4" />
                  查看归档
                </button>
              </template>
              <template v-else>
                <button
                  class="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                  @click="openArchiveModal"
                >
                  <Archive class="w-4 h-4" />
                  创建归档
                </button>
              </template>
            </template>
            <div v-if="permissions.canGenerateDocument" class="relative">
              <button
                class="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                @click="openDocumentDialog"
              >
                <FileSignature class="w-4 h-4" />
                生成文书
              </button>
            </div>
            <div v-if="permissions.canExportExcel || permissions.canExportPdf" class="relative">
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
                  v-if="permissions.canExportExcel"
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  @click="handleExport('excel')"
                >
                  <FileSpreadsheet class="w-4 h-4 text-green-600" />
                  导出 Excel 文件
                </button>
                <button
                  v-if="permissions.canExportPdf"
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

      <div class="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
        <div class="border-b border-gray-200">
          <div class="flex">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative"
              :class="[
                activeTab === tab.key
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              ]"
              @click="activeTab = tab.key"
            >
              <component :is="tab.icon" class="w-4 h-4" />
              {{ tab.label }}
              <span
                v-if="tab.key === 'communication'"
                class="absolute top-2 right-4 w-2 h-2 bg-amber-500 rounded-full"
                v-show="false"
              ></span>
            </button>
          </div>
          <div class="h-0.5 bg-gray-100">
            <div
              class="h-full bg-blue-600 transition-all duration-300"
              :style="{
                width: '50%',
                marginLeft: activeTab === 'case-info' ? '0%' : '50%'
              }"
            ></div>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'case-info'">
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
                  <component
                    v-else
                    :is="getNodeFileIcon(selectedNode)"
                    :class="['w-8 h-8', getNodeFileIconColor(selectedNode)]"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-gray-900 truncate">
                    {{ isEditing ? editForm.name : selectedNode.name }}
                  </h3>
                  <p class="text-sm text-gray-500 mt-0.5">
                    {{ selectedNode.type === NodeType.FOLDER ? '文件夹' : '文件' }}
                    <span v-if="selectedNode.type === NodeType.FILE && selectedNode.fileExtension" class="ml-1">
                      · {{ selectedNode.fileExtension.toUpperCase() }}
                    </span>
                  </p>
                </div>
                <template v-if="!isEditing">
                  <template v-if="selectedNode.type === NodeType.FILE && selectedNode.fileDataId">
                    <button
                      v-if="isFileActuallyPreviewable(selectedNode).previewable"
                      class="p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors"
                      title="预览"
                      @click="handlePreviewFile(selectedNode)"
                    >
                      <Eye class="w-4 h-4" />
                    </button>
                    <button
                      class="p-2 text-gray-400 hover:bg-gray-100 hover:text-green-600 rounded-lg transition-colors"
                      title="下载"
                      @click="handleDownloadFile(selectedNode)"
                    >
                      <Download class="w-4 h-4" />
                    </button>
                  </template>
                  <button
                    v-if="permissions.canEditMaterial"
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

                    <template v-if="selectedNode.fileExtension">
                      <div>
                        <p class="text-xs text-gray-500 mb-1.5">文件类型</p>
                        <p class="text-sm text-gray-900">{{ selectedNode.fileExtension.toUpperCase() }}</p>
                      </div>
                    </template>

                    <template v-if="selectedNode.mimeType">
                      <div>
                        <p class="text-xs text-gray-500 mb-1.5">MIME 类型</p>
                        <p class="text-sm text-gray-900 font-mono">{{ selectedNode.mimeType }}</p>
                      </div>
                    </template>

                    <div>
                      <p class="text-xs text-gray-500 mb-1.5">存储状态</p>
                      <div class="flex flex-col gap-1.5">
                        <span
                          v-if="selectedNode.fileDataId && !isFilePlaceholder(selectedNode)"
                          class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-green-50 text-green-700 rounded-full w-fit"
                        >
                          <CheckCircle2 class="w-3 h-3" />
                          原文件已存储
                        </span>
                        <span
                          v-else-if="selectedNode.fileDataId && isFilePlaceholder(selectedNode)"
                          class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-amber-50 text-amber-700 rounded-full w-fit"
                        >
                          <AlertTriangle class="w-3 h-3" />
                          仅元数据占位（原文件内容未保存）
                        </span>
                        <span
                          v-else
                          class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded-full w-fit"
                        >
                          <XCircle class="w-3 h-3" />
                          无文件数据
                        </span>
                      </div>
                      <p
                        v-if="selectedNode.fileDataId && isFilePlaceholder(selectedNode)"
                        class="text-xs text-amber-600 mt-1.5 leading-relaxed bg-amber-50 px-2 py-1.5 rounded"
                      >
                        该文件体积较大或存储失败，仅保存了文件名、大小等元数据。
                        无法在线预览或下载原文件内容。
                      </p>
                    </div>

                    <div
                      v-if="selectedNode.fileDataId && isFileActuallyPreviewable(selectedNode).previewable"
                      class="pt-2"
                    >
                      <div class="flex items-center justify-between mb-2">
                        <p class="text-xs text-gray-500 flex items-center gap-1">
                          <Eye class="w-3 h-3" />
                          文件预览
                        </p>
                        <button
                          class="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          @click="handleOpenFileNewTab(selectedNode)"
                        >
                          <Maximize2 class="w-3 h-3" />
                          新窗口打开
                        </button>
                      </div>
                      <div
                        class="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden min-h-[200px] flex items-center justify-center cursor-pointer hover:border-blue-300 transition-colors"
                        @click="handlePreviewFile(selectedNode)"
                      >
                        <img
                          v-if="isFileActuallyPreviewable(selectedNode).type === 'image'"
                          :src="getFile(selectedNode.fileDataId!)?.data"
                          :alt="selectedNode.name"
                          class="max-w-full max-h-[300px] object-contain"
                        />
                        <div
                          v-else-if="isFileActuallyPreviewable(selectedNode).type === 'pdf'"
                          class="w-full h-[300px]"
                        >
                          <iframe
                            :src="getFile(selectedNode.fileDataId!)?.data"
                            class="w-full h-full pointer-events-none"
                          ></iframe>
                        </div>
                        <div
                          v-else-if="isFileActuallyPreviewable(selectedNode).type === 'text'"
                          class="w-full p-3 text-xs text-gray-600 font-mono max-h-[300px] overflow-auto whitespace-pre-wrap"
                        >
                          {{ (() => {
                            const f = getFile(selectedNode.fileDataId!);
                            if (!f?.data) return '';
                            return decodeBase64Text(f.data);
                          })() }}
                        </div>
                      </div>
                    </div>

                    <div
                      v-else-if="selectedNode.fileDataId && selectedNode.mimeType && canPreview(selectedNode.mimeType).previewable && isFilePlaceholder(selectedNode)"
                      class="pt-2"
                    >
                      <div class="flex items-center justify-between mb-2">
                        <p class="text-xs text-gray-500 flex items-center gap-1">
                          <Eye class="w-3 h-3" />
                          文件预览
                        </p>
                      </div>
                      <div
                        class="bg-amber-50 border border-amber-200 rounded-lg min-h-[160px] flex flex-col items-center justify-center p-4"
                      >
                        <AlertTriangle class="w-10 h-10 text-amber-500 mb-3" />
                        <p class="text-sm text-amber-800 font-medium text-center mb-1">无法预览</p>
                        <p class="text-xs text-amber-600 text-center leading-relaxed">
                          该文件为元数据占位，原文件内容未存储，无法在线预览。
                          如需预览，请重新上传该文件。
                        </p>
                      </div>
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

      <div v-show="activeTab === 'communication'">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare class="w-5 h-5 text-cyan-600" />
            客户沟通记录
          </h2>
          <button
            v-if="permissions.canEditCase"
            class="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            @click="openCreateCommunication"
          >
            <Plus class="w-4 h-4" />
            新增记录
          </button>
        </div>

        <CommunicationRecordSummary
          v-if="currentCase"
          :case-id="currentCase.id"
          class="mb-6"
          @go-to-communication-list="goToCommunicationList"
        />

        <CommunicationRecordList
          v-if="currentCase"
          :case-id="currentCase.id"
          :show-stats="false"
          :show-add-button="false"
          class="mb-6"
        />
      </div>
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

    <Teleport to="body">
      <CommunicationRecordFormModal
        v-if="showCommunicationForm && currentCase"
        :visible="showCommunicationForm"
        :mode="communicationFormMode"
        :case-id="currentCase.id"
        :record-id="editingCommunicationRecordId"
        @submit="handleCommunicationFormSubmit"
        @cancel="handleCommunicationFormCancel"
      />
    </Teleport>

    <Teleport to="body">
      <div v-if="showArchiveModal && currentCase" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="fixed inset-0 bg-black/50" @click="closeArchiveModal"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-gray-900">创建归档</h3>
            <button
              class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              @click="closeArchiveModal"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div class="flex items-start gap-3">
              <CheckCircle2 class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p class="text-sm font-medium text-green-800">案件已结案</p>
                <p class="text-xs text-green-600 mt-0.5">
                  案件「{{ currentCase.caseNumber }}」状态为已结案，可以创建归档记录。
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                归档编号 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="archiveForm.archiveCode"
                type="text"
                class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="{ 'border-red-300 bg-red-50': archiveFormErrors.archiveCode }"
                placeholder="例如：GD-2026-0001"
                @blur="validateArchiveForm"
              />
              <p v-if="archiveFormErrors.archiveCode" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                {{ archiveFormErrors.archiveCode }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                存放位置 <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <MapPin class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  v-model="archiveForm.physicalLocation"
                  type="text"
                  class="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  :class="{ 'border-red-300 bg-red-50': archiveFormErrors.physicalLocation }"
                  placeholder="例如：档案柜 A-03"
                  @blur="validateArchiveForm"
                />
              </div>
              <p v-if="archiveFormErrors.physicalLocation" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                {{ archiveFormErrors.physicalLocation }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                保管人 <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <User class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  v-model="archiveForm.keeper"
                  type="text"
                  class="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  :class="{ 'border-red-300 bg-red-50': archiveFormErrors.keeper }"
                  placeholder="例如：档案管理员-李芳"
                  @blur="validateArchiveForm"
                />
              </div>
              <p v-if="archiveFormErrors.keeper" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                {{ archiveFormErrors.keeper }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                备注说明
              </label>
              <textarea
                v-model="archiveForm.remark"
                rows="3"
                class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="输入归档备注说明..."
              ></textarea>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              class="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              @click="closeArchiveModal"
            >
              取消
            </button>
            <button
              class="px-4 py-2 text-sm text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors shadow-sm font-medium flex items-center gap-1.5"
              @click="handleArchiveSubmit"
            >
              <Archive class="w-4 h-4" />
              确认创建
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="showDocumentDialog && currentCase"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="closeDocumentDialog"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileSignature class="w-5 h-5 text-emerald-600" />
              生成文书
            </h3>
            <button
              class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              @click="closeDocumentDialog"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-4 flex-shrink-0">
            <div class="flex items-center gap-2">
              <Filter class="w-4 h-4 text-gray-400" />
              <select
                v-model="filterTemplateType"
                class="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              >
                <option v-for="opt in templateTypeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="flex items-center gap-2 ml-auto">
              <button
                class="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                @click="goToGenerationRecords"
              >
                <History class="w-4 h-4" />
                查看生成记录
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-6">
            <div v-if="filteredTemplates.length === 0" class="py-16 text-center">
              <FileText class="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p class="text-gray-500 mb-2">暂无符合条件的模板</p>
              <p class="text-sm text-gray-400">尝试调整筛选条件</p>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="template in filteredTemplates"
                :key="template.templateId"
                class="relative border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md"
                :class="[
                  selectedTemplate?.templateId === template.templateId
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300',
                ]"
                @click="selectTemplate(template)"
              >
                <div
                  v-if="selectedTemplate?.templateId === template.templateId"
                  class="absolute top-3 right-3 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center"
                >
                  <CheckCircle2 class="w-3.5 h-3.5 text-white" />
                </div>
                <div class="flex items-start gap-3">
                  <div
                    class="p-2.5 rounded-lg flex-shrink-0"
                    :class="getTypeColor(template.type)"
                  >
                    <component :is="getTypeIcon(template.type)" class="w-5 h-5" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <h4 class="font-medium text-gray-900 truncate">{{ template.name }}</h4>
                      <span
                        v-if="template.isDefault"
                        class="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded"
                      >
                        默认
                      </span>
                    </div>
                    <p class="text-xs text-gray-500 mb-2">
                      {{ templateTypeMap[template.type].label }}
                    </p>
                    <p v-if="template.description" class="text-xs text-gray-500 line-clamp-2 mb-2">
                      {{ template.description }}
                    </p>
                    <div class="flex items-center gap-3 text-xs text-gray-400">
                      <span class="flex items-center gap-1">
                        <Download class="w-3 h-3" />
                        {{ outputFormatMap[template.outputFormat].label }}
                      </span>
                      <span class="flex items-center gap-1">
                        <FileText class="w-3 h-3" />
                        {{ template.enabledFields.length }} 个字段
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="generationRecords.length > 0" class="mt-6 pt-6 border-t border-gray-100">
              <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <History class="w-4 h-4" />
                最近生成记录
              </h4>
              <div class="space-y-2 max-h-48 overflow-y-auto">
                <div
                  v-for="record in generationRecords.slice(0, 5)"
                  :key="record.recordId"
                  class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div
                    class="p-1.5 rounded flex-shrink-0"
                    :class="record.outputFormat ? getFormatColor(record.outputFormat) : 'bg-gray-100 text-gray-600'"
                  >
                    <component
                      :is="record.outputFormat ? getFormatIcon(record.outputFormat) : FileText"
                      class="w-4 h-4"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">
                      {{ record.templateName }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ formatDate(record.generatedAt) }} · {{ record.generatedBy }}
                    </p>
                  </div>
                  <span
                    class="text-xs px-2 py-0.5 rounded-full border"
                    :class="record.outputFormat ? getFormatColor(record.outputFormat) : 'bg-gray-100 text-gray-600'"
                  >
                    {{ record.outputFormat ? outputFormatMap[record.outputFormat].label : '未知' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 bg-gray-50 flex items-center justify-between border-t border-gray-100 flex-shrink-0">
            <div v-if="selectedTemplate" class="text-sm text-gray-500">
              已选择：<span class="font-medium text-gray-900">{{ selectedTemplate.name }}</span>
            </div>
            <div v-else class="text-sm text-gray-400">
              请选择一个模板
            </div>
            <div class="flex items-center gap-3">
              <button
                class="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                @click="closeDocumentDialog"
              >
                取消
              </button>
              <button
                class="px-5 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                :disabled="!selectedTemplate"
                @click="handleGenerateDocument"
              >
                <FileSignature class="w-4 h-4" />
                生成文书
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="showFilePreview && previewFileData"
        class="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
        @click.self="closeFilePreview"
      >
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div class="flex items-center gap-3 min-w-0">
              <component
                :is="getNodeFileIcon(selectedNode!)"
                :class="['w-6 h-6', getNodeFileIconColor(selectedNode!)]"
              />
              <h3 class="text-lg font-semibold text-gray-900 truncate">
                {{ previewFileData.name }}
              </h3>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button
                class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="下载"
                @click="handleDownloadFile(selectedNode!)"
              >
                <Download class="w-5 h-5" />
              </button>
              <button
                class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="新窗口打开"
                @click="handleOpenFileNewTab(selectedNode!)"
              >
                <Maximize2 class="w-5 h-5" />
              </button>
              <button
                class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="关闭"
                @click="closeFilePreview"
              >
                <X class="w-5 h-5" />
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-6">
            <img
              v-if="previewFileData.type === 'image'"
              :src="previewFileData.dataUrl"
              :alt="previewFileData.name"
              class="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
            />
            <iframe
              v-else-if="previewFileData.type === 'pdf'"
              :src="previewFileData.dataUrl"
              class="w-full h-[75vh] bg-white rounded-lg shadow-lg"
            ></iframe>
            <pre
              v-else-if="previewFileData.type === 'text'"
              class="w-full h-[75vh] bg-white rounded-lg shadow-lg p-6 text-sm text-gray-800 font-mono overflow-auto whitespace-pre-wrap"
            >{{ previewTextContent }}</pre>
            <div
              v-else
              class="text-center py-16"
            >
              <component
                :is="getNodeFileIcon(selectedNode!)"
                :class="['w-16 h-16 mx-auto mb-4', getNodeFileIconColor(selectedNode!)]"
              />
              <p class="text-gray-500">该文件类型暂不支持预览</p>
              <button
                class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                @click="handleDownloadFile(selectedNode!)"
              >
                下载文件
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    </template>
  </div>
</template>
