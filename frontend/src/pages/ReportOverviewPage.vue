<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  Briefcase,
  FileText,
  User,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  FolderTree,
  Clock,
  ChevronRight,
  Upload,
} from 'lucide-vue-next'
import ReportFilter from '@/components/ReportFilter.vue'
import { useReportStats } from '@/composables/useReportStats'
import { exportReportOverview } from '@/utils/reportExport'
import { CaseStatus } from '@/types'
import type { CaseStatus as CaseStatusType } from '@/types'

const router = useRouter()

const goToCaseList = () => {
  router.push({ name: 'case-list' })
}

const goToCaseDistribution = () => {
  router.push({ name: 'report-case-distribution' })
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
  materialStats,
  caseMaterialRank,
  resetFilters,
} = useReportStats()

const handleExport = () => {
  exportReportOverview({
    totalCases: totalCases.value,
    statusStats: statusStats.value,
    caseTypeStats: caseTypeStats.value,
    lawyerStats: lawyerStats.value,
    materialStats: materialStats.value,
    caseMaterialRank: caseMaterialRank.value,
    filters: filters.value,
  })
}

const statusColorMap: Record<string, string> = {
  [CaseStatus.PENDING]: 'text-yellow-600 bg-yellow-50',
  [CaseStatus.IN_PROGRESS]: 'text-blue-600 bg-blue-50',
  [CaseStatus.CLOSED]: 'text-gray-600 bg-gray-100',
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

const maxMaterialRank = computed(() => {
  if (caseMaterialRank.value.length === 0) return 0
  return Math.max(...caseMaterialRank.value.map(c => c.materialCount))
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
              @click="goToCaseList"
            >
              <ArrowLeft class="w-5 h-5" />
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">统计报表总览</h1>
              <p class="mt-1 text-sm text-gray-500">案件与材料数据的综合经营看板</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-sm"
              @click="goToCaseDistribution"
            >
              <PieChart class="w-5 h-5 text-purple-600" />
              案件分布
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

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
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
              <Clock class="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">待处理</p>
              <p class="text-2xl font-bold text-gray-900">{{ statusStats.find(s => s.status === CaseStatus.PENDING)?.count || 0 }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-green-50 rounded-lg">
              <TrendingUp class="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">进行中</p>
              <p class="text-2xl font-bold text-gray-900">{{ statusStats.find(s => s.status === CaseStatus.IN_PROGRESS)?.count || 0 }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-gray-100 rounded-lg">
              <FileText class="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">材料总数</p>
              <p class="text-2xl font-bold text-gray-900">{{ materialStats.totalFiles }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-sky-50 rounded-lg">
              <Upload class="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">最近新增材料</p>
              <p class="text-2xl font-bold text-gray-900">{{ materialStats.recentMaterialsCount }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 rounded-lg" :class="materialStats.casesWithMissing > 0 ? 'bg-orange-50' : 'bg-emerald-50'">
              <AlertTriangle class="w-6 h-6" :class="materialStats.casesWithMissing > 0 ? 'text-orange-600' : 'text-emerald-600'" />
            </div>
            <div>
              <p class="text-sm text-gray-500">材料缺失案件</p>
              <p class="text-2xl font-bold" :class="materialStats.casesWithMissing > 0 ? 'text-orange-600' : 'text-emerald-600'">{{ materialStats.casesWithMissing }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-blue-50 rounded-lg">
                <PieChart class="w-5 h-5 text-blue-600" />
              </div>
              <h3 class="text-base font-semibold text-gray-900">案件状态分布</h3>
            </div>
            <button
              class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              @click="goToCaseDistribution"
            >
              查看详情
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
          <div class="p-5">
            <div class="flex items-center gap-8 mb-6">
              <div class="relative w-32 h-32 flex-shrink-0">
                <svg class="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" stroke-width="12" />
                  <circle
                    v-for="(stat, index) in statusStats"
                    :key="stat.status"
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    :stroke="stat.status === CaseStatus.PENDING ? '#eab308' : stat.status === CaseStatus.IN_PROGRESS ? '#3b82f6' : '#6b7280'"
                    stroke-width="12"
                    :stroke-dasharray="`${stat.percentage * 2.51} 251`"
                    :stroke-dashoffset="-statusStats.slice(0, index).reduce((acc, s) => acc + s.percentage * 2.51, 0)"
                    class="transition-all duration-500"
                  />
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-2xl font-bold text-gray-900">{{ totalCases }}</span>
                </div>
              </div>
              <div class="flex-1 space-y-3">
                <div
                  v-for="stat in statusStats"
                  :key="stat.status"
                  class="flex items-center justify-between"
                >
                  <div class="flex items-center gap-2">
                    <span
                      class="w-3 h-3 rounded-full"
                      :class="stat.status === CaseStatus.PENDING ? 'bg-yellow-500' : stat.status === CaseStatus.IN_PROGRESS ? 'bg-blue-500' : 'bg-gray-500'"
                    ></span>
                    <span class="text-sm text-gray-600">{{ stat.label }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-gray-900">{{ stat.count }}</span>
                    <span class="text-xs text-gray-400">({{ stat.percentage }}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-purple-50 rounded-lg">
                <FolderTree class="w-5 h-5 text-purple-600" />
              </div>
              <h3 class="text-base font-semibold text-gray-900">案件类型分布</h3>
            </div>
            <button
              class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              @click="goToCaseDistribution"
            >
              查看详情
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
          <div class="p-5">
            <div class="space-y-3">
              <div
                v-for="(item, index) in caseTypeStats.slice(0, 5)"
                :key="item.name"
                class="space-y-1.5"
              >
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-700">{{ item.name }}</span>
                  <span class="text-gray-500">{{ item.count }} 件 ({{ item.percentage }}%)</span>
                </div>
                <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
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

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-emerald-50 rounded-lg">
                <Users class="w-5 h-5 text-emerald-600" />
              </div>
              <h3 class="text-base font-semibold text-gray-900">承办律师案件量 TOP5</h3>
            </div>
            <button
              class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              @click="goToCaseDistribution"
            >
              查看详情
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
          <div class="p-5">
            <div class="space-y-4">
              <div
                v-for="(lawyer, index) in lawyerStats.slice(0, 5)"
                :key="lawyer.name"
                class="flex items-center gap-4"
              >
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  :class="index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-100 text-gray-600' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'"
                >
                  {{ index + 1 }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium text-gray-900 truncate">{{ lawyer.name }}</span>
                    <span class="text-sm text-gray-500 flex-shrink-0 ml-2">{{ lawyer.caseCount }} 件</span>
                  </div>
                  <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      :style="{ width: maxLawyerCaseCount > 0 ? `${(lawyer.caseCount / maxLawyerCaseCount) * 100}%` : '0%' }"
                    ></div>
                  </div>
                </div>
              </div>
              <div v-if="lawyerStats.length === 0" class="py-8 text-center text-gray-400">
                暂无数据
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-orange-50 rounded-lg">
                <FileText class="w-5 h-5 text-orange-600" />
              </div>
              <h3 class="text-base font-semibold text-gray-900">材料数量排行 TOP5</h3>
            </div>
            <button
              class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              @click="goToMaterialStats"
            >
              查看详情
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
          <div class="p-5">
            <div class="space-y-4">
              <div
                v-for="(item, index) in caseMaterialRank.slice(0, 5)"
                :key="item.caseId"
                class="flex items-center gap-4"
              >
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  :class="index === 0 ? 'bg-blue-100 text-blue-700' : index === 1 ? 'bg-purple-100 text-purple-600' : index === 2 ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-50 text-gray-500'"
                >
                  {{ index + 1 }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium text-gray-900 truncate">{{ item.caseName }}</span>
                    <span class="text-sm text-gray-500 flex-shrink-0 ml-2">{{ item.materialCount }} 份</span>
                  </div>
                  <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-orange-500 rounded-full transition-all duration-500"
                      :style="{ width: maxMaterialRank > 0 ? `${(item.materialCount / maxMaterialRank) * 100}%` : '0%' }"
                    ></div>
                  </div>
                </div>
              </div>
              <div v-if="caseMaterialRank.length === 0" class="py-8 text-center text-gray-400">
                暂无数据
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-gray-100 flex items-center gap-3">
          <div class="p-2 bg-blue-50 rounded-lg">
            <Clock class="w-5 h-5 text-blue-600" />
          </div>
          <h3 class="text-base font-semibold text-gray-900">最近新增材料</h3>
        </div>
        <div class="divide-y divide-gray-100">
          <div
            v-for="material in materialStats.recentMaterials"
            :key="material.fileName + material.uploadDate + material.caseId"
            class="p-4 hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-3 min-w-0">
                <div class="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                  <FileText class="w-4 h-4 text-blue-600" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ material.fileName }}</p>
                  <p class="text-xs text-gray-500 mt-0.5 truncate">{{ material.caseName }}</p>
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="text-sm text-gray-600">{{ material.uploadDate }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ material.uploader }}</p>
              </div>
            </div>
          </div>
          <div v-if="materialStats.recentMaterials.length === 0" class="py-12 text-center">
            <FileText class="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p class="text-gray-500">暂无材料上传记录</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
