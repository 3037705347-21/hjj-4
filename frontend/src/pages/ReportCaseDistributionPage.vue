<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  PieChart,
  Users,
  Briefcase,
  BarChart3,
  FileText,
  TrendingUp,
  User,
} from 'lucide-vue-next'
import ReportFilter from '@/components/ReportFilter.vue'
import { useReportStats } from '@/composables/useReportStats'
import { exportCaseDistribution } from '@/utils/reportExport'
import { CaseStatus } from '@/types'
import type { CaseStatus as CaseStatusType } from '@/types'

const router = useRouter()

const goToOverview = () => {
  router.push({ name: 'report-overview' })
}

const goToMaterialStats = () => {
  router.push({ name: 'report-material-stats' })
}

const {
  filters,
  allCaseTypes,
  allLawyers,
  totalCases,
  statusStats,
  caseTypeStats,
  lawyerStats,
  filteredCases,
  resetFilters,
} = useReportStats()

const handleExport = () => {
  exportCaseDistribution({
    totalCases: totalCases.value,
    statusStats: statusStats.value,
    caseTypeStats: caseTypeStats.value,
    lawyerStats: lawyerStats.value,
    filters: filters.value,
  })
}

const caseTypeColors = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-cyan-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-amber-500',
]

const maxLawyerCaseCount = computed(() => {
  if (lawyerStats.value.length === 0) return 0
  return Math.max(...lawyerStats.value.map(l => l.caseCount))
})

