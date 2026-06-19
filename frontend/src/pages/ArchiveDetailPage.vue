<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  FileText,
  User,
  Calendar,
  MapPin,
  Archive,
  Download,
  History,
  FileSpreadsheet,
  FileText as FileTextIcon,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-vue-next'
import {
  getArchiveDetail,
  addBorrowRecord,
  returnArchive,
  addExportRecord,
} from '@/mock/archives'
import { archiveStatusMap, ArchiveStatus } from '@/types'
import type { CaseArchive, BorrowRecord, ExportRecord } from '@/types'
import BorrowFormModal from '@/components/BorrowFormModal.vue'

const route = useRoute()
const router = useRouter()

type DetailTab = 'overview' | 'export-records' | 'borrow-history'

const archive = ref<(CaseArchive & { caseNumber: string; caseName: string; caseType: string; responsibleLawyer: string }) | null>(null)

const showBorrowModal = ref(false)
const borrowMode = ref<'borrow' | 'return'>('borrow')

const activeTab = ref<DetailTab>('overview')

const tabs: Array<{ key: DetailTab; label: string; icon: any; count?: number }> = [
  { key: 'overview', label: '概览', icon: Archive },
  { key: 'export-records', label: '导出记录', icon: Download },
  { key: 'borrow-history', label: '借阅历史', icon: History },
]

const loadData = () => {
  const archiveId = route.params.id as string
  const found = getArchiveDetail(archiveId)
  if (found) {
    archive.value = found
  }
}

onMounted(() => {
  loadData()
})

const goBack = () => {
  router.push({ name: 'archive-list' })
}

const goToCaseDetail = () => {
  if (!archive.value) return
  router.push({ name: 'case-detail', params: { id: archive.value.caseId } })
}

const isCurrentlyBorrowed = computed(() => {
  if (!archive.value) return false
  return archive.value.borrowHistory.some(b => !b.returnDate)
})

const currentBorrowRecord = computed(() => {
  if (!archive.value) return null
  return archive.value.borrowHistory.find(b => !b.returnDate) || null
})

const canBorrow = computed(() => {
  if (!archive.value) return false
  return archive.value.archiveStatus === ArchiveStatus.ARCHIVED || archive.value.archiveStatus === ArchiveStatus.RETURNED
})

const canReturn = computed(() => {
  return isCurrentlyBorrowed.value
})

const openBorrowModal = () => {
  borrowMode.value = 'borrow'
  showBorrowModal.value = true
}

const openReturnModal = () => {
  borrowMode.value = 'return'
  showBorrowModal.value = true
}

const handleBorrowSubmit = (data: {
  mode: 'borrow' | 'return'
  borrower?: string
  borrowDate?: string
  expectedReturnDate?: string
  borrowReason?: string
  approver?: string
  returnDate?: string
  remark?: string
}) => {
  if (!archive.value) return

  if (data.mode === 'borrow' && data.borrower && data.borrowDate && data.borrowReason) {
    addBorrowRecord(archive.value.archiveId, {
      borrower: data.borrower,
      borrowDate: data.borrowDate,
      expectedReturnDate: data.expectedReturnDate,
      borrowReason: data.borrowReason,
      approver: data.approver,
      remark: data.remark,
    })
  } else if (data.mode === 'return' && data.returnDate) {
    returnArchive(archive.value.archiveId, data.returnDate, data.remark)
  }

  loadData()
  showBorrowModal.value = false
}

const handleExportRecord = (type: 'excel' | 'pdf') => {
  if (!archive.value) return
  addExportRecord(archive.value.archiveId, {
    exportType: type,
    exporter: '当前用户',
    exportRange: '全部材料',
    remark: `手动导出${type.toUpperCase()}文件`,
  })
  loadData()
}

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '-'
  return dateStr
}

const getExportTypeLabel = (type: 'excel' | 'pdf'): string => {
  return type === 'excel' ? 'Excel' : 'PDF'
}

