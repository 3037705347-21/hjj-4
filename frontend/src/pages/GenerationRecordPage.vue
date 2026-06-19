<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  FileText,
  Search,
  Filter,
  Download,
  Clock,
  User,
  FileSpreadsheet,
  FileType,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  ArrowLeft,
  ExternalLink,
} from 'lucide-vue-next'
import type { GenerationRecord, TemplateType } from '@/types'
import { TemplateType as TT, templateTypeMap, OutputFormat, outputFormatMap } from '@/types'
import { getGenerationRecords, getGenerationRecordsByCaseId, getGenerationRecordsByTemplateId } from '@/mock/documentTemplates'
import { getTemplateById } from '@/mock/documentTemplates'
import { mockCases } from '@/mock/data'

const route = useRoute()
const router = useRouter()

const records = ref<GenerationRecord[]>([])
const searchKeyword = ref('')
const filterTemplateId = ref<string | 'all'>('all')
const filterCaseId = ref<string | 'all'>('all')
const filterFormat = ref<OutputFormat | 'all'>('all')
const expandedRecordId = ref<string | null>(null)

const formatOptions = [
  { value: 'all', label: '全部格式' },
  ...Object.entries(outputFormatMap).map(([value, { label }]) => ({ value, label })),
]

onMounted(() => {
  if (route.query.caseId) {
    filterCaseId.value = route.query.caseId as string
  }
  if (route.query.templateId) {
    filterTemplateId.value = route.query.templateId as string
  }
  loadRecords()
})

watch([filterCaseId, filterTemplateId], () => {
  loadRecords()
})

const loadRecords = () => {
  if (filterCaseId.value && filterCaseId.value !== 'all') {
    records.value = getGenerationRecordsByCaseId(filterCaseId.value)
  } else if (filterTemplateId.value && filterTemplateId.value !== 'all') {
    records.value = getGenerationRecordsByTemplateId(filterTemplateId.value)
  } else {
    records.value = getGenerationRecords()
  }
}

const filteredRecords = computed(() => {
  return records.value.filter(r => {
    if (filterFormat.value !== 'all' && r.outputFormat !== filterFormat.value) return false
    if (searchKeyword.value.trim()) {
      const keyword = searchKeyword.value.toLowerCase()
      return (
        r.caseNumber?.toLowerCase().includes(keyword) ||
        r.caseName?.toLowerCase().includes(keyword) ||
        r.templateName?.toLowerCase().includes(keyword) ||
        r.fileName?.toLowerCase().includes(keyword) ||
        r.generatedBy.toLowerCase().includes(keyword)
      )
    }
    return true
  })
})

const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

