<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import {
  FolderPlus,
  FilePlus,
  RotateCcw,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  ListChecks,
  Trash2,
  ArrowRightLeft,
  MessageSquare,
  FileDown,
  CheckSquare,
  Square,
  FolderOpen,
  Folder,
  FileSpreadsheet,
  FileText,
  Upload,
  AlertTriangle,
  Loader2,
} from 'lucide-vue-next'
import MaterialTreeItem from './MaterialTreeItem.vue'
import type { MaterialNode } from '@/types'
import { MaterialNodeType } from '@/types'
import { generateId } from '@/mock/data'
import {
  filterMaterialTree,
  getAllUploaders,
  findNodeById,
  removeNodeById,
  addChildNode,
  updateNodeById,
  isDescendant,
  removeNodesByIds,
  getNodesByIds,
  isDescendantOfAny,
  updateNodesByIds,
  getAllFolderNodes,
  getNodePath,
  hasDuplicateName,
  findParentNode,
} from '@/utils/treeUtils'
import type { FilterOptions } from '@/utils/treeUtils'
import {
  saveFile,
  deleteFile,
  formatFileSize,
  getFileExtension,
} from '@/utils/fileStorage'
import { usePermissions } from '@/composables/usePermissions'

const permissions = usePermissions()

interface Props {
  materials: MaterialNode[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:materials', materials: MaterialNode[]): void
  (e: 'select', node: MaterialNode | null): void
  (e: 'filtered-count', counts: { files: number; folders: number }): void
  (e: 'multi-select-change', nodes: MaterialNode[]): void
  (e: 'batch-export', selectedIds: string[], format: 'excel' | 'pdf'): void
}>()

const localMaterials = ref<MaterialNode[]>([...props.materials])
const selectedNodeId = ref<string | null>(null)
const draggingNodeId = ref<string | null>(null)
const showFilterPanel = ref(false)
const multiSelectMode = ref(false)
const selectedNodeIds = ref<Set<string>>(new Set())
const lastSelectedId = ref<string | null>(null)

const showMoveDialog = ref(false)
const moveTargetFolderId = ref<string | null>(null)

const showRemarkDialog = ref(false)
const batchRemark = ref('')

const showExportMenu = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const pendingParentId = ref<string | null>(null)
const isDragover = ref(false)

const filterOptions = ref<FilterOptions>({
  nameKeyword: '',
  nodeType: 'all',
  uploader: '',
  uploadDateFrom: '',
  uploadDateTo: '',
  hasFileSize: 'all',
})

const isFilterActive = computed(() => {
  const o = filterOptions.value
  return !!(
    (o.nameKeyword && o.nameKeyword.trim()) ||
    (o.nodeType && o.nodeType !== 'all') ||
    (o.uploader && o.uploader.trim()) ||
    (o.uploadDateFrom && o.uploadDateFrom.trim()) ||
    (o.uploadDateTo && o.uploadDateTo.trim()) ||
    (o.hasFileSize && o.hasFileSize !== 'all')
  )
})

const allUploaders = computed(() => getAllUploaders(localMaterials.value))

const filteredMaterials = computed(() => {
  return filterMaterialTree(localMaterials.value, filterOptions.value)
})

const matchedNodeIds = computed(() => {
  const ids = new Set<string>()
  const keyword = filterOptions.value.nameKeyword?.trim().toLowerCase()
  if (!keyword) return ids

  const traverse = (nodes: MaterialNode[]) => {
    for (const node of nodes) {
      if (node.name.toLowerCase().includes(keyword)) {
        ids.add(node.id)
      }
      if (node.children) {
        traverse(node.children)
      }
    }
  }
  traverse(filteredMaterials.value)
  return ids
})

const selectedNodes = computed(() => {
  return getNodesByIds(localMaterials.value, Array.from(selectedNodeIds.value))
})

const selectedFileCount = computed(() => {
  return selectedNodes.value.filter(n => n.type === MaterialNodeType.FILE).length
})

const selectedFolderCount = computed(() => {
  return selectedNodes.value.filter(n => n.type === MaterialNodeType.FOLDER).length
})

const availableMoveTargets = computed(() => {
  const allFolders = getAllFolderNodes(localMaterials.value)
  const selectedIds = Array.from(selectedNodeIds.value)
  return allFolders.filter(folder => !isDescendantOfAny(localMaterials.value, folder.id, selectedIds))
})

watch(filteredMaterials, (filtered) => {
  let fileCount = 0
  let folderCount = 0
  const traverse = (nodes: MaterialNode[]) => {
    for (const node of nodes) {
      if (node.type === MaterialNodeType.FILE) {
        fileCount++
      } else {
        folderCount++
      }
      if (node.children) {
        traverse(node.children)
      }
    }
  }
  traverse(filtered)
  emit('filtered-count', { files: fileCount, folders: folderCount })
}, { immediate: true })

watch(() => props.materials, (newMaterials) => {
  localMaterials.value = [...newMaterials]
}, { deep: true })

watch(selectedNodeIds, (newIds) => {
  const nodes = getNodesByIds(localMaterials.value, Array.from(newIds))
  emit('multi-select-change', nodes)
}, { deep: true })

const clearFilters = () => {
  filterOptions.value = {
    nameKeyword: '',
    nodeType: 'all',
    uploader: '',
    uploadDateFrom: '',
    uploadDateTo: '',
    hasFileSize: 'all',
  }
}

const toggleFilterPanel = () => {
  showFilterPanel.value = !showFilterPanel.value
}

const toggleMultiSelectMode = () => {
  multiSelectMode.value = !multiSelectMode.value
  if (!multiSelectMode.value) {
    selectedNodeIds.value = new Set()
    lastSelectedId.value = null
  }
}

const addRootFolder = () => {
  const newFolder: MaterialNode = {
    id: generateId(),
    name: '新建文件夹',
    type: MaterialNodeType.FOLDER,
    children: [],
    expanded: true,
  }
  localMaterials.value = [...localMaterials.value, newFolder]
  emit('update:materials', localMaterials.value)
}

const addRootFile = () => {
  pendingParentId.value = null
  nextTick(() => {
    fileInputRef.value?.click()
  })
}

const getAllVisibleNodeIds = (): string[] => {
  const ids: string[] = []
  const traverse = (nodes: MaterialNode[]) => {
    for (const node of nodes) {
      ids.push(node.id)
      if (node.children && node.expanded && node.type === MaterialNodeType.FOLDER) {
        traverse(node.children)
      }
    }
  }
  traverse(filteredMaterials.value)
  return ids
}

const handleSelect = (node: MaterialNode, ctrlKey?: boolean, shiftKey?: boolean) => {
  if (multiSelectMode.value) {
    if (shiftKey && lastSelectedId.value) {
      const allIds = getAllVisibleNodeIds()
      const lastIdx = allIds.indexOf(lastSelectedId.value)
      const currentIdx = allIds.indexOf(node.id)
      if (lastIdx !== -1 && currentIdx !== -1) {
        const start = Math.min(lastIdx, currentIdx)
        const end = Math.max(lastIdx, currentIdx)
        const rangeIds = allIds.slice(start, end + 1)
        const newSet = new Set(selectedNodeIds.value)
        rangeIds.forEach(id => newSet.add(id))
        selectedNodeIds.value = newSet
      }
    } else if (ctrlKey) {
      const newSet = new Set(selectedNodeIds.value)
      if (newSet.has(node.id)) {
        newSet.delete(node.id)
      } else {
        newSet.add(node.id)
      }
      selectedNodeIds.value = newSet
    } else {
      selectedNodeIds.value = new Set([node.id])
    }
    lastSelectedId.value = node.id
  } else {
    selectedNodeId.value = node.id
    const originalNode = findNodeById(localMaterials.value, node.id)
    emit('select', originalNode || node)
  }
}

const handleToggleSelect = (nodeId: string) => {
  const newSet = new Set(selectedNodeIds.value)
  if (newSet.has(nodeId)) {
    newSet.delete(nodeId)
  } else {
    newSet.add(nodeId)
  }
  selectedNodeIds.value = newSet
  lastSelectedId.value = nodeId
}

const selectAllVisible = () => {
  const allIds = getAllVisibleNodeIds()
  selectedNodeIds.value = new Set(allIds)
}

const clearSelection = () => {
  selectedNodeIds.value = new Set()
  lastSelectedId.value = null
}

const toggleExpand = (nodeId: string) => {
  const toggleInNodes = (nodes: MaterialNode[]): MaterialNode[] => {
    return nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, expanded: !node.expanded }
      }
      if (node.children) {
        return { ...node, children: toggleInNodes(node.children) }
      }
      return node
    })
  }
  localMaterials.value = toggleInNodes(localMaterials.value)
  emit('update:materials', localMaterials.value)
}

