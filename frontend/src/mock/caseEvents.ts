import type { Case, CaseEvent, CaseEventSummary } from '@/types'
import { CaseEventType, CaseEventStatus, CaseStatus } from '@/types'
import { mockCases, generateId } from './data'

const createEvent = (
  caseId: string,
  eventType: CaseEventType,
  title: string,
  eventDate: string,
  remindBeforeDays: number,
  status: CaseEventStatus,
  options: Partial<CaseEvent> = {}
): CaseEvent => ({
  eventId: generateId(),
  caseId,
  eventType,
  title,
  eventDate,
  remindBeforeDays,
  status,
  createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
  ...options,
})

const initMockEvents = (): CaseEvent[] => {
  const events: CaseEvent[] = []
  const cases = mockCases

  if (cases.length >= 1) {
    const c0 = cases[0]
    events.push(
      createEvent(c0.id, CaseEventType.FILING, '立案登记与材料提交', c0.filingDate, 3, CaseEventStatus.COMPLETED, {
        location: '北京市第一中级人民法院立案庭',
        description: '完成立案登记，提交起诉状及全套证据材料，缴纳诉讼费。',
        completedAt: c0.filingDate,
      })
    )
    events.push(
      createEvent(c0.id, CaseEventType.EVIDENCE_DEADLINE, '举证期限截止', '2026-02-20', 5, CaseEventStatus.COMPLETED, {
        description: '在举证期限前提交全部证据材料，包括买卖合同、送货单、对账单等。',
        completedAt: '2026-02-18',
      })
    )
    events.push(
      createEvent(c0.id, CaseEventType.DOCUMENT_SUBMISSION, '提交代理词初稿', '2026-03-10', 3, CaseEventStatus.COMPLETED, {
        description: '完成代理词初稿撰写并提交法院。',
        completedAt: '2026-03-09',
      })
    )
    events.push(
      createEvent(c0.id, CaseEventType.HEARING, '第一次开庭审理', '2026-06-25', 7, CaseEventStatus.PENDING, {
        location: '北京市第一中级人民法院第三法庭',
        description: '一审第一次开庭，进行法庭调查和法庭辩论。',
      })
    )
    events.push(
      createEvent(c0.id, CaseEventType.DOCUMENT_SUBMISSION, '补充证据材料', '2026-07-05', 3, CaseEventStatus.PENDING, {
        description: '根据开庭情况补充提交相关证据。',
      })
    )
  }

  if (cases.length >= 2) {
    const c1 = cases[1]
    events.push(
      createEvent(c1.id, CaseEventType.FILING, '审查起诉阶段案卷查阅', c1.filingDate, 3, CaseEventStatus.COMPLETED, {
        location: '北京市某区人民检察院',
        description: '前往检察院查阅案卷材料，制作阅卷笔录。',
        completedAt: c1.filingDate,
      })
    )
    events.push(
      createEvent(c1.id, CaseEventType.INVESTIGATION, '会见被告人', '2026-04-10', 2, CaseEventStatus.COMPLETED, {
        location: '北京市某看守所',
        description: '第一次会见被告人，了解案件详情，制作会见笔录。',
        completedAt: '2026-04-10',
      })
    )
    events.push(
      createEvent(c1.id, CaseEventType.HEARING, '庭前会议', '2026-06-28', 5, CaseEventStatus.PENDING, {
        location: '北京市某区人民法院少年法庭',
        description: '参加庭前会议，就管辖、回避、证据排除等问题交换意见。',
      })
    )
    events.push(
      createEvent(c1.id, CaseEventType.HEARING, '一审开庭', '2026-07-15', 7, CaseEventStatus.PENDING, {
        location: '北京市某区人民法院第一法庭',
        description: '一审正式开庭审理。',
      })
    )
  }

  if (cases.length >= 3) {
    const c2 = cases[2]
    events.push(
      createEvent(c2.id, CaseEventType.FILING, '二审立案', c2.filingDate, 3, CaseEventStatus.COMPLETED, {
        completedAt: c2.filingDate,
      })
    )
    events.push(
      createEvent(c2.id, CaseEventType.EVIDENCE_DEADLINE, '二审举证截止', '2025-09-15', 5, CaseEventStatus.COMPLETED, {
        completedAt: '2025-09-14',
      })
    )
    events.push(
      createEvent(c2.id, CaseEventType.HEARING, '二审开庭', '2025-10-20', 7, CaseEventStatus.COMPLETED, {
        location: '北京市高级人民法院第五法庭',
        completedAt: '2025-10-20',
      })
    )
    events.push(
      createEvent(c2.id, CaseEventType.DOCUMENT_SUBMISSION, '二审代理词提交', '2025-10-25', 3, CaseEventStatus.COMPLETED, {
        completedAt: '2025-10-24',
      })
    )
    events.push(
      createEvent(c2.id, CaseEventType.CLOSING, '结案归档', '2025-11-30', 3, CaseEventStatus.COMPLETED, {
        description: '收到二审判决书，整理案卷材料完成归档。',
        completedAt: '2025-11-28',
      })
    )
  }

  if (cases.length >= 4) {
    const c3 = cases[3]
    events.push(
      createEvent(c3.id, CaseEventType.FILING, '仲裁申请立案', c3.filingDate, 3, CaseEventStatus.COMPLETED, {
        location: '北京市劳动人事争议仲裁委员会',
        completedAt: c3.filingDate,
      })
    )
    events.push(
      createEvent(c3.id, CaseEventType.MEDIATION, '仲裁调解', '2026-05-20', 5, CaseEventStatus.COMPLETED, {
        location: '北京市劳动人事争议仲裁委员会调解室',
        description: '参加仲裁委组织的调解，双方未达成一致。',
        completedAt: '2026-05-20',
      })
    )
    events.push(
      createEvent(c3.id, CaseEventType.HEARING, '仲裁开庭', '2026-06-30', 7, CaseEventStatus.PENDING, {
        location: '北京市劳动人事争议仲裁委员会第二仲裁庭',
      })
    )
  }

  return events
}

