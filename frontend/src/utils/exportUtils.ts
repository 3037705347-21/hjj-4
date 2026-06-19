import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { Case, FlatMaterialItem, MaterialNode } from '@/types'
import { MaterialNodeType } from '@/types'
import { flattenMaterialTree, flattenSelectedNodes, filterMaterialTree } from './treeUtils'
import type { FilterOptions } from './treeUtils'

const nodeTypeLabel: Record<MaterialNodeType, string> = {
  [MaterialNodeType.FOLDER]: '文件夹',
  [MaterialNodeType.FILE]: '文件',
}

export type ExportRange = 'all' | 'filesOnly' | 'filtered' | 'selected'

export interface ExportColumnConfig {
  description: boolean
  uploader: boolean
  uploadDate: boolean
  fileSize: boolean
  path: boolean
}

export interface ExportConfig {
  range: ExportRange
  columns: ExportColumnConfig
  filterOptions?: FilterOptions
  selectedIds?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export const defaultExportColumns: ExportColumnConfig = {
  description: true,
  uploader: true,
  uploadDate: true,
  fileSize: true,
  path: true,
}

export const exportRangeLabels: Record<ExportRange, string> = {
  all: '导出全部材料',
  filesOnly: '仅导出文件节点',
  filtered: '仅导出当前筛选结果',
  selected: '仅导出选中节点',
}

const columnDefs: Array<{
  key: keyof ExportColumnConfig | 'index' | 'type' | 'name'
  label: string
  pdfLabel: string
  dataKey: keyof FlatMaterialItem | 'index'
  width: number
  pdfWidth?: number
  alwaysShow?: boolean
}> = [
  { key: 'index', label: '序号', pdfLabel: 'No.', dataKey: 'index', width: 6, alwaysShow: true },
  { key: 'type', label: '类型', pdfLabel: 'Type', dataKey: 'type', width: 8, alwaysShow: true },
  { key: 'name', label: '名称', pdfLabel: 'Name', dataKey: 'name', width: 40, alwaysShow: true },
  { key: 'path', label: '完整路径', pdfLabel: 'Path', dataKey: 'path', width: 50, pdfWidth: 60 },
  { key: 'uploadDate', label: '上传日期', pdfLabel: 'Date', dataKey: 'uploadDate', width: 12, pdfWidth: 25 },
  { key: 'uploader', label: '上传人', pdfLabel: 'Uploader', dataKey: 'uploader', width: 12, pdfWidth: 25 },
  { key: 'fileSize', label: '文件大小', pdfLabel: 'Size', dataKey: 'fileSize', width: 10, pdfWidth: 20 },
  { key: 'description', label: '备注', pdfLabel: 'Remark', dataKey: 'description', width: 30, pdfWidth: 40 },
]

const getColumns = (config: ExportColumnConfig, isExcel: boolean) => {
  return columnDefs.filter(col => {
    if (col.alwaysShow) return true
    return config[col.key as keyof ExportColumnConfig]
  })
}

const sortMaterials = (materials: FlatMaterialItem[], sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): FlatMaterialItem[] => {
  if (!sortBy) return materials

  const sorted = [...materials].sort((a, b) => {
    let aVal: string | number = ''
    let bVal: string | number = ''

    switch (sortBy) {
      case 'name':
        aVal = a.name
        bVal = b.name
        break
      case 'path':
        aVal = a.path
        bVal = b.path
        break
      case 'uploadDate':
        aVal = a.uploadDate
        bVal = b.uploadDate
        break
      case 'uploader':
        aVal = a.uploader
        bVal = b.uploader
        break
      case 'fileSize':
        aVal = a.fileSize
        bVal = b.fileSize
        break
      case 'type':
        aVal = a.type
        bVal = b.type
        break
      default:
        return 0
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  return sorted
}

const generateFileName = (caseInfo: Case, range: ExportRange, isExcel: boolean, filterOptions?: FilterOptions): string => {
  const baseName = caseInfo.caseNumber.replace(/[()（）]/g, '')
  const dateStr = new Date().toISOString().split('T')[0]

  const parts: string[] = ['案件材料清单']

  if (range === 'filesOnly') {
    parts.push('仅文件')
  } else if (range === 'filtered') {
    parts.push('筛选结果')
  } else if (range === 'selected') {
    parts.push('选中节点')
  }

  if (filterOptions && filterOptions.nameKeyword?.trim()) {
    parts.push(`搜索${filterOptions.nameKeyword.trim()}`)
  }

  parts.push(baseName, dateStr)

  const extension = isExcel ? 'xlsx' : 'pdf'
  return `${parts.join('_')}.${extension}`
}

const getCaseInfoSheetName = (range: ExportRange): string => {
  if (range === 'filesOnly') return '文件清单'
  if (range === 'filtered') return '筛选结果'
  if (range === 'selected') return '选中节点'
  return '材料清单'
}

export const getMaterialsByRange = (
  allMaterials: MaterialNode[],
  range: ExportRange,
  options?: { filterOptions?: FilterOptions; selectedIds?: string[] }
): FlatMaterialItem[] => {
  let materials: FlatMaterialItem[] = []

  switch (range) {
    case 'all':
      materials = flattenMaterialTree(allMaterials)
      break
    case 'filesOnly':
      materials = flattenMaterialTree(allMaterials).filter(m => m.type === MaterialNodeType.FILE)
      break
    case 'filtered':
      if (options?.filterOptions) {
        const filteredTree = filterMaterialTree(allMaterials, options.filterOptions)
        materials = flattenMaterialTree(filteredTree)
      } else {
        materials = flattenMaterialTree(allMaterials)
      }
      break
    case 'selected':
      if (options?.selectedIds && options.selectedIds.length > 0) {
        materials = flattenSelectedNodes(allMaterials, options.selectedIds)
      }
      break
  }

  return materials
}

export const exportToExcel = (
  caseInfo: Case,
  materials: FlatMaterialItem[],
  config: ExportConfig
) => {
  const { columns: colConfig, range } = config
  const wb = XLSX.utils.book_new()

  const caseInfoData = [
    ['案件编号', caseInfo.caseNumber],
    ['案件名称', caseInfo.name],
    ['当事人（原告/申请人）', caseInfo.client],
    ['对方当事人（被告/被申请人）', caseInfo.opposingParty],
    ['案件类型', caseInfo.caseType],
    ['承办律师', caseInfo.responsibleLawyer],
    ['立案日期', caseInfo.filingDate],
    ['案件描述', caseInfo.description],
    ['导出范围', exportRangeLabels[range]],
    ['导出时间', new Date().toLocaleString('zh-CN')],
  ]

  const wsInfo = XLSX.utils.aoa_to_sheet(caseInfoData)
  wsInfo['!cols'] = [{ wch: 25 }, { wch: 80 }]
  XLSX.utils.book_append_sheet(wb, wsInfo, '案件信息')

  const sortedMaterials = sortMaterials(materials, config.sortBy, config.sortOrder)
  const activeColumns = getColumns(colConfig, true)

  const materialHeader = activeColumns.map(col => col.label)
  const materialData = sortedMaterials.map((item, index) => {
    return activeColumns.map(col => {
      if (col.dataKey === 'index') return index + 1
      if (col.dataKey === 'type') return nodeTypeLabel[item.type]
      return item[col.dataKey as keyof FlatMaterialItem]
    })
  })

  const wsMaterials = XLSX.utils.aoa_to_sheet([materialHeader, ...materialData])
  wsMaterials['!cols'] = activeColumns.map(col => ({ wch: col.width }))
  XLSX.utils.book_append_sheet(wb, wsMaterials, getCaseInfoSheetName(range))

  const fileName = generateFileName(caseInfo, range, true, config.filterOptions)
  XLSX.writeFile(wb, fileName)
}

export const exportToPDF = (
  caseInfo: Case,
  materials: FlatMaterialItem[],
  config: ExportConfig
) => {
  const { columns: colConfig, range } = config
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('案件材料清单', pageWidth / 2, 15, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`导出范围：${exportRangeLabels[range]}`, pageWidth / 2, 22, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  const caseData = [
    ['案件编号', caseInfo.caseNumber],
    ['案件名称', caseInfo.name],
    ['当事人', caseInfo.client],
    ['对方当事人', caseInfo.opposingParty],
    ['案件类型', caseInfo.caseType],
    ['承办律师', caseInfo.responsibleLawyer],
    ['立案日期', caseInfo.filingDate],
  ]

  let yPos = 30
  caseData.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label, 14, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(String(value).substring(0, 100), 50, yPos)
    yPos += 7
  })

  yPos += 5

  const sortedMaterials = sortMaterials(materials, config.sortBy, config.sortOrder)
  const activeColumns = getColumns(colConfig, false)

  const tableColumn = activeColumns.map(col => col.pdfLabel)
  const tableRows = sortedMaterials.map((item, index) => {
    return activeColumns.map(col => {
      if (col.dataKey === 'index') return String(index + 1)
      if (col.dataKey === 'type') return nodeTypeLabel[item.type]
      const value = item[col.dataKey as keyof FlatMaterialItem]
      const maxLen = col.pdfWidth ? Math.floor(col.pdfWidth * 0.8) : 30
      return value && value.length > maxLen ? value.substring(0, maxLen - 3) + '...' : value
    })
  })

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: yPos,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 10, right: 10 },
  })

  const fileName = generateFileName(caseInfo, range, false, config.filterOptions)
  doc.save(fileName)
}

export const exportMaterialList = (
  caseInfo: Case,
  tree: MaterialNode[],
  format: 'excel' | 'pdf',
  config?: Partial<ExportConfig>
) => {
  const fullConfig: ExportConfig = {
    range: config?.range || 'all',
    columns: config?.columns || defaultExportColumns,
    filterOptions: config?.filterOptions,
    selectedIds: config?.selectedIds,
    sortBy: config?.sortBy,
    sortOrder: config?.sortOrder,
  }

  const materials = getMaterialsByRange(tree, fullConfig.range, {
    filterOptions: fullConfig.filterOptions,
    selectedIds: fullConfig.selectedIds,
  })

  if (format === 'excel') {
    exportToExcel(caseInfo, materials, fullConfig)
  } else {
    exportToPDF(caseInfo, materials, fullConfig)
  }
}