const handleAdd = (parentId: string | null, type: MaterialNodeType) => {
  if (type === MaterialNodeType.FOLDER) {
    const newNode: MaterialNode = {
      id: generateId(),
      name: '新建文件夹',
      type: MaterialNodeType.FOLDER,
      children: [],
      expanded: true,
    }
    localMaterials.value = addChildNode(localMaterials.value, parentId, newNode)
    emit('update:materials', localMaterials.value)
    if (multiSelectMode.value) {
      selectedNodeIds.value = new Set([newNode.id])
    } else {
      selectedNodeId.value = newNode.id
      emit('select', newNode)
    }
  } else {
    pendingParentId.value = parentId
    nextTick(() => {
      fileInputRef.value?.click()
    })
  }
}

const handleRename = (node: MaterialNode) => {
  const newName = prompt('请输入新名称：', node.name)
  if (newName === null) return

  const trimmedName = newName.trim()
  if (!trimmedName) {
    alert('名称不能为空')
    return
  }

  if (trimmedName !== newName) {
    alert('名称不能包含首尾空格')
    return
  }

  if (trimmedName === node.name) return

  const parent = findParentNode(localMaterials.value, node.id)
  const parentId = parent ? parent.id : null
  if (hasDuplicateName(localMaterials.value, parentId, trimmedName, node.id)) {
    alert('当前父级下已存在同名节点')
    return
  }

  localMaterials.value = updateNodeById(localMaterials.value, node.id, { name: trimmedName })
  emit('update:materials', localMaterials.value)
}

