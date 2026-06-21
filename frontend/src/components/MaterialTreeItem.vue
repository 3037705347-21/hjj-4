<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'

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
  FileImage,
  FileSpreadsheet,
  File,
  FileArchive,
  Music,
  Video,
  FileType,
  Loader2,
  AlertTriangle,
  Upload,
} from 'lucide-vue-next'
import type { MaterialNode } from '@/types'
import { MaterialNodeType } from '@/types'
import { getFileIconType } from '@/utils/fileStorage'
import { usePermissions } from '@/composables/usePermissions'

const permissions = usePermissions()

const nodeRefs = ref<Map<string, HTMLElement>>(new Map())

const flashingNodeId = ref<string | null>(null)
const flashingTimers = ref<Map<string, number>>(new Map())

const setNodeRef = (el: HTMLElement | null, nodeId: string) => {
  if (el) {
    nodeRefs.value.set(nodeId, el)
  } else {
    nodeRefs.value.delete(nodeId)
  }
}

const getNodeEl = (nodeId: string): HTMLElement | null => {
  return nodeRefs.value.get(nodeId) || null
}

const triggerFlash = (nodeId: string) => {
  const existingTimer = flashingTimers.value.get(nodeId)
  if (existingTimer) {
    clearTimeout(existingTimer)
  }
  flashingNodeId.value = nodeId
  const timer = window.setTimeout(() => {
    flashingNodeId.value = null
    flashingTimers.value.delete(nodeId)
  }, 2000)
  flashingTimers.value.set(nodeId, timer)
}

const isFlashing = (nodeId: string) => flashingNodeId.value === nodeId

defineExpose({
  getNodeEl,
  triggerFlash,
})

const emit = defineEmits<{
  (e: 'select', node: MaterialNode, ctrlKey?: boolean, shiftKey?: boolean): void
  (e: 'toggleSelect', nodeId: string): void
  (e: 'toggleExpand', nodeId: string): void
  (e: 'add', parentId: string | null, type: MaterialNodeType): void
  (e: 'rename', node: MaterialNode): void
  (e: 'delete', node: MaterialNode): void
  (e: 'dragStart', nodeId: string): void
  (e: 'dragOver', nodeId: string, position: 'inside' | 'before' | 'after'): void
  (e: 'drop', targetId: string | null, position: 'inside' | 'before' | 'after'): void
  (e: 'uploadFiles', parentId: string | null, files: File[]): void
}>()

interface Props {
  nodes: MaterialNode[]
  selectedNodeId: string | null
  matchedNodeIds?: Set<string>
  level?: number
  multiSelectMode?: boolean
  selectedNodeIds?: Set<string>
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
  matchedNodeIds: () => new Set<string>(),
  multiSelectMode: false,
  selectedNodeIds: () => new Set<string>(),
})

const dragOverState = ref<{ nodeId: string | null; position: 'inside' | 'before' | 'after' | null }>({
  nodeId: null,
  position: null,
})

const isFileDragover = ref(false)

