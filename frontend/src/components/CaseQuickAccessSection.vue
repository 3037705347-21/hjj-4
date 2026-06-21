<script setup lang="ts">
import { computed } from 'vue'
import {
  History,
  Star,
  ChevronRight,
  Briefcase,
  X,
} from 'lucide-vue-next'
import CaseQuickAccessCard from './CaseQuickAccessCard.vue'
import type { RecentCaseItem, FavoriteCaseItem } from '@/composables/useCaseQuickAccess'
import { useCaseQuickAccess } from '@/composables/useCaseQuickAccess'
import { useRouter } from 'vue-router'

const props = defineProps<{
  variant?: 'home' | 'list'
}>()

const quickAccess = useCaseQuickAccess()
const router = useRouter()
quickAccess.initialize()

const displayRecentCases = computed(() => {
  const count = props.variant === 'home' ? 4 : 6
  return quickAccess.recentCases.value.slice(0, count)
})

const displayFavoriteCases = computed(() => {
  const count = props.variant === 'home' ? 4 : 6
  return quickAccess.favoriteCases.value.slice(0, count)
})

const hasRecent = computed(() => displayRecentCases.value.length > 0)
const hasFavorite = computed(() => displayFavoriteCases.value.length > 0)
const hasAny = computed(() => hasRecent.value || hasFavorite.value)

const goToCaseList = () => {
  router.push({ name: 'case-list' })
}

const handleRemoveRecent = (caseId: string) => {
  quickAccess.removeRecentCase(caseId)
}

const handleRemoveFavorite = (caseId: string) => {
  quickAccess.removeFavoriteCase(caseId)
}
</script>

<template>
  <div v-if="hasAny" class="mb-8">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div
        v-if="hasFavorite"
        class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 shadow-sm overflow-hidden"
      >
        <div class="px-5 py-4 flex items-center justify-between border-b border-amber-100 bg-white/60">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-amber-100 rounded-lg">
              <Star class="w-5 h-5 text-amber-600 fill-amber-500" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-gray-900">常用案件</h2>
              <p class="text-xs text-gray-500">您手动置顶的常用案件</p>
            </div>
          </div>
          <button
            v-if="variant === 'home'"
            class="flex items-center gap-1 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-100 rounded-lg transition-colors font-medium"
            @click="goToCaseList"
          >
            查看全部
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
        <div class="p-4 space-y-3 max-h-[480px] overflow-y-auto">
          <CaseQuickAccessCard
            v-for="item in displayFavoriteCases"
            :key="'fav-' + item.caseId"
            :item="item"
            mode="favorite"
            @remove="handleRemoveFavorite"
          />
        </div>
      </div>

      <div
        v-if="hasRecent"
        class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-sm overflow-hidden"
      >
        <div class="px-5 py-4 flex items-center justify-between border-b border-blue-100 bg-white/60">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-100 rounded-lg">
              <History class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-gray-900">最近访问</h2>
              <p class="text-xs text-gray-500">最近打开或操作过材料的案件</p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button
              v-if="hasRecent"
              class="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="清空最近记录"
              @click="quickAccess.clearRecentCases"
            >
              <X class="w-3.5 h-3.5" />
              清空
            </button>
            <button
              v-if="variant === 'home'"
              class="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 rounded-lg transition-colors font-medium"
              @click="goToCaseList"
            >
              查看全部
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>
        <div class="p-4 space-y-3 max-h-[480px] overflow-y-auto">
          <CaseQuickAccessCard
            v-for="item in displayRecentCases"
            :key="'recent-' + item.caseId"
            :item="item"
            mode="recent"
            @remove="handleRemoveRecent"
          />
        </div>
      </div>
    </div>
  </div>

  <div
    v-else-if="variant === 'home'"
    class="mb-8 bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl border border-gray-200 shadow-sm p-8"
  >
    <div class="flex flex-col items-center justify-center text-center">
      <div class="p-4 bg-white rounded-2xl shadow-sm mb-4">
        <Briefcase class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-base font-semibold text-gray-700 mb-1">快速访问区</h3>
      <p class="text-sm text-gray-500 max-w-md">
        打开案件后会自动出现在「最近访问」中。您也可以在案件列表或详情页点击
        <span class="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
          <Star class="w-3 h-3 fill-amber-500" />
          星标
        </span>
        将常用案件置顶。
      </p>
    </div>
  </div>
</template>
