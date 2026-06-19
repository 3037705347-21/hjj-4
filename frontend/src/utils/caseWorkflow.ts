import type { Case, MaterialNode, MaterialTemplateItem, StatusChangeRecord } from '@/types'
import { CaseStatus, MaterialNodeType } from '@/types'
import { generateId } from '@/mock/data'
import { getTemplateByCaseType } from '@/mock/materialTemplates'

export interface MaterialCheckItem {
  path: string
  name: string
  type: MaterialNodeType
  required: boolean
  present: boolean
  matchedId?: string
}

export interface MaterialCompletenessResult {
  totalRequired: number
  completedRequired: number
  totalItems: number
  completedItems: number
  missingRequired: number
  missingCount: number
  completedList: MaterialCheckItem[]
  missingList: MaterialCheckItem[]
}

export interface StatusTransitionValidation {
  valid: boolean
  errors: string[]
}

const buildTemplatePaths = (
  items: MaterialTemplateItem[],
  parentPath: string = ''
): { path: string; name: string; type: MaterialNodeType; required: boolean }[] => {
  const result: { path: string; name: string; type: MaterialNodeType; required: boolean }[] = []

  for (const item of items) {
    const currentPath = parentPath ? `${parentPath} / ${item.name}` : item.name
    result.push({
      path: currentPath,
      name: item.name,
      type: item.type,
      required: item.required ?? true,
    })
    if (item.children && item.children.length > 0) {
      result.push(...buildTemplatePaths(item.children, currentPath))
    }
  }

  return result
}

const buildMaterialPaths = (
  nodes: MaterialNode[],
  parentPath: string = ''
): { path: string; name: string; type: MaterialNodeType; id: string }[] => {
  const result: { path: string; name: string; type: MaterialNodeType; id: string }[] = []

  for (const node of nodes) {
    const currentPath = parentPath ? `${parentPath} / ${node.name}` : node.name
    result.push({
      path: currentPath,
      name: node.name,
      type: node.type,
      id: node.id,
    })
    if (node.children && node.children.length > 0) {
      result.push(...buildMaterialPaths(node.children, currentPath))
    }
  }

  return result
}

export const checkMaterialCompleteness = (
  caseItem: Case
): MaterialCompletenessResult => {
  const template = getTemplateByCaseType(caseItem.caseType)

  const result: MaterialCompletenessResult = {
    totalRequired: 0,
    completedRequired: 0,
    totalItems: 0,
    completedItems: 0,
    missingRequired: 0,
    missingCount: 0,
    completedList: [],
    missingList: [],
  }

  if (!template) {
    return result
  }

  const templatePaths = buildTemplatePaths(template.items)
  const materialPaths = buildMaterialPaths(caseItem.materials)

  for (const tp of templatePaths) {
    const matched = materialPaths.find(mp => {
      if (mp.type !== tp.type) return false
      return mp.path === tp.path || mp.name === tp.name
    })

    const checkItem: MaterialCheckItem = {
      path: tp.path,
      name: tp.name,
      type: tp.type,
      required: tp.required,
      present: !!matched,
      matchedId: matched?.id,
    }

    result.totalItems++
    if (tp.required) {
      result.totalRequired++
    }

    if (matched) {
      result.completedItems++
      result.completedList.push(checkItem)
      if (tp.required) {
        result.completedRequired++
      }
    } else {
      result.missingList.push(checkItem)
      result.missingCount++
      if (tp.required) {
        result.missingRequired++
      }
    }
  }

  return result
}

export const getMissingCount = (caseItem: Case): number => {
  const result = checkMaterialCompleteness(caseItem)
  return result.missingRequired
}

export const hasRootFolder = (materials: MaterialNode[]): boolean => {
  return materials.some(m => m.type === MaterialNodeType.FOLDER)
}

export const countAllFiles = (materials: MaterialNode[]): number => {
  let count = 0
  const traverse = (nodes: MaterialNode[]) => {
    for (const node of nodes) {
      if (node.type === MaterialNodeType.FILE) {
        count++
      }
      if (node.children) {
        traverse(node.children)
      }
    }
  }
  traverse(materials)
  return count
}

export const checkRequiredCaseFields = (caseItem: Case): { valid: boolean; missingFields: string[] } => {
  const missingFields: string[] = []
  const fieldLabels: Record<string, string> = {
    client: '当事人（我方）',
    opposingParty: '对方当事人',
    responsibleLawyer: '承办律师',
    filingDate: '立案日期',
    description: '案件描述',
  }

  for (const [key, label] of Object.entries(fieldLabels)) {
    const value = (caseItem as any)[key]
    if (!value || (typeof value === 'string' && !value.trim())) {
      missingFields.push(label)
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  }
}

export const validateStatusTransition = (
  caseItem: Case,
  fromStatus: CaseStatus,
  toStatus: CaseStatus,
  materials: MaterialNode[]
): StatusTransitionValidation => {
  const errors: string[] = []

  if (fromStatus === toStatus) {
    return { valid: true, errors: [] }
  }

  if (fromStatus === CaseStatus.PENDING && toStatus === CaseStatus.IN_PROGRESS) {
    if (!hasRootFolder(materials)) {
      errors.push('切换到"进行中"状态前，至少需要存在一个根级材料目录')
    }
  }

  if (fromStatus === CaseStatus.IN_PROGRESS && toStatus === CaseStatus.CLOSED) {
    const fileCount = countAllFiles(materials)
    if (fileCount <= 0) {
      errors.push('结案前材料总数必须大于零，请先上传材料文件')
    }

    const fieldCheck = checkRequiredCaseFields(caseItem)
    if (!fieldCheck.valid) {
      errors.push(`结案前关键字段不能为空，缺失字段：${fieldCheck.missingFields.join('、')}`)
    }
  }

  if (fromStatus === CaseStatus.CLOSED && toStatus !== CaseStatus.CLOSED) {
    errors.push('已结案的案件不能重新开启')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export const createStatusChangeRecord = (
  fromStatus: CaseStatus | null,
  toStatus: CaseStatus,
  remark: string,
  operator: string = '当前用户'
): StatusChangeRecord => ({
  id: generateId(),
  fromStatus,
  toStatus,
  remark,
  operator,
  timestamp: new Date().toISOString(),
})

export const getAvailableTransitions = (currentStatus: CaseStatus): CaseStatus[] => {
  switch (currentStatus) {
    case CaseStatus.PENDING:
      return [CaseStatus.PENDING, CaseStatus.IN_PROGRESS]
    case CaseStatus.IN_PROGRESS:
      return [CaseStatus.IN_PROGRESS, CaseStatus.CLOSED]
    case CaseStatus.CLOSED:
      return [CaseStatus.CLOSED]
    default:
      return [currentStatus]
  }
}
