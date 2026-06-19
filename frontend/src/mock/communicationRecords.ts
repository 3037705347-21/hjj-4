import type { CommunicationRecord, CommunicationSummary } from '@/types'
import { ContactType, contactTypeMap } from '@/types'
import { generateId, mockCases } from '@/mock/data'

export const mockCommunicationRecords: CommunicationRecord[] = reactive([])

const createMockRecord = (
  caseId: string,
  contactType: ContactType,
  daysAgo: number,
  participants: string,
  summary: string,
  nextAction: string,
  relatedMaterials: string[] = [],
  isFollowedUp: boolean = true
): CommunicationRecord => {
  const now = new Date()
  const contactDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
  const createdAt = new Date(contactDate.getTime() - Math.random() * 2 * 60 * 60 * 1000)

  return {
    recordId: generateId(),
    caseId,
    contactType,
    contactDate: contactDate.toISOString(),
    participants,
    summary,
    nextAction,
    relatedMaterials,
    creator: '张伟律师',
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
    isFollowedUp,
    followedUpAt: isFollowedUp ? new Date(contactDate.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString() : undefined,
  }
}

const initMockData = () => {
  if (mockCommunicationRecords.length > 0) return

  const caseIds = mockCases.map(c => c.id)

  mockCommunicationRecords.push(
    createMockRecord(
      caseIds[0],
      ContactType.PHONE,
      2,
      '张伟律师、客户王总',
      '客户来电询问案件进度，目前已完成证据交换，等待开庭通知。客户表示对案件进展满意。',
      '继续跟进法院开庭排期',
      [],
      true
    ),
    createMockRecord(
      caseIds[0],
      ContactType.MEETING,
      5,
      '张伟律师、李娜律师、客户王总、客户刘经理',
      '与客户面谈讨论调解方案。客户表示愿意在500万左右接受调解，对方初步报价450万。需要进一步协商。',
      '起草调解方案建议书，发送给客户确认',
      [],
      true
    ),
    createMockRecord(
      caseIds[0],
      ContactType.MATERIAL_REMINDER,
      7,
      '张伟律师、客户王总',
      '催促客户补充提交2025年度财务报表和审计报告，用于证明原告损失金额。',
      '等待客户补充材料',
      [],
      false
    ),
    createMockRecord(
      caseIds[0],
      ContactType.WECHAT,
      10,
      '张伟律师、客户王总',
      '微信沟通证据清单细节，客户确认已收到我方发送的证据清单电子版。',
      '客户反馈需要补充3份合同原件',
      [],
      true
    ),
    createMockRecord(
      caseIds[0],
      ContactType.EMAIL,
      14,
      '张伟律师、对方律师陈某某',
      '发送律师函给对方，要求对方在收到函件后7日内支付货款，否则将采取进一步法律行动。',
      '等待对方回复',
      [],
      true
    ),
    createMockRecord(
      caseIds[1],
      ContactType.MEETING,
      3,
      '李明律师、被告人王某、王某家属',
      '会见被告人，详细了解案件情况。被告人表示对指控金额有异议，认为其中30万为正常业务往来。',
      '调取银行流水明细，核实资金流向',
      [],
      true
    ),
    createMockRecord(
      caseIds[1],
      ContactType.PHONE,
      8,
      '李明律师、检察官张某某',
      '电话联系检察官，提交辩护意见初稿，询问是否可以争取缓刑。检察官表示需要看具体证据。',
      '补充提交减轻处罚的证据材料',
      [],
      false
    ),
    createMockRecord(
      caseIds[2],
      ContactType.EMAIL,
      20,
      '陈静律师、客户方联系人',
      '发送二审判决书给客户，并附结案报告。客户确认收到，对案件结果满意。',
      '整理案卷材料归档',
      [],
      true
    ),
    createMockRecord(
      caseIds[3],
      ContactType.PHONE,
      1,
      '刘洋律师、客户张某',
      '客户来电询问仲裁进度，已提交仲裁申请，等待仲裁委立案通知。',
      '跟进仲裁委立案情况',
      [],
      false
    ),
    createMockRecord(
      caseIds[3],
      ContactType.MATERIAL_REMINDER,
      4,
      '刘洋律师、客户张某',
      '催促客户提供劳动合同原件、工资银行流水明细、社保缴纳证明等证据材料。',
      '客户表示本周内提供',
      [],
      true
    )
  )
}

initMockData()

export interface CommunicationFilterOptions {
  contactType?: ContactType | 'all'
  startDate?: string
  endDate?: string
  isFollowedUp?: boolean | 'all'
  caseId?: string
}

export function getRecordsByCaseId(caseId: string): CommunicationRecord[] {
  return mockCommunicationRecords
    .filter(r => r.caseId === caseId)
    .sort((a, b) => new Date(b.contactDate).getTime() - new Date(a.contactDate).getTime())
}

export function getAllRecords(): CommunicationRecord[] {
  return [...mockCommunicationRecords].sort(
    (a, b) => new Date(b.contactDate).getTime() - new Date(a.contactDate).getTime()
  )
}

export function getRecordById(recordId: string): CommunicationRecord | undefined {
  return mockCommunicationRecords.find(r => r.recordId === recordId)
}

export function getFilteredRecords(filters: CommunicationFilterOptions): CommunicationRecord[] {
  let result = getAllRecords()

  if (filters.caseId) {
    result = result.filter(r => r.caseId === filters.caseId)
  }

  if (filters.contactType && filters.contactType !== 'all') {
    result = result.filter(r => r.contactType === filters.contactType)
  }

  if (filters.startDate) {
    const start = new Date(filters.startDate)
    start.setHours(0, 0, 0, 0)
    result = result.filter(r => new Date(r.contactDate) >= start)
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate)
    end.setHours(23, 59, 59, 999)
    result = result.filter(r => new Date(r.contactDate) <= end)
  }

  if (filters.isFollowedUp !== 'all' && filters.isFollowedUp !== undefined) {
    result = result.filter(r => r.isFollowedUp === filters.isFollowedUp)
  }

  return result
}

