<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  Plus,
  Phone,
  Users,
  MessageCircle,
  Mail,
  FileWarning,
  Filter,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  AlertCircle,
  X,
  CheckCircle,
  MessageSquare,
  FileText,
  Briefcase,
  ChevronRight,
} from 'lucide-vue-next'
import type { CommunicationRecord, ContactType as ContactTypeType, Case } from '@/types'
import { ContactType, contactTypeMap } from '@/types'
import {
  getAllRecords,
  getFilteredRecords,
  getRecordsByCaseId,
  deleteCommunicationRecord,
  markAsFollowedUp,
  formatContactDate,
  formatContactDateShort,
  computeCommunicationSummary,
  mockCommunicationRecords,
  type CommunicationFilterOptions,
} from '@/mock/communicationRecords'
import { mockCases } from '@/mock/data'
import CommunicationRecordFormModal from '@/components/CommunicationRecordFormModal.vue'
import { usePermissions } from '@/composables/usePermissions'

const props = defineProps<{
  caseId?: string
  showCaseInfo?: boolean
  contactTypeFilter?: string
  followUpFilter?: boolean | 'all'
  startDate?: string
  endDate?: string
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'go-to-case-detail', caseId: string): void
}>()

const permissions = usePermissions()

const records = ref<CommunicationRecord[]>([])

const showFormModal = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingRecord = ref<CommunicationRecord | null>(null)

const showDeleteConfirm = ref(false)
const deletingRecord = ref<CommunicationRecord | null>(null)

const showDetail = ref(false)
const selectedRecord = ref<CommunicationRecord | null>(null)

const showFilters = ref(false)
const filters = ref<CommunicationFilterOptions>({
  contactType: (props.contactTypeFilter as ContactType | 'all') || 'all',
  startDate: props.startDate || '',
  endDate: props.endDate || '',
  isFollowedUp: props.followUpFilter !== undefined ? (props.followUpFilter === 'all' ? 'all' : props.followUpFilter) : 'all',
  caseId: props.caseId,
})

function getCaseById(caseId: string): Case | undefined {
  return mockCases.find(c => c.id === caseId)
}

const getCaseInfo = (caseId: string) => {
  const c = getCaseById(caseId)
  return c ? { name: c.name, caseNumber: c.caseNumber, status: c.status } : null
}

const allCases = computed(() => mockCases)

const loadRecords = () => {
  const filterOpts: CommunicationFilterOptions = {
    ...filters.value,
    caseId: props.caseId,
  }
  records.value = getFilteredRecords(filterOpts)
}

onMounted(() => {
  loadRecords()
})

watch([mockCommunicationRecords, () => props.caseId, () => props.contactTypeFilter, () => props.followUpFilter, () => props.startDate, () => props.endDate], () => {
  filters.value = {
    contactType: (props.contactTypeFilter as ContactType | 'all') || 'all',
    startDate: props.startDate || '',
    endDate: props.endDate || '',
    isFollowedUp: props.followUpFilter !== undefined ? (props.followUpFilter === 'all' ? 'all' : props.followUpFilter) : 'all',
    caseId: props.caseId,
  }
  loadRecords()
}, { deep: true })

const summary = computed(() => computeCommunicationSummary(props.caseId))

const goToCaseDetail = (caseId: string) => {
  emit('go-to-case-detail', caseId)
}

const groupedByCase = computed(() => {
  const groups: Record<string, { caseInfo: any; records: CommunicationRecord[] }> = {}

  records.value.forEach(record => {
    if (!groups[record.caseId]) {
      groups[record.caseId] = {
        caseInfo: getCaseInfo(record.caseId),
        records: [],
      }
    }
    groups[record.caseId].records.push(record)
  })

  return Object.keys(groups).map(caseId => ({
    caseId,
    caseInfo: groups[caseId].caseInfo,
    records: groups[caseId].records.sort(
      (a, b) => new Date(b.contactDate).getTime() - new Date(a.contactDate).getTime()
    ),
  })).sort((a, b) => {
    const aLatest = a.records[0]?.contactDate || ''
    const bLatest = b.records[0]?.contactDate || ''
    return new Date(bLatest).getTime() - new Date(aLatest).getTime()
  })
})