const getFileNodeIds = (nodes: MaterialNode[]): string[] => {
  const ids: string[] = []
  const traverse = (nodeList: MaterialNode[]) => {
    for (const node of nodeList) {
      if (node.type === MaterialNodeType.FILE && node.fileDataId) {
        ids.push(node.fileDataId)
      }
      if (node.children) {
        traverse(node.children)
      }
    }
  }
  traverse(nodes)
  return ids
}

const handleDelete = (node: MaterialNode) => {
  if (confirm(`确定要删除「${node.name}」吗？${node.type === MaterialNodeType.FOLDER ? '文件夹内的所有内容也将被删除。' : ''}`)) {
    const fileDataIds = getFileNodeIds([node])
    fileDataIds.forEach(id => deleteFile(id))

    localMaterials.value = removeNodeById(localMaterials.value, node.id)
    if (selectedNodeId.value === node.id) {
      selectedNodeId.value = null
      emit('select', null)
    }
    if (selectedNodeIds.value.has(node.id)) {
      const newSet = new Set(selectedNodeIds.value)
      newSet.delete(node.id)
      selectedNodeIds.value = newSet
    }
    emit('update:materials', localMaterials.value)
  }
}

const handleBatchDelete = () => {
  if (selectedNodeIds.value.size === 0) return

  const fileCount = selectedFileCount.value
  const folderCount = selectedFolderCount.value

  let confirmText = '确定要删除选中的 '
  const parts: string[] = []
  if (fileCount > 0) parts.push(`${fileCount} 个文件`)
  if (folderCount > 0) parts.push(`${folderCount} 个文件夹`)
  confirmText += parts.join('、') + ' 吗？'
  if (folderCount > 0) {
    confirmText += '\n\n注意：删除文件夹将同时删除其内部的所有内容，此操作不可撤销。'
  }

  if (!confirm(confirmText)) return

  const idsToDelete = Array.from(selectedNodeIds.value)
  const nodesToDelete = getNodesByIds(localMaterials.value, idsToDelete)
  const fileDataIds = getFileNodeIds(nodesToDelete)
  fileDataIds.forEach(id => deleteFile(id))

  localMaterials.value = removeNodesByIds(localMaterials.value, idsToDelete)

  idsToDelete.forEach(id => {
    if (selectedNodeId.value === id) {
      selectedNodeId.value = null
      emit('select', null)
    }
  })

  selectedNodeIds.value = new Set()
  lastSelectedId.value = null
  emit('update:materials', localMaterials.value)
}

