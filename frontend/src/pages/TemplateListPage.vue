<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  FileText,
  Plus,
  Search,
  Edit3,
  Trash2,
  Copy,
  Download,
  Filter,
  FileSpreadsheet,
  FileType,
  X,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-vue-next'
import type { DocumentTemplate, TemplateType } from '@/types'
import { TemplateType as TT, templateTypeMap, OutputFormat, outputFormatMap } from '@/types'
import { getTemplates, deleteTemplate, createDefaultTemplate, updateTemplate, getGenerationRecordsByTemplateId } from '@/mock/documentTemplates'

const router = useRouter()

const templates = ref<DocumentTemplate[]>([])
const searchKeyword = ref('')
const filterType = ref<TemplateType | 'all'>('all')
const showDeleteDialog = ref(false)
const pendingDeleteId = ref<string | null>(null)
const expandedTemplateId = ref<string | null>(null)

const templateTypeOptions = [
  { value: 'all', label: '全部类型' },
  ...Object.entries(templateTypeMap).map(([value, { label }]) => ({ value, label })),
]

onMounted(() => {
  loadTemplates()
})

const loadTemplates = () => {
  templates.value = getTemplates()
}

const filteredTemplates = computed(() => {
  return templates.value.filter(t => {
    if (filterType.value !== 'all' && t.type !== filterType.value) return false
    if (searchKeyword.value.trim()) {
      const keyword = searchKeyword.value.toLowerCase()
      return (
        t.name.toLowerCase().includes(keyword) ||
        t.description?.toLowerCase().includes(keyword)
      )
    }
    return true
  })
})

const templateCounts = computed(() => {
  const counts: Record<string, number> = { all: templates.value.length }
  Object.values(TT).forEach(type => {
    counts[type] = templates.value.filter(t => t.type === type).length
  })
  return counts
})

const getTypeIcon = (type: TemplateType) => {
  switch (type) {
    case TT.CASE_COVER:
      return FileText
    case TT.EVIDENCE_LIST:
      return FileSpreadsheet
    case TT.MATERIAL_TRANSFER:
      return FileType
    case TT.ENTRUSTMENT_LIST:
      return FileText
    default:
      return FileText
  }
}

