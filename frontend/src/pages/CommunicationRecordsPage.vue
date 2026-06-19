<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  MessageSquare,
  List,
  GitBranch,
  Plus,
  Filter,
  Phone,
  Users,
  MessageCircle,
  Mail,
  FileWarning,
  AlertCircle,
} from 'lucide-vue-next'
import CommunicationRecordList from '@/components/CommunicationRecordList.vue'
import CommunicationTimelineView from '@/components/CommunicationTimelineView.vue'
import CommunicationRecordFormModal from '@/components/CommunicationRecordFormModal.vue'
import {
  computeCommunicationSummary,
  mockCommunicationRecords,
} from '@/mock/communicationRecords'
import { mockCases } from '@/mock/data'
import { ContactType, contactTypeMap } from '@/types'
import type { CommunicationSummary } from '@/types'

type ViewMode = 'list' | 'timeline'

const router = useRouter()
const route = useRoute()

const viewMode = ref<ViewMode>('list')
const showFormModal = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingRecordId = ref<string | null>(null)

const caseFilter = ref<string>('all')
const contactTypeFilter = ref<string>('all')
const followUpFilter = ref<string>('all')
const startDate = ref('')
const endDate = ref('')
const showFilters = ref(false)

const viewOptions: Array<{ key: ViewMode; label: string; icon: any }> = [
  { key: 'list', label: '列表视图', icon: List },
  { key: 'timeline', label: '时间轴视图', icon: GitBranch },
]

const caseOptions = computed(() => [
  { value: 'all', label: '全部案件' },
  ...mockCases.map(c => ({ value: c.id, label: `${c.caseNumber} - ${c.name}` })),
])

const contactTypeOptions = computed(() => [
  { value: 'all', label: '全部类型' },
  ...Object.values(ContactType).map(t => ({ value: t, label: contactTypeMap[t].label })),
])

const followUpOptions = [
  { value: 'all', label: '全部' },
  { value: 'true', label: '已跟进' },
  { value: 'false', label: '待跟进' },
]

const summary = computed<CommunicationSummary>(() => {
  if (caseFilter.value === 'all') {
    return computeCommunicationSummary()
  }
  return computeCommunicationSummary(caseFilter.value)
})

onMounted(() => {
  if (route.query.caseId && typeof route.query.caseId === 'string') {
    caseFilter.value = route.query.caseId
  }
  if (route.query.view && typeof route.query.view === 'string') {
    viewMode.value = route.query.view === 'timeline' ? 'timeline' : 'list'
  }
})

watch([caseFilter, viewMode], ([newCaseId, newViewMode]) => {
  router.replace({
    query: {
      ...route.query,
      caseId: newCaseId === 'all' ? undefined : newCaseId,
      view: newViewMode === 'timeline' ? 'timeline' : undefined,
    },
  })
})

const handleCreate = () => {
  formMode.value = 'create'
  editingRecordId.value = null
  showFormModal.value = true
}

const handleFormSubmit = () => {
  showFormModal.value = false
  editingRecordId.value = null
}

const handleFormCancel = () => {
  showFormModal.value = false
  editingRecordId.value = null
}

const resetFilters = () => {
  caseFilter.value = 'all'
  contactTypeFilter.value = 'all'
  followUpFilter.value = 'all'
  startDate.value = ''
  endDate.value = ''
}

const goToCaseDetail = (caseId: string) => {
  router.push({ name: 'case-detail', params: { id: caseId }, query: { tab: 'communication' } })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
      <div class="max-w-[1600px] mx-auto px-6 py-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-4 min-w-0">
            <div class="p-2 bg-cyan-50 rounded-lg">
              <MessageSquare class="w-6 h-6 text-cyan-600" />
            </div>
            <div class="min-w-0">
              <h1 class="text-xl font-bold text-gray-900">客户沟通记录</h1>
              <p class="text-xs text-gray-500 mt-0.5">
                共 {{ summary.total }} 条记录 · 待跟进 {{ summary.pendingFollowUp }} 条
              </p>
            </div>
          </div>
          <button
            class="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            @click="handleCreate"
          >
            <Plus class="w-4 h-4" />
            新增记录
          </button>
        </div>
      </div>
    </header>

    <div class="max-w-[1600px] mx-auto px-6 py-6">
      <div class="grid grid-cols-5 gap-3 mb-6">
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-green-50 rounded-lg">
              <Phone class="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ summary.phone }}</p>
              <p class="text-xs text-gray-500">来电</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-50 rounded-lg">
              <Users class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ summary.meeting }}</p>
              <p class="text-xs text-gray-500">面谈</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-emerald-50 rounded-lg">
              <MessageCircle class="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ summary.wechat }}</p>
              <p class="text-xs text-gray-500">微信</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-purple-50 rounded-lg">
              <Mail class="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ summary.email }}</p>
              <p class="text-xs text-gray-500">邮件</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-amber-50 rounded-lg">
              <FileWarning class="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ summary.materialReminder }}</p>
              <p class="text-xs text-gray-500">催材料</p>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-2">
            <div class="flex bg-gray-100 rounded-lg p-1">
              <button
                v-for="opt in viewOptions"
                :key="opt.key"
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                :class="[
                  viewMode === opt.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                ]"
                @click="viewMode = opt.key"
              >
                <component :is="opt.icon" class="w-3.5 h-3.5" />
                {{ opt.label }}
              </button>
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
          </div>
        </div>

        <div
          v-if="showFilters"
          class="px-5 py-4 border-b border-gray-100 bg-gray-50 space-y-3"
        >
          <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label class="text-xs text-gray-500 mb-1 block">关联案件</label>
              <select
                v-model="caseFilter"
                class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option v-for="opt in caseOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="text-xs text-gray-500 mb-1 block">沟通类型</label>
              <select
                v-model="contactTypeFilter"
                class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option v-for="opt in contactTypeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="text-xs text-gray-500 mb-1 block">跟进状态</label>
              <select
                v-model="followUpFilter"
                class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option v-for="opt in followUpOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="text-xs text-gray-500 mb-1 block">开始日期</label>
              <input
                v-model="startDate"
                type="date"
                class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="text-xs text-gray-500 mb-1 block">结束日期</label>
              <input
                v-model="endDate"
                type="date"
                class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button
              class="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
              @click="resetFilters"
            >
              重置筛选
            </button>
          </div>
        </div>
      </div>

      <div v-show="viewMode === 'list'">
        <CommunicationRecordList
          :case-id="caseFilter === 'all' ? undefined : caseFilter"
          :show-header="false"
          :show-stats="false"
        />
      </div>

      <div v-show="viewMode === 'timeline'">
        <CommunicationTimelineView
          :case-id="caseFilter === 'all' ? undefined : caseFilter"
          :contact-type-filter="contactTypeFilter === 'all' ? undefined : contactTypeFilter"
          :follow-up-filter="followUpFilter === 'all' ? undefined : followUpFilter === 'true'"
          :start-date="startDate || undefined"
          :end-date="endDate || undefined"
          @go-to-case-detail="goToCaseDetail"
        />
      </div>
    </div>

    <Teleport to="body">
      <CommunicationRecordFormModal
        v-if="showFormModal"
        :visible="showFormModal"
        :mode="formMode"
        :case-id="caseFilter === 'all' ? undefined : caseFilter"
        :record-id="editingRecordId"
        @submit="handleFormSubmit"
        @cancel="handleFormCancel"
      />
    </Teleport>
  </div>
</template>
