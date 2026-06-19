<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Calendar,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  MapPin,
} from 'lucide-vue-next'
import type { CaseEvent, CaseEventSummary } from '@/types'
import { caseEventTypeMap, caseEventStatusMap } from '@/types'
import { getRecentEventsByCaseId, computeEventSummary } from '@/mock/caseEvents'

interface Props {
  caseId: string
  summary?: CaseEventSummary
}

const props = defineProps<Props>()

const router = useRouter()

const recentEvents = computed<CaseEvent[]>(() => {
  return getRecentEventsByCaseId(props.caseId, 3)
})

const eventSummary = computed<CaseEventSummary>(() => {
  return props.summary || computeEventSummary(props.caseId)
})

const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

const getDaysDiff = (dateStr: string): number => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}

const goToCaseTimeline = () => {
  router.push({ name: 'case-timeline', query: { caseId: props.caseId } })
}

const emit = defineEmits<{
  (e: 'go-to-timeline'): void
}>()

const handleGoToTimeline = () => {
  emit('go-to-timeline')
  goToCaseTimeline()
}
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <button
      class="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
      @click="handleGoToTimeline"
    >
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-blue-50">
          <Calendar class="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 class="text-sm font-semibold text-gray-900">案件时间线 / 庭期日历</h2>
          <p class="text-xs text-gray-500 mt-0.5">
            共 {{ eventSummary.total }} 个事件 · 已完成 {{ eventSummary.completed }} · 待办 {{ eventSummary.pending + eventSummary.inProgress }}
            <span v-if="eventSummary.overdue > 0" class="text-red-600 ml-1">
              · 逾期 {{ eventSummary.overdue }}
            </span>
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400">查看详情</span>
        <ChevronRight class="w-4 h-4 text-gray-400" />
      </div>
    </button>

    <div class="border-t border-gray-100 px-5 py-4 space-y-3">
      <div
        v-for="event in recentEvents"
        :key="event.eventId"
        class="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
        @click="handleGoToTimeline"
      >
        <div class="flex flex-col items-center pt-0.5">
          <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" :class="caseEventTypeMap[event.eventType].dotClass"></div>
          <div class="w-px flex-1 bg-gray-200 mt-1.5"></div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span
              class="px-2 py-0.5 text-xs font-medium rounded-full border flex-shrink-0"
              :class="caseEventTypeMap[event.eventType].class"
            >
              {{ caseEventTypeMap[event.eventType].label }}
            </span>
            <span
              class="px-2 py-0.5 text-xs rounded-full border flex-shrink-0"
              :class="caseEventStatusMap[event.status].class"
            >
              {{ caseEventStatusMap[event.status].label }}
            </span>
            <span
              v-if="getDaysDiff(event.eventDate) > 0 && getDaysDiff(event.eventDate) <= 7"
              class="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full flex-shrink-0 flex items-center gap-1"
            >
              <Clock class="w-3 h-3" />
              {{ getDaysDiff(event.eventDate) }}天后
            </span>
            <span
              v-else-if="getDaysDiff(event.eventDate) === 0"
              class="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full flex-shrink-0 flex items-center gap-1"
            >
              <AlertCircle class="w-3 h-3" />
              今天
            </span>
            <span
              v-else-if="event.status === 'overdue'"
              class="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full flex-shrink-0 flex items-center gap-1"
            >
              <AlertCircle class="w-3 h-3" />
              逾期 {{ Math.abs(getDaysDiff(event.eventDate)) }} 天
            </span>
            <span
              v-else-if="event.status === 'completed'"
              class="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full flex-shrink-0 flex items-center gap-1"
            >
              <CheckCircle2 class="w-3 h-3" />
              已完成
            </span>
          </div>
          <p class="text-sm font-medium text-gray-900 truncate">{{ event.title }}</p>
          <div class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span class="flex items-center gap-1">
              <Calendar class="w-3 h-3" />
              {{ formatDate(event.eventDate) }}
            </span>
            <span v-if="event.location" class="flex items-center gap-1 truncate">
              <MapPin class="w-3 h-3 flex-shrink-0" />
              <span class="truncate">{{ event.location }}</span>
            </span>
          </div>
        </div>
      </div>

      <div v-if="recentEvents.length === 0" class="py-6 text-center">
        <Calendar class="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p class="text-sm text-gray-500">暂无案件事件</p>
        <p class="text-xs text-gray-400 mt-1">点击上方查看详情可添加新事件</p>
      </div>
    </div>
  </div>
</template>