const processFileUpload = async (file: File, parentId: string | null): Promise<MaterialNode> => {
  const extension = getFileExtension(file.name)
  const tempNodeId = generateId()

  const tempNode: MaterialNode = {
    id: tempNodeId,
    name: file.name,
    type: MaterialNodeType.FILE,
    uploadDate: new Date().toISOString().split('T')[0],
    uploader: '当前用户',
    fileSize: formatFileSize(file.size),
    description: '',
    fileExtension: extension,
    mimeType: file.type,
    isUploading: true,
    uploadProgress: 0,
  }

  localMaterials.value = addChildNode(localMaterials.value, parentId, tempNode)
  emit('update:materials', localMaterials.value)

  try {
    localMaterials.value = updateNodeById(localMaterials.value, tempNodeId, { uploadProgress: 30 })
    emit('update:materials', localMaterials.value)

    const storageItem = await saveFile(file)

    localMaterials.value = updateNodeById(localMaterials.value, tempNodeId, { uploadProgress: 70 })
    emit('update:materials', localMaterials.value)

    const finalNode: MaterialNode = {
      ...tempNode,
      fileDataId: storageItem.fileDataId,
      isUploading: false,
      uploadProgress: undefined,
      fileSize: formatFileSize(storageItem.fileSize),
    }

    localMaterials.value = updateNodeById(localMaterials.value, tempNodeId, {
      fileDataId: storageItem.fileDataId,
      isUploading: false,
      uploadProgress: undefined,
    })

    emit('update:materials', localMaterials.value)

    if (storageItem.isPlaceholder) {
      console.warn(`File "${file.name}" exceeds size limit, stored as placeholder`)
    }

    return finalNode
  } catch (error) {
    console.error('File upload failed:', error)
    localMaterials.value = updateNodeById(localMaterials.value, tempNodeId, {
      isUploading: false,
      uploadProgress: undefined,
      uploadError: error instanceof Error ? error.message : '上传失败',
    })
    emit('update:materials', localMaterials.value)
    throw error
  }
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  const parentId = pendingParentId.value
  pendingParentId.value = null

  const fileArray = Array.from(files)

  for (const file of fileArray) {
    try {
      await processFileUpload(file, parentId)
    } catch (e) {
      console.error('Failed to upload file:', file.name, e)
    }
  }

  input.value = ''
}

const handleTreeDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
    isDragover.value = true
  }
}

const handleTreeDragLeave = () => {
  isDragover.value = false
}

const handleTreeDrop = async (e: DragEvent) => {
  e.preventDefault()
  isDragover.value = false

  if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return

  const files = Array.from(e.dataTransfer.files)
  for (const file of files) {
    try {
      await processFileUpload(file, null)
    } catch (e) {
      console.error('Failed to upload file:', file.name, e)
    }
  }
}

