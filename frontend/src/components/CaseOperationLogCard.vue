<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  History,
  ChevronDown,
  ChevronUp,
  Filter,
  User,
  Clock,
} from 'lucide-vue-next'
import type { CaseOperationLog } from '@/types'
import { OperationType, operationTypeMap } from '@/types'
import { useCaseOperationLog } from '@/composables/useCaseOperationLog'

const props = defineProps<{
  caseId: string
}>()

const { getFilteredLogs, getLogs } = useCaseOperationLog(props.caseId)

const isExpanded = ref(true)
const filterType = ref<OperationType | 'all'>('all')

const filterOptions: Array<{ value: OperationType | 'all'; label: string; category: string }> = [
  { value: 'all', label: '全部', category: '' },
  ...Object.entries(operationTypeMap).map(([key, val]) => ({
    value: key as OperationType,
    label: val.label,
    category: val.category,
  })),
]

const materialFilterOptions = computed(() =>
  filterOptions.filter(o => o.value === 'all' || o.category === '材料操作')
)

const caseFilterOptions = computed(() =>
  filterOptions.filter(o => o.value === 'all' || o.category === '案件操作')
)

const filteredLogs = computed(() => getFilteredLogs(filterType.value))

const totalCount = computed(() => getLogs().length)

const displayLogs = computed(() => filteredLogs.value.slice(0, 50))

const hasMore = computed(() => filteredLogs.value.length > 50)

const showAll = ref(false)

const finalLogs = computed(() => {
  if (showAll.value) return filteredLogs.value
  return displayLogs.value
})

const formatTimestamp = (ts: string): string => {
  try {
    const d = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return '刚刚'
    if (diffMin < 60) return `${diffMin} 分钟前`
    if (diffHour < 24) return `${diffHour} 小时前`
    if (diffDay < 7) return `${diffDay} 天前`

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return ts
  }
}

const getFullTimestamp = (ts: string): string => {
  try {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
  } catch {
    return ts
  }
}
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <button
      class="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      @click="isExpanded = !isExpanded"
    >
      <div class="flex items-center gap-3">
        <div class="p-2 bg-slate-50 rounded-lg">
          <History class="w-5 h-5 text-slate-600" />
        </div>
        <div class="text-left">
          <h2 class="text-sm font-semibold text-gray-900">操作日志</h2>
          <p class="text-xs text-gray-500 mt-0.5">
            案件级操作记录 · 共 {{ totalCount }} 条
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="filterType !== 'all'" class="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
          {{ operationTypeMap[filterType]?.label || '全部' }}
        </span>
        <ChevronUp v-if="isExpanded" class="w-5 h-5 text-gray-400" />
        <ChevronDown v-else class="w-5 h-5 text-gray-400" />
      </div>
    </button>

    <div v-if="isExpanded" class="border-t border-gray-100">
      <div class="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
        <div class="flex items-center gap-2 flex-wrap">
          <div class="flex items-center gap-1.5 text-xs text-gray-500 mr-2">
            <Filter class="w-3.5 h-3.5" />
            <span>筛选：</span>
          </div>
          <button
            v-for="opt in materialFilterOptions"
            :key="'mat-' + opt.value"
            class="px-2.5 py-1 text-xs rounded-full border transition-colors"
            :class="[
              filterType === opt.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
            ]"
            @click="filterType = opt.value"
          >
            {{ opt.label }}
          </button>
          <span class="text-gray-300 mx-1">|</span>
          <button
            v-for="opt in caseFilterOptions"
            :key="'case-' + opt.value"
            class="px-2.5 py-1 text-xs rounded-full border transition-colors"
            :class="[
              filterType === opt.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
            ]"
            @click="filterType = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div v-if="finalLogs.length === 0" class="px-5 py-10 text-center">
        <History class="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p class="text-sm text-gray-400">暂无操作记录</p>
        <p class="text-xs text-gray-300 mt-1">案件操作将自动记录在此处</p>
      </div>

      <div v-else class="max-h-[400px] overflow-y-auto">
        <div
          v-for="log in finalLogs"
          :key="log.id"
          class="px-5 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors"
        >
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0 pt-1">
              <div
                class="w-2.5 h-2.5 rounded-full"
                :class="operationTypeMap[log.operationType]?.dotClass || 'bg-gray-400'"
              ></div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span
                  class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border"
                  :class="operationTypeMap[log.operationType]?.class || 'bg-gray-100 text-gray-600 border-gray-200'"
                >
                  {{ operationTypeMap[log.operationType]?.label || log.operationType }}
                </span>
                <span class="text-sm text-gray-800">{{ log.summary }}</span>
              </div>
              <div class="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                <span class="flex items-center gap-1">
                  <User class="w-3 h-3" />
                  {{ log.operator }}
                </span>
                <span class="flex items-center gap-1" :title="getFullTimestamp(log.timestamp)">
                  <Clock class="w-3 h-3" />
                  {{ formatTimestamp(log.timestamp) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="hasMore && !showAll" class="px-5 py-3 text-center border-t border-gray-50">
          <button
            class="text-xs text-blue-600 hover:text-blue-700 transition-colors"
            @click="showAll = true"
          >
            查看全部 {{ filteredLogs.length }} 条记录
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
