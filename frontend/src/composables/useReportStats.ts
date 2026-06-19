import { ref, computed } from 'vue'
import { mockCases } from '@/mock/data'
import { CaseStatus, MaterialNodeType } from '@/types'
import type { Case, CaseStatus as CaseStatusType, MaterialNode } from '@/types'
import { countFiles, flattenMaterialTree } from '@/utils/treeUtils'
import { getMissingCount } from '@/utils/caseWorkflow'

export interface ReportFilters {
  dateFrom: string
  dateTo: string
  status: CaseStatusType | 'all'
  caseType: string
  responsibleLawyer: string
}

export interface CaseTypeStats {
  name: string
  count: number
  percentage: number
}

export interface LawyerStats {
  name: string
  caseCount: number
  materialCount: number
}

export interface StatusStats {
  status: CaseStatusType
  label: string
  count: number
  percentage: number
  color: string
}

export interface MaterialStats {
  totalFiles: number
  totalFolders: number
  avgPerCase: number
  maxPerCase: number
  minPerCase: number
  casesWithMissing: number
  missingCases: Case[]
  missingCaseDetails: MissingCaseItem[]
  recentMaterials: Array<{
    caseId: string
    caseName: string
    fileName: string
    uploadDate: string
    uploader: string
  }>
  recentMaterialsCount: number
}

export interface MissingCaseItem {
  caseId: string
  caseName: string
  caseNumber: string
  responsibleLawyer: string
  missingCount: number
}

export interface CaseMaterialRank {
  caseId: string
  caseName: string
  caseNumber: string
  materialCount: number
  responsibleLawyer: string
}

const defaultFilters: ReportFilters = {
  dateFrom: '',
  dateTo: '',
  status: 'all',
  caseType: 'all',
  responsibleLawyer: 'all',
}

