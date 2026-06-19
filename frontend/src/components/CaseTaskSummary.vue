<script setup lang="ts">
import { computed } from 'vue'
import {
  ClipboardList,
  Clock,
  AlertCircle,
  CheckCircle2,
  CalendarClock,
  ChevronRight,
} from 'lucide-vue-next'
import type { TaskSummary } from '@/types'
import { formatDate } from '@/mock/tasks'

const props = defineProps<{
  summary: TaskSummary
}>()

const emit = defineEmits<{
  (e: 'go-to-task-list'): void
}>()

const pendingCount = computed(() => {
  return props.summary.pending + props.summary.assigned + props.summary.inProgress
})

const hasNearestDue = computed(() => {
  return !!props.summary.nearestDueDate && !!props.summary.nearestDueTaskTitle
})
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all group" @click="emit('go-to-task-list')">
    <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-indigo-50">
          <ClipboardList class="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
            案件任务
            <span class="text-xs font-normal text-gray-400">共 {{ summary.total }} 项</span>
          </h2>
        </div>
      </div>
      <div class="flex items-center gap-1 text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
        查看全部
        <ChevronRight class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>

    <div class="p-5">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div class="bg-yellow-50 rounded-lg p-3">
          <div class="flex items-center gap-2 mb-1">
            <Clock class="w-4 h-4 text-yellow-600" />
            <p class="text-xs text-yellow-700 font-medium">待办</p>
          </div>
          <p class="text-2xl font-bold text-yellow-700">{{ pendingCount }}</p>
        </div>
        <div class="rounded-lg p-3" :class="summary.overdue > 0 ? 'bg-red-50' : 'bg-gray-50'">
          <div class="flex items-center gap-2 mb-1">
            <AlertCircle class="w-4 h-4" :class="summary.overdue > 0 ? 'text-red-600' : 'text-gray-400'" />
            <p class="text-xs font-medium" :class="summary.overdue > 0 ? 'text-red-700' : 'text-gray-500'">逾期</p>
          </div>
          <p class="text-2xl font-bold" :class="summary.overdue > 0 ? 'text-red-700' : 'text-gray-500'">{{ summary.overdue }}</p>
        </div>
        <div class="bg-green-50 rounded-lg p-3">
          <div class="flex items-center gap-2 mb-1">
            <CheckCircle2 class="w-4 h-4 text-green-600" />
            <p class="text-xs text-green-700 font-medium">已完成</p>
          </div>
          <p class="text-2xl font-bold text-green-700">{{ summary.completed }}</p>
        </div>
        <div class="bg-blue-50 rounded-lg p-3">
          <div class="flex items-center gap-2 mb-1">
            <CalendarClock class="w-4 h-4 text-blue-600" />
            <p class="text-xs text-blue-700 font-medium">完成率</p>
          </div>
          <p class="text-2xl font-bold text-blue-700">
            {{ summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0 }}%
          </p>
        </div>
      </div>

      <div v-if="hasNearestDue" class="pt-3 border-t border-gray-100">
        <div class="flex items-center gap-2 text-sm">
          <CalendarClock class="w-4 h-4 text-orange-500 flex-shrink-0" />
          <span class="text-gray-600">最近截止：</span>
          <span class="font-medium text-gray-900">{{ summary.nearestDueTaskTitle }}</span>
          <span class="text-gray-400">·</span>
          <span class="text-orange-600 font-medium">{{ formatDate(summary.nearestDueDate!) }}</span>
        </div>
      </div>
      <div v-else class="pt-3 border-t border-gray-100">
        <div class="flex items-center gap-2 text-sm text-gray-400">
          <CheckCircle2 class="w-4 h-4" />
          <span>暂无待办任务</span>
        </div>
      </div>

      <div class="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          v-if="summary.total > 0"
          class="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
          :style="{ width: `${Math.round((summary.completed / summary.total) * 100)}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>
