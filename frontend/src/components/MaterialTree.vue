<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { FolderPlus, FilePlus, RotateCcw, Filter, X, ChevronDown, ChevronUp } from 'lucide-vue-next'
import MaterialTreeItem from './MaterialTreeItem.vue'
import type { MaterialNode } from '@/types'
import { MaterialNodeType } from '@/types'
import { generateId } from '@/mock/data'
import { filterMaterialTree, getAllUploaders, countFiles, findNodeById } from '@/utils/treeUtils'
import type { FilterOptions } from '@/utils/treeUtils'

interface Props {
  materials: MaterialNode[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:materials', materials: MaterialNode[]): void
  (e: 'select', node: MaterialNode | null): void
  (e: 'filtered-count', counts: { files: number; folders: number }): void
}>()

const localMaterials = ref<MaterialNode[]>([...props.materials])
const selectedNodeId = ref<string | null>(null)
const draggingNodeId = ref<string | null>(null)
const showFilterPanel = ref(false)

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
  const newFile: MaterialNode = {
    id: generateId(),
    name: '新建文件',
    type: MaterialNodeType.FILE,
    uploadDate: new Date().toISOString().split('T')[0],
    uploader: '当前用户',
    fileSize: '0 KB',
    description: '',
  }
  localMaterials.value = [...localMaterials.value, newFile]
  emit('update:materials', localMaterials.value)
}

const handleSelect = (node: MaterialNode) => {
  selectedNodeId.value = node.id
  const originalNode = findNodeById(localMaterials.value, node.id)
  emit('select', originalNode || node)
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
}

const removeNodeById = (nodes: MaterialNode[], id: string): MaterialNode[] => {
  return nodes
    .filter(node => node.id !== id)
    .map(node => ({
      ...node,
      children: node.children ? removeNodeById(node.children, id) : undefined,
    }))
}

const addChildNode = (
  nodes: MaterialNode[],
  parentId: string | null,
  newNode: MaterialNode
): MaterialNode[] => {
  if (parentId === null) {
    return [...nodes, newNode]
  }
  return nodes.map(node => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...(node.children || []), newNode],
        expanded: true,
      }
    }
    if (node.children) {
      return { ...node, children: addChildNode(node.children, parentId, newNode) }
    }
    return node
  })
}

const updateNodeById = (
  nodes: MaterialNode[],
  id: string,
  updates: Partial<MaterialNode>
): MaterialNode[] => {
  return nodes.map(node => {
    if (node.id === id) {
      return { ...node, ...updates }
    }
    if (node.children) {
      return { ...node, children: updateNodeById(node.children, id, updates) }
    }
    return node
  })
}

const isDescendant = (nodes: MaterialNode[], ancestorId: string, descendantId: string): boolean => {
  const ancestor = findNodeById(nodes, ancestorId)
  if (!ancestor || !ancestor.children) return false
  const check = (children: MaterialNode[]): boolean => {
    for (const child of children) {
      if (child.id === descendantId) return true
      if (child.children && check(child.children)) return true
    }
    return false
  }
  return check(ancestor.children)
}

const handleAdd = (parentId: string | null, type: MaterialNodeType) => {
  const newNode: MaterialNode = type === MaterialNodeType.FOLDER
    ? {
        id: generateId(),
        name: '新建文件夹',
        type: MaterialNodeType.FOLDER,
        children: [],
        expanded: true,
      }
    : {
        id: generateId(),
        name: '新建文件',
        type: MaterialNodeType.FILE,
        uploadDate: new Date().toISOString().split('T')[0],
        uploader: '当前用户',
        fileSize: '0 KB',
        description: '',
      }

  localMaterials.value = addChildNode(localMaterials.value, parentId, newNode)
  emit('update:materials', localMaterials.value)
  selectedNodeId.value = newNode.id
  emit('select', newNode)
}

const handleRename = (node: MaterialNode) => {
  const newName = prompt('请输入新名称：', node.name)
  if (newName && newName.trim()) {
    localMaterials.value = updateNodeById(localMaterials.value, node.id, { name: newName.trim() })
    emit('update:materials', localMaterials.value)
  }
}

const handleDelete = (node: MaterialNode) => {
  if (confirm(`确定要删除「${node.name}」吗？${node.type === MaterialNodeType.FOLDER ? '文件夹内的所有内容也将被删除。' : ''}`)) {
    localMaterials.value = removeNodeById(localMaterials.value, node.id)
    if (selectedNodeId.value === node.id) {
      selectedNodeId.value = null
      emit('select', null)
    }
    emit('update:materials', localMaterials.value)
  }
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

defineExpose({
  getMaterials: () => localMaterials.value,
})
</script>

<template>
  <div class="h-full flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm">
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          @click="addRootFolder"
        >
          <FolderPlus class="w-4 h-4" />
          新建文件夹
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
          @click="addRootFile"
        >
          <FilePlus class="w-4 h-4" />
          新增文件
        </button>
      </div>
      <div class="flex items-center gap-1">
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

    <div class="flex-1 overflow-y-auto p-3">
      <MaterialTreeItem
        :nodes="filteredMaterials"
        :selected-node-id="selectedNodeId"
        :matched-node-ids="matchedNodeIds"
        @select="handleSelect"
        @toggle-expand="toggleExpand"
        @add="handleAdd"
        @rename="handleRename"
        @delete="handleDelete"
        @drag-start="handleDragStart"
        @drag-over="handleDragOver"
        @drop="handleDrop"
      />
    </div>
  </div>
</template>
