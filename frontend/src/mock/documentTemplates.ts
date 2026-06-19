import type { DocumentTemplate, GenerationRecord, TemplateType, OutputFormat, ContentSchema } from '@/types'
import { TemplateType as TT, OutputFormat as OF } from '@/types'
import { generateId } from './data'

const createDefaultSchema = (type: TemplateType): ContentSchema => {
  switch (type) {
    case TT.CASE_COVER:
      return {
        title: '案件封面',
        pageOrientation: 'portrait',
        includeHeader: true,
        includeFooter: true,
        fields: [
          { key: 'caseNumber', label: '案件编号', type: 'text', source: 'case', required: true },
          { key: 'name', label: '案件名称', type: 'text', source: 'case', required: true },
          { key: 'client', label: '我方当事人', type: 'text', source: 'case', required: true },
          { key: 'opposingParty', label: '对方当事人', type: 'text', source: 'case', required: true },
          { key: 'caseType', label: '案件类型', type: 'text', source: 'case', required: true },
          { key: 'responsibleLawyer', label: '承办律师', type: 'text', source: 'case', required: true },
          { key: 'filingDate', label: '立案日期', type: 'date', source: 'case', required: true },
          { key: 'description', label: '案件描述', type: 'text', source: 'case' },
        ],
      }
    case TT.EVIDENCE_LIST:
      return {
        title: '证据目录',
        pageOrientation: 'landscape',
        includeHeader: true,
        includeFooter: true,
        fields: [
          { key: 'index', label: '序号', type: 'number', source: 'material', required: true },
          { key: 'name', label: '证据名称', type: 'text', source: 'material', required: true },
          { key: 'path', label: '证据来源', type: 'text', source: 'material' },
          { key: 'uploadDate', label: '提交日期', type: 'date', source: 'material' },
          { key: 'uploader', label: '提交人', type: 'text', source: 'material' },
          { key: 'description', label: '证明内容', type: 'text', source: 'material' },
        ],
      }
    case TT.MATERIAL_TRANSFER:
      return {
        title: '材料移交清单',
        pageOrientation: 'landscape',
        includeHeader: true,
        includeFooter: true,
        fields: [
          { key: 'index', label: '序号', type: 'number', source: 'material', required: true },
          { key: 'name', label: '材料名称', type: 'text', source: 'material', required: true },
          { key: 'type', label: '材料类型', type: 'text', source: 'material' },
          { key: 'fileSize', label: '页数/份数', type: 'text', source: 'material' },
          { key: 'uploadDate', label: '移交日期', type: 'date', source: 'material' },
          { key: 'description', label: '备注', type: 'text', source: 'material' },
        ],
      }
    case TT.ENTRUSTMENT_LIST:
      return {
        title: '委托材料目录',
        pageOrientation: 'landscape',
        includeHeader: true,
        includeFooter: true,
        fields: [
          { key: 'index', label: '序号', type: 'number', source: 'material', required: true },
          { key: 'name', label: '材料名称', type: 'text', source: 'material', required: true },
          { key: 'path', label: '存放位置', type: 'text', source: 'material' },
          { key: 'uploader', label: '提交人', type: 'text', source: 'material' },
          { key: 'uploadDate', label: '提交日期', type: 'date', source: 'material' },
          { key: 'description', label: '备注', type: 'text', source: 'material' },
        ],
      }
    default:
      return {
        title: '未命名模板',
        fields: [],
      }
  }
}

const getDefaultEnabledFields = (type: TemplateType): string[] => {
  const schema = createDefaultSchema(type)
  return schema.fields.map(f => f.key)
}

