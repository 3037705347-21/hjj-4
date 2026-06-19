<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { X, AlertCircle, User, Calendar, FileText, CheckCircle } from 'lucide-vue-next'
import type { CaseArchive } from '@/types'
import { ArchiveStatus, archiveStatusMap } from '@/types'

const props = defineProps<{
  visible: boolean
  archive: CaseArchive | null
  mode: 'borrow' | 'return'
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', data: {
    mode: 'borrow' | 'return'
    borrower?: string
    borrowDate?: string
    expectedReturnDate?: string
    borrowReason?: string
    approver?: string
    returnDate?: string
    remark?: string
  }): void
}>()

const form = ref({
  borrower: '',
  borrowDate: new Date().toISOString().split('T')[0],
  expectedReturnDate: '',
  borrowReason: '',
  approver: '',
  returnDate: new Date().toISOString().split('T')[0],
  remark: '',
})

const formErrors = ref<Record<string, string>>({})

const isBorrowMode = computed(() => props.mode === 'borrow')

const currentBorrow = computed(() => {
  if (!props.archive) return null
  return props.archive.borrowHistory.find(b => !b.returnDate) || null
})

watch(() => props.visible, (visible) => {
  if (visible) {
    if (isBorrowMode.value) {
      form.value = {
        borrower: '',
        borrowDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: (() => {
          const date = new Date()
          date.setDate(date.getDate() + 14)
          return date.toISOString().split('T')[0]
        })(),
        borrowReason: '',
        approver: '',
        returnDate: new Date().toISOString().split('T')[0],
        remark: '',
      }
    } else {
      form.value = {
        borrower: currentBorrow.value?.borrower || '',
        borrowDate: currentBorrow.value?.borrowDate || '',
        expectedReturnDate: currentBorrow.value?.expectedReturnDate || '',
        borrowReason: currentBorrow.value?.borrowReason || '',
        approver: currentBorrow.value?.approver || '',
        returnDate: new Date().toISOString().split('T')[0],
        remark: '',
      }
    }
    formErrors.value = {}
  }
})

