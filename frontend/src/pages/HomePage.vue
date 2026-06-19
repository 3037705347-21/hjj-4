<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  Briefcase,
  FolderTree,
  FileSpreadsheet,
  ArrowRight,
  Scale,
  Shield,
  Users,
  FileText,
  ClipboardList,
  CalendarDays,
  History,
  MessageSquare,
} from 'lucide-vue-next'

const router = useRouter()

const goToCases = () => {
  router.push({ name: 'case-list' })
}

const goToTasks = () => {
  router.push({ name: 'task-list' })
}

const goToCalendar = () => {
  router.push({ name: 'case-calendar' })
}

const goToTimeline = () => {
  router.push({ name: 'case-timeline' })
}

const goToCommunications = () => {
  router.push({ name: 'communication-list' })
}

const features = [
  {
    icon: FolderTree,
    title: '材料树管理',
    description: '以树形结构直观管理案件材料，支持文件夹分类、拖拽排序、快速增删改',
    color: 'blue',
  },
  {
    icon: CalendarDays,
    title: '庭期日历',
    description: '日历视图直观展示所有案件的开庭、举证、文书提交等关键节点，一目了然',
    color: 'red',
  },
  {
    icon: History,
    title: '案件时间线',
    description: '按案件维度展示完整时间线，追踪立案、开庭、结案等全流程关键事件',
    color: 'cyan',
  },
  {
    icon: ClipboardList,
    title: '案件任务与提醒',
    description: '为每个案件设置待办事项、截止日期，跟踪任务进度和逾期状态',
    color: 'indigo',
  },
  {
    icon: FileSpreadsheet,
    title: '清单导出',
    description: '一键导出完整材料清单，支持 Excel 和 PDF 格式，包含详细元数据',
    color: 'green',
  },
  {
    icon: Shield,
    title: '权限管理',
    description: '基于律师角色的访问控制，确保案件材料安全，操作留痕可追溯',
    color: 'purple',
  },
  {
    icon: Users,
    title: '团队协作',
    description: '多位律师可协同管理同一案件材料，实时同步更新状态',
    color: 'orange',
  },
  {
    icon: MessageSquare,
    title: '客户沟通记录',
    description: '沉淀案件办理过程中的来电、面谈、微信、邮件和催材料记录，支持时间轴视图和多维度筛选',
    color: 'teal',
  },
]

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
  red: 'bg-red-50 text-red-600',
  cyan: 'bg-cyan-50 text-cyan-600',
  teal: 'bg-teal-50 text-teal-600',
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
    <header class="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-20">
      <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
            <Scale class="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 class="text-lg font-bold text-gray-900">律所案件管理系统</h1>
            <p class="text-xs text-gray-500">Case Material Management</p>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <button
            class="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-sm"
            @click="goToTasks"
          >
            <ClipboardList class="w-4 h-4" />
            任务管理
          </button>
          <button
            class="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-sm"
            @click="goToTimeline"
          >
            <History class="w-4 h-4" />
            案件时间线
          </button>
          <button
            class="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-sm"
            @click="goToCalendar"
          >
            <CalendarDays class="w-4 h-4" />
            庭期日历
          </button>
          <button
            class="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-sm"
            @click="goToCommunications"
          >
            <MessageSquare class="w-4 h-4" />
            沟通记录
          </button>
          <button
            class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
            @click="goToCases"
          >
            案件管理
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>

    <section class="max-w-7xl mx-auto px-6 py-20">
      <div class="text-center max-w-3xl mx-auto">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
          <Briefcase class="w-4 h-4" />
          专为律师事务所打造
        </div>
        <h2 class="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
          高效管理
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            案件材料
          </span>
          <br />
          提升办案效率
        </h2>
        <p class="text-lg text-gray-600 mb-10 leading-relaxed">
          直观的树形材料管理、一键导出清单、完善的权限控制，
          让律师团队专注于案件本身，而非文件管理。
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            class="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-base font-semibold"
            @click="goToCases"
          >
            <FolderTree class="w-5 h-5" />
            案件管理
            <ArrowRight class="w-5 h-5" />
          </button>
          <button
            class="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-md border border-gray-200 text-base font-semibold"
            @click="goToTasks"
          >
            <ClipboardList class="w-5 h-5 text-indigo-600" />
            任务管理
          </button>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 pb-20">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
        >
          <div
            class="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
            :class="colorMap[feature.color]"
          >
            <component :is="feature.icon" class="w-6 h-6" />
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            {{ feature.title }}
          </h3>
          <p class="text-sm text-gray-500 leading-relaxed">
            {{ feature.description }}
          </p>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-6 pb-20">
      <div class="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
        <div class="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div class="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        <div class="relative z-10 max-w-2xl">
          <h3 class="text-2xl md:text-3xl font-bold mb-4">
            立即开始管理您的案件材料
          </h3>
          <p class="text-blue-100 text-lg mb-8 leading-relaxed">
            进入系统，体验高效便捷的案件材料管理流程。支持文件夹分类管理、拖拽排序、一键导出清单。
          </p>
          <div class="flex flex-col sm:flex-row items-start gap-3 flex-wrap">
            <button
              class="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl text-base font-semibold"
              @click="goToCases"
            >
              <Briefcase class="w-5 h-5" />
              案件管理
              <ArrowRight class="w-5 h-5" />
            </button>
            <button
              class="inline-flex items-center gap-2 px-8 py-3.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all border border-white/20 text-base font-semibold"
              @click="goToCalendar"
            >
              <CalendarDays class="w-5 h-5" />
              庭期日历
            </button>
            <button
              class="inline-flex items-center gap-2 px-8 py-3.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all border border-white/20 text-base font-semibold"
              @click="goToTimeline"
            >
              <History class="w-5 h-5" />
              案件时间线
            </button>
            <button
              class="inline-flex items-center gap-2 px-8 py-3.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all border border-white/20 text-base font-semibold"
              @click="goToTasks"
            >
              <ClipboardList class="w-5 h-5" />
              任务管理
            </button>
          </div>
        </div>
      </div>
    </section>

    <footer class="border-t border-gray-200 bg-white/50 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <Scale class="w-4 h-4" />
            <span>律所案件材料管理系统 v1.0</span>
          </div>
          <p class="text-sm text-gray-400">
            © 2026 Law Firm Case Management System. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>