const formatDateOnly = (dateStr: string): string => {
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

const getFormatIcon = (format?: OutputFormat) => {
  switch (format) {
    case OutputFormat.EXCEL:
      return FileSpreadsheet
    case OutputFormat.PDF:
      return FileType
    case OutputFormat.WORD:
      return FileText
    default:
      return FileText
  }
}

const getFormatColor = (format?: OutputFormat) => {
  switch (format) {
    case OutputFormat.EXCEL:
      return 'text-green-600 bg-green-50'
    case OutputFormat.PDF:
      return 'text-red-600 bg-red-50'
    case OutputFormat.WORD:
      return 'text-blue-600 bg-blue-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

const getTemplateType = (templateId: string): TemplateType | null => {
  const template = getTemplateById(templateId)
  return template?.type || null
}

const getTemplateTypeLabel = (templateId: string): string => {
  const type = getTemplateType(templateId)
  return type ? templateTypeMap[type].label : '未知类型'
}

const getTemplateTypeColor = (templateId: string) => {
  const type = getTemplateType(templateId)
  switch (type) {
    case TT.CASE_COVER:
      return 'text-blue-600 bg-blue-50'
    case TT.EVIDENCE_LIST:
      return 'text-purple-600 bg-purple-50'
    case TT.MATERIAL_TRANSFER:
      return 'text-green-600 bg-green-50'
    case TT.ENTRUSTMENT_LIST:
      return 'text-orange-600 bg-orange-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

const goToCaseDetail = (caseId: string) => {
  router.push({ name: 'case-detail', params: { id: caseId } })
}

const goToTemplateEdit = (templateId: string) => {
  router.push({ name: 'template-edit', params: { id: templateId } })
}

const goBack = () => {
  router.back()
}

const clearFilters = () => {
  searchKeyword.value = ''
  filterTemplateId.value = 'all'
  filterCaseId.value = 'all'
  filterFormat.value = 'all'
  loadRecords()
}

const toggleExpand = (recordId: string) => {
  expandedRecordId.value = expandedRecordId.value === recordId ? null : recordId
}

const stats = computed(() => {
  const total = records.value.length
  const excelCount = records.value.filter(r => r.outputFormat === OutputFormat.EXCEL).length
  const pdfCount = records.value.filter(r => r.outputFormat === OutputFormat.PDF).length
  const wordCount = records.value.filter(r => r.outputFormat === OutputFormat.WORD).length
  const todayCount = records.value.filter(r => {
    const today = new Date().toISOString().split('T')[0]
    return r.generatedAt.startsWith(today)
  }).length
  return { total, excelCount, pdfCount, wordCount, todayCount }
})

const hasActiveFilters = computed(() => {
  return searchKeyword.value || filterTemplateId.value !== 'all' || filterCaseId.value !== 'all' || filterFormat.value !== 'all'
})

const currentCaseName = computed(() => {
  if (filterCaseId.value === 'all') return ''
  const c = mockCases.find(c => c.id === filterCaseId.value)
  return c ? c.name : ''
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
      <div class="max-w-[1600px] mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              v-if="route.query.templateId || route.query.caseId"
              class="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              @click="goBack"
            >
              <ArrowLeft class="w-5 h-5" />
            </button>
            <div class="flex items-center gap-3">
              <div class="p-2 bg-indigo-100 rounded-lg">
                <Clock class="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 class="text-xl font-bold text-gray-900">生成记录</h1>
                <p class="text-sm text-gray-500">
                  {{ currentCaseName ? `${currentCaseName} - 文书生成记录` : '查看所有文书生成历史记录' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-[1600px] mx-auto px-6 py-6">
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs text-gray-500 mb-1">总记录数</p>
          <p class="text-2xl font-bold text-gray-900">{{ stats.total }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs text-gray-500 mb-1">今日生成</p>
          <p class="text-2xl font-bold text-blue-600">{{ stats.todayCount }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs text-gray-500 mb-1">Excel 文档</p>
          <p class="text-2xl font-bold text-green-600">{{ stats.excelCount }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs text-gray-500 mb-1">PDF 文档</p>
          <p class="text-2xl font-bold text-red-600">{{ stats.pdfCount }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs text-gray-500 mb-1">Word 文档</p>
          <p class="text-2xl font-bold text-indigo-600">{{ stats.wordCount }}</p>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div class="p-4 border-b border-gray-100 flex flex-wrap items-center gap-4">
          <div class="flex-1 min-w-[240px] relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索案件编号、名称、模板名称、操作人..."
              class="w-full pl-10 pr-10 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              v-if="searchKeyword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              @click="searchKeyword = ''"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
          <div class="flex items-center gap-2">
            <Filter class="w-4 h-4 text-gray-400" />
            <select
              v-model="filterFormat"
              class="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              <option v-for="opt in formatOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
          <button
            v-if="hasActiveFilters"
            class="text-sm text-indigo-600 hover:text-indigo-700"
            @click="clearFilters"
          >
            清除筛选
          </button>
        </div>

        <div v-if="filteredRecords.length === 0" class="py-16 text-center">
          <Clock class="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p class="text-gray-500 mb-2">暂无生成记录</p>
          <p class="text-sm text-gray-400">尝试调整筛选条件</p>
        </div>

        <div v-else class="divide-y divide-gray-100">
          <div
            v-for="record in filteredRecords"
            :key="record.recordId"
            class="hover:bg-gray-50 transition-colors"
          >
            <div class="p-4 flex items-center gap-4">
              <div
                class="p-2.5 rounded-lg flex-shrink-0"
                :class="getFormatColor(record.outputFormat)"
              >
                <component :is="getFormatIcon(record.outputFormat)" class="w-5 h-5" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 class="font-medium text-gray-900 truncate">{{ record.fileName || '未命名文档' }}</h3>
                  <span
                    class="px-2 py-0.5 text-xs rounded-full border"
                    :class="getTemplateTypeColor(record.templateId)"
                  >
                    {{ getTemplateTypeLabel(record.templateId) }}
                  </span>
                  <span
                    class="px-2 py-0.5 text-xs rounded-full border"
                    :class="getFormatColor(record.outputFormat)"
                  >
                    {{ record.outputFormat ? outputFormatMap[record.outputFormat].label : '未知格式' }}
                  </span>
                </div>
                <div class="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                  <span class="flex items-center gap-1">
                    <FileText class="w-3.5 h-3.5" />
                    {{ record.templateName }}
                  </span>
                  <span class="flex items-center gap-1">
                    <User class="w-3.5 h-3.5" />
                    {{ record.generatedBy }}
                  </span>
                  <span class="flex items-center gap-1">
                    <Calendar class="w-3.5 h-3.5" />
                    {{ formatDate(record.generatedAt) }}
                  </span>
                  <span v-if="record.fileSize" class="flex items-center gap-1">
                    {{ record.fileSize }}
                  </span>
                </div>
                <div v-if="record.caseNumber || record.caseName" class="mt-1 text-sm text-gray-400 truncate">
                  {{ record.caseNumber }} · {{ record.caseName }}
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <button
                  class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="查看案件详情"
                  @click="goToCaseDetail(record.caseId)"
                >
                  <ExternalLink class="w-4 h-4" />
                </button>
                <button
                  class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="查看模板"
                  @click="goToTemplateEdit(record.templateId)"
                >
                  <FileText class="w-4 h-4" />
                </button>
                <button
                  class="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="重新下载"
                >
                  <Download class="w-4 h-4" />
                </button>
                <button
                  class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  @click="toggleExpand(record.recordId)"
                >
                  <ChevronDown v-if="expandedRecordId !== record.recordId" class="w-4 h-4" />
                  <ChevronUp v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div
              v-if="expandedRecordId === record.recordId"
              class="px-4 pb-4 border-t border-gray-100 bg-gray-50"
            >
              <div class="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white rounded-lg p-3 border border-gray-200">
                  <p class="text-xs text-gray-500 mb-1">记录编号</p>
                  <p class="text-sm font-medium text-gray-900 font-mono truncate">{{ record.recordId }}</p>
                </div>
                <div class="bg-white rounded-lg p-3 border border-gray-200">
                  <p class="text-xs text-gray-500 mb-1">模板编号</p>
                  <p class="text-sm font-medium text-gray-900 font-mono truncate">{{ record.templateId }}</p>
                </div>
                <div class="bg-white rounded-lg p-3 border border-gray-200">
                  <p class="text-xs text-gray-500 mb-1">案件编号</p>
                  <p class="text-sm font-medium text-gray-900 truncate">{{ record.caseNumber || '-' }}</p>
                </div>
                <div class="bg-white rounded-lg p-3 border border-gray-200">
                  <p class="text-xs text-gray-500 mb-1">生成日期</p>
                  <p class="text-sm font-medium text-gray-900">{{ formatDateOnly(record.generatedAt) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