const handleUploadFiles = async (parentId: string, files: File[]) => {
  for (const file of files) {
    try {
      await processFileUpload(file, parentId)
    } catch (e) {
      console.error('Failed to upload file to folder:', file.name, e)
    }
  }
}

const handleBatchMove = () => {
  if (selectedNodeIds.value.size === 0) return
  moveTargetFolderId.value = null
  showMoveDialog.value = true
}

const confirmBatchMove = () => {
  const targetId = moveTargetFolderId.value
  const selectedIds = Array.from(selectedNodeIds.value)

  if (targetId !== null) {
    if (isDescendantOfAny(localMaterials.value, targetId, selectedIds)) {
      alert('不能将节点移动到自身或其后代节点下！')
      return
    }
  }

  const nodesToMove = getNodesByIds(localMaterials.value, selectedIds)
  const targetParent = targetId ? findNodeById(localMaterials.value, targetId) : null
  const targetSiblings = targetParent ? targetParent.children || [] : localMaterials.value

  for (const node of nodesToMove) {
    const duplicate = targetSiblings.find(s => s.name === node.name && s.id !== node.id)
    if (duplicate) {
      alert(`移动失败：目标位置已存在名为「${node.name}」的节点，请先重命名。`)
      return
    }
  }

  let result = localMaterials.value

  result = removeNodesByIds(result, selectedIds)

  for (const node of nodesToMove) {
    if (targetId === null) {
      result = [...result, { ...node }]
    } else {
      result = addChildNode(result, targetId, { ...node })
    }
  }

  localMaterials.value = result
  emit('update:materials', localMaterials.value)
  showMoveDialog.value = false
  moveTargetFolderId.value = null
}

const handleBatchRemark = () => {
  if (selectedNodeIds.value.size === 0) return
  batchRemark.value = ''
  showRemarkDialog.value = true
}

const confirmBatchRemark = () => {
  const remark = batchRemark.value.trim()
  if (!remark) {
    alert('请输入备注内容')
    return
  }

  const ids = Array.from(selectedNodeIds.value)
  localMaterials.value = updateNodesByIds(localMaterials.value, ids, { description: remark })
  emit('update:materials', localMaterials.value)
  showRemarkDialog.value = false
  batchRemark.value = ''
}

const handleBatchExport = (format: 'excel' | 'pdf') => {
  if (selectedNodeIds.value.size === 0) return
  emit('batch-export', Array.from(selectedNodeIds.value), format)
  showExportMenu.value = false
}

const handleDragStart = (nodeId: string) => {
  draggingNodeId.value = nodeId
}

const handleDragOver = () => {}

const handleDrop = (targetId: string | null, position: 'inside' | 'before' | 'after') => {
  if (!draggingNodeId.value) return
  if (draggingNodeId.value === targetId) return
  if (targetId && isDescendant(localMaterials.value, draggingNodeId.value, targetId)) return

  const sourceNode = findNodeById(localMaterials.value, draggingNodeId.value)
  if (!sourceNode) return

  let result = removeNodeById(localMaterials.value, draggingNodeId.value)

  if (position === 'inside' || targetId === null) {
    result = addChildNode(result, targetId, sourceNode)
  } else {
    const findParentAndSiblings = (
      nodes: MaterialNode[],
      id: string,
      parent: MaterialNode | null = null
    ): { parent: MaterialNode | null; siblings: MaterialNode[] } | null => {
      if (nodes.some(n => n.id === id)) {
        return { parent, siblings: nodes }
      }
      for (const node of nodes) {
        if (node.children) {
          const found = findParentAndSiblings(node.children, id, node)
          if (found) return found
        }
      }
      return null
    }

    const info = findParentAndSiblings(result, targetId)
    if (!info) return

    const { parent, siblings } = info
    const targetIndex = siblings.findIndex(n => n.id === targetId)
    const insertIndex = position === 'before' ? targetIndex : targetIndex + 1
    const newSiblings = [...siblings]
    newSiblings.splice(insertIndex, 0, sourceNode)

    if (parent) {
      result = updateNodeById(result, parent.id, { children: newSiblings })
    } else {
      result = newSiblings
    }
  }

  localMaterials.value = result
  emit('update:materials', localMaterials.value)
  draggingNodeId.value = null
}