const contactTypeOptions = computed(() => [
  { value: 'all', label: '全部类型' },
  ...Object.values(ContactType).map(t => ({ value: t, label: contactTypeMap[t].label })),
])

const followUpOptions = [
  { value: 'all', label: '全部' },
  { value: 'true', label: '已跟进' },
  { value: 'false', label: '待跟进' },
]

const resetFilters = () => {
  filters.value = {
    contactType: 'all',
    startDate: '',
    endDate: '',
    isFollowedUp: 'all',
    caseId: props.caseId,
  }
  loadRecords()
}

const handleCreate = () => {
  formMode.value = 'create'
  editingRecord.value = null
  showFormModal.value = true
}

const handleEdit = (record: CommunicationRecord, event: MouseEvent) => {
  event.stopPropagation()
  formMode.value = 'edit'
  editingRecord.value = record
  showFormModal.value = true
}

const handleFormSubmit = (data: any) => {
  if (formMode.value === 'create') {
    const { recordId, isFollowedUp, ...createData } = data
    import('@/mock/communicationRecords').then(m => {
      m.createCommunicationRecord(createData)
      loadRecords()
      emit('refresh')
    })
  } else {
    const { recordId, ...updateData } = data
    import('@/mock/communicationRecords').then(m => {
      m.updateCommunicationRecord(recordId, updateData)
      loadRecords()
      emit('refresh')
    })
  }
  showFormModal.value = false
}

const confirmDelete = (record: CommunicationRecord, event: MouseEvent) => {
  event.stopPropagation()
  deletingRecord.value = record
  showDeleteConfirm.value = true
  showDetail.value = false
}

const executeDelete = () => {
  if (!deletingRecord.value) return
  deleteCommunicationRecord(deletingRecord.value.recordId)
  loadRecords()
  emit('refresh')
  showDeleteConfirm.value = false
  deletingRecord.value = null
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  deletingRecord.value = null
}

const openDetail = (record: CommunicationRecord) => {
  selectedRecord.value = record
  showDetail.value = true
}

const closeDetail = () => {
  showDetail.value = false
  selectedRecord.value = null
}

const handleMarkFollowedUp = (record: CommunicationRecord, event: MouseEvent) => {
  event.stopPropagation()
  markAsFollowedUp(record.recordId)
  loadRecords()
  emit('refresh')
}

const getTypeIcon = (type: ContactTypeType) => {
  switch (type) {
    case ContactType.PHONE: return Phone
    case ContactType.MEETING: return Users
    case ContactType.WECHAT: return MessageCircle
    case ContactType.EMAIL: return Mail
    case ContactType.MATERIAL_REMINDER: return FileWarning
    default: return MessageSquare
  }
}

const getTypeIconColor = (type: ContactTypeType): string => {
  switch (type) {
    case ContactType.PHONE: return 'text-green-500 bg-green-50'
    case ContactType.MEETING: return 'text-blue-500 bg-blue-50'
    case ContactType.WECHAT: return 'text-emerald-500 bg-emerald-50'
    case ContactType.EMAIL: return 'text-purple-500 bg-purple-50'
    case ContactType.MATERIAL_REMINDER: return 'text-amber-500 bg-amber-50'
    default: return 'text-gray-500 bg-gray-50'
  }
}

const getDateLabel = (dateStr: string): string => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((now.getTime() - target.getTime()) / (24 * 60 * 60 * 1000))
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff < 7) return `${diff}天前`
  return ''
}


</script>

