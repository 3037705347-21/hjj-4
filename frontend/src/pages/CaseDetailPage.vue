<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  FileSpreadsheet,
  FileDown,
  Folder,
  FileText,
  Calendar,
  User,
  Clock,
  HardDrive,
  Edit3,
  Info,
} from 'lucide-vue-next'
import MaterialTree from '@/components/MaterialTree.vue'
import { mockCases, caseStatusMap } from '@/mock/data'
import type { Case, MaterialNode } from '@/types'
import { MaterialNodeType as NodeType } from '@/types'
import { flattenMaterialTree } from '@/utils/treeUtils'
import { exportToExcel, exportToPDF } from '@/utils/exportUtils'

const route = useRoute()
const router = useRouter()

const currentCase = ref<Case | null>(null)
const selectedNode = ref<MaterialNode | null>(null)
const treeRef = ref<InstanceType<typeof MaterialTree> | null>(null)
const currentMaterials = ref<MaterialNode[]>([])
const showExportMenu = ref(false)

onMounted(() => {
  const caseId = route.params.id as string
  const found = mockCases.find(c => c.id === caseId)
  if (found) {
    currentCase.value = found
    currentMaterials.value = JSON.parse(JSON.stringify(found.materials))
  }
})

const goBack = () => {
  router.push({ name: 'case-list' })
}

const handleSelectNode = (node: MaterialNode | null) => {
  selectedNode.value = node
}

const handleMaterialsUpdate = (materials: MaterialNode[]) => {
  currentMaterials.value = materials
}

const handleExport = (format: 'excel' | 'pdf') => {
  if (!currentCase.value) return
  const flatMaterials = flattenMaterialTree(currentMaterials.value)
  const exportCase = { ...currentCase.value, materials: currentMaterials.value }
  if (format === 'excel') {
    exportToExcel(exportCase, flatMaterials)
  } else {
    exportToPDF(exportCase, flatMaterials)
  }
  showExportMenu.value = false
}

const materialCount = computed(() => {
  const flat = flattenMaterialTree(currentMaterials.value)
  return flat.filter(m => m.type === NodeType.FILE).length
})

const folderCount = computed(() => {
  const flat = flattenMaterialTree(currentMaterials.value)
  return flat.filter(m => m.type === NodeType.FOLDER).length
})
</script>