const setSelectedNode = (node: MaterialNode) => {
  selectedNodeId.value = node.id
  emit('select', node)
}

const setSelectedNodeId = (nodeId: string) => {
  selectedNodeId.value = nodeId
}

const scrollToNodeId = (nodeId: string): boolean => {
  const el = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null
  if (el && el.scrollIntoView) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    return true
  }
  return false
}

const flashHighlightNodeId = (nodeId: string): boolean => {
  const el = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null
  if (!el) return false

  el.classList.add('bg-yellow-200', 'text-yellow-900', 'border-yellow-400', 'animate-pulse')
  el.classList.remove('border-transparent')

  window.setTimeout(() => {
    el.classList.remove('bg-yellow-200', 'text-yellow-900', 'border-yellow-400', 'animate-pulse')
    el.classList.add('border-transparent')
  }, 2000)

  return true
}

defineExpose({
  getMaterials: () => localMaterials.value,
  getFilteredMaterials: () => filteredMaterials.value,
  getFilterOptions: () => filterOptions.value,
  getIsFilterActive: () => isFilterActive.value,
  setSelectedNode,
  setSelectedNodeId,
  getSelectedIds: () => Array.from(selectedNodeIds.value),
  getSelectedNodes: () => selectedNodes.value,
  scrollToNodeId,
  flashHighlightNodeId,
})
</script>

