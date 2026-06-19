<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  BarChart3,
  FileText,
  FolderTree,
  AlertTriangle,
  Clock,
  User,
  Briefcase,
  TrendingUp,
  ChevronRight,
  Upload,
} from 'lucide-vue-next'
import ReportFilter from '@/components/ReportFilter.vue'
import { useReportStats } from '@/composables/useReportStats'
import { exportMaterialStats } from '@/utils/reportExport'

const router = useRouter()

const goToOverview = () => {
  router.push({ name: 'report-overview' })
}

const goToCaseDistribution = () => {
  router.push({ name: 'report-case-distribution' })
}

const {
  filters,
  allCaseTypes,
  allLawyers,
  totalCases,
  materialStats,
  caseMaterialRank,
  filteredCases,
  resetFilters,
} = useReportStats()

const handleExport = () => {
  exportMaterialStats({
    totalCases: totalCases.value,
    materialStats: materialStats.value,
    caseMaterialRank: caseMaterialRank.value,
    filters: filters.value,
  })
}

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
              @click="goToOverview"
            >
              <ArrowLeft class="w-5 h-5" />
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">材料规模统计</h1>
              <p class="mt-1 text-sm text-gray-500">案件材料数据的深度分析</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-sm"
              @click="goToOverview"
            >
              <BarChart3 class="w-5 h-5 text-blue-600" />
              总览
            </button>
            <button
              class="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-sm"
              @click="goToCaseDistribution"
            >
              <FileText class="w-5 h-5 text-purple-600" />
              案件分布
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

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 mb-8">
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-blue-50 rounded-lg">
              <FileText class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">材料总数</p>
              <p class="text-2xl font-bold text-gray-900">{{ materialStats.totalFiles }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-purple-50 rounded-lg">
              <FolderTree class="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">文件夹数</p>
              <p class="text-2xl font-bold text-gray-900">{{ materialStats.totalFolders }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-emerald-50 rounded-lg">
              <TrendingUp class="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">平均材料数</p>
              <p class="text-2xl font-bold text-gray-900">{{ materialStats.avgPerCase }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-cyan-50 rounded-lg">
              <Briefcase class="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">最多材料</p>
              <p class="text-2xl font-bold text-gray-900">{{ materialStats.maxPerCase }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-gray-100 rounded-lg">
              <FolderTree class="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">最少材料</p>
              <p class="text-2xl font-bold text-gray-900">{{ materialStats.minPerCase }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-sky-50 rounded-lg">
              <Upload class="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">最近新增</p>
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
              <p class="text-sm text-gray-500">缺失材料案件</p>
              <p class="text-2xl font-bold" :class="materialStats.casesWithMissing > 0 ? 'text-orange-600' : 'text-emerald-600'">{{ materialStats.casesWithMissing }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-gray-100 flex items-center gap-3">
            <div class="p-2 bg-blue-50 rounded-lg">
              <BarChart3 class="w-5 h-5 text-blue-600" />
            </div>
            <h3 class="text-base font-semibold text-gray-900">案件材料数量排行 TOP10</h3>
          </div>
          <div class="p-5">
            <div class="space-y-4">
              <div
                v-for="(item, index) in caseMaterialRank.slice(0, 10)"
                :key="item.caseId"
                class="flex items-center gap-4"
              >
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  :class="index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-200 text-gray-600' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'"
                >
                  {{ index + 1 }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium text-gray-900 truncate">{{ item.caseName }}</span>
                    <span class="text-sm text-gray-500 flex-shrink-0 ml-2">{{ item.materialCount }} 份</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        class="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                        :style="{ width: maxMaterialRank > 0 ? `${(item.materialCount / maxMaterialRank) * 100}%` : '0%' }"
                      ></div>
                    </div>
                    <User class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span class="text-xs text-gray-400 truncate max-w-[80px]">{{ item.responsibleLawyer }}</span>
                  </div>
                </div>
              </div>
              <div v-if="caseMaterialRank.length === 0" class="py-8 text-center text-gray-400">
                暂无数据
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-gray-100 flex items-center gap-3">
            <div class="p-2 rounded-lg" :class="materialStats.casesWithMissing > 0 ? 'bg-orange-50' : 'bg-emerald-50'">
              <AlertTriangle class="w-5 h-5" :class="materialStats.casesWithMissing > 0 ? 'text-orange-600' : 'text-emerald-600'" />
            </div>
            <h3 class="text-base font-semibold text-gray-900">材料缺失案件</h3>
          </div>
          <div class="p-5">
            <div class="space-y-3">
              <div
                v-for="item in materialStats.missingCaseDetails"
                :key="item.caseId"
                class="p-3 bg-orange-50 rounded-lg border border-orange-100"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ item.caseName }}</p>
                    <p class="text-xs text-gray-500 mt-0.5">{{ item.caseNumber }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ item.responsibleLawyer }}</p>
                  </div>
                  <div class="flex-shrink-0">
                    <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                      缺失 {{ item.missingCount }} 项
                    </span>
                  </div>
                </div>
              </div>
              <div v-if="materialStats.missingCaseDetails.length === 0" class="py-8 text-center">
                <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-50 flex items-center justify-center">
                  <AlertTriangle class="w-8 h-8 text-emerald-500" />
                </div>
                <p class="text-emerald-600 font-medium">所有案件材料齐备</p>
                <p class="text-sm text-gray-400 mt-1">暂无材料缺失的案件</p>
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
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200">
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">材料名称</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">所属案件</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">上传人</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">上传日期</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="material in materialStats.recentMaterials"
                :key="material.fileName + material.uploadDate + material.caseId"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-3">
                    <div class="p-1.5 bg-blue-50 rounded">
                      <FileText class="w-4 h-4 text-blue-600" />
                    </div>
                    <span class="text-sm font-medium text-gray-900">{{ material.fileName }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-sm text-gray-600">{{ material.caseName }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-sm text-gray-600">{{ material.uploader }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-sm text-gray-600">{{ material.uploadDate }}</span>
                </td>
              </tr>
              <tr v-if="materialStats.recentMaterials.length === 0">
                <td colspan="4" class="px-6 py-12 text-center text-gray-400">
                  暂无材料上传记录
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>
