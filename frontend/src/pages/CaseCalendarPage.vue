<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Calendar as CalendarIcon,
  User,
  Briefcase,
  X,
  Edit3,
  Trash2,
  CheckCircle,
  AlertCircle,
  MapPin,
  FileText,
  Clock,
  Scale,
  Home,
  ClipboardList,
  FolderTree,
} from 'lucide-vue-next'
import type { CaseEvent, CaseEvent as CaseEventTypeModel, Case } from '@/types'
import {
  CaseEventType,
  CaseEventStatus,
  CaseStatus,
  caseEventTypeMap,
  caseEventStatusMap,
} from '@/types'
import { caseStatusMap } from '@/mock/data'
import {
  refreshOverdueEvents,
  getFilteredEvents,
  getCaseById,
  getAllResponsibleLawyers,
  updateCaseEvent,
  deleteCaseEvent,
  getUpcomingEvents,
  type EventFilterOptions,
} from '@/mock/caseEvents'
import CaseEventFormModal from '@/components/CaseEventFormModal.vue'

const router = useRouter()
const route = useRoute()

const currentDate = ref(new Date())
const today = new Date()
today.setHours(0, 0, 0, 0)

const showFormModal = ref(false)
const editingEvent = ref<CaseEvent | null>(null)

const showEventDetail = ref(false)
const selectedEvent = ref<CaseEvent | null>(null)

const showDeleteConfirm = ref(false)
const deletingEvent = ref<CaseEvent | null>(null)

const showFilters = ref(false)
const filters = ref<EventFilterOptions>({
  caseStatus: 'all',
  responsibleLawyer: 'all',
  startDate: '',
  endDate: '',
  eventType: 'all',
  eventStatus: 'all',
})

const viewMode = ref<'calendar' | 'list'>('calendar')

onMounted(() => {
  refreshOverdueEvents()
})

const responsibleLawyers = computed(() => getAllResponsibleLawyers())

const currentYear = computed(() => currentDate.value.getFullYear())
const currentMonth = computed(() => currentDate.value.getMonth())

const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startWeekday = firstDay.getDay()

  const days: Array<{ date: Date; isCurrentMonth: boolean; dateStr: string }> = []

  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i)
    days.push({ date: d, isCurrentMonth: false, dateStr: formatDate(d) })
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i)
    days.push({ date: d, isCurrentMonth: true, dateStr: formatDate(d) })
  }

  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i)
    days.push({ date: d, isCurrentMonth: false, dateStr: formatDate(d) })
  }

  return days
})

const filteredEvents = computed<CaseEvent[]>(() => {
  return getFilteredEvents(filters.value)
})

const eventsByDate = computed(() => {
  const map: Record<string, CaseEvent[]> = {}
  filteredEvents.value.forEach(event => {
    if (!map[event.eventDate]) {
      map[event.eventDate] = []
    }
    map[event.eventDate].push(event)
  })
  return map
})

const upcomingEvents = computed(() => getUpcomingEvents(30))

const monthStats = computed(() => {
  const start = new Date(currentYear.value, currentMonth.value, 1)
  const end = new Date(currentYear.value, currentMonth.value + 1, 0)
  const monthEvents = filteredEvents.value.filter(e => {
    const d = new Date(e.eventDate)
    return d >= start && d <= end
  })
  return {
    total: monthEvents.length,
    pending: monthEvents.filter(e => e.status === CaseEventStatus.PENDING).length,
    completed: monthEvents.filter(e => e.status === CaseEventStatus.COMPLETED).length,
    hearing: monthEvents.filter(e => e.eventType === CaseEventType.HEARING).length,
    overdue: monthEvents.filter(e => e.status === CaseEventStatus.OVERDUE).length,
  }
})

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

function isToday(d: Date): boolean {
  return isSameDay(d, today)
}

function goToPrevMonth() {
  currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1)
}

function goToNextMonth() {
  currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1)
}

function goToToday() {
  currentDate.value = new Date()
}

function getEventCase(caseId: string): Case | undefined {
  return getCaseById(caseId)
}

function openCreateForm(dateStr?: string) {
  editingEvent.value = null
  if (dateStr) {
    setTimeout(() => {
      if (dateStr) {
        const modal = document.querySelector('[data-event-form-date]')
        if (modal) {
          (modal as HTMLInputElement).value = dateStr
        }
      }
    }, 0)
  }
  showFormModal.value = true
}

function openEditForm(event: CaseEvent) {
  editingEvent.value = event
  showFormModal.value = true
}

function handleEventSaved(event: CaseEvent) {
  showFormModal.value = false
  editingEvent.value = null
  if (selectedEvent.value?.eventId === event.eventId) {
    selectedEvent.value = event
  }
}