const validateForm = (): boolean => {
  const errors: Record<string, string> = {}

  if (isBorrowMode.value) {
    if (!form.value.borrower || !form.value.borrower.trim()) {
      errors.borrower = '请输入借阅人'
    }
    if (!form.value.borrowDate) {
      errors.borrowDate = '请选择借阅日期'
    }
    if (!form.value.borrowReason || !form.value.borrowReason.trim()) {
      errors.borrowReason = '请输入借阅事由'
    }
  } else {
    if (!form.value.returnDate) {
      errors.returnDate = '请选择归还日期'
    }
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleSubmit = () => {
  if (!validateForm()) return

  if (isBorrowMode.value) {
    emit('submit', {
      mode: 'borrow',
      borrower: form.value.borrower.trim(),
      borrowDate: form.value.borrowDate,
      expectedReturnDate: form.value.expectedReturnDate || undefined,
      borrowReason: form.value.borrowReason.trim(),
      approver: form.value.approver.trim() || undefined,
      remark: form.value.remark.trim() || undefined,
    })
  } else {
    emit('submit', {
      mode: 'return',
      returnDate: form.value.returnDate,
      remark: form.value.remark.trim() || undefined,
    })
  }
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="fixed inset-0 bg-black/50" @click="handleClose"></div>
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-gray-900">
            {{ isBorrowMode ? '借阅登记' : '归还登记' }}
          </h3>
          <button
            class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            @click="handleClose"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div v-if="archive" class="mb-6 p-4 bg-gray-50 rounded-lg">
          <div class="flex items-center gap-3 mb-3">
            <div class="p-2 rounded-lg" :class="archiveStatusMap[archive.archiveStatus].class">
              <FileText class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ archive.archiveCode }}</p>
              <p class="text-xs text-gray-500 truncate">{{ archive.physicalLocation }}</p>
            </div>
            <span
              class="px-2 py-0.5 text-xs font-medium rounded-full border ml-auto"
              :class="archiveStatusMap[archive.archiveStatus].class"
            >
              {{ archiveStatusMap[archive.archiveStatus].label }}
            </span>
          </div>
          <div v-if="isBorrowMode && archive.archiveStatus !== ArchiveStatus.ARCHIVED && archive.archiveStatus !== ArchiveStatus.RETURNED" class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div class="flex items-start gap-2">
              <AlertCircle class="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p class="text-xs text-amber-700">
                当前卷宗状态为「{{ archiveStatusMap[archive.archiveStatus].label }}」，无法办理借阅。
              </p>
            </div>
          </div>
        </div>

        <div class="space-y-5">
          <template v-if="isBorrowMode">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                借阅人 <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <User class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  v-model="form.borrower"
                  type="text"
                  class="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  :class="{ 'border-red-300 bg-red-50': formErrors.borrower }"
                  placeholder="请输入借阅人姓名"
                  @blur="validateForm"
                />
              </div>
              <p v-if="formErrors.borrower" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                {{ formErrors.borrower }}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  借阅日期 <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    v-model="form.borrowDate"
                    type="date"
                    class="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    :class="{ 'border-red-300 bg-red-50': formErrors.borrowDate }"
                    @blur="validateForm"
                  />
                </div>
                <p v-if="formErrors.borrowDate" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle class="w-3 h-3" />
                  {{ formErrors.borrowDate }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  预计归还日期
                </label>
                <div class="relative">
                  <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    v-model="form.expectedReturnDate"
                    type="date"
                    class="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                借阅事由 <span class="text-red-500">*</span>
              </label>
              <textarea
                v-model="form.borrowReason"
                rows="3"
                class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                :class="{ 'border-red-300 bg-red-50': formErrors.borrowReason }"
                placeholder="请输入借阅事由，如：案件申诉准备、类似案件参考等"
                @blur="validateForm"
              ></textarea>
              <p v-if="formErrors.borrowReason" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                {{ formErrors.borrowReason }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                审批人
              </label>
              <div class="relative">
                <User class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  v-model="form.approver"
                  type="text"
                  class="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入审批人姓名"
                />
              </div>
            </div>
          </template>

          <template v-else>
            <div v-if="currentBorrow" class="p-4 bg-gray-50 rounded-lg space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-500">借阅人</span>
                <span class="text-sm font-medium text-gray-900">{{ currentBorrow.borrower }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-500">借阅日期</span>
                <span class="text-sm font-medium text-gray-900">{{ currentBorrow.borrowDate }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-500">预计归还</span>
                <span class="text-sm font-medium text-gray-900">{{ currentBorrow.expectedReturnDate || '-' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-500">借阅事由</span>
                <span class="text-sm font-medium text-gray-900">{{ currentBorrow.borrowReason }}</span>
              </div>
              <div v-if="currentBorrow.approver" class="flex items-center justify-between">
                <span class="text-sm text-gray-500">审批人</span>
                <span class="text-sm font-medium text-gray-900">{{ currentBorrow.approver }}</span>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                归还日期 <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  v-model="form.returnDate"
                  type="date"
                  class="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  :class="{ 'border-red-300 bg-red-50': formErrors.returnDate }"
                  @blur="validateForm"
                />
              </div>
              <p v-if="formErrors.returnDate" class="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                {{ formErrors.returnDate }}
              </p>
            </div>
          </template>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              备注说明
            </label>
            <textarea
              v-model="form.remark"
              rows="3"
              class="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              :placeholder="isBorrowMode ? '输入借阅备注说明...' : '输入归还时的备注说明...'"
            ></textarea>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            class="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            @click="handleClose"
          >
            取消
          </button>
          <button
            class="px-4 py-2 text-sm text-white rounded-lg transition-colors shadow-sm font-medium flex items-center gap-1.5"
            :class="isBorrowMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'"
            @click="handleSubmit"
            :disabled="isBorrowMode && archive && archive.archiveStatus !== ArchiveStatus.ARCHIVED && archive.archiveStatus !== ArchiveStatus.RETURNED"
          >
            <CheckCircle v-if="!isBorrowMode" class="w-4 h-4" />
            {{ isBorrowMode ? '确认借阅' : '确认归还' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
