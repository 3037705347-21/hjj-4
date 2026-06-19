<script setup lang="ts">
import { computed } from 'vue'
import {
  MessageSquare,
  Phone,
  Users,
  MessageCircle,
  Mail,
  FileWarning,
  Clock,
  ChevronRight,
} from 'lucide-vue-next'
import type { CommunicationSummary } from '@/types'
import { computeCommunicationSummary, formatContactDateShort } from '@/mock/communicationRecords'
import { contactTypeMap } from '@/types'

const props = defineProps<{
  caseId: string
}>()

const emit = defineEmits<{
  (e: 'go-to-communication-list'): void
}>()

const summary = computed<CommunicationSummary>(() => {
  return computeCommunicationSummary(props.caseId)
})

const goToCommunicationList = () => {
  emit('go-to-communication-list')
}
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-cyan-50">
          <MessageSquare class="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <h2 class="text-sm font-semibold text-gray-900">客户沟通记录</h2>
          <p class="text-xs text-gray-500 mt-0.5">
            共 {{ summary.total }} 条记录 · 待跟进 {{ summary.pendingFollowUp }} 条
          </p>
        </div>
      </div>
      <button
        class="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
        @click="goToCommunicationList"
      >
        查看全部
        <ChevronRight class="w-3.5 h-3.5" />
      </button>
    </div>

    <div class="p-5">
      <div class="grid grid-cols-5 gap-3 mb-5">
        <div class="bg-gray-50 rounded-lg p-3 text-center">
          <div class="w-8 h-8 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-1.5">
            <Phone class="w-4 h-4 text-green-600" />
          </div>
          <p class="text-xl font-bold text-gray-900">{{ summary.phone }}</p>
          <p class="text-xs text-gray-500">来电</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3 text-center">
          <div class="w-8 h-8 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-1.5">
            <Users class="w-4 h-4 text-blue-600" />
          </div>
          <p class="text-xl font-bold text-gray-900">{{ summary.meeting }}</p>
          <p class="text-xs text-gray-500">面谈</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3 text-center">
          <div class="w-8 h-8 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-1.5">
            <MessageCircle class="w-4 h-4 text-emerald-600" />
          </div>
          <p class="text-xl font-bold text-gray-900">{{ summary.wechat }}</p>
          <p class="text-xs text-gray-500">微信</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3 text-center">
          <div class="w-8 h-8 mx-auto rounded-full bg-purple-100 flex items-center justify-center mb-1.5">
            <Mail class="w-4 h-4 text-purple-600" />
          </div>
          <p class="text-xl font-bold text-gray-900">{{ summary.email }}</p>
          <p class="text-xs text-gray-500">邮件</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3 text-center">
          <div class="w-8 h-8 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-1.5">
            <FileWarning class="w-4 h-4 text-amber-600" />
          </div>
          <p class="text-xl font-bold text-gray-900">{{ summary.materialReminder }}</p>
          <p class="text-xs text-gray-500">催材料</p>
        </div>
      </div>

      <div v-if="summary.recentRecords.length > 0">
        <div class="flex items-center gap-2 mb-3">
          <Clock class="w-4 h-4 text-gray-400" />
          <span class="text-xs font-medium text-gray-700">最近沟通</span>
        </div>
        <div class="space-y-2">
          <div
            v-for="record in summary.recentRecords"
            :key="record.recordId"
            class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            @click="goToCommunicationList"
          >
            <div class="flex-shrink-0 mt-0.5">
              <div
                class="w-2 h-2 rounded-full"
                :class="contactTypeMap[record.contactType].dotClass"
              ></div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <span class="text-[11px] px-1.5 py-0.5 rounded-full border" :class="contactTypeMap[record.contactType].class">
                  {{ contactTypeMap[record.contactType].label }}
                </span>
                <span
                  v-if="!record.isFollowedUp"
                  class="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-0.5"
                >
                  <Clock class="w-3 h-3" />
                  待跟进
                </span>
                <span class="text-[11px] text-gray-400 ml-auto">{{ formatContactDateShort(record.contactDate) }}</span>
              </div>
              <p class="text-sm text-gray-700 line-clamp-1">{{ record.summary }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="py-6 text-center">
        <MessageSquare class="w-10 h-10 mx-auto text-gray-300 mb-2" />
        <p class="text-sm text-gray-500">暂无沟通记录</p>
      </div>
    </div>
  </div>
</template>