export const mockCaseEvents: CaseEvent[] = initMockEvents()

export const refreshOverdueEvents = (): void => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  mockCaseEvents.forEach(event => {
    if (
      (event.status === CaseEventStatus.PENDING || event.status === CaseEventStatus.IN_PROGRESS) &&
      new Date(event.eventDate) < now
    ) {
      event.status = CaseEventStatus.OVERDUE
      event.updatedAt = new Date().toISOString()
    }
  })
}

export const getEventsByCaseId = (caseId: string): CaseEvent[] => {
  return mockCaseEvents
    .filter(e => e.caseId === caseId)
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
}

export const getRecentEventsByCaseId = (caseId: string, limit: number = 3): CaseEvent[] => {
  return getEventsByCaseId(caseId).slice(0, limit)
}

export const getUpcomingEvents = (days: number = 30): CaseEvent[] => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  return mockCaseEvents
    .filter(e => {
      const date = new Date(e.eventDate)
      return date >= now && date <= future && e.status !== CaseEventStatus.COMPLETED && e.status !== CaseEventStatus.CANCELLED
    })
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
}

export const computeEventSummary = (caseId: string): CaseEventSummary => {
  const events = getEventsByCaseId(caseId)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const upcoming = events
    .filter(e => {
      const d = new Date(e.eventDate)
      return d >= now && d <= next7 && e.status !== CaseEventStatus.COMPLETED && e.status !== CaseEventStatus.CANCELLED
    })
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())

  return {
    total: events.length,
    pending: events.filter(e => e.status === CaseEventStatus.PENDING).length,
    inProgress: events.filter(e => e.status === CaseEventStatus.IN_PROGRESS).length,
    completed: events.filter(e => e.status === CaseEventStatus.COMPLETED).length,
    cancelled: events.filter(e => e.status === CaseEventStatus.CANCELLED).length,
    overdue: events.filter(e => e.status === CaseEventStatus.OVERDUE).length,
    upcoming,
  }
}

export interface CreateEventInput {
  caseId: string
  eventType: CaseEventType
  title: string
  eventDate: string
  remindBeforeDays: number
  location?: string
  description?: string
}

