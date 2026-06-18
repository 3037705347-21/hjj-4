<script setup lang="ts">
import { ref } from 'vue'

defineOptions({
  name: 'MaterialTreeItem',
})
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-vue-next'
import type { MaterialNode } from '@/types'
import { MaterialNodeType } from '@/types'

interface Props {
  nodes: MaterialNode[]
  selectedNodeId: string | null
  level?: number
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
})

const emit = defineEmits<{
  (e: 'select', node: MaterialNode): void
  (e: 'toggleExpand', nodeId: string): void
  (e: 'add', parentId: string | null, type: MaterialNodeType): void
  (e: 'rename', node: MaterialNode): void
  (e: 'delete', node: MaterialNode): void
  (e: 'dragStart', nodeId: string): void
  (e: 'dragOver', nodeId: string, position: 'inside' | 'before' | 'after'): void
  (e: 'drop', targetId: string | null, position: 'inside' | 'before' | 'after'): void
}>()

const dragOverState = ref<{ nodeId: string | null; position: 'inside' | 'before' | 'after' | null }>({
  nodeId: null,
  position: null,
})

const handleToggle = (e: Event, node: MaterialNode) => {
  e.stopPropagation()
  if (node.type === MaterialNodeType.FOLDER) {
    emit('toggleExpand', node.id)
  }
}

const handleSelect = (node: MaterialNode) => {
  emit('select', node)
}

const handleAdd = (e: Event, parentId: string | null, type: MaterialNodeType) => {
  e.stopPropagation()
  emit('add', parentId, type)
}

const handleRename = (e: Event, node: MaterialNode) => {
  e.stopPropagation()
  emit('rename', node)
}

const handleDelete = (e: Event, node: MaterialNode) => {
  e.stopPropagation()
  emit('delete', node)
}

const handleDragStart = (e: DragEvent, node: MaterialNode) => {
  e.dataTransfer?.setData('text/plain', node.id)
  e.dataTransfer!.effectAllowed = 'move'
  emit('dragStart', node.id)
}

const handleDragOver = (e: DragEvent, node: MaterialNode) => {
  e.preventDefault()
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const y = e.clientY - rect.top
  const height = rect.height

  let position: 'inside' | 'before' | 'after'
  if (y < height * 0.25) {
    position = 'before'
  } else if (y > height * 0.75) {
    position = 'after'
  } else {
    position = 'inside'
  }

  if (node.type === MaterialNodeType.FILE && position === 'inside') {
    position = y < height * 0.5 ? 'before' : 'after'
  }

  dragOverState.value = { nodeId: node.id, position }
  emit('dragOver', node.id, position)
}

const handleDragLeave = () => {
  dragOverState.value = { nodeId: null, position: null }
}

const handleDrop = (e: DragEvent, node: MaterialNode) => {
  e.preventDefault()
  const { position } = dragOverState.value
  if (position) {
    emit('drop', node.id, position)
  }
  dragOverState.value = { nodeId: null, position: null }
}

const handleRootDrop = (e: DragEvent) => {
  e.preventDefault()
  emit('drop', null, 'inside')
  dragOverState.value = { nodeId: null, position: null }
}

const isSelected = (nodeId: string) => props.selectedNodeId === nodeId

const getDropClass = (node: MaterialNode) => {
  if (dragOverState.value.nodeId !== node.id) return ''
  const pos = dragOverState.value.position
  if (pos === 'before') return 'border-t-2 border-blue-500'
  if (pos === 'after') return 'border-b-2 border-blue-500'
  if (pos === 'inside') return 'ring-2 ring-blue-500 ring-inset bg-blue-50'
  return ''
}
</script>