<template>
  <div class="h-full flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm">
    <div
      v-if="multiSelectMode && selectedNodeIds.size > 0 && permissions.canBatchOperate"
      class="flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-100"
    >
      <div class="flex items-center gap-3">
        <span class="text-sm font-medium text-blue-700">
          已选择 {{ selectedNodeIds.size }} 项
          <span v-if="selectedFileCount > 0" class="text-blue-600">
            （{{ selectedFileCount }} 文件
            <span v-if="selectedFolderCount > 0">, {{ selectedFolderCount }} 文件夹</span>）
          </span>
          <span v-else-if="selectedFolderCount > 0" class="text-blue-600">
            （{{ selectedFolderCount }} 文件夹）
          </span>
        </span>
      </div>
      <div class="flex items-center gap-1.5">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white text-gray-600 rounded-md hover:bg-gray-50 border border-gray-200 transition-colors"
          @click="selectAllVisible"
        >
          <CheckSquare class="w-3.5 h-3.5" />
          全选
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white text-gray-600 rounded-md hover:bg-gray-50 border border-gray-200 transition-colors"
          @click="clearSelection"
        >
          <Square class="w-3.5 h-3.5" />
          清空
        </button>
        <div class="w-px h-5 bg-gray-200 mx-1"></div>
        <button
          v-if="permissions.canDeleteMaterial"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-md hover:bg-red-100 border border-red-200 transition-colors"
          @click="handleBatchDelete"
        >
          <Trash2 class="w-3.5 h-3.5" />
          批量删除
        </button>
        <button
          v-if="permissions.canMoveMaterial"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-50 text-amber-600 rounded-md hover:bg-amber-100 border border-amber-200 transition-colors"
          @click="handleBatchMove"
        >
          <ArrowRightLeft class="w-3.5 h-3.5" />
          批量移动
        </button>
        <button
          v-if="permissions.canEditMaterial"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 border border-purple-200 transition-colors"
          @click="handleBatchRemark"
        >
          <MessageSquare class="w-3.5 h-3.5" />
          批量备注
        </button>
        <div v-if="permissions.canExportExcel || permissions.canExportPdf" class="relative">
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-50 text-green-600 rounded-md hover:bg-green-100 border border-green-200 transition-colors"
            @click="showExportMenu = !showExportMenu"
          >
            <FileDown class="w-3.5 h-3.5" />
            批量导出
          </button>
          <div
            v-if="showExportMenu"
            class="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30"
          >
            <button
              v-if="permissions.canExportExcel"
              class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
              @click="handleBatchExport('excel')"
            >
              <FileSpreadsheet class="w-4 h-4 text-green-600" />
              导出 Excel
            </button>
            <button
              v-if="permissions.canExportPdf"
              class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
              @click="handleBatchExport('pdf')"
            >
              <FileText class="w-4 h-4 text-red-600" />
              导出 PDF
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <div class="flex items-center gap-2">
        <button
          v-if="permissions.canCreateFolder"
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          @click="addRootFolder"
        >
          <FolderPlus class="w-4 h-4" />
          新建文件夹
        </button>
        <button
          v-if="permissions.canUploadMaterial"
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
          @click="addRootFile"
        >
          <FilePlus class="w-4 h-4" />
          新增文件
        </button>
      </div>
      <div class="flex items-center gap-1">
        <button
          v-if="permissions.canBatchOperate"
          class="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-colors"
          :class="multiSelectMode ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'"
          :title="multiSelectMode ? '退出多选模式' : '进入多选模式'"
          @click="toggleMultiSelectMode"
        >
          <ListChecks class="w-4 h-4" />
          <span class="text-xs">{{ multiSelectMode ? '多选中' : '多选' }}</span>
        </button>
        <button
          class="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          title="刷新"
        >
          <RotateCcw class="w-4 h-4" />
        </button>
        <button
          class="p-2 rounded-lg transition-colors relative"
          :class="isFilterActive ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'"
          title="筛选"
          @click="toggleFilterPanel"
        >
          <Filter class="w-4 h-4" />
          <span
            v-if="isFilterActive"
            class="absolute top-0.5 right-0.5 w-2 h-2 bg-blue-500 rounded-full"
          ></span>
        </button>
      </div>
    </div>

    <div class="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
      <div class="flex-1 relative">
        <input
          v-model="filterOptions.nameKeyword"
          type="text"
          placeholder="搜索材料名称..."
          class="w-full pl-3 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          v-if="filterOptions.nameKeyword"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
          @click="filterOptions.nameKeyword = ''"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
      <button
        class="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
        :class="{ 'bg-gray-100': showFilterPanel }"
        @click="toggleFilterPanel"
      >
        <ChevronDown v-if="!showFilterPanel" class="w-4 h-4" />
        <ChevronUp v-else class="w-4 h-4" />
      </button>
    </div>

    <div
      v-if="showFilterPanel"
      class="px-4 py-3 border-b border-gray-100 bg-gray-50 space-y-3"
    >
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-gray-500 mb-1">节点类型</label>
          <select
            v-model="filterOptions.nodeType"
            class="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部</option>
            <option value="folder">文件夹</option>
            <option value="file">文件</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">文件大小</label>
          <select
            v-model="filterOptions.hasFileSize"
            class="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部</option>
            <option value="yes">有大小</option>
            <option value="no">无大小</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-xs text-gray-500 mb-1">上传人</label>
        <select
          v-model="filterOptions.uploader"
          class="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部</option>
          <option v-for="u in allUploaders" :key="u" :value="u">{{ u }}</option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-gray-500 mb-1">开始日期</label>
          <input
            v-model="filterOptions.uploadDateFrom"
            type="date"
            class="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">结束日期</label>
          <input
            v-model="filterOptions.uploadDateTo"
            type="date"
            class="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div class="flex justify-end">
        <button
          class="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
          @click="clearFilters"
        >
          清空筛选
        </button>
      </div>
    </div>

    <div
      class="flex-1 overflow-y-auto p-3 relative"
      @dragover="handleTreeDragOver"
      @dragleave="handleTreeDragLeave"
      @drop="handleTreeDrop"
    >
      <div
        v-if="isDragover"
        class="absolute inset-0 z-10 flex items-center justify-center bg-blue-50/90 border-2 border-dashed border-blue-400 rounded-lg pointer-events-none"
      >
        <div class="text-center">
          <Upload class="w-12 h-12 text-blue-400 mx-auto mb-2" />
          <p class="text-sm font-medium text-blue-600">释放文件以上传</p>
          <p class="text-xs text-blue-500 mt-1">文件将上传到根目录</p>
        </div>
      </div>
      <MaterialTreeItem
        :nodes="filteredMaterials"
        :selected-node-id="selectedNodeId"
        :matched-node-ids="matchedNodeIds"
        :multi-select-mode="multiSelectMode"
        :selected-node-ids="selectedNodeIds"
        @select="handleSelect"
        @toggle-select="handleToggleSelect"
        @toggle-expand="toggleExpand"
        @add="handleAdd"
        @rename="handleRename"
        @delete="handleDelete"
        @drag-start="handleDragStart"
        @drag-over="handleDragOver"
        @drop="handleDrop"
        @upload-files="handleUploadFiles"
      />
    </div>

    <input
      ref="fileInputRef"
      type="file"
      multiple
      class="hidden"
      @change="handleFileSelect"
    />

    <Teleport to="body">
      <div
        v-if="showMoveDialog"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="showMoveDialog = false"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="text-base font-semibold text-gray-900">批量移动到文件夹</h3>
            <button
              class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              @click="showMoveDialog = false"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
          <div class="px-5 py-4">
            <p class="text-sm text-gray-600 mb-3">
              已选择 {{ selectedNodeIds.size }} 项，请选择目标文件夹（选择根目录则移动到顶层）
            </p>
            <div class="space-y-1 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
              <button
                class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors"
                :class="moveTargetFolderId === null ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'"
                @click="moveTargetFolderId = null"
              >
                <FolderOpen class="w-4 h-4 text-yellow-500" />
                <span>根目录</span>
              </button>
              <button
                v-for="folder in availableMoveTargets"
                :key="folder.id"
                class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors"
                :class="moveTargetFolderId === folder.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'"
                @click="moveTargetFolderId = folder.id"
              >
                <Folder class="w-4 h-4 text-yellow-500" />
                <span class="truncate">{{ folder.name }}</span>
                <span class="text-xs text-gray-400 ml-auto flex-shrink-0">
                  {{ getNodePath(localMaterials, folder.id) }}
                </span>
              </button>
              <div
                v-if="availableMoveTargets.length === 0"
                class="px-3 py-4 text-center text-sm text-gray-400"
              >
                没有可用的目标文件夹
              </div>
            </div>
          </div>
          <div class="px-5 py-4 bg-gray-50 flex items-center justify-end gap-2">
            <button
              class="px-4 py-2 text-sm text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
              @click="showMoveDialog = false"
            >
              取消
            </button>
            <button
              class="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              @click="confirmBatchMove"
            >
              确认移动
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="showRemarkDialog"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="showRemarkDialog = false"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="text-base font-semibold text-gray-900">批量设置备注</h3>
            <button
              class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              @click="showRemarkDialog = false"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
          <div class="px-5 py-4">
            <p class="text-sm text-gray-600 mb-3">
              将为选中的 {{ selectedNodeIds.size }} 项设置相同备注
            </p>
            <textarea
              v-model="batchRemark"
              rows="5"
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="请输入备注内容..."
            ></textarea>
          </div>
          <div class="px-5 py-4 bg-gray-50 flex items-center justify-end gap-2">
            <button
              class="px-4 py-2 text-sm text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
              @click="showRemarkDialog = false"
            >
              取消
            </button>
            <button
              class="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!batchRemark.trim()"
              @click="confirmBatchRemark"
            >
              确认设置
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <div
      v-if="showExportMenu"
      class="fixed inset-0 z-20"
      @click="showExportMenu = false"
    ></div>
  </div>
</template>
