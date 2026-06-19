<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { CaseStatus } from '@/types'
import type { Case, CaseStatus as CaseStatusType } from '@/types'

const props = defineProps<{
  visible: boolean
  mode: 'create' | 'edit'
  caseData?: Case | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', data: Omit<Case, 'id' | 'materials'> & { id?: string }): void
}>()

const statusOptions: { value: CaseStatusType; label: string }[] = [
  { value: CaseStatus.PENDING, label: '待处理' },
  { value: CaseStatus.IN_PROGRESS, label: '进行中' },
  { value: CaseStatus.CLOSED, label: '已结案' },
]

const caseTypeOptions = ['民事案件', '刑事案件', '行政案件', '劳动争议', '知识产权', '其他']

interface FormState {
  caseNumber: string
  name: string
  client: string
  opposingParty: string
  caseType: string
  status: CaseStatusType
  responsibleLawyer: string
  filingDate: string
  description: string
}

const defaultForm: FormState = {
  caseNumber: '',
  name: '',
  client: '',
  opposingParty: '',
  caseType: '民事案件',
  status: CaseStatus.PENDING,
  responsibleLawyer: '',
  filingDate: '',
  description: '',
}

const form = reactive<FormState>({ ...defaultForm })
const errors = reactive<Record<string, string>>({})
const touched = reactive<Record<string, boolean>>({})

watch(() => props.visible, (val) => {
  if (val) {
    if (props.mode === 'edit' && props.caseData) {
      Object.assign(form, {
        caseNumber: props.caseData.caseNumber,
        name: props.caseData.name,
        client: props.caseData.client,
        opposingParty: props.caseData.opposingParty,
        caseType: props.caseData.caseType,
        status: props.caseData.status,
        responsibleLawyer: props.caseData.responsibleLawyer,
        filingDate: props.caseData.filingDate,
        description: props.caseData.description,
      })
    } else {
      Object.assign(form, { ...defaultForm })
    }
    Object.keys(errors).forEach(k => delete errors[k])
    Object.keys(touched).forEach(k => delete touched[k])
  }
})

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

const validateField = (field: string) => {
  touched[field] = true
  switch (field) {
    case 'caseNumber':
      if (!form.caseNumber.trim()) {
        errors.caseNumber = '案号为必填项'
      } else {
        delete errors.caseNumber
      }
      break
    case 'name':
      if (!form.name.trim()) {
        errors.name = '案件名称为必填项'
      } else {
        delete errors.name
      }
      break
    case 'filingDate':
      if (!form.filingDate) {
        errors.filingDate = '立案日期为必填项'
      } else if (!dateRegex.test(form.filingDate)) {
        errors.filingDate = '立案日期格式应为 YYYY-MM-DD'
      } else {
        const d = new Date(form.filingDate)
        if (isNaN(d.getTime())) {
          errors.filingDate = '立案日期不是有效日期'
        } else {
          delete errors.filingDate
        }
      }
      break
    case 'status':
      if (!Object.values(CaseStatus).includes(form.status)) {
        errors.status = '状态值不合法'
      } else {
        delete errors.status
      }
      break
  }
}

const validateAll = (): boolean => {
  validateField('caseNumber')
  validateField('name')
  validateField('filingDate')
  validateField('status')
  return Object.keys(errors).length === 0
}

const handleSubmit = () => {
  if (!validateAll()) return
  const result: Omit<Case, 'id' | 'materials'> & { id?: string } = {
    caseNumber: form.caseNumber.trim(),
    name: form.name.trim(),
    client: form.client.trim(),
    opposingParty: form.opposingParty.trim(),
    caseType: form.caseType,
    status: form.status,
    responsibleLawyer: form.responsibleLawyer.trim(),
    filingDate: form.filingDate,
    description: form.description.trim(),
  }
  if (props.mode === 'edit' && props.caseData) {
    result.id = props.caseData.id
  }
  emit('submit', result)
}

const handleClose = () => {
  emit('close')
}

const title = computed(() => props.mode === 'create' ? '新建案件' : '编辑案件')
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="fixed inset-0 bg-black/50" @click="handleClose"></div>
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <div class="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-200 rounded-t-2xl z-10">
          <h2 class="text-lg font-bold text-gray-900">{{ title }}</h2>
          <button
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            @click="handleClose"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="px-6 py-5 space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                案号 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.caseNumber"
                type="text"
                placeholder="例如：(2026)京民初字第001号"
                class="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="touched.caseNumber && errors.caseNumber ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'"
                @blur="validateField('caseNumber')"
              />
              <p v-if="touched.caseNumber && errors.caseNumber" class="mt-1 text-xs text-red-500">{{ errors.caseNumber }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                案件名称 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                placeholder="请输入案件名称"
                class="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="touched.name && errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'"
                @blur="validateField('name')"
              />
              <p v-if="touched.name && errors.name" class="mt-1 text-xs text-red-500">{{ errors.name }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">当事人（我方）</label>
              <input
                v-model="form.client"
                type="text"
                placeholder="请输入我方当事人"
                class="w-full px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">对方当事人</label>
              <input
                v-model="form.opposingParty"
                type="text"
                placeholder="请输入对方当事人"
                class="w-full px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">案件类型</label>
              <select
                v-model="form.caseType"
                class="w-full px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option v-for="ct in caseTypeOptions" :key="ct" :value="ct">{{ ct }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                案件状态 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.status"
                class="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="touched.status && errors.status ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'"
                @change="validateField('status')"
              >
                <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
              <p v-if="touched.status && errors.status" class="mt-1 text-xs text-red-500">{{ errors.status }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">承办律师</label>
              <input
                v-model="form.responsibleLawyer"
                type="text"
                placeholder="请输入承办律师"
                class="w-full px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                立案日期 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.filingDate"
                type="date"
                class="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="touched.filingDate && errors.filingDate ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'"
                @blur="validateField('filingDate')"
                @change="validateField('filingDate')"
              />
              <p v-if="touched.filingDate && errors.filingDate" class="mt-1 text-xs text-red-500">{{ errors.filingDate }}</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">案件描述</label>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="请输入案件描述"
              class="w-full px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            ></textarea>
          </div>
        </div>

        <div class="sticky bottom-0 bg-white flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 rounded-b-2xl">
          <button
            class="px-5 py-2.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            @click="handleClose"
          >
            取消
          </button>
          <button
            class="px-5 py-2.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm font-medium"
            @click="handleSubmit"
          >
            {{ mode === 'create' ? '创建' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