export function useReportStats() {
  const filters = ref<ReportFilters>({ ...defaultFilters })

  const allCases = computed(() => [...mockCases])

  const filteredCases = computed(() => {
    return allCases.value.filter(c => {
      const matchesDateFrom = !filters.value.dateFrom || c.filingDate >= filters.value.dateFrom
      const matchesDateTo = !filters.value.dateTo || c.filingDate <= filters.value.dateTo
      const matchesStatus = filters.value.status === 'all' || c.status === filters.value.status
      const matchesCaseType = filters.value.caseType === 'all' || c.caseType === filters.value.caseType
      const matchesLawyer = filters.value.responsibleLawyer === 'all' || c.responsibleLawyer === filters.value.responsibleLawyer

      return matchesDateFrom && matchesDateTo && matchesStatus && matchesCaseType && matchesLawyer
    })
  })

  const allCaseTypes = computed(() => {
    const types = new Set(allCases.value.map(c => c.caseType))
    return Array.from(types)
  })

  const allLawyers = computed(() => {
    const lawyers = new Set(allCases.value.map(c => c.responsibleLawyer))
    return Array.from(lawyers)
  })

  const totalCases = computed(() => filteredCases.value.length)

  const statusStats = computed<StatusStats[]>(() => {
    const total = filteredCases.value.length
    const statuses = [
      { status: CaseStatus.PENDING, label: '待处理', color: 'bg-yellow-500' },
      { status: CaseStatus.IN_PROGRESS, label: '进行中', color: 'bg-blue-500' },
      { status: CaseStatus.CLOSED, label: '已结案', color: 'bg-gray-500' },
    ]

    return statuses.map(s => {
      const count = filteredCases.value.filter(c => c.status === s.status).length
      return {
        status: s.status,
        label: s.label,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        color: s.color,
      }
    })
  })

  const caseTypeStats = computed<CaseTypeStats[]>(() => {
    const total = filteredCases.value.length
    const typeMap = new Map<string, number>()

    filteredCases.value.forEach(c => {
      const current = typeMap.get(c.caseType) || 0
      typeMap.set(c.caseType, current + 1)
    })

    return Array.from(typeMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
  })

  const lawyerStats = computed<LawyerStats[]>(() => {
    const lawyerMap = new Map<string, { caseCount: number; materialCount: number }>()

    filteredCases.value.forEach(c => {
      const current = lawyerMap.get(c.responsibleLawyer) || { caseCount: 0, materialCount: 0 }
      lawyerMap.set(c.responsibleLawyer, {
        caseCount: current.caseCount + 1,
        materialCount: current.materialCount + countFiles(c.materials),
      })
    })

    return Array.from(lawyerMap.entries())
      .map(([name, stats]) => ({
        name,
        caseCount: stats.caseCount,
        materialCount: stats.materialCount,
      }))
      .sort((a, b) => b.caseCount - a.caseCount)
  })

  const materialStats = computed<MaterialStats>(() => {
    let totalFiles = 0
    let totalFolders = 0
    let maxPerCase = 0
    let minPerCase = Infinity
    const casesWithMissingArr: Case[] = []
    const missingCaseDetailsArr: MissingCaseItem[] = []
    const allRecentMaterials: Array<{
      caseId: string
      caseName: string
      fileName: string
      uploadDate: string
      uploader: string
    }> = []

    filteredCases.value.forEach(c => {
      const fileCount = countFiles(c.materials)
      totalFiles += fileCount
      maxPerCase = Math.max(maxPerCase, fileCount)
      minPerCase = Math.min(minPerCase, fileCount)

      const folderCount = countFolders(c.materials)
      totalFolders += folderCount

      const missingCount = getMissingCount(c)
      if (missingCount > 0) {
        casesWithMissingArr.push(c)
        missingCaseDetailsArr.push({
          caseId: c.id,
          caseName: c.name,
          caseNumber: c.caseNumber,
          responsibleLawyer: c.responsibleLawyer,
          missingCount,
        })
      }

      const flatMaterials = flattenMaterialTree(c.materials)
      flatMaterials
        .filter(m => m.type === MaterialNodeType.FILE && m.uploadDate)
        .forEach(m => {
          allRecentMaterials.push({
            caseId: c.id,
            caseName: c.name,
            fileName: m.name,
            uploadDate: m.uploadDate,
            uploader: m.uploader,
          })
        })
    })

    const recentMaterials = allRecentMaterials
      .sort((a, b) => b.uploadDate.localeCompare(a.uploadDate))
      .slice(0, 10)

    missingCaseDetailsArr.sort((a, b) => b.missingCount - a.missingCount)

    return {
      totalFiles,
      totalFolders,
      avgPerCase: filteredCases.value.length > 0 ? Math.round(totalFiles / filteredCases.value.length) : 0,
      maxPerCase,
      minPerCase: minPerCase === Infinity ? 0 : minPerCase,
      casesWithMissing: casesWithMissingArr.length,
      missingCases: casesWithMissingArr,
      missingCaseDetails: missingCaseDetailsArr,
      recentMaterials,
      recentMaterialsCount: allRecentMaterials.length,
    }
  })

  const caseMaterialRank = computed<CaseMaterialRank[]>(() => {
    return filteredCases.value
      .map(c => ({
        caseId: c.id,
        caseName: c.name,
        caseNumber: c.caseNumber,
        materialCount: countFiles(c.materials),
        responsibleLawyer: c.responsibleLawyer,
      }))
      .sort((a, b) => b.materialCount - a.materialCount)
      .slice(0, 10)
  })

  const resetFilters = () => {
    filters.value = { ...defaultFilters }
  }

  return {
    filters,
    allCases,
    filteredCases,
    allCaseTypes,
    allLawyers,
    totalCases,
    statusStats,
    caseTypeStats,
    lawyerStats,
    materialStats,
    caseMaterialRank,
    resetFilters,
  }
}

function countFolders(nodes: MaterialNode[]): number {
  let count = 0
  for (const node of nodes) {
    if (node.type === MaterialNodeType.FOLDER) {
      count++
      if (node.children) {
        count += countFolders(node.children)
      }
    }
  }
  return count
}
