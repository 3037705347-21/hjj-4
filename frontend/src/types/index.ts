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