function handleFormError(message: string) {
  alert(message)
}

function openEventDetail(event: CaseEvent) {
  selectedEvent.value = event
  showEventDetail.value = true
}

function closeEventDetail() {
  showEventDetail.value = false
  selectedEvent.value = null
}

function confirmDelete(event: CaseEvent) {
  deletingEvent.value = event
  showDeleteConfirm.value = true
  showEventDetail.value = false
}

function executeDelete() {
  if (!deletingEvent.value) return
  deleteCaseEvent(deletingEvent.value.eventId)
  showDeleteConfirm.value = false
  deletingEvent.value = null
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deletingEvent.value = null
}

function markEventComplete(event: CaseEvent) {
  updateCaseEvent({
    eventId: event.eventId,
    status: CaseEventStatus.COMPLETED,
  })
  if (selectedEvent.value?.eventId === event.eventId) {
    selectedEvent.value.status = CaseEventStatus.COMPLETED
  }
}

function goToCaseDetail(caseId: string) {
  router.push({ name: 'case-detail', params: { id: caseId } })
}

function goToCaseTimeline(caseId: string) {
  router.push({ name: 'case-timeline', query: { caseId } })
}

function goToHome() {
  router.push({ name: 'home' })
}

function goToCases() {
  router.push({ name: 'case-list' })
}

function goToTasks() {
  router.push({ name: 'task-list' })
}

function goToTimeline() {
  router.push({ name: 'case-timeline' })
}

function resetFilters() {
  filters.value = {
    caseStatus: 'all',
    responsibleLawyer: 'all',
    startDate: '',
    endDate: '',
    eventType: 'all',
    eventStatus: 'all',
  }
}

function goToDate(dateStr: string) {
  const d = new Date(dateStr)
  currentDate.value = new Date(d.getFullYear(), d.getMonth(), 1)
}

