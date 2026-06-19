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