export function createCommunicationRecord(data: Omit<CommunicationRecord, 'recordId' | 'createdAt' | 'updatedAt' | 'isFollowedUp'>): CommunicationRecord {
  const now = new Date().toISOString()
  const record: CommunicationRecord = {
    ...data,
    recordId: generateId(),
    createdAt: now,
    updatedAt: now,
    isFollowedUp: false,
  }
  mockCommunicationRecords.unshift(record)
  return record
}

export function updateCommunicationRecord(recordId: string, updates: Partial<CommunicationRecord>): CommunicationRecord | undefined {
  const idx = mockCommunicationRecords.findIndex(r => r.recordId === recordId)
  if (idx === -1) return undefined

  mockCommunicationRecords[idx] = {
    ...mockCommunicationRecords[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  return mockCommunicationRecords[idx]
}

export function deleteCommunicationRecord(recordId: string): boolean {
  const idx = mockCommunicationRecords.findIndex(r => r.recordId === recordId)
  if (idx === -1) return false
  mockCommunicationRecords.splice(idx, 1)
  return true
}

export function markAsFollowedUp(recordId: string): CommunicationRecord | undefined {
  return updateCommunicationRecord(recordId, {
    isFollowedUp: true,
    followedUpAt: new Date().toISOString(),
  })
}

export function computeCommunicationSummary(caseId?: string): CommunicationSummary {
  const records = caseId ? getRecordsByCaseId(caseId) : getAllRecords()

  const summary: CommunicationSummary = {
    total: records.length,
    phone: 0,
    meeting: 0,
    wechat: 0,
    email: 0,
    materialReminder: 0,
    pendingFollowUp: 0,
    recentRecords: records.slice(0, 5),
  }

  records.forEach(r => {
    switch (r.contactType) {
      case ContactType.PHONE:
        summary.phone++
        break
      case ContactType.MEETING:
        summary.meeting++
        break
      case ContactType.WECHAT:
        summary.wechat++
        break
      case ContactType.EMAIL:
        summary.email++
        break
      case ContactType.MATERIAL_REMINDER:
        summary.materialReminder++
        break
    }
    if (!r.isFollowedUp) {
      summary.pendingFollowUp++
    }
  })

  return summary
}

export function formatContactDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

export function formatContactDateShort(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

export function getContactTypeIcon(contactType: ContactType): string {
  return contactTypeMap[contactType]?.icon || 'message-circle'
}

function reactive<T extends object>(obj: T): T {
  return obj
}
