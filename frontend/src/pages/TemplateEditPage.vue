<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Save,
  X,
  FileText,
  FileSpreadsheet,
  FileType,
  Download,
  Settings,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  RotateCcw,
} from 'lucide-vue-next'
import type { DocumentTemplate, TemplateType, OutputFormat, ContentSchemaField } from '@/types'
import { TemplateType as TT, templateTypeMap, OutputFormat as OF, outputFormatMap, caseFieldDefinitions, materialFieldDefinitions } from '@/types'
import { getTemplateById, createTemplate, updateTemplate, createDefaultTemplate } from '@/mock/documentTemplates'
import { usePermissions } from '@/composables/usePermissions'

const route = useRoute()
const router = useRouter()
const permissions = usePermissions()

const isEditMode = computed(() => !!route.params.id)
const templateId = computed(() => route.params.id as string)
const isReadonly = computed(() => !permissions.canManageTemplate)

const form = ref<Partial<DocumentTemplate>>({
  name: '',
  type: TT.CASE_COVER,
  outputFormat: OF.EXCEL,
  description: '',
  enabledFields: [],
  contentSchema: {
    title: '',
    fields: [],
    includeHeader: true,
    includeFooter: true,
    pageOrientation: 'portrait',
  },
})

const formErrors = ref<Record<string, string>>({})
const hasChanges = ref(false)
const showPreview = ref(false)

const templateTypeOptions = Object.entries(templateTypeMap).map(([value, { label, description }]) => ({
  value: value as TemplateType,
  label,
  description,
}))

const outputFormatOptions = Object.entries(outputFormatMap).map(([value, { label }]) => ({
  value: value as OutputFormat,
  label,
}))

onMounted(() => {
  if (isEditMode.value) {
    loadTemplate()
  } else {
    const type = (route.query.type as TemplateType) || TT.CASE_COVER
    form.value.type = type
    resetToDefaultSchema()
  }
})

watch(
  () => form.value.type,
  (newType) => {
    if (newType && !isEditMode.value) {
      resetToDefaultSchema()
    }
  }
)

watch(
  () => form.value,
  () => {
    hasChanges.value = true
  },
  { deep: true }
)

const loadTemplate = () => {
  const template = getTemplateById(templateId.value)
  if (template) {
    form.value = JSON.parse(JSON.stringify(template))
    hasChanges.value = false
  } else {
    router.push({ name: 'template-list' })
  }
}

const resetToDefaultSchema = () => {
  if (!form.value.type) return
  const defaultTemplate = createDefaultTemplate(form.value.type)
  form.value.contentSchema = JSON.parse(JSON.stringify(defaultTemplate.contentSchema))
  form.value.enabledFields = [...defaultTemplate.enabledFields]
  form.value.contentSchema.title = templateTypeMap[form.value.type].label
  hasChanges.value = true
}

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

const allAvailableFields = computed(() => {
  const caseFields = caseFieldDefinitions.map(f => ({
    ...f,
    type: 'text' as const,
    source: 'case' as const,
  }))
  const materialFields = materialFieldDefinitions.map(f => ({
    ...f,
    type: f.key === 'index' ? 'number' as const : 'text' as const,
    source: 'material' as const,
  }))
  return { caseFields, materialFields }
})

const currentSchemaFields = computed(() => form.value.contentSchema?.fields || [])

const toggleField = (fieldKey: string) => {
  if (!form.value.enabledFields) return
  const idx = form.value.enabledFields.indexOf(fieldKey)
  if (idx === -1) {
    form.value.enabledFields.push(fieldKey)
  } else {
    form.value.enabledFields.splice(idx, 1)
  }
}

const isFieldEnabled = (fieldKey: string): boolean => {
  return form.value.enabledFields?.includes(fieldKey) || false
}

const addCustomField = () => {
  if (!form.value.contentSchema) return
  const newField: ContentSchemaField = {
    key: `custom_${Date.now()}`,
    label: '自定义字段',
    type: 'text',
    source: 'case',
  }
  form.value.contentSchema.fields.push(newField)
  form.value.enabledFields?.push(newField.key)
}

