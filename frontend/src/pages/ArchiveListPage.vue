<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search,
  Plus,
  Filter,
  Archive,
  User,
  Calendar,
  MapPin,
  FileText,
  ChevronRight,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  X,
  AlertCircle,
} from 'lucide-vue-next'
import {
  getArchiveList,
  getClosedCasesWithoutArchive,
  createArchive as createNewArchive,
  generateArchiveCode,
  deleteArchive,
} from '@/mock/archives'
import { caseStatusMap } from '@/mock/data'
import { archiveStatusMap, ArchiveStatus, CaseStatus } from '@/types'
import type { CaseArchiveListItem, Case } from '@/types'

const router = useRouter()

const goToCaseList = () => {
  router.push({ name: 'case-list' })
}

const archives = ref<CaseArchiveListItem[]>([])
const searchQuery = ref('')
const statusFilter = ref<ArchiveStatus | 'all'>('all')
const keeperFilter = ref<string>('all')
const dateFrom = ref('')
const dateTo = ref('')

const showCreateModal = ref(false)
const showDeleteConfirm = ref(false)
const deletingArchive = ref<CaseArchiveListItem | null>(null)

const createForm = ref({
  caseId: '',
  archiveCode: '',
  physicalLocation: '',
  keeper: '',
  remark: '',
})

const formErrors = ref<Record<string, string>>({})
const availableCases = ref<Case[]>([])

const loadData = () => {
  archives.value = getArchiveList()
  availableCases.value = getClosedCasesWithoutArchive()
}

onMounted(() => {
  loadData()
})

const allKeepers = computed(() => {
  const keepers = new Set(archives.value.map(a => a.keeper))
  return Array.from(keepers)
})

const filteredArchives = computed(() => {
  return archives.value.filter(archive => {
    const matchesSearch = !searchQuery.value ||
      archive.caseName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      archive.archiveCode.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      archive.caseNumber.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      archive.keeper.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesStatus = statusFilter.value === 'all' || archive.archiveStatus === statusFilter.value

    const matchesKeeper = keeperFilter.value === 'all' || archive.keeper === keeperFilter.value

    const matchesDateFrom = !dateFrom.value || archive.archiveDate >= dateFrom.value
    const matchesDateTo = !dateTo.value || archive.archiveDate <= dateTo.value

    return matchesSearch && matchesStatus && matchesKeeper && matchesDateFrom && matchesDateTo
  })
})

const stats = computed(() => {
  return {
    total: archives.value.length,
    pending: archives.value.filter(a => a.archiveStatus === ArchiveStatus.PENDING).length,
    archived: archives.value.filter(a => a.archiveStatus === ArchiveStatus.ARCHIVED).length,
    borrowed: archives.value.filter(a => a.archiveStatus === ArchiveStatus.BORROWED).length,
    returned: archives.value.filter(a => a.archiveStatus === ArchiveStatus.RETURNED).length,
  }
})

const goToDetail = (archive: CaseArchiveListItem) => {
  router.push({ name: 'archive-detail', params: { id: archive.archiveId } })
}

const openCreateModal = () => {
  availableCases.value = getClosedCasesWithoutArchive()
  createForm.value = {
    caseId: '',
    archiveCode: generateArchiveCode(),
    physicalLocation: '',
    keeper: '档案管理员-李芳',
    remark: '',
  }
  formErrors.value = {}
  showCreateModal.value = true
}

const closeCreateModal = () => {
  showCreateModal.value = false
  createForm.value = {
    caseId: '',
    archiveCode: '',
    physicalLocation: '',
    keeper: '',
    remark: '',
  }
  formErrors.value = {}
}

