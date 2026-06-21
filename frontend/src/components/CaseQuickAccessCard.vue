<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Briefcase,
  User,
  Calendar,
  FileText,
  ChevronRight,
  Star,
  StarOff,
  Clock,
  X,
  Pin,
  PinOff,
} from 'lucide-vue-next'
import { caseStatusMap } from '@/stores/cases'
import type { RecentCaseItem, FavoriteCaseItem } from '@/composables/useCaseQuickAccess'
import { useCaseQuickAccess } from '@/composables/useCaseQuickAccess'
import { useCasesStore } from '@/stores/cases'

type QuickAccessItem = RecentCaseItem | FavoriteCaseItem

const props = defineProps<{
  item: QuickAccessItem
  mode: 'recent' | 'favorite'
  showRemove?: boolean
  showPin?: boolean
}>()

const emit = defineEmits<{
  (e: 'remove', caseId: string): void
}>()

const router = useRouter()
const quickAccess = useCaseQuickAccess()
const store = useCasesStore()

const isFavoriteItem = computed(() => 'pinnedAt' in props.item)

const formattedTime = computed(() => {
  if (!isFavoriteItem.value) {
    const d = new Date((props.item as RecentCaseItem).lastVisitedAt)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins} 分钟前`
    if (diffHours < 24) return `${diffHours} 小时前`
    if (diffDays < 7) return `${diffDays} 天前`
    return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return ''
})

const visitTypeLabel = computed(() => {
  if (!isFavoriteItem.value) {
    return (props.item as RecentCaseItem).visitType === 'material' ? '操作材料' : '访问'
  }
  return ''
})

const isFavorited = computed(() => quickAccess.isFavorite(props.item.caseId))

const goToDetail = () => {
  router.push({ name: 'case-detail', params: { id: props.item.caseId } })
}

const handleToggleFavorite = (event: MouseEvent) => {
  event.stopPropagation()
  const caseData = store.getCaseById(props.item.caseId)
  if (caseData) {
    quickAccess.toggleFavoriteCase(caseData)
  }
}

const handleRemove = (event: MouseEvent) => {
  event.stopPropagation()
  emit('remove', props.item.caseId)
}
</script>

<template>
  <div
    class="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
    @click="goToDetail"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-2 flex-wrap">
          <span
            class="px-2 py-0.5 text-xs font-medium rounded-full border"
            :class="caseStatusMap[item.status].class"
          >
            {{ caseStatusMap[item.status].label }}
          </span>
          <span class="text-xs text-gray-400 font-mono truncate">{{ item.caseNumber }}</span>
          <span class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
            {{ item.caseType }}
          </span>
          <span
            v-if="mode === 'recent' && !isFavoriteItem"
            class="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded"
          >
            <Clock class="w-3 h-3" />
            {{ visitTypeLabel }}· {{ formattedTime }}
          </span>
          <span
            v-if="mode === 'favorite'"
            class="flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-50 text-amber-600 rounded"
          >
            <Pin class="w-3 h-3" />
            常用
          </span>
        </div>
        <h3
          class="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors"
          :title="item.name"
        >
          {{ item.name }}
        </h3>
        <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span class="flex items-center gap-1">
            <User class="w-3.5 h-3.5" />
            <span class="truncate max-w-[100px]">{{ item.client }}</span>
          </span>
          <span class="flex items-center gap-1">
            <Briefcase class="w-3.5 h-3.5" />
            <span class="truncate max-w-[80px]">{{ item.responsibleLawyer }}</span>
          </span>
        </div>
      </div>
      <div
        class="flex items-center gap-0.5 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <button
          v-if="showPin !== false"
          class="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
          :title="isFavorited ? '取消常用置顶' : '设为常用置顶'"
          @click="handleToggleFavorite"
        >
          <Star v-if="isFavorited" class="w-4 h-4 fill-amber-400 text-amber-400" />
          <StarOff v-else class="w-4 h-4" />
        </button>
        <button
          v-if="showRemove !== false"
          class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          :title="mode === 'favorite' ? '移除常用' : '移除最近记录'"
          @click="handleRemove"
        >
          <X v-if="mode === 'recent'" class="w-4 h-4" />
          <PinOff v-else class="w-4 h-4" />
        </button>
        <ChevronRight
          class="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all ml-0.5"
        />
      </div>
    </div>
  </div>
</template>
