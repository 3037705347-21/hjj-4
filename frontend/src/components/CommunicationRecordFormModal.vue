<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { X, AlertCircle, Phone, Users, MessageCircle, Mail, FileWarning } from 'lucide-vue-next'
import { ContactType, contactTypeMap } from '@/types'
import type { CommunicationRecord, ContactType as ContactTypeType, MaterialNode } from '@/types'
import { mockCases } from '@/mock/data'
import { flattenMaterialTree } from '@/utils/treeUtils'

const props = defineProps<{
  visible: boolean
  mode: 'create' | 'edit'
  recordData?: CommunicationRecord | null
  defaultCaseId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', data: Omit<CommunicationRecord, 'recordId' | 'createdAt' | 'updatedAt' | 'isFollowedUp' | 'followedUpAt'> & { recordId?: string; isFollowedUp?: boolean }): void
}>()

const contactTypeOptions: { value: ContactTypeType; label: string; icon: any; class: string }[] = [
  { value: ContactType.PHONE, label: contactTypeMap[ContactType.PHONE].label, icon: Phone, class: contactTypeMap[ContactType.PHONE].class },
  { value: ContactType.MEETING, label: contactTypeMap[ContactType.MEETING].label, icon: Users, class: contactTypeMap[ContactType.MEETING].class },
  { value: ContactType.WECHAT, label: contactTypeMap[ContactType.WECHAT].label, icon: MessageCircle, class: contactTypeMap[ContactType.WECHAT].class },
  { value: ContactType.EMAIL, label: contactTypeMap[ContactType.EMAIL].label, icon: Mail, class: contactTypeMap[ContactType.EMAIL].class },
  { value: ContactType.MATERIAL_REMINDER, label: contactTypeMap[ContactType.MATERIAL_REMINDER].label, icon: FileWarning, class: contactTypeMap[ContactType.MATERIAL_REMINDER].class },
]

interface FormState {
  caseId: string
  contactType: ContactTypeType
  contactDate: string
  contactTime: string
  participants: string
  summary: string
  nextAction: string
  relatedMaterials: string[]
  creator: string
}

const getDefaultDateTime = (): { date: string; time: string } => {
  const d = new Date()
  return {
    date: d.toISOString().split('T')[0],
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  }
}

const defaultForm: FormState = {
  caseId: '',
  contactType: ContactType.PHONE,
  contactDate: '',
  contactTime: '',
  participants: '',
  summary: '',
  nextAction: '',
  relatedMaterials: [],
  creator: '张伟律师',
}

const form = reactive<FormState>({ ...defaultForm })
const errors = reactive<Record<string, string>>({})
const touched = reactive<Record<string, boolean>>({})

const caseOptions = computed(() => mockCases.map(c => ({ value: c.id, label: `${c.caseNumber} - ${c.name}` })))

const selectedCase = computed(() => mockCases.find(c => c.id === form.caseId))

const availableMaterials = computed<MaterialNode[]>(() => {
  if (!selectedCase.value) return []
  return flattenMaterialTree(selectedCase.value.materials)
})

const selectedMaterialNames = computed(() => {
  const names: string[] = []
  availableMaterials.value.forEach(m => {
    if (form.relatedMaterials.includes(m.id)) {
      names.push(m.name)
    }
  })
  return names
})

const toggleMaterialNode = (nodeId: string) => {
  const idx = form.relatedMaterials.indexOf(nodeId)
  if (idx === -1) {
    form.relatedMaterials.push(nodeId)
  } else {
    form.relatedMaterials.splice(idx, 1)
  }
}

watch(() => props.visible, (val) => {
  if (val) {
    const defaultDT = getDefaultDateTime()
    if (props.mode === 'edit' && props.recordData) {
      const d = new Date(props.recordData.contactDate)
      Object.assign(form, {
        caseId: props.recordData.caseId,
        contactType: props.recordData.contactType,
        contactDate: d.toISOString().split('T')[0],
        contactTime: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        participants: props.recordData.participants,
        summary: props.recordData.summary,
        nextAction: props.recordData.nextAction,
        relatedMaterials: [...(props.recordData.relatedMaterials || [])],
        creator: props.recordData.creator,
      })
    } else {
      Object.assign(form, {
        ...defaultForm,
        caseId: props.defaultCaseId || (mockCases.length > 0 ? mockCases[0].id : ''),
        contactDate: defaultDT.date,
        contactTime: defaultDT.time,
      })
    }
    Object.keys(errors).forEach(k => delete errors[k])
    Object.keys(touched).forEach(k => delete touched[k])
  }
})

const validateField = (field: string) => {
  touched[field] = true
  switch (field) {
    case 'caseId':
      if (!form.caseId) {
        errors.caseId = '请选择关联案件'
      } else {
        delete errors.caseId
      }
      break
    case 'contactType':
      if (!form.contactType) {
        errors.contactType = '请选择沟通类型'
      } else {
        delete errors.contactType
      }
      break
    case 'contactDate':
      if (!form.contactDate) {
        errors.contactDate = '请选择沟通日期'
      } else {
        delete errors.contactDate
      }
      break
    case 'contactTime':
      if (!form.contactTime) {
        errors.contactTime = '请选择沟通时间'
      } else {
        delete errors.contactTime
      }
      break
    case 'participants':
      if (!form.participants.trim()) {
        errors.participants = '请填写参与人员'
      } else {
        delete errors.participants
      }
      break
    case 'summary':
      if (!form.summary.trim()) {
        errors.summary = '请填写沟通摘要'
      } else {
        delete errors.summary
      }
      break
    case 'creator':
      if (!form.creator.trim()) {
        errors.creator = '请填写创建人'
      } else {
        delete errors.creator
      }
      break
  }
}

