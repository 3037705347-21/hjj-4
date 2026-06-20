<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search,
  X,
  Briefcase,
  Folder,
  FileText,
  User,
  ChevronRight,
} from 'lucide-vue-next'
import { useCasesStore, caseStatusMap } from '@/stores/cases'
import { useGlobalSearch } from '@/composables/useGlobalSearch'
import { getNodePath } from '@/utils/treeUtils'
import type { Case, MaterialNode } from '@/types'
import { MaterialNodeType } from '@/types'

const router = useRouter()
const store = useCasesStore()
const { isOpen, closeSearch } = useGlobalSearch()

const query = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const activeIndex = ref(-1)

interface CaseResult {
  type: 'case'
  caseItem: Case
  matchFields: string[]
}

interface MaterialResult {
  type: 'material'
  caseItem: Case
  node: MaterialNode
  path: string
}

type SearchResult = CaseResult | MaterialResult

const caseResults = computed<CaseResult[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []

  const results: CaseResult[] = []
  for (const c of store.cases) {
    const matchFields: string[] = []
    if (c.name.toLowerCase().includes(q)) matchFields.push('案件名称')
    if (c.caseNumber.toLowerCase().includes(q)) matchFields.push('案号')
    if (c.client.toLowerCase().includes(q)) matchFields.push('委托人')
    if (matchFields.length > 0) {
      results.push({ type: 'case', caseItem: c, matchFields })
    }
  }
  return results
})

const materialResults = computed<MaterialResult[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []

  const results: MaterialResult[] = []
  for (const c of store.cases) {
    const traverse = (nodes: MaterialNode[]) => {
      for (const node of nodes) {
        if (node.name.toLowerCase().includes(q)) {
          const path = getNodePath(c.materials, node.id)
          results.push({ type: 'material', caseItem: c, node, path })
        }
        if (node.children) {
          traverse(node.children)
        }
      }
    }
    traverse(c.materials)
  }
  return results.slice(0, 20)
})

const allResults = computed<SearchResult[]>(() => {
  return [...caseResults.value, ...materialResults.value]
})

