<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search,
  Plus,
  Filter,
  FileText,
  User,
  Calendar,
  Briefcase,
  ChevronRight,
} from 'lucide-vue-next'
import { mockCases, caseStatusMap } from '@/mock/data'
import { countFiles } from '@/utils/treeUtils'
import type { Case, CaseStatus } from '@/types'

const router = useRouter()

const cases = ref<Case[]>(mockCases)
const searchQuery = ref('')
const statusFilter = ref<CaseStatus | 'all'>('all')

const filteredCases = computed(() => {
  return cases.value.filter(c => {
    const matchesSearch = !searchQuery.value ||
      c.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      c.client.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesStatus = statusFilter.value === 'all' || c.status === statusFilter.value

    return matchesSearch && matchesStatus
  })
})

const goToDetail = (caseItem: Case) => {
  router.push({ name: 'case-detail', params: { id: caseItem.id } })
}

const getFileCount = (caseItem: Case) => countFiles(caseItem.materials)
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-7xl mx-auto px-6 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">案件管理</h1>
            <p class="mt-1 text-sm text-gray-500">管理所有案件及其材料档案</p>
          </div>
          <button class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Plus class="w-5 h-5" />
            新建案件
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-blue-50 rounded-lg">
              <Briefcase class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">案件总数</p>
              <p class="text-2xl font-bold text-gray-900">{{ cases.length }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-yellow-50 rounded-lg">
              <Calendar class="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">待处理</p>
              <p class="text-2xl font-bold text-gray-900">{{ cases.filter(c => c.status === 'pending').length }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-green-50 rounded-lg">
              <FileText class="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">进行中</p>
              <p class="text-2xl font-bold text-gray-900">{{ cases.filter(c => c.status === 'in_progress').length }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-gray-100 rounded-lg">
              <User class="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">已结案</p>
              <p class="text-2xl font-bold text-gray-900">{{ cases.filter(c => c.status === 'closed').length }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-gray-100">
          <div class="flex flex-col sm:flex-row gap-3">
            <div class="relative flex-1">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索案件名称、案号或当事人..."
                class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div class="flex items-center gap-2">
              <Filter class="w-5 h-5 text-gray-400" />
              <select
                v-model="statusFilter"
                class="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">全部状态</option>
                <option value="pending">待处理</option>
                <option value="in_progress">进行中</option>
                <option value="closed">已结案</option>
              </select>
            </div>
          </div>
        </div>

        <div class="divide-y divide-gray-100">
          <div
            v-for="caseItem in filteredCases"
            :key="caseItem.id"
            class="p-5 hover:bg-gray-50 transition-colors cursor-pointer group"
            @click="goToDetail(caseItem)"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 mb-2">
                  <span class="px-2.5 py-1 text-xs font-medium rounded-full border"
                    :class="caseStatusMap[caseItem.status].class">
                    {{ caseStatusMap[caseItem.status].label }}
                  </span>
                  <span class="text-xs text-gray-400 font-mono">{{ caseItem.caseNumber }}</span>
                  <span class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                    {{ caseItem.caseType }}
                  </span>
                </div>
                <h3 class="text-base font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                  {{ caseItem.name }}
                </h3>
                <p class="mt-1.5 text-sm text-gray-500 line-clamp-2">
                  {{ caseItem.description }}
                </p>
                <div class="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
                  <span class="flex items-center gap-1.5">
                    <User class="w-4 h-4" />
                    {{ caseItem.client }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <Briefcase class="w-4 h-4" />
                    {{ caseItem.responsibleLawyer }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <Calendar class="w-4 h-4" />
                    {{ caseItem.filingDate }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <FileText class="w-4 h-4" />
                    {{ getFileCount(caseItem) }} 份材料
                  </span>
                </div>
              </div>
              <ChevronRight class="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
            </div>
          </div>

          <div
            v-if="filteredCases.length === 0"
            class="py-16 text-center"
          >
            <Briefcase class="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p class="text-gray-500">没有找到匹配的案件</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
