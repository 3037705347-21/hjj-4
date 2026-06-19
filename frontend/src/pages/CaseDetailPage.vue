<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
} from 'lucide-vue-next'
import MaterialTree from '@/components/MaterialTree.vue'
import { mockCases, caseStatusMap } from '@/mock/data'
import type { Case, MaterialNode } from '@/types'
import { MaterialNodeType as NodeType } from '@/types'
import { flattenMaterialTree, updateNodeById, findParentNode, hasDuplicateName, flattenSelectedNodes, findNodeById } from '@/utils/treeUtils'
import { exportToExcel, exportToPDF, exportMaterialList, defaultExportColumns, exportRangeLabels, type ExportRange, type ExportColumnConfig } from '@/utils/exportUtils'

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
  }
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
              <div class="flex items-center gap-3 mb-1">
                <span class="px-2.5 py-0.5 text-xs font-medium rounded-full border flex-shrink-0"
                  :class="caseStatusMap[currentCase.status].class">
                  {{ caseStatusMap[currentCase.status].label }}
                </span>
                <span class="text-xs text-gray-400 font-mono truncate">{{ currentCase.caseNumber }}</span>
                <span class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded flex-shrink-0">
                  {{ currentCase.caseType }}
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
    </template>
  </div>
</template>
