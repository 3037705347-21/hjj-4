export enum MaterialNodeType {
  FOLDER = 'folder',
  FILE = 'file',
}

export enum CaseStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed',
}

export interface StatusChangeRecord {
  id: string
  fromStatus: CaseStatus | null
  toStatus: CaseStatus
  remark: string
  operator: string
  timestamp: string
}

export interface MaterialTemplateItem {
  name: string
  type: MaterialNodeType
  required?: boolean
  children?: MaterialTemplateItem[]
}

export interface MaterialTemplate {
  caseType: string
  items: MaterialTemplateItem[]
}

export interface MaterialNode {
  id: string
  name: string
  type: MaterialNodeType
  children?: MaterialNode[]
  uploadDate?: string
  uploader?: string
  fileSize?: string
  description?: string
  expanded?: boolean
}

export interface Case {
  id: string
  caseNumber: string
  name: string
  client: string
  opposingParty: string
  caseType: string
  status: CaseStatus
  responsibleLawyer: string
  filingDate: string
  description: string
  materials: MaterialNode[]
  statusHistory?: StatusChangeRecord[]
}

export interface FlatMaterialItem {
  id: string
  name: string
  type: MaterialNodeType
  path: string
  uploadDate: string
  uploader: string
  fileSize: string
  description: string
}

export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TaskType {
  DOCUMENT = 'document',
  EVIDENCE = 'evidence',
  HEARING = 'hearing',
  COMMUNICATION = 'communication',
  OTHER = 'other',
}

export interface TaskStatusChangeRecord {
  id: string
  fromStatus: TaskStatus | null
  toStatus: TaskStatus
  remark: string
  operator: string
  timestamp: string
}

export interface CaseTask {
  id: string
  caseId: string
  title: string
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  assignee: string
  assignor?: string
  dueDate: string
  description: string
  relatedMaterialNodeIds: string[]
  createdAt: string
  updatedAt: string
  completedAt?: string
  statusHistory?: TaskStatusChangeRecord[]
}

export interface TaskSummary {
  total: number
  pending: number
  assigned: number
  inProgress: number
  completed: number
  overdue: number
  cancelled: number
  nearestDueDate?: string
  nearestDueTaskTitle?: string
}

export enum CaseEventType {
  FILING = 'filing',
  HEARING = 'hearing',
  EVIDENCE_DEADLINE = 'evidence_deadline',
  DOCUMENT_SUBMISSION = 'document_submission',
  CLOSING = 'closing',
  MEDIATION = 'mediation',
  INVESTIGATION = 'investigation',
  OTHER = 'other',
}

export enum CaseEventStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue',
}