<template>
  <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-cyan-50">
          <MessageSquare class="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <h2 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
            沟通记录时间轴
            <span
              v-if="summary.pendingFollowUp > 0"
              class="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full"
            >
              <AlertCircle class="w-3 h-3" />
              待跟进 {{ summary.pendingFollowUp }}
            </span>
          </h2>
          <p class="text-xs text-gray-500 mt-0.5">
            按案件聚合 · 共 {{ summary.total }} 条记录
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          :class="showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'text-gray-600'"
          @click="showFilters = !showFilters"
        >
          <Filter class="w-3.5 h-3.5" />
          筛选
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          @click="handleCreate"
        >
          <Plus class="w-4 h-4" />
          新增记录
        </button>
      </div>
    </div>

    <div
      v-if="showFilters"
      class="px-5 py-4 border-b border-gray-100 bg-gray-50 space-y-3"
    >
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div v-if="!caseId">
          <label class="text-xs text-gray-500 mb-1 block">案件</label>
          <select
            v-model="filters.caseId"
            class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="loadRecords"
          >
            <option value="">全部案件</option>
            <option v-for="c in allCases" :key="c.id" :value="c.id">
              {{ c.caseNumber }} - {{ c.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1 block">沟通类型</label>
          <select
            v-model="filters.contactType"
            class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="loadRecords"
          >
            <option v-for="opt in contactTypeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1 block">跟进状态</label>
          <select
            v-model="filters.isFollowedUp"
            class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="loadRecords"
          >
            <option v-for="opt in followUpOptions" :key="opt.value" :value="opt.value === 'all' ? 'all' : (opt.value === 'true')">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1 block">开始日期</label>
          <input
            v-model="filters.startDate"
            type="date"
            class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="loadRecords"
          />
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1 block">结束日期</label>
          <input
            v-model="filters.endDate"
            type="date"
            class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="loadRecords"
          />
        </div>
      </div>
      <div class="flex justify-end">
        <button
          class="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
          @click="resetFilters"
        >
          重置筛选
        </button>
      </div>
    </div>

    <div class="p-5">
      <div v-if="groupedByCase.length === 0" class="py-16 text-center">
        <MessageSquare class="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p class="text-sm text-gray-500 mb-4">暂无沟通记录</p>
        <button
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          @click="handleCreate"
        >
          <Plus class="w-4 h-4" />
          新增记录
        </button>
      </div>

      <div v-else class="space-y-8">
        <div v-for="group in groupedByCase" :key="group.caseId" class="relative">
          <div
            v-if="showCaseInfo !== false"
            class="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group/case"
            @click="goToCaseDetail(group.caseId)"
          >
            <div class="p-2 bg-white rounded-lg shadow-sm">
              <Briefcase class="w-4 h-4 text-blue-600" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-semibold text-gray-900 truncate">
                  {{ group.caseInfo?.name }}
                </h3>
                <ChevronRight class="w-4 h-4 text-gray-400 opacity-0 group-hover/case:opacity-100 transition-opacity" />
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-gray-400 font-mono">{{ group.caseInfo?.caseNumber }}</span>
                <span
                  v-if="group.caseInfo"
                  class="text-[11px] px-1.5 py-0.5 rounded-full border"
                  :class="{
                    'bg-yellow-100 text-yellow-800 border-yellow-200': group.caseInfo.status === 'pending',
                    'bg-blue-100 text-blue-800 border-blue-200': group.caseInfo.status === 'in_progress',
                    'bg-gray-100 text-gray-800 border-gray-200': group.caseInfo.status === 'closed',
                  }"
                >
                  {{ group.caseInfo?.status === 'pending' ? '待处理' : group.caseInfo?.status === 'in_progress' ? '进行中' : '已结案' }}
                </span>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-xs text-gray-500">沟通记录</p>
              <p class="text-sm font-semibold text-gray-900">{{ group.records.length }} 条</p>
            </div>
          </div>

          <div class="relative pl-8">
            <div
              class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"
              aria-hidden="true"
            ></div>

            <div class="space-y-4">
              <div
                v-for="record in group.records"
                :key="record.recordId"
                class="relative"
              >
                <div class="absolute -left-8 top-0 mt-1">
                  <div
                    class="w-9 h-9 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center z-10 shadow-sm"
                    :class="[
                      getDateLabel(record.contactDate) === '今天' ? 'border-cyan-500 ring-4 ring-cyan-100' : '',
                    ]"
                  >
                    <component :is="getTypeIcon(record.contactType)" class="w-4 h-4" :class="getTypeIconColor(record.contactType).split(' ')[0]" />
                  </div>
                </div>

                <div
                  class="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden group"
                >
                  <div class="p-4">
                    <div class="flex items-start justify-between gap-3 mb-2">
                      <div class="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                        <span
                          class="px-2 py-0.5 text-xs font-medium rounded-full border flex-shrink-0"
                          :class="contactTypeMap[record.contactType].class"
                        >
                          {{ contactTypeMap[record.contactType].label }}
                        </span>
                        <span
                          v-if="record.isFollowedUp"
                          class="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700 border border-green-200 flex items-center gap-0.5 flex-shrink-0"
                        >
                          <CheckCircle class="w-3 h-3" />
                          已跟进
                        </span>
                        <span
                          v-else
                          class="px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-0.5 flex-shrink-0"
                        >
                          <Clock class="w-3 h-3" />
                          待跟进
                        </span>
                        <button
                          v-if="!record.isFollowedUp"
                          class="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1 hover:bg-green-200"
                          @click.stop="handleMarkFollowedUp(record, $event)"
                        >
                          <CheckCircle2 class="w-3 h-3" />
                          标记跟进
                        </button>
                      </div>
                      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          @click.stop="openDetail(record)"
                          title="查看详情"
                        >
                          <FileText class="w-4 h-4" />
                        </button>
                        <button
                          v-if="permissions.canEditCase"
                          class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          @click.stop="handleEdit(record, $event)"
                          title="编辑"
                        >
                          <Edit3 class="w-4 h-4" />
                        </button>
                        <button
                          v-if="permissions.canDeleteCase"
                          class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          @click.stop="confirmDelete(record, $event)"
                          title="删除"
                        >
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div class="flex items-baseline gap-2 mb-2">
                      <span
                        v-if="getDateLabel(record.contactDate)"
                        class="text-xs font-medium px-2 py-0.5 rounded"
                        :class="[
                          getDateLabel(record.contactDate) === '今天'
                            ? 'text-cyan-600 bg-cyan-50'
                            : 'text-gray-500 bg-gray-100',
                        ]"
                      >
                        {{ getDateLabel(record.contactDate) }}
                      </span>
                      <span class="text-xs text-gray-400">{{ formatContactDate(record.contactDate) }}</span>
                    </div>

                    <p class="text-sm text-gray-900 mb-2 line-clamp-2">{{ record.summary }}</p>

                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span class="flex items-center gap-1">
                        <User class="w-3.5 h-3.5 flex-shrink-0" />
                        {{ record.participants }}
                      </span>
                      <span v-if="record.relatedMaterials && record.relatedMaterials.length > 0" class="text-gray-400">
                        关联 {{ record.relatedMaterials.length }} 项材料
                      </span>
                    </div>

                    <div
                      v-if="record.nextAction"
                      class="mt-3 pt-3 border-t border-gray-100"
                    >
                      <p class="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <Clock class="w-3 h-3" />
                        后续行动
                      </p>
                      <p class="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
                        {{ record.nextAction }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CommunicationRecordFormModal
      :visible="showFormModal"
      :mode="formMode"
      :record-data="editingRecord"
      :default-case-id="caseId"
      @close="showFormModal = false"
      @submit="handleFormSubmit"
    />

    <Teleport to="body">
      <div
        v-if="showDetail && selectedRecord"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="closeDetail"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                class="p-2 rounded-lg"
                :class="`${contactTypeMap[selectedRecord.contactType].class.split(' ')[0]}`"
              >
                <component
                  :is="getTypeIcon(selectedRecord.contactType)"
                  class="w-5 h-5"
                  :class="contactTypeMap[selectedRecord.contactType].class.split(' ')[1]"
                />
              </div>
              <div>
                <h3 class="text-base font-semibold text-gray-900">沟通记录详情</h3>
                <div class="flex items-center gap-2 mt-0.5">
                  <span
                    class="px-2 py-0.5 text-xs font-medium rounded-full border"
                    :class="contactTypeMap[selectedRecord.contactType].class"
                  >
                    {{ contactTypeMap[selectedRecord.contactType].label }}
                  </span>
                  <span
                    v-if="selectedRecord.isFollowedUp"
                    class="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700 border border-green-200 flex items-center gap-0.5"
                  >
                    <CheckCircle class="w-3 h-3" />
                    已跟进
                  </span>
                  <span
                    v-else
                    class="px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-0.5"
                  >
                    <Clock class="w-3 h-3" />
                    待跟进
                  </span>
                </div>
              </div>
            </div>
            <button
              class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              @click="closeDetail"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div class="p-3 bg-gray-50 rounded-lg">
              <p class="text-xs text-gray-500 mb-1">关联案件</p>
              <button
                class="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline text-left"
                @click="goToCaseDetail(selectedRecord.caseId)"
              >
                {{ getCaseInfo(selectedRecord.caseId)?.name }}
              </button>
              <p class="text-xs text-gray-400 mt-1">{{ getCaseInfo(selectedRecord.caseId)?.caseNumber }}</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Calendar class="w-3 h-3" />
                  沟通时间
                </p>
                <p class="text-sm font-medium text-gray-900">{{ formatContactDate(selectedRecord.contactDate) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <User class="w-3 h-3" />
                  创建人
                </p>
                <p class="text-sm font-medium text-gray-900">{{ selectedRecord.creator }}</p>
              </div>
            </div>

            <div>
              <p class="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Users class="w-3 h-3" />
                参与人员
              </p>
              <p class="text-sm text-gray-900">{{ selectedRecord.participants }}</p>
            </div>

            <div>
              <p class="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <FileText class="w-3 h-3" />
                沟通摘要
              </p>
              <p class="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3">
                {{ selectedRecord.summary }}
              </p>
            </div>

            <div v-if="selectedRecord.nextAction">
              <p class="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Clock class="w-3 h-3" />
                后续行动
              </p>
              <p class="text-sm text-gray-700 leading-relaxed bg-blue-50 rounded-lg p-3 text-blue-800">
                {{ selectedRecord.nextAction }}
              </p>
            </div>

            <div class="pt-2 border-t border-gray-100 text-xs text-gray-400 space-y-0.5">
              <p>创建时间：{{ formatContactDate(selectedRecord.createdAt) }}</p>
              <p>更新时间：{{ formatContactDate(selectedRecord.updatedAt) }}</p>
              <p v-if="selectedRecord.followedUpAt">跟进时间：{{ formatContactDate(selectedRecord.followedUpAt) }}</p>
            </div>
          </div>

          <div class="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              v-if="permissions.canDeleteCase"
              class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              @click="confirmDelete(selectedRecord, $event)"
              title="删除"
            >
              <Trash2 class="w-4 h-4" />
            </button>
            <button
              v-if="!selectedRecord.isFollowedUp && permissions.canEditCase"
              class="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
              @click="handleMarkFollowedUp(selectedRecord, $event); closeDetail()"
            >
              <CheckCircle2 class="w-3.5 h-3.5" />
              标记已跟进
            </button>
            <button
              v-if="permissions.canEditCase"
              class="px-3 py-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5"
              @click="handleEdit(selectedRecord, $event); closeDetail()"
            >
              <Edit3 class="w-3.5 h-3.5" />
              编辑
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="showDeleteConfirm && deletingRecord"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="cancelDelete"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100">
            <h3 class="text-base font-semibold text-gray-900">确认删除</h3>
          </div>
          <div class="px-5 py-5">
            <p class="text-sm text-gray-600">
              确定要删除这条沟通记录吗？
            </p>
            <p class="text-xs text-gray-500 mt-2">删除后不可恢复。</p>
          </div>
          <div class="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              class="px-4 py-2 text-sm text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
              @click="cancelDelete"
            >
              取消
            </button>
            <button
              class="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
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
