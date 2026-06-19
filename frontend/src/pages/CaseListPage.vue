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
  Edit3,
  Trash2,
  AlertTriangle,
} from 'lucide-vue-next'
import { mockCases, caseStatusMap, generateId } from '@/mock/data'
import { countFiles } from '@/utils/treeUtils'
import { CaseStatus } from '@/types'
import type { Case, CaseStatus as CaseStatusType } from '@/types'
import CaseFormModal from '@/components/CaseFormModal.vue'
import { getMissingCount } from '@/utils/caseWorkflow'

const router = useRouter()

const cases = ref<Case[]>([...mockCases])
const searchQuery = ref('')
const statusFilter = ref<CaseStatusType | 'all'>('all')
const missingFilter = ref<'all' | 'has_missing' | 'no_missing'>('all')

const showFormModal = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingCase = ref<Case | null>(null)

const showDeleteConfirm = ref(false)
const deletingCase = ref<Case | null>(null)

const filteredCases = computed(() => {
  return cases.value.filter(c => {
    const matchesSearch = !searchQuery.value ||
      c.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      c.client.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesStatus = statusFilter.value === 'all' || c.status === statusFilter.value

    const missingCount = getMissingCount(c)
    const matchesMissing =
      missingFilter.value === 'all' ||
      (missingFilter.value === 'has_missing' && missingCount > 0) ||
      (missingFilter.value === 'no_missing' && missingCount === 0)

    return matchesSearch && matchesStatus && matchesMissing
  })
})

const casesWithMissing = computed(() => cases.value.filter(c => getMissingCount(c) > 0).length)

const goToDetail = (caseItem: Case) => {
  router.push({ name: 'case-detail', params: { id: caseItem.id } })
}

const getFileCount = (caseItem: Case) => countFiles(caseItem.materials)
const getCaseMissingCount = (caseItem: Case) => getMissingCount(caseItem)

const handleCreate = () => {
  formMode.value = 'create'
  editingCase.value = null
  showFormModal.value = true
}

const handleEdit = (caseItem: Case, event: MouseEvent) => {
  event.stopPropagation()
  formMode.value = 'edit'
  editingCase.value = caseItem
  showFormModal.value = true
}

const handleFormSubmit = (data: Omit<Case, 'id' | 'materials'> & { id?: string }) => {
  if (formMode.value === 'create') {
    const newCase: Case = {
      ...data,
      id: generateId(),
      materials: [],
    }
    cases.value = [...cases.value, newCase]
    const idx = mockCases.findIndex(c => c.id === newCase.id)
    if (idx === -1) {
      mockCases.push(newCase)
    }
  } else {
    const id = data.id!
    cases.value = cases.value.map(c =>
      c.id === id ? { ...c, ...data, id } : c
    )
    const idx = mockCases.findIndex(c => c.id === id)
    if (idx !== -1) {
      mockCases[idx] = { ...mockCases[idx], ...data, id }
    }
  }
  showFormModal.value = false
}

const confirmDelete = (caseItem: Case, event: MouseEvent) => {
  event.stopPropagation()
  deletingCase.value = caseItem
  showDeleteConfirm.value = true
}

const executeDelete = () => {
  if (!deletingCase.value) return
  const id = deletingCase.value.id
  cases.value = cases.value.filter(c => c.id !== id)
  const idx = mockCases.findIndex(c => c.id === id)
  if (idx !== -1) {
    mockCases.splice(idx, 1)
  }
  showDeleteConfirm.value = false
  deletingCase.value = null
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  deletingCase.value = null
}
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
          <button
            class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            @click="handleCreate"
          >
            <Plus class="w-5 h-5" />
            新建案件
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
              <p class="text-2xl font-bold text-gray-900">{{ cases.filter(c => c.status === CaseStatus.PENDING).length }}</p>
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
              <p class="text-2xl font-bold text-gray-900">{{ cases.filter(c => c.status === CaseStatus.IN_PROGRESS).length }}</p>
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
              <p class="text-2xl font-bold text-gray-900">{{ cases.filter(c => c.status === CaseStatus.CLOSED).length }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-3 rounded-lg" :class="casesWithMissing > 0 ? 'bg-orange-50' : 'bg-emerald-50'">
              <AlertTriangle class="w-6 h-6" :class="casesWithMissing > 0 ? 'text-orange-600' : 'text-emerald-600'" />
            </div>
            <div>
              <p class="text-sm text-gray-500">材料缺失</p>
              <p class="text-2xl font-bold" :class="casesWithMissing > 0 ? 'text-orange-600' : 'text-emerald-600'">{{ casesWithMissing }}</p>
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
                placeholder="搜索案件名称、案号或当事人..."
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
                  <option value="pending">待处理</option>
                  <option value="in_progress">进行中</option>
                  <option value="closed">已结案</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <AlertTriangle class="w-5 h-5 text-gray-400" />
                <select
                  v-model="missingFilter"
                  class="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">全部材料状态</option>
                  <option value="has_missing">材料缺失</option>
                  <option value="no_missing">材料齐备</option>
                </select>
              </div>
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
                <div class="flex items-center gap-3 mb-2 flex-wrap">
                  <span class="px-2.5 py-1 text-xs font-medium rounded-full border"
                    :class="caseStatusMap[caseItem.status].class">
                    {{ caseStatusMap[caseItem.status].label }}
                  </span>
                  <span class="text-xs text-gray-400 font-mono">{{ caseItem.caseNumber }}</span>
                  <span class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                    {{ caseItem.caseType }}
                  </span>
                  <span
                    v-if="getCaseMissingCount(caseItem) > 0"
                    class="px-2 py-0.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded flex items-center gap-1"
                  >
                    <AlertTriangle class="w-3 h-3" />
                    材料缺失 {{ getCaseMissingCount(caseItem) }} 项
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
              <div class="flex items-center gap-1 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="编辑"
                  @click="handleEdit(caseItem, $event)"
                >
                  <Edit3 class="w-4 h-4" />
                </button>
                <button
                  class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="删除"
                  @click="confirmDelete(caseItem, $event)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
                <ChevronRight class="w-5 h-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all ml-1" />
              </div>
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

    <CaseFormModal
      :visible="showFormModal"
      :mode="formMode"
      :case-data="editingCase"
      @close="showFormModal = false"
      @submit="handleFormSubmit"
    />

    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="fixed inset-0 bg-black/50" @click="cancelDelete"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
          <h3 class="text-lg font-bold text-gray-900 mb-2">确认删除</h3>
          <p class="text-sm text-gray-600 mb-1">
            确定要删除案件「<span class="font-semibold text-gray-900">{{ deletingCase?.name }}</span>」吗？
          </p>
          <p class="text-sm text-red-600 mb-6">
            删除后，该案件的所有材料数据将被同步移除，此操作不可恢复。
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