export interface CaseEvent {
  eventId: string
  caseId: string
  eventType: CaseEventType
  title: string
  eventDate: string
  remindBeforeDays: number
  location?: string
  description?: string
  status: CaseEventStatus
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface CaseEventSummary {
  total: number
  pending: number
  inProgress: number
  completed: number
  cancelled: number
  overdue: number
  upcoming: CaseEvent[]
}

export const caseEventTypeMap: Record<CaseEventType, { label: string; class: string; dotClass: string }> = {
  [CaseEventType.FILING]: {
    label: '立案',
    class: 'bg-blue-100 text-blue-800 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  [CaseEventType.HEARING]: {
    label: '开庭',
    class: 'bg-red-100 text-red-800 border-red-200',
    dotClass: 'bg-red-500',
  },
  [CaseEventType.EVIDENCE_DEADLINE]: {
    label: '举证截止',
    class: 'bg-amber-100 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  [CaseEventType.DOCUMENT_SUBMISSION]: {
    label: '提交文书',
    class: 'bg-purple-100 text-purple-800 border-purple-200',
    dotClass: 'bg-purple-500',
  },
  [CaseEventType.CLOSING]: {
    label: '结案归档',
    class: 'bg-gray-100 text-gray-800 border-gray-200',
    dotClass: 'bg-gray-500',
  },
  [CaseEventType.MEDIATION]: {
    label: '调解',
    class: 'bg-teal-100 text-teal-800 border-teal-200',
    dotClass: 'bg-teal-500',
  },
  [CaseEventType.INVESTIGATION]: {
    label: '调查取证',
    class: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    dotClass: 'bg-indigo-500',
  },
  [CaseEventType.OTHER]: {
    label: '其他',
    class: 'bg-slate-100 text-slate-800 border-slate-200',
    dotClass: 'bg-slate-500',
  },
}

export const caseEventStatusMap: Record<CaseEventStatus, { label: string; class: string }> = {
  [CaseEventStatus.PENDING]: {
    label: '待开始',
    class: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  [CaseEventStatus.IN_PROGRESS]: {
    label: '进行中',
    class: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  [CaseEventStatus.COMPLETED]: {
    label: '已完成',
    class: 'bg-green-100 text-green-800 border-green-200',
  },
  [CaseEventStatus.CANCELLED]: {
    label: '已取消',
    class: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  [CaseEventStatus.OVERDUE]: {
    label: '已逾期',
    class: 'bg-red-100 text-red-800 border-red-200',
  },
}

export enum ContactType {
  PHONE = 'phone',
  MEETING = 'meeting',
  WECHAT = 'wechat',
  EMAIL = 'email',
  MATERIAL_REMINDER = 'material_reminder',
}

export interface CommunicationRecord {
  recordId: string
  caseId: string
  contactType: ContactType
  contactDate: string
  participants: string
  summary: string
  nextAction: string
  relatedMaterials: string[]
  creator: string
  createdAt: string
  updatedAt: string
  isFollowedUp: boolean
  followedUpAt?: string
}

export const contactTypeMap: Record<ContactType, { label: string; class: string; dotClass: string; icon: string }> = {
  [ContactType.PHONE]: {
    label: '来电',
    class: 'bg-green-100 text-green-800 border-green-200',
    dotClass: 'bg-green-500',
    icon: 'phone',
  },
  [ContactType.MEETING]: {
    label: '面谈',
    class: 'bg-blue-100 text-blue-800 border-blue-200',
    dotClass: 'bg-blue-500',
    icon: 'users',
  },
  [ContactType.WECHAT]: {
    label: '微信',
    class: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-500',
    icon: 'message-circle',
  },
  [ContactType.EMAIL]: {
    label: '邮件',
    class: 'bg-purple-100 text-purple-800 border-purple-200',
    dotClass: 'bg-purple-500',
    icon: 'mail',
  },
  [ContactType.MATERIAL_REMINDER]: {
    label: '催材料',
    class: 'bg-amber-100 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
    icon: 'file-warning',
  },
}

export interface CommunicationSummary {
  total: number
  phone: number
  meeting: number
  wechat: number
  email: number
  materialReminder: number
  pendingFollowUp: number
  recentRecords: CommunicationRecord[]
}

export enum ArchiveStatus {
  PENDING = 'pending',
  ARCHIVED = 'archived',
  BORROWED = 'borrowed',
  RETURNED = 'returned',
}

export const archiveStatusMap: Record<ArchiveStatus, { label: string; class: string }> = {
  [ArchiveStatus.PENDING]: {
    label: '待归档',
    class: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  [ArchiveStatus.ARCHIVED]: {
    label: '已归档',
    class: 'bg-green-100 text-green-800 border-green-200',
  },
  [ArchiveStatus.BORROWED]: {
    label: '已借出',
    class: 'bg-red-100 text-red-800 border-red-200',
  },
  [ArchiveStatus.RETURNED]: {
    label: '已归还',
    class: 'bg-blue-100 text-blue-800 border-blue-200',
  },
}

export interface BorrowRecord {
  borrowId: string
  archiveId: string
  borrower: string
  borrowDate: string
  expectedReturnDate?: string
  returnDate?: string
  borrowReason: string
  approver?: string
  remark?: string
  createdAt: string
  updatedAt: string
}

export interface ExportRecord {
  exportId: string
  archiveId: string
  exportType: 'excel' | 'pdf'
  exportDate: string
  exporter: string
  exportRange: string
  remark?: string
}

export interface CaseArchive {
  archiveId: string
  caseId: string
  archiveCode: string
  archiveDate: string
  archiveStatus: ArchiveStatus
  physicalLocation: string
  keeper: string
  borrower?: string
  borrowDate?: string
  returnDate?: string
  remark?: string
  materialCount: number
  exportRecords: ExportRecord[]
  borrowHistory: BorrowRecord[]
  createdAt: string
  updatedAt: string
}

export interface CaseArchiveListItem extends CaseArchive {
  caseNumber: string
  caseName: string
  caseType: string
  responsibleLawyer: string
}

export enum TemplateType {
  CASE_COVER = 'case_cover',
  EVIDENCE_LIST = 'evidence_list',
  MATERIAL_TRANSFER = 'material_transfer',
  ENTRUSTMENT_LIST = 'entrustment_list',
}

export const templateTypeMap: Record<TemplateType, { label: string; description: string }> = {
  [TemplateType.CASE_COVER]: {
    label: '案件封面',
    description: '包含案件基本信息的封面页',
  },
  [TemplateType.EVIDENCE_LIST]: {
    label: '证据目录',
    description: '整理案件证据材料的目录清单',
  },
  [TemplateType.MATERIAL_TRANSFER]: {
    label: '材料移交清单',
    description: '用于材料移交时的清单文件',
  },
  [TemplateType.ENTRUSTMENT_LIST]: {
    label: '委托材料目录',
    description: '整理委托相关材料的目录',
  },
}

export enum OutputFormat {
  EXCEL = 'excel',
  PDF = 'pdf',
  WORD = 'word',
}

export const outputFormatMap: Record<OutputFormat, { label: string; extension: string }> = {
  [OutputFormat.EXCEL]: { label: 'Excel (.xlsx)', extension: 'xlsx' },
  [OutputFormat.PDF]: { label: 'PDF (.pdf)', extension: 'pdf' },
  [OutputFormat.WORD]: { label: 'Word (.docx)', extension: 'docx' },
}

export interface ContentSchemaField {
  key: string
  label: string
  type: 'text' | 'date' | 'number' | 'array' | 'table'
  source: 'case' | 'material'
  required?: boolean
  description?: string
}

export interface ContentSchema {
  title: string
  fields: ContentSchemaField[]
  includeHeader?: boolean
  includeFooter?: boolean
  pageOrientation?: 'portrait' | 'landscape'
}

export interface DocumentTemplate {
  templateId: string
  name: string
  type: TemplateType
  contentSchema: ContentSchema
  enabledFields: string[]
  outputFormat: OutputFormat
  updatedAt: string
  createdAt?: string
  description?: string
  isDefault?: boolean
}

export interface GenerationRecord {
  recordId: string
  templateId: string
  caseId: string
  generatedAt: string
  generatedBy: string
  fileName?: string
  fileSize?: string
  outputFormat?: OutputFormat
  templateName?: string
  caseNumber?: string
  caseName?: string
}

export const caseFieldDefinitions: Array<{ key: string; label: string; description: string }> = [
  { key: 'caseNumber', label: '案件编号', description: '案件的唯一编号' },
  { key: 'name', label: '案件名称', description: '案件的全称' },
  { key: 'client', label: '我方当事人', description: '原告/申请人' },
  { key: 'opposingParty', label: '对方当事人', description: '被告/被申请人' },
  { key: 'caseType', label: '案件类型', description: '民事/刑事/行政等' },
  { key: 'responsibleLawyer', label: '承办律师', description: '负责本案的律师' },
  { key: 'filingDate', label: '立案日期', description: '法院立案日期' },
  { key: 'description', label: '案件描述', description: '案件简介' },
  { key: 'status', label: '案件状态', description: '待处理/进行中/已结案' },
]

export const materialFieldDefinitions: Array<{ key: string; label: string; description: string }> = [
  { key: 'index', label: '序号', description: '自动生成的序号' },
  { key: 'name', label: '材料名称', description: '材料的名称' },
  { key: 'type', label: '类型', description: '文件夹/文件' },
  { key: 'path', label: '路径', description: '材料在目录中的完整路径' },
  { key: 'uploadDate', label: '上传日期', description: '材料上传日期' },
  { key: 'uploader', label: '上传人', description: '材料上传人' },
  { key: 'fileSize', label: '文件大小', description: '文件的大小' },
  { key: 'description', label: '备注', description: '材料的备注说明' },
]