const removeField = (fieldKey: string) => {
  if (!form.value.contentSchema) return
  form.value.contentSchema.fields = form.value.contentSchema.fields.filter(f => f.key !== fieldKey)
  if (form.value.enabledFields) {
    form.value.enabledFields = form.value.enabledFields.filter(k => k !== fieldKey)
  }
}

const validateForm = (): boolean => {
  const errors: Record<string, string> = {}

  if (!form.value.name?.trim()) {
    errors.name = '模板名称不能为空'
  }
  if (!form.value.type) {
    errors.type = '请选择模板类型'
  }
  if (!form.value.outputFormat) {
    errors.outputFormat = '请选择输出格式'
  }
  if (!form.value.enabledFields || form.value.enabledFields.length === 0) {
    errors.enabledFields = '至少选择一个字段'
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const goBack = () => {
  if (hasChanges.value) {
    if (confirm('有未保存的更改，确定要离开吗？')) {
      router.push({ name: 'template-list' })
    }
  } else {
    router.push({ name: 'template-list' })
  }
}

const handleSave = () => {
  if (!validateForm()) return

  if (isEditMode.value) {
    updateTemplate(templateId.value, form.value as DocumentTemplate)
  } else {
    createTemplate(form.value as Omit<DocumentTemplate, 'templateId' | 'createdAt' | 'updatedAt'>)
  }

  router.push({ name: 'template-list' })
}

const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
      <div class="max-w-[1400px] mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              class="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              @click="goBack"
            >
              <ArrowLeft class="w-5 h-5" />
            </button>
            <div class="flex items-center gap-3">
              <div
                class="p-2 rounded-lg"
                :class="form.type ? getTypeColor(form.type) : 'bg-gray-100 text-gray-600'"
              >
                <component
                  :is="form.type ? getTypeIcon(form.type) : FileText"
                  class="w-5 h-5"
                />
              </div>
              <div>
                <h1 class="text-lg font-bold text-gray-900">
                  {{ isEditMode ? '编辑模板' : '新建模板' }}
                </h1>
                <p class="text-xs text-gray-500">
                  {{ isEditMode ? `更新于 ${formatDate(form.updatedAt || '')}` : '创建新的文书模板' }}
                </p>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              @click="goBack"
            >
              取消
            </button>
            <button
              v-if="permissions.canManageTemplate"
              class="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              :disabled="!hasChanges"
              @click="handleSave"
            >
              <Save class="w-4 h-4" />
              保存
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-[1400px] mx-auto px-6 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 class="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings class="w-5 h-5 text-indigo-600" />
              基本信息
            </h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                  模板名称 <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  :disabled="isReadonly"
                  class="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  :class="formErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'"
                  placeholder="请输入模板名称"
                />
                <p v-if="formErrors.name" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle class="w-3 h-3" />
                  {{ formErrors.name }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                  模板类型 <span class="text-red-500">*</span>
                </label>
                <div class="grid grid-cols-2 gap-3">
                  <label
                    v-for="opt in templateTypeOptions"
                    :key="opt.value"
                    class="relative flex items-start p-3 border rounded-lg cursor-pointer transition-all"
                    :class="[
                      form.type === opt.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300',
                      isEditMode ? 'opacity-60 cursor-not-allowed' : '',
                    ]"
                  >
                    <input
                      v-model="form.type"
                      type="radio"
                      :value="opt.value"
                      class="mt-1"
                      :disabled="isEditMode || isReadonly"
                    />
                    <div class="ml-3 min-w-0 flex-1">
                      <p class="text-sm font-medium text-gray-900">{{ opt.label }}</p>
                      <p class="text-xs text-gray-500 mt-0.5">{{ opt.description }}</p>
                    </div>
                  </label>
                </div>
                <p v-if="formErrors.type" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle class="w-3 h-3" />
                  {{ formErrors.type }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">
                  输出格式 <span class="text-red-500">*</span>
                </label>
                <div class="flex gap-3">
                  <label
                    v-for="opt in outputFormatOptions"
                    :key="opt.value"
                    class="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-all"
                    :class="[
                      form.outputFormat === opt.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300',
                    ]"
                  >
                    <input v-model="form.outputFormat" type="radio" :value="opt.value" :disabled="isReadonly" />
                    <Download class="w-4 h-4" />
                    <span class="text-sm">{{ opt.label }}</span>
                  </label>
                </div>
                <p v-if="formErrors.outputFormat" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle class="w-3 h-3" />
                  {{ formErrors.outputFormat }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">模板描述</label>
                <textarea
                  v-model="form.description"
                  rows="3"
                  :disabled="isReadonly"
                  class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="请输入模板描述（可选）"
                ></textarea>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FileText class="w-5 h-5 text-indigo-600" />
                字段配置
              </h2>
              <div class="flex items-center gap-2">
                <button
                  v-if="permissions.canManageTemplate"
                  class="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  @click="resetToDefaultSchema"
                >
                  <RotateCcw class="w-4 h-4" />
                  重置为默认
                </button>
                <button
                  v-if="permissions.canManageTemplate"
                  class="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  @click="addCustomField"
                >
                  <Plus class="w-4 h-4" />
                  添加字段
                </button>
              </div>
            </div>

            <div class="mb-6">
              <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
                <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                案件信息字段
              </h3>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                <label
                  v-for="field in allAvailableFields.caseFields"
                  :key="field.key"
                  class="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-all"
                  :class="[
                    isFieldEnabled(field.key)
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300',
                  ]"
                >
                  <input
                    type="checkbox"
                    :checked="isFieldEnabled(field.key)"
                    @change="toggleField(field.key)"
                    class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ field.label }}</p>
                    <p class="text-xs text-gray-500 truncate">{{ field.description }}</p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
                <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                材料清单字段
              </h3>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                <label
                  v-for="field in allAvailableFields.materialFields"
                  :key="field.key"
                  class="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-all"
                  :class="[
                    isFieldEnabled(field.key)
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300',
                  ]"
                >
                  <input
                    type="checkbox"
                    :checked="isFieldEnabled(field.key)"
                    @change="toggleField(field.key)"
                    class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ field.label }}</p>
                    <p class="text-xs text-gray-500 truncate">{{ field.description }}</p>
                  </div>
                </label>
              </div>
            </div>

            <div v-if="currentSchemaFields.some(f => f.key.startsWith('custom_'))" class="mt-6">
              <h3 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
                <span class="w-2 h-2 bg-purple-500 rounded-full"></span>
                自定义字段
              </h3>
              <div class="space-y-2">
                <div
                  v-for="field in currentSchemaFields.filter(f => f.key.startsWith('custom_'))"
                  :key="field.key"
                  class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                >
                  <GripVertical class="w-4 h-4 text-gray-400 cursor-move" />
                  <input
                    v-model="field.label"
                    type="text"
                    :disabled="isReadonly"
                    class="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="字段名称"
                  />
                  <select
                    v-model="field.source"
                    :disabled="isReadonly"
                    class="px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="case">案件</option>
                    <option value="material">材料</option>
                  </select>
                  <button
                    v-if="permissions.canManageTemplate"
                    class="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    @click="removeField(field.key)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <p v-if="formErrors.enabledFields" class="mt-3 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle class="w-3 h-3" />
              {{ formErrors.enabledFields }}
            </p>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 class="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Eye class="w-5 h-5 text-indigo-600" />
              高级设置
            </h2>
            <div class="space-y-4">
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p class="text-sm font-medium text-gray-900">包含页眉</p>
                  <p class="text-xs text-gray-500">在文档顶部显示标题信息</p>
                </div>
                <input
                  v-model="form.contentSchema.includeHeader"
                  type="checkbox"
                  :disabled="isReadonly"
                  class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
              </div>
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p class="text-sm font-medium text-gray-900">包含页脚</p>
                  <p class="text-xs text-gray-500">在文档底部显示页码和案件信息</p>
                </div>
                <input
                  v-model="form.contentSchema.includeFooter"
                  type="checkbox"
                  :disabled="isReadonly"
                  class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">页面方向</label>
                <div class="flex gap-3">
                  <label
                    class="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-all flex-1"
                    :class="[
                      form.contentSchema.pageOrientation === 'portrait'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300',
                    ]"
                  >
                    <input
                      v-model="form.contentSchema.pageOrientation"
                      type="radio"
                      value="portrait"
                      :disabled="isReadonly"
                    />
                    <span class="text-sm">纵向</span>
                  </label>
                  <label
                    class="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-all flex-1"
                    :class="[
                      form.contentSchema.pageOrientation === 'landscape'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300',
                    ]"
                  >
                    <input
                      v-model="form.contentSchema.pageOrientation"
                      type="radio"
                      value="landscape"
                      :disabled="isReadonly"
                    />
                    <span class="text-sm">横向</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-24">
            <h3 class="text-sm font-semibold text-gray-900 mb-4">模板预览</h3>
            <div class="border border-gray-200 rounded-lg overflow-hidden">
              <div class="bg-gray-100 px-4 py-2 text-xs text-gray-500 flex items-center justify-between">
                <span>预览效果</span>
                <button
                  class="text-indigo-600 hover:text-indigo-700"
                  @click="showPreview = !showPreview"
                >
                  {{ showPreview ? '收起' : '展开' }}
                </button>
              </div>
              <div v-if="showPreview" class="p-4 bg-white min-h-[300px]">
                <div class="text-center mb-4">
                  <h4 class="font-bold text-gray-900">{{ form.contentSchema?.title || '文档标题' }}</h4>
                  <p class="text-xs text-gray-400 mt-1">{{ new Date().toLocaleString('zh-CN') }}</p>
                </div>
                <div class="text-xs space-y-1">
                  <div
                    v-for="field in currentSchemaFields.filter(f => isFieldEnabled(f.key) && f.source === 'case')"
                    :key="field.key"
                    class="flex"
                  >
                    <span class="text-gray-500 w-20 flex-shrink-0">{{ field.label }}：</span>
                    <span class="text-gray-700 flex-1">[示例数据]</span>
                  </div>
                </div>
                <div v-if="currentSchemaFields.some(f => isFieldEnabled(f.key) && f.source === 'material')" class="mt-4">
                  <p class="text-xs font-medium text-gray-700 mb-2">材料清单</p>
                  <table class="w-full text-xs">
                    <thead class="bg-gray-100">
                      <tr>
                        <th
                          v-for="field in currentSchemaFields.filter(f => isFieldEnabled(f.key) && f.source === 'material')"
                          :key="field.key"
                          class="px-2 py-1 text-left font-medium text-gray-600 border"
                        >
                          {{ field.label }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td
                          v-for="field in currentSchemaFields.filter(f => isFieldEnabled(f.key) && f.source === 'material')"
                          :key="field.key"
                          class="px-2 py-1 border text-gray-500"
                        >
                          -
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div v-else class="p-8 text-center text-gray-400">
                <Eye class="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p class="text-sm">点击展开查看预览</p>
              </div>
            </div>

            <div class="mt-4 p-3 bg-indigo-50 rounded-lg">
              <div class="flex items-start gap-2">
                <CheckCircle class="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div class="text-xs text-indigo-700">
                  <p class="font-medium mb-1">已选择 {{ form.enabledFields?.length || 0 }} 个字段</p>
                  <p>案件字段：{{ currentSchemaFields.filter(f => isFieldEnabled(f.key) && f.source === 'case').length }} 个</p>
                  <p>材料字段：{{ currentSchemaFields.filter(f => isFieldEnabled(f.key) && f.source === 'material').length }} 个</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
