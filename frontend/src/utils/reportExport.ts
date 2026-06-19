import * as XLSX from 'xlsx'
import type {
  StatusStats,
  CaseTypeStats,
  LawyerStats,
  MaterialStats,
  CaseMaterialRank,
  ReportFilters,
  MissingCaseItem,
} from '@/composables/useReportStats'

interface ReportOverviewExportData {
  totalCases: number
  statusStats: StatusStats[]
  caseTypeStats: CaseTypeStats[]
  lawyerStats: LawyerStats[]
  materialStats: MaterialStats
  caseMaterialRank: CaseMaterialRank[]
  filters: ReportFilters
}

interface CaseDistributionExportData {
  totalCases: number
  statusStats: StatusStats[]
  caseTypeStats: CaseTypeStats[]
  lawyerStats: LawyerStats[]
  filters: ReportFilters
}

interface MaterialStatsExportData {
  totalCases: number
  materialStats: MaterialStats
  caseMaterialRank: CaseMaterialRank[]
  filters: ReportFilters
}

const generateFileName = (reportName: string): string => {
  const dateStr = new Date().toISOString().split('T')[0]
  return `${reportName}_${dateStr}.xlsx`
}

const buildFilterInfoRows = (filters: ReportFilters): string[][] => {
  const rows: string[][] = [
    ['筛选条件', ''],
    ['日期范围', `${filters.dateFrom || '不限'} 至 ${filters.dateTo || '不限'}`],
    ['案件状态', filters.status === 'all' ? '全部' : filters.status],
    ['案件类型', filters.caseType === 'all' ? '全部' : filters.caseType],
    ['承办律师', filters.responsibleLawyer === 'all' ? '全部' : filters.responsibleLawyer],
    ['导出时间', new Date().toLocaleString('zh-CN')],
  ]
  return rows
}

