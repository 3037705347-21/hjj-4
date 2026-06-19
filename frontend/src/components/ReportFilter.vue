<script setup lang="ts">
import {
  Calendar,
  Filter,
  User,
  Briefcase,
  RotateCcw,
  FileSpreadsheet,
} from 'lucide-vue-next'
import { CaseStatus } from '@/types'
import type { CaseStatus as CaseStatusType } from '@/types'

interface Props {
  dateFrom: string
  dateTo: string
  status: CaseStatusType | 'all'
  caseType: string
  responsibleLawyer: string
  caseTypes: string[]
  lawyers: string[]
  showExport?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showExport: true,
})

const emit = defineEmits<{
  'update:dateFrom': [value: string]
  'update:dateTo': [value: string]
  'update:status': [value: CaseStatusType | 'all']
  'update:caseType': [value: string]
  'update:responsibleLawyer': [value: string]
  'reset': []
  'export': []
}>()
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
    <div class="flex flex-col lg:flex-row lg:items-center gap-4">
      <div class="flex items-center gap-2 text-gray-500">
        <Filter class="w-5 h-5" />
        <span class="text-sm font-medium text-gray-700">筛选条件</span>
      </div>

      <div class="flex flex-wrap items-center gap-3 flex-1">
        <div class="flex items-center gap-2">
          <Calendar class="w-4 h-4 text-gray-400" />
          <input
            :value="dateFrom"
            type="date"
            class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @input="emit('update:dateFrom', ($event.target as HTMLInputElement).value)"
          />
          <span class="text-gray-400 text-sm">至</span>
          <input
            :value="dateTo"
            type="date"
            class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @input="emit('update:dateTo', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div class="flex items-center gap-2">
          <Briefcase class="w-4 h-4 text-gray-400" />
          <select
            :value="status"
            class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @change="emit('update:status', ($event.target as HTMLSelectElement).value as CaseStatusType | 'all')"
          >
            <option value="all">全部状态</option>
            <option :value="CaseStatus.PENDING">待处理</option>
            <option :value="CaseStatus.IN_PROGRESS">进行中</option>
            <option :value="CaseStatus.CLOSED">已结案</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <FileSpreadsheet class="w-4 h-4 text-gray-400" />
          <select
            :value="caseType"
            class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @change="emit('update:caseType', ($event.target as HTMLSelectElement).value)"
          >
            <option value="all">全部类型</option>
            <option v-for="type in caseTypes" :key="type" :value="type">{{ type }}</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <User class="w-4 h-4 text-gray-400" />
          <select
            :value="responsibleLawyer"
            class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @change="emit('update:responsibleLawyer', ($event.target as HTMLSelectElement).value)"
          >
            <option value="all">全部律师</option>
            <option v-for="lawyer in lawyers" :key="lawyer" :value="lawyer">{{ lawyer }}</option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-1.5 px-3 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
          @click="emit('reset')"
        >
          <RotateCcw class="w-4 h-4" />
          重置
        </button>
        <button
          v-if="showExport"
          class="flex items-center gap-1.5 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm shadow-sm"
          @click="emit('export')"
        >
          <FileSpreadsheet class="w-4 h-4" />
          导出报表
        </button>
      </div>
    </div>
  </div>
</template>
