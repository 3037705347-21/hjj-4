import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { Case, FlatMaterialItem, MaterialNode } from '@/types'
import { MaterialNodeType } from '@/types'
import { flattenMaterialTree } from './treeUtils'

const nodeTypeLabel: Record<MaterialNodeType, string> = {
  [MaterialNodeType.FOLDER]: '文件夹',
  [MaterialNodeType.FILE]: '文件',
}

export const exportToExcel = (caseInfo: Case, materials: FlatMaterialItem[]) => {
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
  ]

  const wsInfo = XLSX.utils.aoa_to_sheet(caseInfoData)
  wsInfo['!cols'] = [{ wch: 25 }, { wch: 80 }]
  XLSX.utils.book_append_sheet(wb, wsInfo, '案件信息')

  const materialHeader = ['序号', '类型', '名称', '所在路径', '上传日期', '上传人', '文件大小', '备注']
  const materialData = materials.map((item, index) => [
    index + 1,
    nodeTypeLabel[item.type],
    item.name,
    item.path,
    item.uploadDate,
    item.uploader,
    item.fileSize,
    item.description,
  ])

  const wsMaterials = XLSX.utils.aoa_to_sheet([materialHeader, ...materialData])
  wsMaterials['!cols'] = [
    { wch: 6 },
    { wch: 8 },
    { wch: 40 },
    { wch: 50 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 30 },
  ]
  XLSX.utils.book_append_sheet(wb, wsMaterials, '材料清单')

  const fileName = `案件材料清单_${caseInfo.caseNumber.replace(/[()（）]/g, '')}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}

export const exportToPDF = (caseInfo: Case, materials: FlatMaterialItem[]) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Case Material Inventory', pageWidth / 2, 15, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  const caseData = [
    ['Case No.', caseInfo.caseNumber],
    ['Case Name', caseInfo.name],
    ['Client', caseInfo.client],
    ['Opposing Party', caseInfo.opposingParty],
    ['Case Type', caseInfo.caseType],
    ['Responsible Lawyer', caseInfo.responsibleLawyer],
    ['Filing Date', caseInfo.filingDate],
  ]

  let yPos = 25
  caseData.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label, 14, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(String(value).substring(0, 100), 50, yPos)
    yPos += 7
  })

  yPos += 5

  const tableColumn = ['No.', 'Type', 'Name', 'Path', 'Date', 'Uploader', 'Size']
  const tableRows = materials.map((item, index) => [
    String(index + 1),
    nodeTypeLabel[item.type],
    item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name,
    item.path.length > 40 ? item.path.substring(0, 37) + '...' : item.path,
    item.uploadDate,
    item.uploader,
    item.fileSize,
  ])

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: yPos,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 10, right: 10 },
  })

  const fileName = `Case_Materials_${caseInfo.caseNumber.replace(/[()（）]/g, '')}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

export const exportMaterialList = (
  caseInfo: Case,
  tree: MaterialNode[],
  format: 'excel' | 'pdf'
) => {
  const flatMaterials = flattenMaterialTree(tree)
  if (format === 'excel') {
    exportToExcel(caseInfo, flatMaterials)
  } else {
    exportToPDF(caseInfo, flatMaterials)
  }
}