export const exportReportOverview = (data: ReportOverviewExportData) => {
  const wb = XLSX.utils.book_new()

  const summaryData = [
    ['统计报表总览', ''],
    ...buildFilterInfoRows(data.filters),
    ['', ''],
    ['核心指标', '数值'],
    ['案件总数', data.totalCases],
    ['材料文件总数', data.materialStats.totalFiles],
    ['文件夹总数', data.materialStats.totalFolders],
    ['每案平均材料数', data.materialStats.avgPerCase],
    ['单案最多材料数', data.materialStats.maxPerCase],
    ['单案最少材料数', data.materialStats.minPerCase],
    ['最近新增材料数', data.materialStats.recentMaterialsCount],
    ['材料缺失案件数', data.materialStats.casesWithMissing],
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, '核心指标')

  const statusData = [
    ['案件状态分布', '', '', ''],
    ['状态', '数量', '占比', ''],
    ...data.statusStats.map(s => [s.label, s.count, `${s.percentage}%`, '']),
  ]
  const wsStatus = XLSX.utils.aoa_to_sheet(statusData)
  wsStatus['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsStatus, '状态分布')

  const typeData = [
    ['案件类型分布', '', '', ''],
    ['类型', '数量', '占比', ''],
    ...data.caseTypeStats.map(t => [t.name, t.count, `${t.percentage}%`, '']),
  ]
  const wsType = XLSX.utils.aoa_to_sheet(typeData)
  wsType['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsType, '类型分布')

  const lawyerData = [
    ['承办律师案件量', '', '', ''],
    ['排名', '律师', '案件数', '材料数'],
    ...data.lawyerStats.map((l, i) => [i + 1, l.name, l.caseCount, l.materialCount]),
  ]
  const wsLawyer = XLSX.utils.aoa_to_sheet(lawyerData)
  wsLawyer['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 12 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsLawyer, '律师排行')

  const rankData = [
    ['案件材料数量排行', '', '', '', ''],
    ['排名', '案件名称', '案号', '承办律师', '材料数'],
    ...data.caseMaterialRank.map((c, i) => [i + 1, c.caseName, c.caseNumber, c.responsibleLawyer, c.materialCount]),
  ]
  const wsRank = XLSX.utils.aoa_to_sheet(rankData)
  wsRank['!cols'] = [{ wch: 8 }, { wch: 40 }, { wch: 25 }, { wch: 15 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsRank, '材料排行')

  const recentData = [
    ['最近新增材料', '', '', ''],
    ['材料名称', '所属案件', '上传人', '上传日期'],
    ...data.materialStats.recentMaterials.map(m => [m.fileName, m.caseName, m.uploader, m.uploadDate]),
  ]
  const wsRecent = XLSX.utils.aoa_to_sheet(recentData)
  wsRecent['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, wsRecent, '最近新增')

  const missingData = [
    ['材料缺失案件', '', '', '', ''],
    ['案件名称', '案号', '承办律师', '缺失材料数', ''],
    ...data.materialStats.missingCaseDetails.map(c => [
      c.caseName,
      c.caseNumber,
      c.responsibleLawyer,
      c.missingCount,
    ]),
  ]
  const wsMissing = XLSX.utils.aoa_to_sheet(missingData)
  wsMissing['!cols'] = [{ wch: 40 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsMissing, '缺失案件')

  XLSX.writeFile(wb, generateFileName('统计报表总览'))
}

export const exportCaseDistribution = (data: CaseDistributionExportData) => {
  const wb = XLSX.utils.book_new()

  const summaryData = [
    ['案件分布统计', ''],
    ...buildFilterInfoRows(data.filters),
    ['', ''],
    ['指标', '数值'],
    ['案件总数', data.totalCases],
    ['案件类型数', data.caseTypeStats.length],
    ['承办律师数', data.lawyerStats.length],
    ['人均案件数', data.lawyerStats.length > 0 ? (data.totalCases / data.lawyerStats.length).toFixed(1) : 0],
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, '概览')

  const statusData = [
    ['案件状态分布', '', ''],
    ['状态', '数量', '占比'],
    ...data.statusStats.map(s => [s.label, s.count, `${s.percentage}%`]),
  ]
  const wsStatus = XLSX.utils.aoa_to_sheet(statusData)
  wsStatus['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsStatus, '状态分布')

  const typeData = [
    ['案件类型分布', '', ''],
    ['类型', '数量', '占比'],
    ...data.caseTypeStats.map(t => [t.name, t.count, `${t.percentage}%`]),
  ]
  const wsType = XLSX.utils.aoa_to_sheet(typeData)
  wsType['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsType, '类型分布')

  const lawyerData = [
    ['承办律师案件量排行', '', '', '', ''],
    ['排名', '律师', '案件数', '材料数', '案件占比'],
    ...data.lawyerStats.map((l, i) => [
      i + 1,
      l.name,
      l.caseCount,
      l.materialCount,
      data.totalCases > 0 ? `${((l.caseCount / data.totalCases) * 100).toFixed(1)}%` : '0%',
    ]),
  ]
  const wsLawyer = XLSX.utils.aoa_to_sheet(lawyerData)
  wsLawyer['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsLawyer, '律师排行')

  XLSX.writeFile(wb, generateFileName('案件分布统计'))
}

export const exportMaterialStats = (data: MaterialStatsExportData) => {
  const wb = XLSX.utils.book_new()

  const summaryData = [
    ['材料规模统计', ''],
    ...buildFilterInfoRows(data.filters),
    ['', ''],
    ['指标', '数值'],
    ['案件总数', data.totalCases],
    ['材料文件总数', data.materialStats.totalFiles],
    ['文件夹总数', data.materialStats.totalFolders],
    ['每案平均材料数', data.materialStats.avgPerCase],
    ['单案最多材料数', data.materialStats.maxPerCase],
    ['单案最少材料数', data.materialStats.minPerCase],
    ['最近新增材料数', data.materialStats.recentMaterialsCount],
    ['材料缺失案件数', data.materialStats.casesWithMissing],
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, '概览')

  const rankData = [
    ['案件材料数量排行', '', '', '', ''],
    ['排名', '案件名称', '案号', '承办律师', '材料数'],
    ...data.caseMaterialRank.map((c, i) => [i + 1, c.caseName, c.caseNumber, c.responsibleLawyer, c.materialCount]),
  ]
  const wsRank = XLSX.utils.aoa_to_sheet(rankData)
  wsRank['!cols'] = [{ wch: 8 }, { wch: 40 }, { wch: 25 }, { wch: 15 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsRank, '材料排行')

  const missingData = [
    ['材料缺失案件', '', '', '', ''],
    ['案件名称', '案号', '承办律师', '缺失材料数', ''],
    ...data.materialStats.missingCaseDetails.map(c => [
      c.caseName,
      c.caseNumber,
      c.responsibleLawyer,
      c.missingCount,
    ]),
  ]
  const wsMissing = XLSX.utils.aoa_to_sheet(missingData)
  wsMissing['!cols'] = [{ wch: 40 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsMissing, '缺失案件')

  const recentData = [
    ['最近新增材料', '', '', ''],
    ['材料名称', '所属案件', '上传人', '上传日期'],
    ...data.materialStats.recentMaterials.map(m => [m.fileName, m.caseName, m.uploader, m.uploadDate]),
  ]
  const wsRecent = XLSX.utils.aoa_to_sheet(recentData)
  wsRecent['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, wsRecent, '最近新增')

  XLSX.writeFile(wb, generateFileName('材料规模统计'))
}