const maxLawyerMaterialCount = computed(() => {
  if (lawyerStats.value.length === 0) return 0
  return Math.max(...lawyerStats.value.map(l => l.materialCount))
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-7xl mx-auto px-6 py-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              class="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              @click="goToOverview"
            >
              <ArrowLeft class="w-5 h-5" />
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">案件分布统计</h1>
              <p class="mt-1 text-sm text-gray-500">多维度查看案件分布情况</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-sm"
              @click="goToOverview"
            >
              <PieChart class="w-5 h-5 text-blue-600" />
              总览
            </button>
            <button
              class="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-sm"
              @click="goToMaterialStats"
            >
              <BarChart3 class="w-5 h-5 text-emerald-600" />
              材料统计
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
      <ReportFilter
        v-model:date-from="filters.dateFrom"
        v-model:date-to="filters.dateTo"
        v-model:status="filters.status"
        v-model:case-type="filters.caseType"
        v-model:responsible-lawyer="filters.responsibleLawyer"
        :case-types="allCaseTypes"
        :lawyers="allLawyers"
        @reset="resetFilters"
        @export="handleExport"
      />

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-blue-50 rounded-lg">
              <Briefcase class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">案件总数</p>
              <p class="text-2xl font-bold text-gray-900">{{ totalCases }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-yellow-50 rounded-lg">
              <PieChart class="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">案件类型</p>
              <p class="text-2xl font-bold text-gray-900">{{ caseTypeStats.length }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-emerald-50 rounded-lg">
              <Users class="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">承办律师</p>
              <p class="text-2xl font-bold text-gray-900">{{ lawyerStats.length }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-purple-50 rounded-lg">
              <TrendingUp class="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">人均案件</p>
              <p class="text-2xl font-bold text-gray-900">{{ lawyerStats.length > 0 ? (totalCases / lawyerStats.length).toFixed(1) : 0 }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-gray-100 flex items-center gap-3">
            <div class="p-2 bg-blue-50 rounded-lg">
              <PieChart class="w-5 h-5 text-blue-600" />
            </div>
            <h3 class="text-base font-semibold text-gray-900">案件状态分布</h3>
          </div>
          <div class="p-6">
            <div class="flex items-center gap-8">
              <div class="relative w-40 h-40 flex-shrink-0">
                <svg class="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" stroke-width="14" />
                  <circle
                    v-for="(stat, index) in statusStats"
                    :key="stat.status"
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    :stroke="stat.status === CaseStatus.PENDING ? '#eab308' : stat.status === CaseStatus.IN_PROGRESS ? '#3b82f6' : '#6b7280'"
                    stroke-width="14"
                    :stroke-dasharray="`${stat.percentage * 2.51} 251`"
                    :stroke-dashoffset="-statusStats.slice(0, index).reduce((acc, s) => acc + s.percentage * 2.51, 0)"
                    class="transition-all duration-500"
                  />
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-3xl font-bold text-gray-900">{{ totalCases }}</span>
                  <span class="text-xs text-gray-500">总案件</span>
                </div>
              </div>
              <div class="flex-1 space-y-4">
                <div
                  v-for="stat in statusStats"
                  :key="stat.status"
                  class="space-y-2"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span
                        class="w-3 h-3 rounded-full"
                        :class="stat.status === CaseStatus.PENDING ? 'bg-yellow-500' : stat.status === CaseStatus.IN_PROGRESS ? 'bg-blue-500' : 'bg-gray-500'"
                      ></span>
                      <span class="text-sm font-medium text-gray-700">{{ stat.label }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-bold text-gray-900">{{ stat.count }}</span>
                      <span class="text-xs text-gray-400">({{ stat.percentage }}%)</span>
                    </div>
                  </div>
                  <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :class="stat.status === CaseStatus.PENDING ? 'bg-yellow-500' : stat.status === CaseStatus.IN_PROGRESS ? 'bg-blue-500' : 'bg-gray-500'"
                      :style="{ width: `${stat.percentage}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-gray-100 flex items-center gap-3">
            <div class="p-2 bg-purple-50 rounded-lg">
              <FileText class="w-5 h-5 text-purple-600" />
            </div>
            <h3 class="text-base font-semibold text-gray-900">案件类型分布</h3>
          </div>
          <div class="p-6">
            <div class="space-y-4">
              <div
                v-for="(item, index) in caseTypeStats"
                :key="item.name"
                class="space-y-2"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span
                      class="w-3 h-3 rounded-full"
                      :class="caseTypeColors[index % caseTypeColors.length]"
                    ></span>
                    <span class="text-sm font-medium text-gray-700">{{ item.name }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-gray-900">{{ item.count }} 件</span>
                    <span class="text-xs text-gray-400">({{ item.percentage }}%)</span>
                  </div>
                </div>
                <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="caseTypeColors[index % caseTypeColors.length]"
                    :style="{ width: `${item.percentage}%` }"
                  ></div>
                </div>
              </div>
              <div v-if="caseTypeStats.length === 0" class="py-8 text-center text-gray-400">
                暂无数据
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-gray-100 flex items-center gap-3">
          <div class="p-2 bg-emerald-50 rounded-lg">
            <Users class="w-5 h-5 text-emerald-600" />
          </div>
          <h3 class="text-base font-semibold text-gray-900">承办律师案件量排行</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200">
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">排名</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">律师</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">案件数量</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">材料数量</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">案件占比</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="(lawyer, index) in lawyerStats"
                :key="lawyer.name"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                    :class="index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-200 text-gray-600' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'"
                  >
                    {{ index + 1 }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-3">
                    <div class="p-2 bg-blue-50 rounded-lg">
                      <User class="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-900">{{ lawyer.name }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-gray-900">{{ lawyer.caseCount }}</span>
                    <span class="text-xs text-gray-400">件</span>
                  </div>
                  <div class="w-24 h-1.5 bg-gray-100 rounded-full mt-1.5">
                    <div
                      class="h-full bg-blue-500 rounded-full transition-all duration-500"
                      :style="{ width: maxLawyerCaseCount > 0 ? `${(lawyer.caseCount / maxLawyerCaseCount) * 100}%` : '0%' }"
                    ></div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-gray-900">{{ lawyer.materialCount }}</span>
                    <span class="text-xs text-gray-400">份</span>
                  </div>
                  <div class="w-24 h-1.5 bg-gray-100 rounded-full mt-1.5">
                    <div
                      class="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      :style="{ width: maxLawyerMaterialCount > 0 ? `${(lawyer.materialCount / maxLawyerMaterialCount) * 100}%` : '0%' }"
                    ></div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 bg-gray-100 rounded-full min-w-[120px]">
                      <div
                        class="h-full bg-purple-500 rounded-full transition-all duration-500"
                        :style="{ width: totalCases > 0 ? `${(lawyer.caseCount / totalCases) * 100}%` : '0%' }"
                      ></div>
                    </div>
                    <span class="text-sm text-gray-600 min-w-[48px] text-right">
                      {{ totalCases > 0 ? ((lawyer.caseCount / totalCases) * 100).toFixed(1) : 0 }}%
                    </span>
                  </div>
                </td>
              </tr>
              <tr v-if="lawyerStats.length === 0">
                <td colspan="5" class="px-6 py-12 text-center text-gray-400">
                  暂无数据
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>
