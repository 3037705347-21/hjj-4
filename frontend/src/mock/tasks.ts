import type { CaseTask, TaskStatusChangeRecord, TaskSummary } from '@/types'
import { TaskStatus, TaskPriority, TaskType } from '@/types'
import { mockCases, generateId } from './data'

const STORAGE_KEY = 'case_tasks_data'

const loadFromStorage = (): CaseTask[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // ignore
  }
  return []
}

const saveToStorage = (tasks: CaseTask[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  } catch {
    // ignore
  }
}

const createTaskStatusRecord = (
  fromStatus: TaskStatus | null,
  toStatus: TaskStatus,
  remark: string,
  operator: string = '系统'
): TaskStatusChangeRecord => ({
  id: generateId(),
  fromStatus,
  toStatus,
  remark,
  operator,
  timestamp: new Date().toISOString(),
})

export const taskStatusMap: Record<TaskStatus, { label: string; class: string }> = {
  [TaskStatus.PENDING]: {
    label: '待处理',
    class: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  [TaskStatus.ASSIGNED]: {
    label: '已指派',
    class: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  [TaskStatus.IN_PROGRESS]: {
    label: '进行中',
    class: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  [TaskStatus.COMPLETED]: {
    label: '已完成',
    class: 'bg-green-100 text-green-800 border-green-200',
  },
  [TaskStatus.OVERDUE]: {
    label: '已逾期',
    class: 'bg-red-100 text-red-800 border-red-200',
  },
  [TaskStatus.CANCELLED]: {
    label: '已取消',
    class: 'bg-slate-100 text-slate-600 border-slate-200',
  },
}

export const taskPriorityMap: Record<TaskPriority, { label: string; class: string; dotClass: string }> = {
  [TaskPriority.LOW]: {
    label: '低',
    class: 'bg-slate-50 text-slate-600 border-slate-200',
    dotClass: 'bg-slate-400',
  },
  [TaskPriority.MEDIUM]: {
    label: '中',
    class: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  [TaskPriority.HIGH]: {
    label: '高',
    class: 'bg-orange-50 text-orange-700 border-orange-200',
    dotClass: 'bg-orange-500',
  },
  [TaskPriority.URGENT]: {
    label: '紧急',
    class: 'bg-red-50 text-red-700 border-red-200',
    dotClass: 'bg-red-500',
  },
}

export const taskTypeMap: Record<TaskType, { label: string; icon: string }> = {
  [TaskType.DOCUMENT]: {
    label: '文书撰写',
    icon: 'FileText',
  },
  [TaskType.EVIDENCE]: {
    label: '证据收集',
    icon: 'Search',
  },
  [TaskType.HEARING]: {
    label: '出庭准备',
    icon: 'Gavel',
  },
  [TaskType.COMMUNICATION]: {
    label: '客户沟通',
    icon: 'MessageSquare',
  },
  [TaskType.OTHER]: {
    label: '其他事项',
    icon: 'ClipboardList',
  },
}

const buildInitialTasks = (): CaseTask[] => {
  const caseIds = mockCases.map(c => c.id)
  const today = new Date()
  const daysFromNow = (days: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }
  const timestampAgo = (days: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - days)
    return d.toISOString()
  }

  const tasks: CaseTask[] = [
    {
      id: generateId(),
      caseId: caseIds[0],
      title: '撰写民事答辩状',
      type: TaskType.DOCUMENT,
      priority: TaskPriority.HIGH,
      status: TaskStatus.IN_PROGRESS,
      assignee: '张伟律师',
      assignor: '李明律师',
      dueDate: daysFromNow(3),
      description: '根据被告提供的证据材料，撰写民事答辩状，重点针对货款金额和违约金计算方式进行抗辩。',
      relatedMaterialNodeIds: [],
      createdAt: timestampAgo(5),
      updatedAt: timestampAgo(2),
      statusHistory: [
        createTaskStatusRecord(null, TaskStatus.PENDING, '任务创建'),
        createTaskStatusRecord(TaskStatus.PENDING, TaskStatus.ASSIGNED, '指派给张伟律师', '李明律师'),
        createTaskStatusRecord(TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, '开始撰写', '张伟律师'),
      ],
    },
    {
      id: generateId(),
      caseId: caseIds[0],
      title: '收集送货单原件',
      type: TaskType.EVIDENCE,
      priority: TaskPriority.URGENT,
      status: TaskStatus.OVERDUE,
      assignee: '李娜',
      assignor: '张伟律师',
      dueDate: daysFromNow(-2),
      description: '联系客户收集所有送货单的原始单据，用于庭审质证。',
      relatedMaterialNodeIds: [],
      createdAt: timestampAgo(10),
      updatedAt: timestampAgo(2),
      statusHistory: [
        createTaskStatusRecord(null, TaskStatus.PENDING, '任务创建'),
        createTaskStatusRecord(TaskStatus.PENDING, TaskStatus.ASSIGNED, '指派给李娜', '张伟律师'),
      ],
    },
    {
      id: generateId(),
      caseId: caseIds[0],
      title: '与客户沟通调解方案',
      type: TaskType.COMMUNICATION,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.PENDING,
      assignee: '张伟律师',
      dueDate: daysFromNow(7),
      description: '初步与客户沟通是否考虑调解方案，了解客户的调解底线。',
      relatedMaterialNodeIds: [],
      createdAt: timestampAgo(1),
      updatedAt: timestampAgo(1),
      statusHistory: [
        createTaskStatusRecord(null, TaskStatus.PENDING, '任务创建'),
      ],
    },
    {
      id: generateId(),
      caseId: caseIds[1],
      title: '会见被告人王某',
      type: TaskType.COMMUNICATION,
      priority: TaskPriority.URGENT,
      status: TaskStatus.ASSIGNED,
      assignee: '李明律师',
      assignor: '律所主任',
      dueDate: daysFromNow(1),
      description: '前往看守所会见被告人王某，了解案件详情并制作会见笔录。',
      relatedMaterialNodeIds: [],
      createdAt: timestampAgo(3),
      updatedAt: timestampAgo(3),
      statusHistory: [
        createTaskStatusRecord(null, TaskStatus.PENDING, '任务创建'),
        createTaskStatusRecord(TaskStatus.PENDING, TaskStatus.ASSIGNED, '指派给李明律师', '律所主任'),
      ],
    },
    {
      id: generateId(),
      caseId: caseIds[1],
      title: '调取被告人银行流水',
      type: TaskType.EVIDENCE,
      priority: TaskPriority.HIGH,
      status: TaskStatus.COMPLETED,
      assignee: '赵静',
      assignor: '李明律师',
      dueDate: daysFromNow(-5),
      description: '向法院申请调查令，调取被告人涉案期间的全部银行流水记录。',
      relatedMaterialNodeIds: [],
      createdAt: timestampAgo(15),
      updatedAt: timestampAgo(6),
      completedAt: timestampAgo(6),
      statusHistory: [
        createTaskStatusRecord(null, TaskStatus.PENDING, '任务创建'),
        createTaskStatusRecord(TaskStatus.PENDING, TaskStatus.ASSIGNED, '指派给赵静', '李明律师'),
        createTaskStatusRecord(TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, '已申请调查令', '赵静'),
        createTaskStatusRecord(TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, '已完成调取并归档', '赵静'),
      ],
    },
    {
      id: generateId(),
      caseId: caseIds[1],
      title: '准备庭审辩护提纲',
      type: TaskType.HEARING,
      priority: TaskPriority.HIGH,
      status: TaskStatus.PENDING,
      assignee: '李明律师',
      dueDate: daysFromNow(10),
      description: '根据起诉书和现有证据，准备庭审辩护提纲和质证意见。',
      relatedMaterialNodeIds: [],
      createdAt: timestampAgo(2),
      updatedAt: timestampAgo(2),
      statusHistory: [
        createTaskStatusRecord(null, TaskStatus.PENDING, '任务创建'),
      ],
    },
    {
      id: generateId(),
      caseId: caseIds[2],
      title: '整理二审结案档案',
      type: TaskType.DOCUMENT,
      priority: TaskPriority.LOW,
      status: TaskStatus.COMPLETED,
      assignee: '陈静律师',
      dueDate: daysFromNow(-10),
      description: '整理二审全部材料归档，包括判决书、代理词、庭审笔录等。',
      relatedMaterialNodeIds: [],
      createdAt: timestampAgo(20),
      updatedAt: timestampAgo(11),
      completedAt: timestampAgo(11),
      statusHistory: [
        createTaskStatusRecord(null, TaskStatus.PENDING, '任务创建'),
        createTaskStatusRecord(TaskStatus.PENDING, TaskStatus.IN_PROGRESS, '开始整理', '陈静律师'),
        createTaskStatusRecord(TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, '档案已归档', '陈静律师'),
      ],
    },
    {
      id: generateId(),
      caseId: caseIds[2],
      title: '客户回访',
      type: TaskType.COMMUNICATION,
      priority: TaskPriority.LOW,
      status: TaskStatus.CANCELLED,
      assignee: '陈静律师',
      dueDate: daysFromNow(-8),
      description: '案件结案后对客户进行回访，了解满意度。',
      relatedMaterialNodeIds: [],
      createdAt: timestampAgo(18),
      updatedAt: timestampAgo(9),
      statusHistory: [
        createTaskStatusRecord(null, TaskStatus.PENDING, '任务创建'),
        createTaskStatusRecord(TaskStatus.PENDING, TaskStatus.CANCELLED, '客户已主动联系无需回访', '陈静律师'),
      ],
    },
    {
      id: generateId(),
      caseId: caseIds[3],
      title: '收集加班证据',
      type: TaskType.EVIDENCE,
      priority: TaskPriority.HIGH,
      status: TaskStatus.IN_PROGRESS,
      assignee: '孙悦',
      assignor: '刘洋律师',
      dueDate: daysFromNow(5),
      description: '协助客户收集加班记录、考勤打卡记录、工作邮件等证据材料。',
      relatedMaterialNodeIds: [],
      createdAt: timestampAgo(4),
      updatedAt: timestampAgo(1),
      statusHistory: [
        createTaskStatusRecord(null, TaskStatus.PENDING, '任务创建'),
        createTaskStatusRecord(TaskStatus.PENDING, TaskStatus.ASSIGNED, '指派给孙悦', '刘洋律师'),
        createTaskStatusRecord(TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, '已联系客户提供材料', '孙悦'),
      ],
    },
    {
      id: generateId(),
      caseId: caseIds[3],
      title: '计算赔偿金额明细',
      type: TaskType.DOCUMENT,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.ASSIGNED,
      assignee: '刘洋律师',
      dueDate: daysFromNow(4),
      description: '根据劳动合同法规定，计算违法解除赔偿金、未休年假工资、加班费等明细。',
      relatedMaterialNodeIds: [],
      createdAt: timestampAgo(2),
      updatedAt: timestampAgo(2),
      statusHistory: [
        createTaskStatusRecord(null, TaskStatus.PENDING, '任务创建'),
        createTaskStatusRecord(TaskStatus.PENDING, TaskStatus.ASSIGNED, '自行承担', '刘洋律师'),
      ],
    },
  ]

  return tasks
}

const storedTasks = loadFromStorage()
export const mockTasks: CaseTask[] = storedTasks.length > 0 ? storedTasks : buildInitialTasks()

if (storedTasks.length === 0) {
  saveToStorage(mockTasks)
}

export const persistTasks = () => {
  saveToStorage(mockTasks)
}

export const refreshOverdueTasks = () => {
  const today = new Date().toISOString().split('T')[0]
  let changed = false
  mockTasks.forEach(task => {
    if (
      task.status !== TaskStatus.COMPLETED &&
      task.status !== TaskStatus.CANCELLED &&
      task.status !== TaskStatus.OVERDUE &&
      task.dueDate < today
    ) {
      const oldStatus = task.status
      task.status = TaskStatus.OVERDUE
      task.statusHistory = task.statusHistory || []
      task.statusHistory.push(createTaskStatusRecord(oldStatus, TaskStatus.OVERDUE, '系统自动标记逾期'))
      task.updatedAt = new Date().toISOString()
      changed = true
    }
  })
  if (changed) {
    persistTasks()
  }
}

export const createTask = (data: Omit<CaseTask, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'> & { status?: TaskStatus }): CaseTask => {
  const status = data.status || TaskStatus.PENDING
  const task: CaseTask = {
    ...data,
    id: generateId(),
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    statusHistory: [createTaskStatusRecord(null, status, '任务创建')],
  }
  mockTasks.push(task)
  persistTasks()
  return task
}

export const updateTask = (id: string, updates: Partial<Omit<CaseTask, 'id' | 'createdAt' | 'statusHistory'>>): CaseTask | null => {
  const idx = mockTasks.findIndex(t => t.id === id)
  if (idx === -1) return null

  const oldTask = mockTasks[idx]
  const newStatus = updates.status

  if (newStatus && newStatus !== oldTask.status) {
    oldTask.statusHistory = oldTask.statusHistory || []
    oldTask.statusHistory.push(createTaskStatusRecord(oldTask.status, newStatus, '状态变更'))
  }

  if (newStatus === TaskStatus.COMPLETED && !oldTask.completedAt) {
    ;(updates as any).completedAt = new Date().toISOString()
  } else if (newStatus !== TaskStatus.COMPLETED && oldTask.completedAt) {
    ;(updates as any).completedAt = undefined
  }

  mockTasks[idx] = {
    ...oldTask,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  persistTasks()
  return mockTasks[idx]
}

export const deleteTask = (id: string): boolean => {
  const idx = mockTasks.findIndex(t => t.id === id)
  if (idx === -1) return false
  mockTasks.splice(idx, 1)
  persistTasks()
  return true
}

export const getTasksByCaseId = (caseId: string): CaseTask[] => {
  return mockTasks.filter(t => t.caseId === caseId)
}

export const getTaskById = (id: string): CaseTask | undefined => {
  return mockTasks.find(t => t.id === id)
}

export const computeTaskSummary = (caseId?: string): TaskSummary => {
  const tasks = caseId ? mockTasks.filter(t => t.caseId === caseId) : mockTasks

  let nearestDueDate: string | undefined
  let nearestDueTaskTitle: string | undefined

  const today = new Date().toISOString().split('T')[0]
  const activeTasks = tasks.filter(t =>
    t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED
  )

  activeTasks.forEach(t => {
    if (!nearestDueDate || t.dueDate < nearestDueDate) {
      nearestDueDate = t.dueDate
      nearestDueTaskTitle = t.title
    }
  })

  return {
    total: tasks.length,
    pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
    assigned: tasks.filter(t => t.status === TaskStatus.ASSIGNED).length,
    inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
    completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
    overdue: tasks.filter(t => t.status === TaskStatus.OVERDUE).length,
    cancelled: tasks.filter(t => t.status === TaskStatus.CANCELLED).length,
    nearestDueDate,
    nearestDueTaskTitle,
  }
}

export const changeTaskStatus = (
  id: string,
  newStatus: TaskStatus,
  remark: string = '状态变更',
  operator: string = '当前用户'
): CaseTask | null => {
  const idx = mockTasks.findIndex(t => t.id === id)
  if (idx === -1) return null

  const task = mockTasks[idx]
  if (task.status === newStatus) return task

  task.statusHistory = task.statusHistory || []
  task.statusHistory.push(createTaskStatusRecord(task.status, newStatus, remark, operator))

  task.status = newStatus
  task.updatedAt = new Date().toISOString()

  if (newStatus === TaskStatus.COMPLETED && !task.completedAt) {
    task.completedAt = task.updatedAt
  } else if (newStatus !== TaskStatus.COMPLETED && task.completedAt) {
    task.completedAt = undefined
  }

  persistTasks()
  return task
}

export const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

export const getDaysUntilDue = (dueDate: string): number => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
