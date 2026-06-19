import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { Case, FlatMaterialItem, DocumentTemplate, ContentSchemaField, ContentSchema, GenerationRecord } from '@/types'
import { OutputFormat, MaterialNodeType, outputFormatMap, TemplateType, templateTypeMap } from '@/types'
import { flattenMaterialTree } from './treeUtils'
import { createGenerationRecord, getTemplateById as getTemplateFromMock, getTemplates } from '@/mock/documentTemplates'
import { mockCases } from '@/mock/data'

const nodeTypeLabel: Record<MaterialNodeType, string> = {
  [MaterialNodeType.FOLDER]: '文件夹',
  [MaterialNodeType.FILE]: '文件',
}

const getCaseFieldValue = (caseInfo: Case, fieldKey: string): string => {
  const value = caseInfo[fieldKey as keyof Case]
  if (value === undefined || value === null) return '-'
  if (typeof value === 'object' && 'label' in value) return String(value.label || value)
  return String(value)
}

const getMaterialFieldValue = (item: FlatMaterialItem, fieldKey: string, index: number): string => {
  if (fieldKey === 'index') return String(index + 1)
  if (fieldKey === 'type') return nodeTypeLabel[item.type]
  const value = item[fieldKey as keyof FlatMaterialItem]
  return value !== undefined && value !== null ? String(value) : '-'
}

const getActiveFields = (schema: ContentSchema, enabledFields: string[]): ContentSchemaField[] => {
  return schema.fields.filter(field => enabledFields.includes(field.key))
}

const generateFileName = (caseInfo: Case, template: DocumentTemplate): string => {
  const baseName = caseInfo.caseNumber.replace(/[()（）]/g, '')
  const dateStr = new Date().toISOString().split('T')[0]
  const extension = outputFormatMap[template.outputFormat].extension
  return `${baseName}_${template.name}_${dateStr}.${extension}`
}

const filterMaterialsByTemplateType = (
  materials: FlatMaterialItem[],
  templateType: TemplateType
): FlatMaterialItem[] => {
  switch (templateType) {
    case TemplateType.EVIDENCE_LIST:
      return materials.filter(m =>
        m.type === MaterialNodeType.FILE &&
        m.path.includes('证据')
      )
    case TemplateType.MATERIAL_TRANSFER:
      return materials.filter(m => m.type === MaterialNodeType.FILE)
    case TemplateType.ENTRUSTMENT_LIST:
      return materials.filter(m =>
        m.type === MaterialNodeType.FILE &&
        (m.path.includes('授权') || m.path.includes('委托'))
      )
    case TemplateType.CASE_COVER:
    default:
      return materials
  }
}

interface GenerateDocumentOptions {
  caseInfo: Case
  materials: FlatMaterialItem[]
  template: DocumentTemplate
  generatedBy: string
}

export const generateDocument = (options: GenerateDocumentOptions): GenerationRecord => {
  const { caseInfo, materials, template, generatedBy } = options

  const activeFields = getActiveFields(template.contentSchema, template.enabledFields)
  const filteredMaterials = filterMaterialsByTemplateType(materials, template.type)

  if (template.outputFormat === OutputFormat.EXCEL) {
    generateExcel(caseInfo, filteredMaterials, template, activeFields)
  } else if (template.outputFormat === OutputFormat.PDF) {
    generatePDF(caseInfo, filteredMaterials, template, activeFields)
  }

  const fileName = generateFileName(caseInfo, template)

  const record = createGenerationRecord({
    templateId: template.templateId,
    caseId: caseInfo.id,
    generatedBy,
    fileName,
    outputFormat: template.outputFormat,
    templateName: template.name,
    caseNumber: caseInfo.caseNumber,
    caseName: caseInfo.name,
  })

  return record
}

