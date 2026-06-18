export enum MaterialNodeType {
  FOLDER = 'folder',
  FILE = 'file',
}

export enum CaseStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed',
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