const getTypeColor = (type: TemplateType) => {
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

const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

const getUsageCount = (templateId: string): number => {
  return getGenerationRecordsByTemplateId(templateId).length
}

const goToEdit = (templateId: string) => {
  router.push({ name: 'template-edit', params: { id: templateId } })
}

const goToCreate = () => {
  router.push({ name: 'template-create' })
}

const goToRecords = (templateId: string) => {
  router.push({ name: 'generation-records', query: { templateId } })
}

const confirmDelete = (templateId: string) => {
  pendingDeleteId.value = templateId
  showDeleteDialog.value = true
}

const cancelDelete = () => {
  showDeleteDialog.value = false
  pendingDeleteId.value = null
}

const handleDelete = () => {
  if (!pendingDeleteId.value) return
  if (deleteTemplate(pendingDeleteId.value)) {
    loadTemplates()
  }
  cancelDelete()
}

const duplicateTemplate = (template: DocumentTemplate) => {
  const newTemplate = createDefaultTemplate(template.type, `${template.name} (副本)`)
  newTemplate.contentSchema = JSON.parse(JSON.stringify(template.contentSchema))
  newTemplate.enabledFields = [...template.enabledFields]
  newTemplate.outputFormat = template.outputFormat
  newTemplate.description = template.description ? `${template.description} (副本)` : ''
  updateTemplate(newTemplate.templateId, {
    contentSchema: newTemplate.contentSchema,
    enabledFields: newTemplate.enabledFields,
    outputFormat: newTemplate.outputFormat,
    description: newTemplate.description,
  })
  loadTemplates()
}

const toggleExpand = (templateId: string) => {
  expandedTemplateId.value = expandedTemplateId.value === templateId ? null : templateId
}

const clearFilters = () => {
  searchKeyword.value = ''
  filterType.value = 'all'
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
      <div class="max-w-[1600px] mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-indigo-100 rounded-lg">
              <FileText class="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-900">文书模板管理</h1>
              <p class="text-sm text-gray-500">管理案件文书的生成模板</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <button
              class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              @click="goToCreate"
            >
              <Plus class="w-4 h-4" />
              新建模板
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-[1600px] mx-auto px-6 py-6">
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div
          v-for="opt in templateTypeOptions"
          :key="opt.value"
          class="bg-white rounded-xl border p-4 cursor-pointer transition-all"
          :class="[
            filterType === opt.value
              ? 'border-indigo-500 ring-2 ring-indigo-100'
              : 'border-gray-200 hover:border-gray-300',
          ]"
          @click="filterType = opt.value as TemplateType | 'all'"
        >
          <p class="text-xs text-gray-500 mb-1">{{ opt.label }}</p>
          <p class="text-2xl font-bold" :class="filterType === opt.value ? 'text-indigo-600' : 'text-gray-900'">
            {{ templateCounts[opt.value] || 0 }}
          </p>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div class="p-4 border-b border-gray-100 flex flex-wrap items-center gap-4">
          <div class="flex-1 min-w-[240px] relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索模板名称或描述..."
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
              v-model="filterType"
              class="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              <option v-for="opt in templateTypeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
          <button
            v-if="searchKeyword || filterType !== 'all'"
            class="text-sm text-indigo-600 hover:text-indigo-700"
            @click="clearFilters"
          >
            清除筛选
          </button>
        </div>

        <div v-if="filteredTemplates.length === 0" class="py-16 text-center">
          <FileText class="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p class="text-gray-500 mb-2">暂无符合条件的模板</p>
          <p class="text-sm text-gray-400">尝试调整筛选条件或创建新模板</p>
        </div>

        <div v-else class="divide-y divide-gray-100">
          <div
            v-for="template in filteredTemplates"
            :key="template.templateId"
            class="hover:bg-gray-50 transition-colors"
          >
            <div class="p-4 flex items-center gap-4">
              <div
                class="p-2.5 rounded-lg flex-shrink-0"
                :class="getTypeColor(template.type)"
              >
                <component :is="getTypeIcon(template.type)" class="w-5 h-5" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-medium text-gray-900 truncate">{{ template.name }}</h3>
                  <span
                    v-if="template.isDefault"
                    class="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1"
                  >
                    <CheckCircle class="w-3 h-3" />
                    默认模板
                  </span>
                  <span
                    class="px-2 py-0.5 text-xs rounded-full border"
                    :class="getTypeColor(template.type)"
                  >
                    {{ templateTypeMap[template.type].label }}
                  </span>
                </div>
                <p v-if="template.description" class="text-sm text-gray-500 truncate">
                  {{ template.description }}
                </p>
                <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span class="flex items-center gap-1">
                    <Download class="w-3 h-3" />
                    {{ outputFormatMap[template.outputFormat].label }}
                  </span>
                  <span class="flex items-center gap-1">
                    <FileText class="w-3 h-3" />
                    {{ template.enabledFields.length }} 个字段
                  </span>
                  <span class="flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    {{ getUsageCount(template.templateId) }} 次使用
                  </span>
                  <span class="flex items-center gap-1">
                    更新于 {{ formatDate(template.updatedAt) }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <button
                  class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="查看生成记录"
                  @click="goToRecords(template.templateId)"
                >
                  <Clock class="w-4 h-4" />
                </button>
                <button
                  class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="复制模板"
                  @click.stop="duplicateTemplate(template)"
                >
                  <Copy class="w-4 h-4" />
                </button>
                <button
                  class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="编辑模板"
                  @click="goToEdit(template.templateId)"
                >
                  <Edit3 class="w-4 h-4" />
                </button>
                <button
                  v-if="!template.isDefault"
                  class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="删除模板"
                  @click.stop="confirmDelete(template.templateId)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
                <button
                  class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  @click.stop="toggleExpand(template.templateId)"
                >
                  <ChevronDown v-if="expandedTemplateId !== template.templateId" class="w-4 h-4" />
                  <ChevronUp v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div
              v-if="expandedTemplateId === template.templateId"
              class="px-4 pb-4 border-t border-gray-100 bg-gray-50"
            >
              <div class="pt-4">
                <h4 class="text-sm font-medium text-gray-700 mb-3">已启用字段</h4>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="field in template.contentSchema.fields.filter(f => template.enabledFields.includes(f.key))"
                    :key="field.key"
                    class="px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-full"
                  >
                    {{ field.label }}
                    <span class="text-gray-400 ml-1">
                      ({{ field.source === 'case' ? '案件' : '材料' }})
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <Teleport to="body">
      <div
        v-if="showDeleteDialog"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="cancelDelete"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100">
            <h3 class="text-lg font-semibold text-gray-900">确认删除</h3>
          </div>
          <div class="px-6 py-4">
            <p class="text-gray-600 mb-4">确定要删除这个模板吗？此操作不可撤销。</p>
            <p class="text-sm text-amber-600 bg-amber-50 rounded-lg p-3 flex items-start gap-2">
              <FileText class="w-4 h-4 flex-shrink-0 mt-0.5" />
              删除模板不会影响已生成的文书记录。
            </p>
          </div>
          <div class="px-6 py-4 bg-gray-50 flex justify-end gap-3">
            <button
              class="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              @click="cancelDelete"
            >
              取消
            </button>
            <button
              class="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              @click="handleDelete"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