export const mockTemplates: DocumentTemplate[] = [
  {
    templateId: generateId(),
    name: '标准案件封面',
    type: TT.CASE_COVER,
    contentSchema: createDefaultSchema(TT.CASE_COVER),
    enabledFields: getDefaultEnabledFields(TT.CASE_COVER),
    outputFormat: OF.PDF,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-15T10:30:00Z',
    description: '包含案件基本信息的标准封面页，适用于各类案件',
    isDefault: true,
  },
  {
    templateId: generateId(),
    name: '简易案件封面',
    type: TT.CASE_COVER,
    contentSchema: createDefaultSchema(TT.CASE_COVER),
    enabledFields: ['caseNumber', 'name', 'client', 'opposingParty', 'caseType', 'responsibleLawyer'],
    outputFormat: OF.PDF,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-04-10T14:20:00Z',
    description: '简化版案件封面，仅包含核心信息',
    isDefault: false,
  },
  {
    templateId: generateId(),
    name: '民事诉讼证据目录',
    type: TT.EVIDENCE_LIST,
    contentSchema: createDefaultSchema(TT.EVIDENCE_LIST),
    enabledFields: getDefaultEnabledFields(TT.EVIDENCE_LIST),
    outputFormat: OF.EXCEL,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-05-20T09:15:00Z',
    description: '民事诉讼案件标准证据目录模板',
    isDefault: true,
  },
  {
    templateId: generateId(),
    name: '刑事辩护证据目录',
    type: TT.EVIDENCE_LIST,
    contentSchema: createDefaultSchema(TT.EVIDENCE_LIST),
    enabledFields: ['index', 'name', 'description', 'uploadDate'],
    outputFormat: OF.EXCEL,
    createdAt: '2026-02-20T00:00:00Z',
    updatedAt: '2026-04-25T16:45:00Z',
    description: '刑事辩护案件专用证据目录模板',
    isDefault: false,
  },
  {
    templateId: generateId(),
    name: '法院材料移交清单',
    type: TT.MATERIAL_TRANSFER,
    contentSchema: createDefaultSchema(TT.MATERIAL_TRANSFER),
    enabledFields: getDefaultEnabledFields(TT.MATERIAL_TRANSFER),
    outputFormat: OF.EXCEL,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-05-10T11:00:00Z',
    description: '向法院移交材料时使用的清单模板',
    isDefault: true,
  },
  {
    templateId: generateId(),
    name: '客户材料移交清单',
    type: TT.MATERIAL_TRANSFER,
    contentSchema: createDefaultSchema(TT.MATERIAL_TRANSFER),
    enabledFields: ['index', 'name', 'type', 'fileSize', 'description'],
    outputFormat: OF.PDF,
    createdAt: '2026-03-15T00:00:00Z',
    updatedAt: '2026-05-15T13:30:00Z',
    description: '向客户移交材料时使用的清单模板',
    isDefault: false,
  },
  {
    templateId: generateId(),
    name: '委托材料目录',
    type: TT.ENTRUSTMENT_LIST,
    contentSchema: createDefaultSchema(TT.ENTRUSTMENT_LIST),
    enabledFields: getDefaultEnabledFields(TT.ENTRUSTMENT_LIST),
    outputFormat: OF.EXCEL,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-05-20T08:00:00Z',
    description: '委托相关材料的整理目录模板',
    isDefault: true,
  },
]

export const mockGenerationRecords: GenerationRecord[] = [
  {
    recordId: generateId(),
    templateId: mockTemplates[0].templateId,
    caseId: 'case_001',
    generatedAt: '2026-06-01T10:30:00Z',
    generatedBy: '张伟律师',
    fileName: '(2026)京民初字第001号_案件封面.pdf',
    fileSize: '245 KB',
    outputFormat: OF.PDF,
    templateName: '标准案件封面',
    caseNumber: '(2026)京民初字第001号',
    caseName: '北京某科技公司与上海某贸易公司买卖合同纠纷案',
  },
  {
    recordId: generateId(),
    templateId: mockTemplates[2].templateId,
    caseId: 'case_001',
    generatedAt: '2026-06-02T14:15:00Z',
    generatedBy: '李娜',
    fileName: '(2026)京民初字第001号_证据目录.xlsx',
    fileSize: '128 KB',
    outputFormat: OF.EXCEL,
    templateName: '民事诉讼证据目录',
    caseNumber: '(2026)京民初字第001号',
    caseName: '北京某科技公司与上海某贸易公司买卖合同纠纷案',
  },
  {
    recordId: generateId(),
    templateId: mockTemplates[4].templateId,
    caseId: 'case_001',
    generatedAt: '2026-06-03T09:45:00Z',
    generatedBy: '王芳',
    fileName: '(2026)京民初字第001号_材料移交清单.xlsx',
    fileSize: '96 KB',
    outputFormat: OF.EXCEL,
    templateName: '法院材料移交清单',
    caseNumber: '(2026)京民初字第001号',
    caseName: '北京某科技公司与上海某贸易公司买卖合同纠纷案',
  },
  {
    recordId: generateId(),
    templateId: mockTemplates[6].templateId,
    caseId: 'case_002',
    generatedAt: '2026-06-05T11:20:00Z',
    generatedBy: '李明律师',
    fileName: '(2026)京刑初字第023号_委托材料目录.xlsx',
    fileSize: '85 KB',
    outputFormat: OF.EXCEL,
    templateName: '委托材料目录',
    caseNumber: '(2026)京刑初字第023号',
    caseName: '王某涉嫌职务侵占罪案',
  },
  {
    recordId: generateId(),
    templateId: mockTemplates[1].templateId,
    caseId: 'case_003',
    generatedAt: '2026-06-08T15:00:00Z',
    generatedBy: '陈静律师',
    fileName: '(2025)京民终字第156号_案件封面.pdf',
    fileSize: '210 KB',
    outputFormat: OF.PDF,
    templateName: '简易案件封面',
    caseNumber: '(2025)京民终字第156号',
    caseName: '某房地产开发公司建设工程施工合同纠纷上诉案',
  },
]