<template>
  <div v-if="currentCase" class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
      <div class="max-w-[1600px] mx-auto px-6 py-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-4 min-w-0">
            <button
              class="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              @click="goBack"
            >
              <ArrowLeft class="w-5 h-5" />
            </button>
            <div class="min-w-0">
              <div class="flex items-center gap-3 mb-1">
                <span class="px-2.5 py-0.5 text-xs font-medium rounded-full border flex-shrink-0"
                  :class="caseStatusMap[currentCase.status].class">
                  {{ caseStatusMap[currentCase.status].label }}
                </span>
                <span class="text-xs text-gray-400 font-mono truncate">{{ currentCase.caseNumber }}</span>
                <span class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded flex-shrink-0">
                  {{ currentCase.caseType }}
                </span>
              </div>
              <h1 class="text-lg font-bold text-gray-900 truncate">{{ currentCase.name }}</h1>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <div class="relative">
              <button
                class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                @click="showExportMenu = !showExportMenu"
              >
                <FileDown class="w-4 h-4" />
                导出清单
              </button>
              <div
                v-if="showExportMenu"
                class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20"
              >
                <button
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  @click="handleExport('excel')"
                >
                  <FileSpreadsheet class="w-4 h-4 text-green-600" />
                  导出 Excel 文件
                </button>
                <button
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  @click="handleExport('pdf')"
                >
                  <FileText class="w-4 h-4 text-red-600" />
                  导出 PDF 文件
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="max-w-[1600px] mx-auto px-6 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-blue-50 rounded-lg">
              <User class="w-5 h-5 text-blue-600" />
            </div>
            <div class="min-w-0">
              <p class="text-xs text-gray-500">当事人（我方）</p>
              <p class="text-sm font-semibold text-gray-900 truncate">{{ currentCase.client }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-red-50 rounded-lg">
              <User class="w-5 h-5 text-red-600" />
            </div>
            <div class="min-w-0">
              <p class="text-xs text-gray-500">对方当事人</p>
              <p class="text-sm font-semibold text-gray-900 truncate">{{ currentCase.opposingParty }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-purple-50 rounded-lg">
              <Info class="w-5 h-5 text-purple-600" />
            </div>
            <div class="min-w-0">
              <p class="text-xs text-gray-500">承办律师</p>
              <p class="text-sm font-semibold text-gray-900 truncate">{{ currentCase.responsibleLawyer }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-green-50 rounded-lg">
              <Calendar class="w-5 h-5 text-green-600" />
            </div>
            <div class="min-w-0">
              <p class="text-xs text-gray-500">立案日期</p>
              <p class="text-sm font-semibold text-gray-900 truncate">{{ currentCase.filingDate }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <div class="flex items-center gap-2 mb-2">
          <Info class="w-4 h-4 text-gray-400" />
          <h2 class="text-sm font-semibold text-gray-700">案件描述</h2>
        </div>
        <p class="text-sm text-gray-600 leading-relaxed">{{ currentCase.description }}</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6" style="min-height: 600px;">
        <div class="lg:col-span-2 flex flex-col">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Folder class="w-5 h-5 text-yellow-500" />
              案件材料管理
            </h2>
            <div class="flex items-center gap-4 text-sm text-gray-500">
              <span class="flex items-center gap-1.5">
                <Folder class="w-4 h-4" />
                {{ folderCount }} 个文件夹
              </span>
              <span class="flex items-center gap-1.5">
                <FileText class="w-4 h-4" />
                {{ materialCount }} 个文件
              </span>
            </div>
          </div>
          <MaterialTree
            ref="treeRef"
            :materials="currentMaterials"
            class="flex-1"
            @update:materials="handleMaterialsUpdate"
            @select="handleSelectNode"
          />
        </div>

        <div class="flex flex-col">
          <h2 class="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Info class="w-5 h-5 text-gray-500" />
            材料详情
          </h2>
          <div class="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div v-if="selectedNode" class="p-5">
              <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div class="p-3 rounded-xl"
                  :class="selectedNode.type === NodeType.FOLDER ? 'bg-yellow-50' : 'bg-blue-50'">
                  <Folder v-if="selectedNode.type === NodeType.FOLDER" class="w-8 h-8 text-yellow-500" />
                  <FileText v-else class="w-8 h-8 text-blue-500" />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-gray-900 truncate">{{ selectedNode.name }}</h3>
                  <p class="text-sm text-gray-500 mt-0.5">
                    {{ selectedNode.type === NodeType.FOLDER ? '文件夹' : '文件' }}
                  </p>
                </div>
                <button
                  class="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-colors"
                  title="编辑"
                >
                  <Edit3 class="w-4 h-4" />
                </button>
              </div>

              <div class="mt-4 space-y-4">
                <div>
                  <p class="text-xs text-gray-500 mb-1.5">类型</p>
                  <p class="text-sm text-gray-900">
                    {{ selectedNode.type === NodeType.FOLDER ? '文件夹' : '文件' }}
                  </p>
                </div>

                <template v-if="selectedNode.type === NodeType.FILE">
                  <div>
                    <p class="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                      <User class="w-3 h-3" />
                      上传人
                    </p>
                    <p class="text-sm text-gray-900">{{ selectedNode.uploader || '-' }}</p>
                  </div>

                  <div>
                    <p class="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                      <Clock class="w-3 h-3" />
                      上传日期
                    </p>
                    <p class="text-sm text-gray-900">{{ selectedNode.uploadDate || '-' }}</p>
                  </div>

                  <div>
                    <p class="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                      <HardDrive class="w-3 h-3" />
                      文件大小
                    </p>
                    <p class="text-sm text-gray-900">{{ selectedNode.fileSize || '-' }}</p>
                  </div>
                </template>

                <div v-if="selectedNode.type === NodeType.FOLDER">
                  <p class="text-xs text-gray-500 mb-1.5">包含内容</p>
                  <p class="text-sm text-gray-900">
                    {{ selectedNode.children?.length || 0 }} 项
                  </p>
                </div>

                <div>
                  <p class="text-xs text-gray-500 mb-1.5">备注说明</p>
                  <p class="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    {{ selectedNode.description || '暂无备注' }}
                  </p>
                </div>
              </div>
            </div>

            <div v-else class="h-full flex flex-col items-center justify-center p-8 text-center">
              <FileText class="w-12 h-12 text-gray-300 mb-3" />
              <p class="text-sm text-gray-500">请在左侧选择材料</p>
              <p class="text-xs text-gray-400 mt-1">查看文件或文件夹的详细信息</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showExportMenu"
      class="fixed inset-0 z-10"
      @click="showExportMenu = false"
    ></div>
  </div>
</template>