export const createCaseEvent = (input: CreateEventInput): CaseEvent => {
  const caseData = mockCases.find(c => c.id === input.caseId)
  if (caseData && caseData.status === CaseStatus.CLOSED) {
    throw new Error('案件已结案，无法新增未完成事件')
  }

  const now = new Date().toISOString()
  const event: CaseEvent = {
    eventId: generateId(),
    caseId: input.caseId,
    eventType: input.eventType,
    title: input.title.trim(),
    eventDate: input.eventDate,
    remindBeforeDays: input.remindBeforeDays,
    location: input.location?.trim() || undefined,
    description: input.description?.trim() || undefined,
    status: CaseEventStatus.PENDING,
    createdAt: now,
    updatedAt: now,
  }
  mockCaseEvents.unshift(event)
  return event
}

export interface UpdateEventInput {
  eventId: string
  eventType?: CaseEventType
  title?: string
  eventDate?: string
  remindBeforeDays?: number
  location?: string
  description?: string
  status?: CaseEventStatus
}

export const updateCaseEvent = (input: UpdateEventInput): CaseEvent | null => {
  const idx = mockCaseEvents.findIndex(e => e.eventId === input.eventId)
  if (idx === -1) return null

  const event = mockCaseEvents[idx]
  const caseData = mockCases.find(c => c.id === event.caseId)

  if (
    caseData &&
    caseData.status === CaseStatus.CLOSED &&
    input.status !== undefined &&
    input.status !== CaseEventStatus.COMPLETED &&
    input.status !== CaseEventStatus.CANCELLED
  ) {
    throw new Error('案件已结案，事件状态只能标记为已完成或已取消')
  }

  const now = new Date().toISOString()
  const updates: Partial<CaseEvent> = { updatedAt: now }

  if (input.eventType !== undefined) updates.eventType = input.eventType
  if (input.title !== undefined) updates.title = input.title.trim()
  if (input.eventDate !== undefined) updates.eventDate = input.eventDate
  if (input.remindBeforeDays !== undefined) updates.remindBeforeDays = input.remindBeforeDays
  if (input.location !== undefined) updates.location = input.location.trim() || undefined
  if (input.description !== undefined) updates.description = input.description.trim() || undefined
  if (input.status !== undefined) {
    updates.status = input.status
    if (input.status === CaseEventStatus.COMPLETED) {
      updates.completedAt = now
    }
  }

  mockCaseEvents[idx] = { ...event, ...updates }
  return mockCaseEvents[idx]
}

export const deleteCaseEvent = (eventId: string): boolean => {
  const idx = mockCaseEvents.findIndex(e => e.eventId === eventId)
  if (idx === -1) return false
  mockCaseEvents.splice(idx, 1)
  return true
}

export interface EventFilterOptions {
  caseStatus?: CaseStatus | 'all'
  responsibleLawyer?: string | 'all'
  startDate?: string
  endDate?: string
  eventType?: CaseEventType | 'all'
  eventStatus?: CaseEventStatus | 'all'
}

export const getFilteredEvents = (options: EventFilterOptions): CaseEvent[] => {
  let events = [...mockCaseEvents]

  if (options.caseStatus && options.caseStatus !== 'all') {
    const caseIds = mockCases.filter(c => c.status === options.caseStatus).map(c => c.id)
    events = events.filter(e => caseIds.includes(e.caseId))
  }

  if (options.responsibleLawyer && options.responsibleLawyer !== 'all') {
    const caseIds = mockCases.filter(c => c.responsibleLawyer === options.responsibleLawyer).map(c => c.id)
    events = events.filter(e => caseIds.includes(e.caseId))
  }

  if (options.startDate) {
    const start = new Date(options.startDate)
    start.setHours(0, 0, 0, 0)
    events = events.filter(e => new Date(e.eventDate) >= start)
  }

  if (options.endDate) {
    const end = new Date(options.endDate)
    end.setHours(23, 59, 59, 999)
    events = events.filter(e => new Date(e.eventDate) <= end)
  }

  if (options.eventType && options.eventType !== 'all') {
    events = events.filter(e => e.eventType === options.eventType)
  }

  if (options.eventStatus && options.eventStatus !== 'all') {
    events = events.filter(e => e.status === options.eventStatus)
  }

  return events.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
}

export const getAllResponsibleLawyers = (): string[] => {
  return Array.from(new Set(mockCases.map(c => c.responsibleLawyer)))
}

export const getCaseById = (caseId: string): Case | undefined => {
  return mockCases.find(c => c.id === caseId)
}