const validateCreateForm = (): boolean => {
  const errors: Record<string, string> = {}

  if (!createForm.value.caseId) {
    errors.caseId = '请选择结案案件'
  }

  if (!createForm.value.archiveCode || !createForm.value.archiveCode.trim()) {
    errors.archiveCode = '请输入归档编号'
  }

  if (!createForm.value.physicalLocation || !createForm.value.physicalLocation.trim()) {
    errors.physicalLocation = '请输入存放位置'
  }

  if (!createForm.value.keeper || !createForm.value.keeper.trim()) {
    errors.keeper = '请输入保管人'
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleCreateSubmit = () => {
  if (!validateCreateForm()) return

  createNewArchive(createForm.value.caseId, {
    archiveCode: createForm.value.archiveCode.trim(),
    physicalLocation: createForm.value.physicalLocation.trim(),
    keeper: createForm.value.keeper.trim(),
    remark: createForm.value.remark.trim() || undefined,
  })

  loadData()
  closeCreateModal()
}

const confirmDelete = (archive: CaseArchiveListItem, event: MouseEvent) => {
  event.stopPropagation()
  deletingArchive.value = archive
  showDeleteConfirm.value = true
}

const executeDelete = () => {
  if (!deletingArchive.value) return
  deleteArchive(deletingArchive.value.archiveId)
  loadData()
  showDeleteConfirm.value = false
  deletingArchive.value = null
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  deletingArchive.value = null
}

const getSelectedCaseName = computed(() => {
  if (!createForm.value.caseId) return ''
  const caseItem = availableCases.value.find(c => c.id === createForm.value.caseId)
  return caseItem?.name || ''
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
              <h1 class="text-2xl font-bold text-gray-900">卷宗归档与借阅</h1>
              <p class="mt-1 text-sm text-gray-500">管理结案案件的电子归档和纸质卷宗流转</p>
            </div>
          </div>
          <button
            class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            @click="openCreateModal"
            :disabled="availableCases.length === 0"
            :class="{ 'opacity-50 cursor-not-allowed': availableCases.length === 0 }"
            :title="availableCases.length === 0 ? '暂无可归档的结案案件' : '新建归档'"
          >
            <Plus class="w-5 h-5" />
            新建归档
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-blue-50 rounded-lg">
              <Archive class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">归档总数</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.total }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle class="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">待归档</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.pending }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-green-50 rounded-lg">
              <CheckCircle class="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">已归档</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.archived }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-red-50 rounded-lg">
              <User class="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">已借出</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.borrowed }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-indigo-50 rounded-lg">
              <FileText class="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p class="text-sm text-gray-500">已归还</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.returned }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-gray-100">
          <div class="flex flex-col lg:flex-row gap-3">
            <div class="relative flex-1">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索案件名称、归档编号、案号或保管人..."
                class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <div class="flex items-center gap-2">
                <Filter class="w-5 h-5 text-gray-400" />
                <select
                  v-model="statusFilter"
                  class="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">全部状态</option>
                  <option :value="ArchiveStatus.PENDING">待归档</option>
                  <option :value="ArchiveStatus.ARCHIVED">已归档</option>
                  <option :value="ArchiveStatus.BORROWED">已借出</option>
                  <option :value="ArchiveStatus.RETURNED">已归还</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <User class="w-5 h-5 text-gray-400" />
                <select
                  v-model="keeperFilter"
                  class="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">全部保管人</option>
                  <option v-for="keeper in allKeepers" :key="keeper" :value="keeper">{{ keeper }}</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <Calendar class="w-5 h-5 text-gray-400" />
                <input
                  v-model="dateFrom"
                  type="date"
                  class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span class="text-gray-400">至</span>
                <input
                  v-model="dateTo"
                  type="date"
                  class="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="divide-y divide-gray-100">
          <div
            v-for="archive in filteredArchives"
            :key="archive.archiveId"
            class="p-5 hover:bg-gray-50 transition-colors cursor-pointer group"
            @click="goToDetail(archive)"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 mb-2 flex-wrap">
                  <span class="px-2.5 py-1 text-xs font-medium rounded-full border"
                    :class="archiveStatusMap[archive.archiveStatus].class">
                    {{ archiveStatusMap[archive.archiveStatus].label }}
                  </span>
                  <span class="text-xs text-gray-400 font-mono">{{ archive.archiveCode }}</span>
                  <span class="text-xs text-gray-400 font-mono">{{ archive.caseNumber }}</span>
                  <span class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                    {{ archive.caseType }}
                  </span>
                </div>
                <h3 class="text-base font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                  {{ archive.caseName }}
                </h3>
                <p class="mt-1.5 text-sm text-gray-500 line-clamp-2">
                  {{ archive.remark || '暂无备注' }}
                </p>
                <div class="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
                  <span class="flex items-center gap-1.5">
                    <User class="w-4 h-4" />
                    {{ archive.responsibleLawyer }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <MapPin class="w-4 h-4" />
                    {{ archive.physicalLocation }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <User class="w-4 h-4" />
                    保管：{{ archive.keeper }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <Calendar class="w-4 h-4" />
                    {{ archive.archiveDate }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <FileText class="w-4 h-4" />
                    {{ archive.materialCount }} 份材料
                  </span>
                  <template v-if="archive.borrower">
                    <span class="flex items-center gap-1.5 text-red-600">
                      <User class="w-4 h-4" />
                      借阅人：{{ archive.borrower }}（{{ archive.borrowDate }}）
                    </span>
                  </template>
                </div>
              </div>
              <div class="flex items-center gap-1 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="删除"
                  @click="confirmDelete(archive, $event)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
                <ChevronRight class="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all ml-1" />
              </div>
            </div>
          </div>

          <div
            v-if="filteredArchives.length === 0"
            class="py-16 text-center"
          >
            <Archive class="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p class="text-gray-500">没有找到匹配的归档记录</p>
            <p v-if="archives.length === 0" class="text-sm text-gray-400 mt-1">
              点击「新建归档」将已结案案件添加到归档系统
            </p>
          </div>
        </div>
      </div>
    </main>

    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="fixed inset-0 bg-black/50" @click="closeCreateModal"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-gray-900">新建归档</h3>
            <button
              class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              @click="closeCreateModal"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-5">
            <div v-if="availableCases.length === 0" class="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div class="flex items-start gap-3">
                <AlertCircle class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-amber-800">暂无可归档的案件</p>
                  <p class="text-xs text-amber-600 mt-1">
                    只有已结案（{{ caseStatusMap[CaseStatus.CLOSED].label }}）的案件才能创建归档记录。
                  </p>
                </div>
              </div>
            </div>

            <div v-else>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                选择案件 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="createForm.caseId"
                class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="{ 'border-red-300 bg-red-50': formErrors.caseId }"
                @blur="validateCreateForm"
              >
                <option value="">请选择要归档的结案案件</option>
                <option v-for="caseItem in availableCases" :key="caseItem.id" :value="caseItem.id">
                  {{ caseItem.caseNumber }} - {{ caseItem.name }}
                </option>
              </select>
              <p v-if="formErrors.caseId" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                {{ formErrors.caseId }}
              </p>
              <div v-if="createForm.caseId" class="mt-2 p-3 bg-blue-50 rounded-lg">
                <p class="text-xs text-blue-700">{{ getSelectedCaseName }}</p>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                归档编号 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="createForm.archiveCode"
                type="text"
                class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="{ 'border-red-300 bg-red-50': formErrors.archiveCode }"
                placeholder="例如：GD-2026-0001"
                @blur="validateCreateForm"
              />
              <p v-if="formErrors.archiveCode" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                {{ formErrors.archiveCode }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                存放位置 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="createForm.physicalLocation"
                type="text"
                class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="{ 'border-red-300 bg-red-50': formErrors.physicalLocation }"
                placeholder="例如：档案柜 A-03"
                @blur="validateCreateForm"
              />
              <p v-if="formErrors.physicalLocation" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                {{ formErrors.physicalLocation }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                保管人 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="createForm.keeper"
                type="text"
                class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="{ 'border-red-300 bg-red-50': formErrors.keeper }"
                placeholder="例如：档案管理员-李芳"
                @blur="validateCreateForm"
              />
              <p v-if="formErrors.keeper" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                {{ formErrors.keeper }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                备注说明
              </label>
              <textarea
                v-model="createForm.remark"
                rows="3"
                class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="输入归档备注说明..."
              ></textarea>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              class="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              @click="closeCreateModal"
            >
              取消
            </button>
            <button
              class="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm font-medium"
              @click="handleCreateSubmit"
              :disabled="availableCases.length === 0"
            >
              确认创建
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="fixed inset-0 bg-black/50" @click="cancelDelete"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
          <h3 class="text-lg font-bold text-gray-900 mb-2">确认删除</h3>
          <p class="text-sm text-gray-600 mb-1">
            确定要删除归档记录「<span class="font-semibold text-gray-900">{{ deletingArchive?.archiveCode }}</span>」吗？
          </p>
          <p class="text-sm text-red-600 mb-6">
            删除后，该归档的所有借阅历史和导出记录将被同步移除，此操作不可恢复。
          </p>
          <div class="flex items-center justify-end gap-3">
            <button
              class="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              @click="cancelDelete"
            >
              取消
            </button>
            <button
              class="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm font-medium"
              @click="executeDelete"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