<template>
  <div
    class="select-none"
    @dragover="(e) => { if (level === 0) e.preventDefault() }"
    @drop="(e) => { if (level === 0) handleRootDrop(e) }"
  >
    <div
      v-for="node in nodes"
      :key="node.id"
    >
      <div
        class="group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-all border-2 border-transparent"
        :class="[
          isSelected(node.id)
            ? 'bg-blue-50 text-blue-700'
            : 'hover:bg-gray-50',
          getDropClass(node),
        ]"
        :style="{ paddingLeft: `${level * 20 + 8}px` }"
        @click="handleSelect(node)"
        draggable="true"
        @dragstart="(e) => handleDragStart(e, node)"
        @dragover="(e) => handleDragOver(e, node)"
        @dragleave="handleDragLeave"
        @drop="(e) => handleDrop(e, node)"
      >
        <button
          v-if="node.type === MaterialNodeType.FOLDER"
          class="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 transition-colors flex-shrink-0"
          @click="(e) => handleToggle(e, node)"
        >
          <ChevronRight
            v-if="!node.expanded"
            class="w-4 h-4 text-gray-500"
          />
          <ChevronDown
            v-else
            class="w-4 h-4 text-gray-500"
          />
        </button>
        <span v-else class="w-5 flex-shrink-0"></span>

        <FolderOpen
          v-if="node.type === MaterialNodeType.FOLDER && node.expanded"
          class="w-5 h-5 text-yellow-500 flex-shrink-0"
        />
        <Folder
          v-else-if="node.type === MaterialNodeType.FOLDER"
          class="w-5 h-5 text-yellow-500 flex-shrink-0"
        />
        <FileText
          v-else
          class="w-5 h-5 text-blue-500 flex-shrink-0"
        />

        <span class="flex-1 truncate text-sm font-medium">
          {{ node.name }}
        </span>

        <span
          v-if="node.type === MaterialNodeType.FILE"
          class="text-xs text-gray-400 flex-shrink-0 hidden sm:inline"
        >
          {{ node.fileSize }}
        </span>

        <div class="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
          <button
            v-if="node.type === MaterialNodeType.FOLDER"
            class="p-1 rounded hover:bg-blue-100 text-gray-500 hover:text-blue-600 transition-colors"
            title="新建文件夹"
            @click="(e) => handleAdd(e, node.id, MaterialNodeType.FOLDER)"
          >
            <Plus class="w-3.5 h-3.5" />
          </button>
          <button
            v-if="node.type === MaterialNodeType.FOLDER"
            class="p-1 rounded hover:bg-green-100 text-gray-500 hover:text-green-600 transition-colors"
            title="新增文件"
            @click="(e) => handleAdd(e, node.id, MaterialNodeType.FILE)"
          >
            <FileText class="w-3.5 h-3.5" />
          </button>
          <button
            class="p-1 rounded hover:bg-yellow-100 text-gray-500 hover:text-yellow-600 transition-colors"
            title="重命名"
            @click="(e) => handleRename(e, node)"
          >
            <Pencil class="w-3.5 h-3.5" />
          </button>
          <button
            class="p-1 rounded hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
            title="删除"
            @click="(e) => handleDelete(e, node)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <MaterialTreeItem
        v-if="node.type === MaterialNodeType.FOLDER && node.expanded && node.children"
        :nodes="node.children"
        :selected-node-id="selectedNodeId"
        :level="level + 1"
        @select="(n) => emit('select', n)"
        @toggle-expand="(id) => emit('toggleExpand', id)"
        @add="(pid, t) => emit('add', pid, t)"
        @rename="(n) => emit('rename', n)"
        @delete="(n) => emit('delete', n)"
        @drag-start="(id) => emit('dragStart', id)"
        @drag-over="(id, p) => emit('dragOver', id, p)"
        @drop="(tid, p) => emit('drop', tid, p)"
      />
    </div>

    <div
      v-if="level === 0 && nodes.length === 0"
      class="py-12 text-center text-gray-400"
    >
      <Folder class="w-12 h-12 mx-auto mb-2 opacity-50" />
      <p class="text-sm">暂无材料，点击上方按钮添加</p>
    </div>
  </div>
</template>