const validateAll = (): boolean => {
  validateField('caseId')
  validateField('contactType')
  validateField('contactDate')
  validateField('contactTime')
  validateField('participants')
  validateField('summary')
  validateField('creator')
  return Object.keys(errors).length === 0
}

const handleSubmit = () => {
  if (!validateAll()) return

  const contactDate = new Date(`${form.contactDate}T${form.contactTime}:00`).toISOString()

  const result: Omit<CommunicationRecord, 'recordId' | 'createdAt' | 'updatedAt' | 'isFollowedUp' | 'followedUpAt'> & { recordId?: string; isFollowedUp?: boolean } = {
    caseId: form.caseId,
    contactType: form.contactType,
    contactDate,
    participants: form.participants.trim(),
    summary: form.summary.trim(),
    nextAction: form.nextAction.trim(),
    relatedMaterials: [...form.relatedMaterials],
    creator: form.creator.trim(),
  }

  if (props.mode === 'edit' && props.recordData) {
    result.recordId = props.recordData.recordId
    result.isFollowedUp = props.recordData.isFollowedUp
  }

  emit('submit', result)
}

const handleClose = () => {
  emit('close')
}

const title = computed(() => props.mode === 'create' ? '新增沟通记录' : '编辑沟通记录')
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
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              关联案件 <span class="text-red-500">*</span>
            </label>
            <select
              v-model="form.caseId"
              class="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="touched.caseId && errors.caseId ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'"
              @change="validateField('caseId')"
            >
              <option value="">请选择案件</option>
              <option v-for="opt in caseOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <p v-if="touched.caseId && errors.caseId" class="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle class="w-3 h-3" />
              {{ errors.caseId }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              沟通类型 <span class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-3 sm:grid-cols-5 gap-2">
              <label
                v-for="opt in contactTypeOptions"
                :key="opt.value"
                class="cursor-pointer"
              >
                <input
                  type="radio"
                  v-model="form.contactType"
                  :value="opt.value"
                  class="sr-only peer"
                />
                <div
                  class="flex flex-col items-center gap-1 px-2 py-3 rounded-lg border-2 transition-all peer-checked:ring-2 peer-checked:ring-offset-1 peer-checked:ring-blue-400"
                  :class="form.contactType === opt.value ? opt.class + ' border-transparent shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'"
                >
                  <component :is="opt.icon" class="w-5 h-5" />
                  <span class="text-xs font-medium">{{ opt.label }}</span>
                </div>
              </label>
            </div>
            <p v-if="touched.contactType && errors.contactType" class="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle class="w-3 h-3" />
              {{ errors.contactType }}
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                沟通日期 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.contactDate"
                type="date"
                class="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="touched.contactDate && errors.contactDate ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'"
                @blur="validateField('contactDate')"
                @change="validateField('contactDate')"
              />
              <p v-if="touched.contactDate && errors.contactDate" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                {{ errors.contactDate }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                沟通时间 <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.contactTime"
                type="time"
                class="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="touched.contactTime && errors.contactTime ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'"
                @blur="validateField('contactTime')"
                @change="validateField('contactTime')"
              />
              <p v-if="touched.contactTime && errors.contactTime" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                {{ errors.contactTime }}
              </p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              参与人员 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.participants"
              type="text"
              placeholder="例如：张伟律师、客户王总、对方律师李某某"
              class="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="touched.participants && errors.participants ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'"
              @blur="validateField('participants')"
            />
            <p v-if="touched.participants && errors.participants" class="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle class="w-3 h-3" />
              {{ errors.participants }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              沟通摘要 <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="form.summary"
              rows="4"
              placeholder="请详细记录沟通内容摘要..."
              class="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              :class="touched.summary && errors.summary ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'"
              @blur="validateField('summary')"
            ></textarea>
            <p v-if="touched.summary && errors.summary" class="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle class="w-3 h-3" />
              {{ errors.summary }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              后续行动
            </label>
            <textarea
              v-model="form.nextAction"
              rows="2"
              placeholder="请记录本次沟通后需要跟进的事项..."
              class="w-full px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              创建人 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.creator"
              type="text"
              placeholder="请输入创建人姓名"
              class="w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="touched.creator && errors.creator ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'"
              @blur="validateField('creator')"
            />
            <p v-if="touched.creator && errors.creator" class="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle class="w-3 h-3" />
              {{ errors.creator }}
            </p>
          </div>

          <div v-if="availableMaterials.length > 0">
            <label class="block text-sm font-medium text-gray-700 mb-2">关联材料（选填）</label>
            <div class="border border-gray-200 rounded-lg overflow-hidden">
              <div class="max-h-48 overflow-y-auto divide-y divide-gray-100">
                <label
                  v-for="mat in availableMaterials"
                  :key="mat.id"
                  class="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    :checked="form.relatedMaterials.includes(mat.id)"
                    @change="toggleMaterialNode(mat.id)"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-700 truncate">{{ mat.name }}</span>
                  <span class="text-xs text-gray-400 ml-auto flex-shrink-0">{{ mat.type === 'folder' ? '文件夹' : '文件' }}</span>
                </label>
              </div>
            </div>
            <p v-if="selectedMaterialNames.length > 0" class="mt-2 text-xs text-gray-500">
              已选择 {{ selectedMaterialNames.length }} 项：{{ selectedMaterialNames.join('、') }}
            </p>
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
            {{ mode === 'create' ? '创建记录' : '保存修改' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