function getDaysDiff(dateStr: string): number {
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
      <div class="max-w-[1600px] mx-auto px-6 py-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <div class="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-sm">
              <Scale class="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 class="text-lg font-bold text-gray-900">庭期日历 / 案件时间线</h1>
              <p class="text-xs text-gray-500">管理开庭、举证、文书提交等关键节点</p>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              class="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-sm transition-colors"
              @click="goToHome"
            >
              <Home class="w-4 h-4" />
              首页
            </button>
            <button
              class="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-sm transition-colors"
              @click="goToCases"
            >
              <FolderTree class="w-4 h-4" />
              案件
            </button>
            <button
              class="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-sm transition-colors"
              @click="goToTasks"
            >
              <ClipboardList class="w-4 h-4" />
              任务
            </button>
            <button
              class="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-sm font-medium"
              @click="goToTimeline"
            >
              <CalendarIcon class="w-4 h-4" />
              日历
            </button>
            <button
              class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
              @click="openCreateForm()"
            >
              <Plus class="w-4 h-4" />
              新增事件
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-[1600px] mx-auto px-6 py-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-blue-50 rounded-lg">
              <CalendarIcon class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p class="text-xs text-gray-500">本月事件</p>
              <p class="text-xl font-bold text-gray-900">{{ monthStats.total }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-yellow-50 rounded-lg">
              <Clock class="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p class="text-xs text-gray-500">待处理</p>
              <p class="text-xl font-bold text-gray-900">{{ monthStats.pending }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-red-50 rounded-lg">
              <AlertCircle class="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p class="text-xs text-gray-500">本月开庭</p>
              <p class="text-xl font-bold text-gray-900">{{ monthStats.hearing }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-green-50 rounded-lg">
              <CheckCircle class="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p class="text-xs text-gray-500">已完成</p>
              <p class="text-xl font-bold text-gray-900">{{ monthStats.completed }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2.5 rounded-lg" :class="monthStats.overdue > 0 ? 'bg-red-50' : 'bg-gray-50'">
              <AlertCircle class="w-5 h-5" :class="monthStats.overdue > 0 ? 'text-red-600' : 'text-gray-500'" />
            </div>
            <div>
              <p class="text-xs text-gray-500">逾期事件</p>
              <p class="text-xl font-bold" :class="monthStats.overdue > 0 ? 'text-red-600' : 'text-gray-900'">{{ monthStats.overdue }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div class="lg:col-span-3">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-1">
                  <button
                    class="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    @click="goToPrevMonth"
                  >
                    <ChevronLeft class="w-5 h-5" />
                  </button>
                  <div class="min-w-[160px] text-center">
                    <h2 class="text-lg font-bold text-gray-900">
                      {{ currentYear }}年 {{ monthNames[currentMonth] }}
                    </h2>
                  </div>
                  <button
                    class="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    @click="goToNextMonth"
                  >
                    <ChevronRight class="w-5 h-5" />
                  </button>
                </div>
                <button
                  class="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  @click="goToToday"
                >
                  今天
                </button>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex items-center bg-gray-100 rounded-lg p-0.5">
                  <button
                    class="px-3 py-1.5 text-xs rounded-md transition-colors"
                    :class="viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'"
                    @click="viewMode = 'calendar'"
                  >
                    日历
                  </button>
                  <button
                    class="px-3 py-1.5 text-xs rounded-md transition-colors"
                    :class="viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'"
                    @click="viewMode = 'list'"
                  >
                    列表
                  </button>
                </div>
                <button
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  @click="showFilters = !showFilters"
                  :class="showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'text-gray-600'"
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
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">案件状态</label>
                  <select
                    v-model="filters.caseStatus"
                    class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">全部</option>
                    <option v-for="(info, key) in caseStatusMap" :key="key" :value="key">
                      {{ info.label }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">承办律师</label>
                  <select
                    v-model="filters.responsibleLawyer"
                    class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">全部</option>
                    <option v-for="lawyer in responsibleLawyers" :key="lawyer" :value="lawyer">
                      {{ lawyer }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">事件类型</label>
                  <select
                    v-model="filters.eventType"
                    class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">全部</option>
                    <option v-for="(info, key) in caseEventTypeMap" :key="key" :value="key">
                      {{ info.label }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">事件状态</label>
                  <select
                    v-model="filters.eventStatus"
                    class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">全部</option>
                    <option v-for="(info, key) in caseEventStatusMap" :key="key" :value="key">
                      {{ info.label }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">开始日期</label>
                  <input
                    v-model="filters.startDate"
                    type="date"
                    class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label class="text-xs text-gray-500 mb-1 block">结束日期</label>
                  <input
                    v-model="filters.endDate"
                    type="date"
                    class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <div v-if="viewMode === 'calendar'">
              <div class="grid grid-cols-7 border-b border-gray-100">
                <div
                  v-for="(day, idx) in weekDays"
                  :key="day"
                  class="px-2 py-2 text-center text-xs font-medium"
                  :class="idx === 0 || idx === 6 ? 'text-red-500' : 'text-gray-500'"
                >
                  {{ day }}
                </div>
              </div>
              <div class="grid grid-cols-7">
                <div
                  v-for="day in calendarDays"
                  :key="day.dateStr + day.isCurrentMonth"
                  class="min-h-[120px] border-b border-r border-gray-100 p-1.5 relative cursor-pointer hover:bg-gray-50 transition-colors group"
                  :class="[
                    !day.isCurrentMonth ? 'bg-gray-50/60' : '',
                    isToday(day.date) ? 'bg-blue-50/30' : '',
                  ]"
                  @click="openCreateForm(day.dateStr)"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span
                      class="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full"
                      :class="[
                        isToday(day.date)
                          ? 'bg-blue-600 text-white'
                          : day.isCurrentMonth
                          ? 'text-gray-700'
                          : 'text-gray-400',
                      ]"
                    >
                      {{ day.date.getDate() }}
                    </span>
                    <button
                      class="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      @click.stop="openCreateForm(day.dateStr)"
                      title="添加事件"
                    >
                      <Plus class="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div class="space-y-1">
                    <div
                      v-for="event in (eventsByDate[day.dateStr] || []).slice(0, 3)"
                      :key="event.eventId"
                      class="text-xs px-1.5 py-1 rounded truncate cursor-pointer border-l-2"
                      :class="[
                        caseEventTypeMap[event.eventType].class,
                        `border-l-${caseEventTypeMap[event.eventType].dotClass.replace('bg-', '')}`,
                      ]"
                      @click.stop="openEventDetail(event)"
                      :title="event.title"
                    >
                      {{ event.title }}
                    </div>
                    <div
                      v-if="(eventsByDate[day.dateStr] || []).length > 3"
                      class="text-xs text-gray-500 text-center py-0.5"
                    >
                      +{{ (eventsByDate[day.dateStr] || []).length - 3 }} 更多
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="divide-y divide-gray-100 max-h-[700px] overflow-y-auto">
              <div v-if="filteredEvents.length === 0" class="py-16 text-center">
                <CalendarIcon class="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p class="text-sm text-gray-500">暂无符合条件的事件</p>
                <button
                  class="mt-4 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  @click="openCreateForm()"
                >
                  创建第一个事件
                </button>
              </div>
              <div
                v-for="event in filteredEvents"
                :key="event.eventId"
                class="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                @click="openEventDetail(event)"
              >
                <div class="flex items-start gap-3">
                  <div class="flex flex-col items-center pt-0.5">
                    <div class="w-3 h-3 rounded-full" :class="caseEventTypeMap[event.eventType].dotClass"></div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        class="px-2 py-0.5 text-xs font-medium rounded-full border"
                        :class="caseEventTypeMap[event.eventType].class"
                      >
                        {{ caseEventTypeMap[event.eventType].label }}
                      </span>
                      <span
                        class="px-2 py-0.5 text-xs rounded-full border"
                        :class="caseEventStatusMap[event.status].class"
                      >
                        {{ caseEventStatusMap[event.status].label }}
                      </span>
                      <span
                        v-if="getDaysDiff(event.eventDate) > 0 && getDaysDiff(event.eventDate) <= 7"
                        class="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full"
                      >
                        {{ getDaysDiff(event.eventDate) }}天后
                      </span>
                      <span
                        v-else-if="getDaysDiff(event.eventDate) === 0"
                        class="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full flex items-center gap-1"
                      >
                        <AlertCircle class="w-3 h-3" />
                        今天
                      </span>
                    </div>
                    <h3 class="text-sm font-semibold text-gray-900 mb-1">{{ event.title }}</h3>
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span class="flex items-center gap-1">
                        <CalendarIcon class="w-3 h-3" />
                        {{ event.eventDate }}
                      </span>
                      <span v-if="event.location" class="flex items-center gap-1 truncate">
                        <MapPin class="w-3 h-3 flex-shrink-0" />
                        <span class="truncate max-w-[200px]">{{ event.location }}</span>
                      </span>
                      <span v-if="getEventCase(event.caseId)" class="flex items-center gap-1">
                        <Briefcase class="w-3 h-3" />
                        {{ getEventCase(event.caseId)?.caseNumber }}
                      </span>
                      <span v-if="getEventCase(event.caseId)" class="flex items-center gap-1">
                        <User class="w-3 h-3" />
                        {{ getEventCase(event.caseId)?.responsibleLawyer }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Clock class="w-4 h-4 text-orange-500" />
                未来30天事件
              </h3>
              <span class="text-xs text-gray-400">{{ upcomingEvents.length }} 项</span>
            </div>
            <div class="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
              <div v-if="upcomingEvents.length === 0" class="py-8 px-4 text-center">
                <p class="text-xs text-gray-400">暂无即将到来的事件</p>
              </div>
              <div
                v-for="event in upcomingEvents"
                :key="event.eventId"
                class="p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                @click="openEventDetail(event)"
              >
                <div class="flex items-start gap-2.5">
                  <div class="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" :class="caseEventTypeMap[event.eventType].dotClass"></div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 mb-0.5">
                      <span
                        class="px-1.5 py-px text-[10px] rounded border"
                        :class="caseEventTypeMap[event.eventType].class"
                      >
                        {{ caseEventTypeMap[event.eventType].label }}
                      </span>
                      <span v-if="getDaysDiff(event.eventDate) === 0" class="text-[10px] text-red-600 font-medium">今天</span>
                      <span v-else-if="getDaysDiff(event.eventDate) <= 3" class="text-[10px] text-orange-600 font-medium">{{ getDaysDiff(event.eventDate) }}天后</span>
                    </div>
                    <p class="text-xs font-medium text-gray-900 truncate">{{ event.title }}</p>
                    <p class="text-[11px] text-gray-500 mt-0.5">{{ event.eventDate }} · {{ getEventCase(event.caseId)?.responsibleLawyer || '-' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-100">
              <h3 class="text-sm font-semibold text-gray-900 mb-2">事件类型图例</h3>
            </div>
            <div class="p-4 space-y-2">
              <div
                v-for="(info, key) in caseEventTypeMap"
                :key="key"
                class="flex items-center gap-2"
              >
                <div class="w-2.5 h-2.5 rounded-full" :class="info.dotClass"></div>
                <span class="text-xs text-gray-700">{{ info.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <Teleport to="body">
      <div
        v-if="showEventDetail && selectedEvent"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="closeEventDetail"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg" :class="`${caseEventTypeMap[selectedEvent.eventType].class.split(' ')[0]}`">
                <CalendarIcon class="w-5 h-5" :class="caseEventTypeMap[selectedEvent.eventType].class.split(' ')[1]" />
              </div>
              <div>
                <h3 class="text-base font-semibold text-gray-900">{{ selectedEvent.title }}</h3>
                <div class="flex items-center gap-2 mt-0.5">
                  <span
                    class="px-2 py-0.5 text-xs font-medium rounded-full border"
                    :class="caseEventTypeMap[selectedEvent.eventType].class"
                  >
                    {{ caseEventTypeMap[selectedEvent.eventType].label }}
                  </span>
                  <span
                    class="px-2 py-0.5 text-xs rounded-full border"
                    :class="caseEventStatusMap[selectedEvent.status].class"
                  >
                    {{ caseEventStatusMap[selectedEvent.status].label }}
                  </span>
                </div>
              </div>
            </div>
            <button
              class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              @click="closeEventDetail"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="px-5 py-5 space-y-4">
            <div v-if="getEventCase(selectedEvent.caseId)" class="p-3 bg-gray-50 rounded-lg">
              <p class="text-xs text-gray-500 mb-1">关联案件</p>
              <button
                class="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline text-left"
                @click="goToCaseDetail(selectedEvent.caseId)"
              >
                {{ getEventCase(selectedEvent.caseId)?.caseNumber }} - {{ getEventCase(selectedEvent.caseId)?.name }}
              </button>
              <p class="text-xs text-gray-500 mt-1">
                <span class="flex items-center gap-1 inline-flex">
                  <User class="w-3 h-3" />
                  {{ getEventCase(selectedEvent.caseId)?.responsibleLawyer }}
                </span>
                <span class="mx-2">·</span>
                <span
                  class="px-1.5 py-0.5 text-[10px] rounded border"
                  :class="getEventCase(selectedEvent.caseId) ? caseStatusMap[getEventCase(selectedEvent.caseId)!.status].class : ''"
                >
                  {{ getEventCase(selectedEvent.caseId) ? caseStatusMap[getEventCase(selectedEvent.caseId)!.status].label : '' }}
                </span>
              </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <CalendarIcon class="w-3 h-3" />
                  事件日期
                </p>
                <p class="text-sm font-medium text-gray-900">{{ selectedEvent.eventDate }}</p>
                <p v-if="getDaysDiff(selectedEvent.eventDate) === 0" class="text-xs text-red-600 mt-0.5">今天</p>
                <p v-else-if="getDaysDiff(selectedEvent.eventDate) > 0" class="text-xs text-gray-500 mt-0.5">
                  还有 {{ getDaysDiff(selectedEvent.eventDate) }} 天
                </p>
                <p v-else class="text-xs text-gray-500 mt-0.5">
                  已过 {{ Math.abs(getDaysDiff(selectedEvent.eventDate)) }} 天
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Clock class="w-3 h-3" />
                  提前提醒
                </p>
                <p class="text-sm font-medium text-gray-900">
                  {{ selectedEvent.remindBeforeDays }} 天前
                </p>
              </div>
            </div>

            <div v-if="selectedEvent.location">
              <p class="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <MapPin class="w-3 h-3" />
                地点
              </p>
              <p class="text-sm text-gray-900">{{ selectedEvent.location }}</p>
            </div>

            <div v-if="selectedEvent.description">
              <p class="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <FileText class="w-3 h-3" />
                详细描述
              </p>
              <p class="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3">
                {{ selectedEvent.description }}
              </p>
            </div>
          </div>

          <div class="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <button
                v-if="selectedEvent.status !== CaseEventStatus.COMPLETED && selectedEvent.status !== CaseEventStatus.CANCELLED"
                class="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
                @click="markEventComplete(selectedEvent)"
              >
                <CheckCircle class="w-3.5 h-3.5" />
                标记完成
              </button>
              <button
                class="px-3 py-1.5 text-xs text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                @click="goToCaseTimeline(selectedEvent.caseId)"
              >
                查看时间线
              </button>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                @click="confirmDelete(selectedEvent)"
                title="删除"
              >
                <Trash2 class="w-4 h-4" />
              </button>
              <button
                class="px-3 py-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5"
                @click="openEditForm(selectedEvent)"
              >
                <Edit3 class="w-3.5 h-3.5" />
                编辑
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="showDeleteConfirm && deletingEvent"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="cancelDelete"
      >
        <div class="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100">
            <h3 class="text-base font-semibold text-gray-900">确认删除</h3>
          </div>
          <div class="px-5 py-5">
            <p class="text-sm text-gray-600">
              确定要删除事件「<span class="font-medium text-gray-900">{{ deletingEvent.title }}</span>」吗？
              <br />
              <span class="text-xs text-gray-500">此操作不可撤销。</span>
            </p>
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

    <CaseEventFormModal
      :visible="showFormModal"
      :event="editingEvent"
      @close="showFormModal = false; editingEvent = null"
      @saved="handleEventSaved"
      @error="handleFormError"
    />
  </div>
</template>