const getExportTypeClass = (type: 'excel' | 'pdf'): string => {
  return type === 'excel' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
}

const isOverdue = (record: BorrowRecord): boolean => {
  if (record.returnDate) return false
  if (!record.expectedReturnDate) return false
  const today = new Date().toISOString().split('T')[0]
  return record.expectedReturnDate < today
}

const sortedExportRecords = computed(() => {
  if (!archive.value) return []
  return [...archive.value.exportRecords].sort((a, b) =>
    new Date(b.exportDate).getTime() - new Date(a.exportDate).getTime()
  )
})

const sortedBorrowHistory = computed(() => {
  if (!archive.value) return []
  return [...archive.value.borrowHistory].sort((a, b) =>
    new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime()
  )
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div v-if="!archive" class="flex flex-col items-center justify-center py-32">
      <Archive class="w-16 h-16 text-gray-300 mb-4" />
      <p class="text-lg text-gray-500 mb-2">归档记录不存在或已被删除</p>
      <button
        class="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        @click="goBack"
      >
        返回归档列表
      </button>
    </div>

    <template v-else>
      <header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div class="max-w-[1600px] mx-auto px-6 py-4">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-4 min-w-0">
              <button
                class="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                @click="goBack"
              >
                <ArrowLeft class="w-5 h-5" />
              </button>
              <div class="min-w-0">
                <div class="flex items-center gap-3 mb-1 flex-wrap">
                  <span
                    class="px-2.5 py-0.5 text-xs font-medium rounded-full border flex-shrink-0"
                    :class="archiveStatusMap[archive.archiveStatus].class"
                  >
                    {{ archiveStatusMap[archive.archiveStatus].label }}
                  </span>
                  <span class="text-xs text-gray-400 font-mono truncate">{{ archive.archiveCode }}</span>
                  <span class="text-xs text-gray-400 font-mono truncate">{{ archive.caseNumber }}</span>
                  <span class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded flex-shrink-0">
                    {{ archive.caseType }}
                  </span>
                </div>
                <h1 class="text-lg font-bold text-gray-900 truncate">{{ archive.caseName }}</h1>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <template v-if="canBorrow">
                <button
                  class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  @click="openBorrowModal"
                >
                  <Plus class="w-4 h-4" />
                  借阅登记
                </button>
              </template>
              <template v-else-if="canReturn">
                <button
                  class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                  @click="openReturnModal"
                >
                  <CheckCircle class="w-4 h-4" />
                  归还登记
                </button>
              </template>
              <template v-else>
                <button
                  class="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed shadow-sm"
                  disabled
                >
                  <Clock class="w-4 h-4" />
                  待归档
                </button>
              </template>
            </div>
          </div>
        </div>
      </header>

      <div class="max-w-[1600px] mx-auto px-6 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div class="flex items-center gap-3">
              <div class="p-2.5 bg-blue-50 rounded-lg">
                <User class="w-5 h-5 text-blue-600" />
              </div>
              <div class="min-w-0">
                <p class="text-xs text-gray-500">承办律师</p>
                <p class="text-sm font-semibold text-gray-900 truncate">{{ archive.responsibleLawyer }}</p>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div class="flex items-center gap-3">
              <div class="p-2.5 bg-purple-50 rounded-lg">
                <MapPin class="w-5 h-5 text-purple-600" />
              </div>
              <div class="min-w-0">
                <p class="text-xs text-gray-500">存放位置</p>
                <p class="text-sm font-semibold text-gray-900 truncate">{{ archive.physicalLocation }}</p>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div class="flex items-center gap-3">
              <div class="p-2.5 bg-green-50 rounded-lg">
                <User class="w-5 h-5 text-green-600" />
              </div>
              <div class="min-w-0">
                <p class="text-xs text-gray-500">保管人</p>
                <p class="text-sm font-semibold text-gray-900 truncate">{{ archive.keeper }}</p>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div class="flex items-center gap-3">
              <div class="p-2.5 bg-amber-50 rounded-lg">
                <Calendar class="w-5 h-5 text-amber-600" />
              </div>
              <div class="min-w-0">
                <p class="text-xs text-gray-500">归档日期</p>
                <p class="text-sm font-semibold text-gray-900 truncate">{{ archive.archiveDate }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500 mb-1">材料总数</p>
                <p class="text-3xl font-bold text-blue-600">{{ archive.materialCount }}</p>
                <p class="text-xs text-gray-400 mt-1">份文件</p>
              </div>
              <div class="p-3 bg-blue-50 rounded-xl">
                <FileText class="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>
          <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500 mb-1">导出次数</p>
                <p class="text-3xl font-bold text-green-600">{{ archive.exportRecords.length }}</p>
                <p class="text-xs text-gray-400 mt-1">次</p>
              </div>
              <div class="p-3 bg-green-50 rounded-xl">
                <Download class="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>
          <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500 mb-1">借阅次数</p>
                <p class="text-3xl font-bold text-purple-600">{{ archive.borrowHistory.length }}</p>
                <p class="text-xs text-gray-400 mt-1">次</p>
              </div>
              <div class="p-3 bg-purple-50 rounded-xl">
                <History class="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentBorrowRecord" class="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
          <div class="flex items-start gap-3">
            <AlertCircle class="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div class="flex-1">
              <h3 class="text-sm font-semibold text-red-800 mb-2">当前借阅中</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p class="text-xs text-red-600 mb-0.5">借阅人</p>
                  <p class="font-medium text-red-900">{{ currentBorrowRecord.borrower }}</p>
                </div>
                <div>
                  <p class="text-xs text-red-600 mb-0.5">借阅日期</p>
                  <p class="font-medium text-red-900">{{ currentBorrowRecord.borrowDate }}</p>
                </div>
                <div>
                  <p class="text-xs text-red-600 mb-0.5">预计归还</p>
                  <p class="font-medium" :class="isOverdue(currentBorrowRecord) ? 'text-red-600' : 'text-red-900'">
                    {{ formatDate(currentBorrowRecord.expectedReturnDate) }}
                    <span v-if="isOverdue(currentBorrowRecord)" class="text-xs ml-1">(已逾期)</span>
                  </p>
                </div>
                <div>
                  <p class="text-xs text-red-600 mb-0.5">借阅事由</p>
                  <p class="font-medium text-red-900 truncate">{{ currentBorrowRecord.borrowReason }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="archive.remark" class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <div class="flex items-center gap-2 mb-2">
            <FileTextIcon class="w-4 h-4 text-gray-400" />
            <h2 class="text-sm font-semibold text-gray-700">备注说明</h2>
          </div>
          <p class="text-sm text-gray-600 leading-relaxed">{{ archive.remark }}</p>
        </div>

        <div class="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
          <div class="border-b border-gray-200">
            <div class="flex">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                class="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative"
                :class="[
                  activeTab === tab.key
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                ]"
                @click="activeTab = tab.key"
              >
                <component :is="tab.icon" class="w-4 h-4" />
                {{ tab.label }}
              </button>
            </div>
            <div class="h-0.5 bg-gray-100">
              <div
                class="h-full bg-blue-600 transition-all duration-300"
                :style="{
                  width: '33.33%',
                  marginLeft: activeTab === 'overview' ? '0%' : activeTab === 'export-records' ? '33.33%' : '66.66%'
                }"
              ></div>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'overview'">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div class="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 class="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Download class="w-5 h-5 text-green-600" />
                  最近导出记录
                </h3>
                <button
                  class="text-xs text-blue-600 hover:text-blue-700"
                  @click="activeTab = 'export-records'"
                >
                  查看全部
                </button>
              </div>
              <div class="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                <div
                  v-for="record in sortedExportRecords.slice(0, 5)"
                  :key="record.exportId"
                  class="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div
                        class="p-2 rounded-lg"
                        :class="getExportTypeClass(record.exportType)"
                      >
                        <FileSpreadsheet v-if="record.exportType === 'excel'" class="w-5 h-5" />
                        <FileTextIcon v-else class="w-5 h-5" />
                      </div>
                      <div>
                        <p class="text-sm font-medium text-gray-900">
                          {{ getExportTypeLabel(record.exportType) }} - {{ record.exportRange }}
                        </p>
                        <p class="text-xs text-gray-500">
                          {{ record.exporter }} · {{ record.exportDate }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  v-if="sortedExportRecords.length === 0"
                  class="py-12 text-center"
                >
                  <Download class="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p class="text-sm text-gray-500">暂无导出记录</p>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div class="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 class="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <History class="w-5 h-5 text-purple-600" />
                  最近借阅记录
                </h3>
                <button
                  class="text-xs text-blue-600 hover:text-blue-700"
                  @click="activeTab = 'borrow-history'"
                >
                  查看全部
                </button>
              </div>
              <div class="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                <div
                  v-for="record in sortedBorrowHistory.slice(0, 5)"
                  :key="record.borrowId"
                  class="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3">
                      <div
                        class="p-2 rounded-lg mt-0.5"
                        :class="record.returnDate ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'"
                      >
                        <User class="w-5 h-5" />
                      </div>
                      <div class="min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="text-sm font-medium text-gray-900">{{ record.borrower }}</span>
                          <span
                            v-if="record.returnDate"
                            class="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full"
                          >
                            已归还
                          </span>
                          <span
                            v-else-if="isOverdue(record)"
                            class="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full"
                          >
                            已逾期
                          </span>
                          <span
                            v-else
                            class="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full"
                          >
                            借阅中
                          </span>
                        </div>
                        <p class="text-xs text-gray-500">
                          {{ record.borrowDate }} → {{ formatDate(record.returnDate) || '未归还' }}
                        </p>
                        <p class="text-xs text-gray-600 mt-1 truncate">{{ record.borrowReason }}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  v-if="sortedBorrowHistory.length === 0"
                  class="py-12 text-center"
                >
                  <History class="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p class="text-sm text-gray-500">暂无借阅记录</p>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mt-6">
            <div class="flex items-center gap-2 mb-4">
              <FileText class="w-5 h-5 text-blue-600" />
              <h3 class="text-base font-semibold text-gray-900">关联案件</h3>
            </div>
            <div
              class="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              @click="goToCaseDetail"
            >
              <div class="flex items-center justify-between">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ archive.caseName }}</p>
                  <p class="text-xs text-gray-500 mt-1">{{ archive.caseNumber }}</p>
                </div>
                <button class="px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  查看案件
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'export-records'">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 class="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Download class="w-5 h-5 text-green-600" />
                导出记录
              </h3>
              <div class="flex items-center gap-2">
                <button
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                  @click="handleExportRecord('excel')"
                >
                  <FileSpreadsheet class="w-4 h-4" />
                  导出 Excel
                </button>
                <button
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  @click="handleExportRecord('pdf')"
                >
                  <FileTextIcon class="w-4 h-4" />
                  导出 PDF
                </button>
              </div>
            </div>
            <div class="divide-y divide-gray-100">
              <div
                v-for="record in sortedExportRecords"
                :key="record.exportId"
                class="p-4 hover:bg-gray-50 transition-colors"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div
                      class="p-2.5 rounded-xl"
                      :class="getExportTypeClass(record.exportType)"
                    >
                      <FileSpreadsheet v-if="record.exportType === 'excel'" class="w-6 h-6" />
                      <FileTextIcon v-else class="w-6 h-6" />
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-900">
                        {{ getExportTypeLabel(record.exportType) }} 导出
                      </p>
                      <p class="text-xs text-gray-500 mt-0.5">
                        导出范围：{{ record.exportRange }}
                      </p>
                      <p v-if="record.remark" class="text-xs text-gray-400 mt-0.5">
                        备注：{{ record.remark }}
                      </p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-sm text-gray-900">{{ record.exportDate }}</p>
                    <p class="text-xs text-gray-500 mt-0.5">{{ record.exporter }}</p>
                  </div>
                </div>
              </div>
              <div
                v-if="sortedExportRecords.length === 0"
                class="py-16 text-center"
              >
                <Download class="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p class="text-gray-500">暂无导出记录</p>
                <p class="text-sm text-gray-400 mt-1">点击右上角按钮导出材料清单</p>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'borrow-history'">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 class="text-base font-semibold text-gray-900 flex items-center gap-2">
                <History class="w-5 h-5 text-purple-600" />
                借阅历史
              </h3>
              <template v-if="canBorrow">
                <button
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  @click="openBorrowModal"
                >
                  <Plus class="w-4 h-4" />
                  新增借阅
                </button>
              </template>
            </div>
            <div class="divide-y divide-gray-100">
              <div
                v-for="record in sortedBorrowHistory"
                :key="record.borrowId"
                class="p-5 hover:bg-gray-50 transition-colors"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex items-start gap-4 flex-1 min-w-0">
                    <div
                      class="p-2.5 rounded-xl flex-shrink-0 mt-0.5"
                      :class="record.returnDate ? 'bg-green-50 text-green-600' : isOverdue(record) ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'"
                    >
                      <CheckCircle v-if="record.returnDate" class="w-6 h-6" />
                      <XCircle v-else-if="isOverdue(record)" class="w-6 h-6" />
                      <Clock v-else class="w-6 h-6" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-2 flex-wrap">
                        <span class="text-sm font-semibold text-gray-900">{{ record.borrower }}</span>
                        <span
                          v-if="record.returnDate"
                          class="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full"
                        >
                          已归还
                        </span>
                        <span
                          v-else-if="isOverdue(record)"
                          class="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full"
                        >
                          已逾期
                        </span>
                        <span
                          v-else
                          class="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full"
                        >
                          借阅中
                        </span>
                      </div>
                      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                        <div>
                          <p class="text-xs text-gray-500 mb-0.5">借阅日期</p>
                          <p class="text-sm text-gray-900">{{ record.borrowDate }}</p>
                        </div>
                        <div>
                          <p class="text-xs text-gray-500 mb-0.5">预计归还</p>
                          <p class="text-sm" :class="isOverdue(record) && !record.returnDate ? 'text-red-600 font-medium' : 'text-gray-900'">
                            {{ formatDate(record.expectedReturnDate) }}
                          </p>
                        </div>
                        <div>
                          <p class="text-xs text-gray-500 mb-0.5">实际归还</p>
                          <p class="text-sm text-gray-900">{{ formatDate(record.returnDate) }}</p>
                        </div>
                        <div v-if="record.approver">
                          <p class="text-xs text-gray-500 mb-0.5">审批人</p>
                          <p class="text-sm text-gray-900">{{ record.approver }}</p>
                        </div>
                      </div>
                      <div>
                        <p class="text-xs text-gray-500 mb-0.5">借阅事由</p>
                        <p class="text-sm text-gray-600">{{ record.borrowReason }}</p>
                      </div>
                      <div v-if="record.remark" class="mt-2">
                        <p class="text-xs text-gray-500 mb-0.5">备注</p>
                        <p class="text-sm text-gray-600">{{ record.remark }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                v-if="sortedBorrowHistory.length === 0"
                class="py-16 text-center"
              >
                <History class="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p class="text-gray-500">暂无借阅记录</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <BorrowFormModal
      :visible="showBorrowModal"
      :archive="archive"
      :mode="borrowMode"
      @close="showBorrowModal = false"
      @submit="handleBorrowSubmit"
    />
  </div>
</template>