watch(isOpen, (val) => {
  if (val) {
    query.value = ''
    activeIndex.value = -1
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

watch(query, () => {
  activeIndex.value = -1
})

const handleKeydown = (e: KeyboardEvent) => {
  if (!isOpen.value) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      isOpen.value = true
    }
    return
  }

  if (e.key === 'Escape') {
    e.preventDefault()
    closeSearch()
    return
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    closeSearch()
    return
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (allResults.value.length > 0) {
      activeIndex.value = (activeIndex.value + 1) % allResults.value.length
    }
    return
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (allResults.value.length > 0) {
      activeIndex.value = activeIndex.value <= 0
        ? allResults.value.length - 1
        : activeIndex.value - 1
    }
    return
  }

  if (e.key === 'Enter') {
    e.preventDefault()
    if (activeIndex.value >= 0 && activeIndex.value < allResults.value.length) {
      selectResult(allResults.value[activeIndex.value])
    }
    return
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const selectResult = (result: SearchResult) => {
  if (result.type === 'case') {
    closeSearch()
    router.push({ name: 'case-detail', params: { id: result.caseItem.id } })
  } else {
    closeSearch()
    router.push({
      name: 'case-detail',
      params: { id: result.caseItem.id },
      query: { highlight: result.node.id },
    })
  }
}

const highlightText = (text: string, q: string): string => {
  if (!q) return text
  const lowerText = text.toLowerCase()
  const lowerQ = q.toLowerCase()
  const idx = lowerText.indexOf(lowerQ)
  if (idx === -1) return text
  return text.substring(0, idx)
    + '<mark class="bg-yellow-200 text-yellow-900 rounded px-0.5">'
    + text.substring(idx, idx + q.length)
    + '</mark>'
    + text.substring(idx + q.length)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]"
    >
      <div
        class="fixed inset-0 bg-black/50 backdrop-blur-sm"
        @click="closeSearch"
      ></div>

      <div
        class="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
        style="max-height: 70vh;"
      >
        <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <Search class="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            placeholder="搜索案件名称、案号、委托人或材料名称..."
            class="flex-1 text-base bg-transparent focus:outline-none placeholder-gray-400"
          />
          <button
            class="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            @click="closeSearch"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div
          v-if="query.trim()"
          class="flex-1 overflow-y-auto"
        >
          <div v-if="allResults.length === 0" class="py-12 text-center">
            <Search class="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p class="text-sm text-gray-500">未找到匹配结果</p>
          </div>

          <template v-else>
            <div v-if="caseResults.length > 0">
              <div class="px-5 py-2.5 bg-gray-50 border-b border-gray-100">
                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  案件（{{ caseResults.length }}）
                </span>
              </div>
              <div
                v-for="(result, idx) in caseResults"
                :key="'case-' + result.caseItem.id"
                class="flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors border-b border-gray-50"
                :class="activeIndex === idx ? 'bg-blue-50' : 'hover:bg-gray-50'"
                @click="selectResult(result)"
                @mouseenter="activeIndex = idx"
              >
                <div class="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                  <Briefcase class="w-4 h-4 text-blue-600" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span
                      class="px-2 py-0.5 text-xs font-medium rounded-full border flex-shrink-0"
                      :class="caseStatusMap[result.caseItem.status].class"
                    >
                      {{ caseStatusMap[result.caseItem.status].label }}
                    </span>
                    <span class="text-xs text-gray-400 font-mono">{{ result.caseItem.caseNumber }}</span>
                    <span class="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">{{ result.caseItem.caseType }}</span>
                  </div>
                  <h4
                    class="text-sm font-semibold text-gray-900 truncate"
                    v-html="highlightText(result.caseItem.name, query)"
                  ></h4>
                  <div class="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span class="flex items-center gap-1">
                      <User class="w-3 h-3" />
                      <span v-html="highlightText(result.caseItem.client, query)"></span>
                    </span>
                    <span>{{ result.caseItem.responsibleLawyer }}</span>
                    <span>{{ result.caseItem.filingDate }}</span>
                  </div>
                </div>
                <ChevronRight class="w-4 h-4 text-gray-300 flex-shrink-0" />
              </div>
            </div>

            <div v-if="materialResults.length > 0">
              <div class="px-5 py-2.5 bg-gray-50 border-b border-gray-100">
                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  材料（{{ materialResults.length }}{{ materialResults.length >= 20 ? '+' : '' }}）
                </span>
              </div>
              <div
                v-for="(result, idx) in materialResults"
                :key="'mat-' + result.node.id"
                class="flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors border-b border-gray-50"
                :class="activeIndex === (caseResults.length + idx) ? 'bg-blue-50' : 'hover:bg-gray-50'"
                @click="selectResult(result)"
                @mouseenter="activeIndex = caseResults.length + idx"
              >
                <div
                  class="p-2 rounded-lg flex-shrink-0"
                  :class="result.node.type === MaterialNodeType.FOLDER ? 'bg-yellow-50' : 'bg-green-50'"
                >
                  <Folder v-if="result.node.type === MaterialNodeType.FOLDER" class="w-4 h-4 text-yellow-600" />
                  <FileText v-else class="w-4 h-4 text-green-600" />
                </div>
                <div class="flex-1 min-w-0">
                  <h4
                    class="text-sm font-semibold text-gray-900 truncate"
                    v-html="highlightText(result.node.name, query)"
                  ></h4>
                  <div class="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span class="truncate">{{ result.path || '根目录' }}</span>
                  </div>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded flex items-center gap-1">
                      <Briefcase class="w-3 h-3" />
                      {{ result.caseItem.name }}
                    </span>
                    <span class="text-xs text-gray-400 font-mono">{{ result.caseItem.caseNumber }}</span>
                  </div>
                </div>
                <ChevronRight class="w-4 h-4 text-gray-300 flex-shrink-0" />
              </div>
            </div>
          </template>
        </div>

        <div
          v-else
          class="py-10 text-center"
        >
          <Search class="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p class="text-sm text-gray-500">输入关键词开始搜索</p>
          <p class="text-xs text-gray-400 mt-1">搜索范围：案件名称、案号、委托人、材料名称</p>
        </div>

        <div class="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-4 text-xs text-gray-400">
          <span class="flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">↑↓</kbd>
            导航
          </span>
          <span class="flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">Enter</kbd>
            选择
          </span>
          <span class="flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">Esc</kbd>
            关闭
          </span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
