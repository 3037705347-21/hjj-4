<script setup lang="ts">
import { ref } from 'vue'
import { FolderPlus, FilePlus, RotateCcw, Filter } from 'lucide-vue-next'
import MaterialTreeItem from './MaterialTreeItem.vue'
import type { MaterialNode } from '@/types'
import { MaterialNodeType } from '@/types'
import { generateId } from '@/mock/data'

interface Props {
  materials: MaterialNode[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:materials', materials: MaterialNode[]): void
  (e: 'select', node: MaterialNode | null): void
}>()

const localMaterials = ref<MaterialNode[]>([...props.materials])
const selectedNodeId = ref<string | null>(null)
const draggingNodeId = ref<string | null>(null)
const searchQuery = ref('')

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
  emit('select', node)
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

const findNodeById = (nodes: MaterialNode[], id: string): MaterialNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
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
          class="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          title="筛选"
        >
          <Filter class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="px-4 py-2 border-b border-gray-100">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索材料..."
        class="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <div class="flex-1 overflow-y-auto p-3">
      <MaterialTreeItem
        :nodes="localMaterials"
        :selected-node-id="selectedNodeId"
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