const generateExcel = (
  caseInfo: Case,
  materials: FlatMaterialItem[],
  template: DocumentTemplate,
  activeFields: ContentSchemaField[]
) => {
  const wb = XLSX.utils.book_new()

  const caseFields = activeFields.filter(f => f.source === 'case')
  const materialFields = activeFields.filter(f => f.source === 'material')

  if (caseFields.length > 0) {
    const caseInfoData = caseFields.map(field => [
      field.label,
      getCaseFieldValue(caseInfo, field.key),
    ])
    const wsInfo = XLSX.utils.aoa_to_sheet(caseInfoData)
    wsInfo['!cols'] = [{ wch: 25 }, { wch: 80 }]
    XLSX.utils.book_append_sheet(wb, wsInfo, '案件信息')
  }

  if (materialFields.length > 0) {
    const materialHeader = materialFields.map(f => f.label)
    const materialData = materials.map((item, index) =>
      materialFields.map(field => getMaterialFieldValue(item, field.key, index))
    )

    const wsMaterials = XLSX.utils.aoa_to_sheet([materialHeader, ...materialData])
    wsMaterials['!cols'] = materialFields.map(() => ({ wch: 20 }))
    XLSX.utils.book_append_sheet(wb, wsMaterials, template.contentSchema.title)
  }

  const fileName = generateFileName(caseInfo, template)
  XLSX.writeFile(wb, fileName)
}

const generatePDF = (
  caseInfo: Case,
  materials: FlatMaterialItem[],
  template: DocumentTemplate,
  activeFields: ContentSchemaField[]
) => {
  const orientation = template.contentSchema.pageOrientation === 'landscape' ? 'landscape' : 'portrait'
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(template.contentSchema.title, pageWidth / 2, 20, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`生成时间：${new Date().toLocaleString('zh-CN')}`, pageWidth / 2, 28, { align: 'center' })

  const caseFields = activeFields.filter(f => f.source === 'case')
  const materialFields = activeFields.filter(f => f.source === 'material')

  let yPos = 38

  if (caseFields.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('案件信息', 14, yPos)
    yPos += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    caseFields.forEach(field => {
      doc.setFont('helvetica', 'bold')
      doc.text(`${field.label}：`, 14, yPos)
      doc.setFont('helvetica', 'normal')
      const value = getCaseFieldValue(caseInfo, field.key)
      const maxWidth = pageWidth - 60
      if (doc.getTextWidth(value) > maxWidth) {
        const lines = doc.splitTextToSize(value, maxWidth)
        doc.text(lines, 40, yPos)
        yPos += lines.length * 5
      } else {
        doc.text(value, 40, yPos)
        yPos += 6
      }
    })

    yPos += 5
  }

  if (materialFields.length > 0 && materials.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(template.contentSchema.title, 14, yPos)
    yPos += 8

    const tableColumn = materialFields.map(f => f.label)
    const tableRows = materials.map((item, index) =>
      materialFields.map(field => {
        const value = getMaterialFieldValue(item, field.key, index)
        const maxLen = 40
        return value && value.length > maxLen ? value.substring(0, maxLen - 3) + '...' : value
      })
    )

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: yPos,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 10, right: 10 },
    })
  }

  if (template.contentSchema.includeFooter) {
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(128, 128, 128)
      doc.text(
        `${caseInfo.caseNumber} · ${template.name}`,
        14,
        doc.internal.pageSize.getHeight() - 10
      )
      doc.text(
        `第 ${i} 页 / 共 ${pageCount} 页`,
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      )
    }
  }

  const fileName = generateFileName(caseInfo, template)
  doc.save(fileName)
}

export const generateDocumentByCaseId = (
  caseId: string,
  templateId: string,
  generatedBy: string
): GenerationRecord | null => {
  const caseInfo = mockCases.find(c => c.id === caseId)
  const template = getTemplateById(templateId)

  if (!caseInfo || !template) return null

  const materials = flattenMaterialTree(caseInfo.materials)

  return generateDocument({
    caseInfo,
    materials,
    template,
    generatedBy,
  })
}

export const getTemplateById = (templateId: string) => {
  return getTemplateFromMock(templateId)
}

export const getAvailableTemplates = () => {
  return getTemplates()
}