export const getTemplates = (): DocumentTemplate[] => {
  return [...mockTemplates]
}

export const getTemplateById = (templateId: string): DocumentTemplate | undefined => {
  return mockTemplates.find(t => t.templateId === templateId)
}

export const getTemplatesByType = (type: TemplateType): DocumentTemplate[] => {
  return mockTemplates.filter(t => t.type === type)
}

export const createTemplate = (data: Omit<DocumentTemplate, 'templateId' | 'createdAt' | 'updatedAt'>): DocumentTemplate => {
  const now = new Date().toISOString()
  const template: DocumentTemplate = {
    ...data,
    templateId: generateId(),
    createdAt: now,
    updatedAt: now,
  }
  mockTemplates.unshift(template)
  return template
}

export const updateTemplate = (templateId: string, data: Partial<DocumentTemplate>): DocumentTemplate | undefined => {
  const idx = mockTemplates.findIndex(t => t.templateId === templateId)
  if (idx === -1) return undefined

  const now = new Date().toISOString()
  mockTemplates[idx] = {
    ...mockTemplates[idx],
    ...data,
    updatedAt: now,
  }
  return mockTemplates[idx]
}

export const deleteTemplate = (templateId: string): boolean => {
  const idx = mockTemplates.findIndex(t => t.templateId === templateId)
  if (idx === -1) return false
  mockTemplates.splice(idx, 1)
  return true
}

export const createDefaultTemplate = (type: TemplateType, name?: string): DocumentTemplate => {
  return {
    templateId: generateId(),
    name: name || `新建${type}模板`,
    type,
    contentSchema: createDefaultSchema(type),
    enabledFields: getDefaultEnabledFields(type),
    outputFormat: OF.EXCEL,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: '',
    isDefault: false,
  }
}

export const duplicateTemplate = (source: DocumentTemplate, name?: string): DocumentTemplate => {
  const now = new Date().toISOString()
  const copy: DocumentTemplate = {
    ...JSON.parse(JSON.stringify(source)),
    templateId: generateId(),
    name: name || `${source.name} (副本)`,
    createdAt: now,
    updatedAt: now,
    isDefault: false,
  }
  mockTemplates.unshift(copy)
  return copy
}

export const getGenerationRecords = (): GenerationRecord[] => {
  return [...mockGenerationRecords]
}

export const getGenerationRecordsByCaseId = (caseId: string): GenerationRecord[] => {
  return mockGenerationRecords.filter(r => r.caseId === caseId)
}

export const getGenerationRecordsByTemplateId = (templateId: string): GenerationRecord[] => {
  return mockGenerationRecords.filter(r => r.templateId === templateId)
}

export const createGenerationRecord = (data: Omit<GenerationRecord, 'recordId' | 'generatedAt'>): GenerationRecord => {
  const record: GenerationRecord = {
    ...data,
    recordId: generateId(),
    generatedAt: new Date().toISOString(),
  }
  mockGenerationRecords.unshift(record)
  return record
}