const getFileIcon = (node: MaterialNode) => {
  if (node.type !== MaterialNodeType.FILE) return null
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

const getFileIconColor = (node: MaterialNode) => {
  if (node.type !== MaterialNodeType.FILE) return 'text-blue-500'
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

const handleFileDrop = async (e: DragEvent, node: MaterialNode) => {
  e.preventDefault()
  e.stopPropagation()
  isFileDragover.value = false
  dragOverState.value = { nodeId: null, position: null }

  if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return
  if (node.type !== MaterialNodeType.FOLDER) return

  const files = Array.from(e.dataTransfer.files)
  emit('uploadFiles', node.id, files)
}

const handleFileDragOver = (e: DragEvent, node: MaterialNode) => {
  if (node.type !== MaterialNodeType.FOLDER) return
  if (!e.dataTransfer?.types.includes('Files')) return

  e.preventDefault()
  isFileDragover.value = true
  e.dataTransfer.dropEffect = 'copy'
}

const handleFileDragLeave = () => {
  isFileDragover.value = false
}

const handleToggle = (e: Event, node: MaterialNode) => {
  e.stopPropagation()
  if (node.type === MaterialNodeType.FOLDER) {
    emit('toggleExpand', node.id)
  }
}

const handleSelect = (e: MouseEvent, node: MaterialNode) => {
  if (props.multiSelectMode) {
    emit('select', node, e.ctrlKey || e.metaKey, e.shiftKey)
  } else {
    emit('select', node)
  }
}

const handleCheckboxClick = (e: Event, nodeId: string) => {
  e.stopPropagation()
  emit('toggleSelect', nodeId)
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

const handleRootDrop = async (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  const hasFiles = e.dataTransfer?.types.includes('Files')
  if (hasFiles && permissions.canUploadMaterial) {
    const files = Array.from(e.dataTransfer!.files)
    if (files.length > 0) {
      emit('uploadFiles', null, files)
    }
  } else if (!hasFiles && permissions.canMoveMaterial) {
    emit('drop', null, 'inside')
  }
  dragOverState.value = { nodeId: null, position: null }
}

const isSelected = (nodeId: string) => {
  if (props.multiSelectMode) {
    return props.selectedNodeIds?.has(nodeId) || false
  }
  return props.selectedNodeId === nodeId
}

const isMatched = (nodeId: string) => props.matchedNodeIds?.has(nodeId)

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
    @dragover="(e) => {
      if (level !== 0) return
      const hasFiles = e.dataTransfer?.types.includes('Files')
      if (hasFiles && permissions.canUploadMaterial) {
        e.preventDefault()
      } else if (!hasFiles && permissions.canMoveMaterial) {
        e.preventDefault()
      }
    }"
    @drop="(e) => {
      if (level !== 0) return
      const hasFiles = e.dataTransfer?.types.includes('Files')
      if (hasFiles && permissions.canUploadMaterial) {
        handleRootDrop(e)
      } else if (!hasFiles && permissions.canMoveMaterial) {
        handleRootDrop(e)
      }
    }"
  >
    <div
      v-for="node in nodes"
      :key="node.id"
    >
      <div
        :ref="(el) => setNodeRef(el as HTMLElement | null, node.id)"
        :data-node-id="node.id"
        class="group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-all border-2 border-transparent relative"
        :class="[
          isFlashing(node.id)
            ? 'bg-yellow-200 text-yellow-900 border-yellow-400 animate-pulse'
            : isSelected(node.id)
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : isMatched(node.id)
            ? 'bg-yellow-50 text-yellow-800'
            : 'hover:bg-gray-50',
          getDropClass(node),
          node.isUploading ? 'opacity-70' : '',
          node.type === MaterialNodeType.FOLDER && isFileDragover && dragOverState.nodeId === node.id ? 'ring-2 ring-green-500' : '',
        ]"
        :style="{ paddingLeft: `${level * 20 + 8}px` }"
        @click="(e) => { if (!node.isUploading) handleSelect(e, node) }"
        :draggable="!node.isUploading && permissions.canMoveMaterial"
        @dragstart="(e) => { if (!e.dataTransfer?.types.includes('Files') && permissions.canMoveMaterial) handleDragStart(e, node); else if (!permissions.canMoveMaterial) e.preventDefault() }"
        @dragover="(e) => {
          if (!permissions.canMoveMaterial && !permissions.canUploadMaterial) return
          if (e.dataTransfer?.types.includes('Files') && permissions.canUploadMaterial) {
            handleFileDragOver(e, node)
          } else if (permissions.canMoveMaterial) {
            handleDragOver(e, node)
          }
        }"
        @dragleave="(e) => {
          if (e.dataTransfer?.types.includes('Files')) {
            handleFileDragLeave()
          } else {
            handleDragLeave()
          }
        }"
        @drop="(e) => {
          if (e.dataTransfer?.types.includes('Files') && permissions.canUploadMaterial) {
            handleFileDrop(e, node)
          } else if (permissions.canMoveMaterial) {
            handleDrop(e, node)
          } else {
            e.preventDefault()
          }
        }"
      >
        <div
          v-if="node.isUploading"
          class="absolute inset-0 bg-white/50 flex items-center px-2 z-10 rounded-md"
        >
          <Loader2 class="w-4 h-4 text-blue-500 animate-spin flex-shrink-0 mr-2" />
          <span class="text-xs text-blue-600 truncate flex-1">
            上传中{{ node.uploadProgress ? ` ${node.uploadProgress}%` : '' }}
          </span>
        </div>

        <div
          v-if="node.uploadError"
          class="absolute inset-0 bg-red-50/80 flex items-center px-2 z-10 rounded-md"
          :title="node.uploadError"
        >
          <AlertTriangle class="w-4 h-4 text-red-500 flex-shrink-0 mr-2" />
          <span class="text-xs text-red-600 truncate flex-1">上传失败</span>
          <button
            v-if="permissions.canDeleteMaterial"
            class="p-0.5 hover:bg-red-100 rounded text-red-500 flex-shrink-0"
            @click.stop="$emit('delete', node)"
            title="删除"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          v-if="multiSelectMode && !node.isUploading && !node.uploadError"
          class="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 transition-colors flex-shrink-0"
          @click="(e) => handleCheckboxClick(e, node.id)"
        >
          <div
            class="w-4 h-4 border-2 rounded transition-colors flex items-center justify-center"
            :class="isSelected(node.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'"
          >
            <svg
              v-if="isSelected(node.id)"
              class="w-3 h-3 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </button>
        <button
          v-if="node.type === MaterialNodeType.FOLDER && !node.isUploading && !node.uploadError"
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
        <span v-else-if="!node.isUploading && !node.uploadError" class="w-5 flex-shrink-0"></span>
        <span v-else class="w-5 flex-shrink-0"></span>

        <FolderOpen
          v-if="node.type === MaterialNodeType.FOLDER && node.expanded && !node.isUploading && !node.uploadError"
          class="w-5 h-5 text-yellow-500 flex-shrink-0"
        />
        <Folder
          v-else-if="node.type === MaterialNodeType.FOLDER && !node.isUploading && !node.uploadError"
          class="w-5 h-5 text-yellow-500 flex-shrink-0"
        />
        <component
          v-else-if="!node.isUploading && !node.uploadError"
          :is="getFileIcon(node)"
          :class="['w-5 h-5 flex-shrink-0', getFileIconColor(node)]"
        />

        <span class="flex-1 truncate text-sm font-medium">
          {{ node.name }}
        </span>

        <span
          v-if="node.type === MaterialNodeType.FILE && !node.isUploading && !node.uploadError"
          class="text-xs text-gray-400 flex-shrink-0 hidden sm:inline"
        >
          {{ node.fileSize }}
        </span>

        <span
          v-if="node.type === MaterialNodeType.FILE && node.fileDataId && !node.isUploading && !node.uploadError"
          class="text-xs text-green-500 flex-shrink-0 hidden sm:inline"
          title="文件已存储"
        >
          ●
        </span>
        <span
          v-else-if="node.type === MaterialNodeType.FILE && !node.fileDataId && !node.isUploading && !node.uploadError"
          class="text-xs text-amber-500 flex-shrink-0 hidden sm:inline"
          title="仅存储元数据"
        >
          ○
        </span>

        <div class="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
          <button
            v-if="node.type === MaterialNodeType.FOLDER && permissions.canCreateFolder"
            class="p-1 rounded hover:bg-blue-100 text-gray-500 hover:text-blue-600 transition-colors"
            title="新建文件夹"
            @click="(e) => handleAdd(e, node.id, MaterialNodeType.FOLDER)"
          >
            <Plus class="w-3.5 h-3.5" />
          </button>
          <button
            v-if="node.type === MaterialNodeType.FOLDER && permissions.canUploadMaterial"
            class="p-1 rounded hover:bg-green-100 text-gray-500 hover:text-green-600 transition-colors"
            title="新增文件"
            @click="(e) => handleAdd(e, node.id, MaterialNodeType.FILE)"
          >
            <FileText class="w-3.5 h-3.5" />
          </button>
          <button
            v-if="permissions.canRenameMaterial"
            class="p-1 rounded hover:bg-yellow-100 text-gray-500 hover:text-yellow-600 transition-colors"
            title="重命名"
            @click="(e) => handleRename(e, node)"
          >
            <Pencil class="w-3.5 h-3.5" />
          </button>
          <button
            v-if="permissions.canDeleteMaterial"
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
        :matched-node-ids="matchedNodeIds"
        :multi-select-mode="multiSelectMode"
        :selected-node-ids="selectedNodeIds"
        :level="level + 1"
        @select="(n, c, s) => emit('select', n, c, s)"
        @toggle-select="(id) => emit('toggleSelect', id)"
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
