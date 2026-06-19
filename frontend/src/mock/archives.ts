import type { CaseArchive, CaseArchiveListItem, BorrowRecord, ExportRecord } from '@/types'
import { generateId } from './data'
import { mockCases } from './data'
import { countFiles } from '@/utils/treeUtils'
import { CaseStatus, ArchiveStatus } from '@/types'

const createExportRecord = (
  archiveId: string,
  exportType: 'excel' | 'pdf',
  exporter: string,
  exportRange: string,
  daysAgo: number,
  remark?: string
): ExportRecord => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return {
    exportId: generateId(),
    archiveId,
    exportType,
    exportDate: date.toISOString().split('T')[0],
    exporter,
    exportRange,
    remark,
  }
}

const createBorrowRecord = (
  archiveId: string,
  borrower: string,
  borrowReason: string,
  borrowDaysAgo: number,
  returnDaysAgo?: number,
  approver?: string,
  remark?: string
): BorrowRecord => {
  const borrowDate = new Date()
  borrowDate.setDate(borrowDate.getDate() - borrowDaysAgo)
  const expectedReturnDate = new Date(borrowDate)
  expectedReturnDate.setDate(expectedReturnDate.getDate() + 14)

  let returnDate: Date | undefined
  if (returnDaysAgo !== undefined) {
    returnDate = new Date()
    returnDate.setDate(returnDate.getDate() - returnDaysAgo)
  }

  const now = new Date().toISOString()
  return {
    borrowId: generateId(),
    archiveId,
    borrower,
    borrowDate: borrowDate.toISOString().split('T')[0],
    expectedReturnDate: expectedReturnDate.toISOString().split('T')[0],
    returnDate: returnDate?.toISOString().split('T')[0],
    borrowReason,
    approver,
    remark,
    createdAt: now,
    updatedAt: now,
  }
}

const createMockArchive = (
  caseId: string,
  archiveCode: string,
  archiveStatus: ArchiveStatus,
  archiveDaysAgo: number,
  physicalLocation: string,
  keeper: string,
  materialCount: number,
  remark?: string,
  borrower?: string,
  borrowDate?: string,
  returnDate?: string
): CaseArchive => {
  const archiveDate = new Date()
  archiveDate.setDate(archiveDate.getDate() - archiveDaysAgo)
  const now = new Date().toISOString()
  return {
    archiveId: generateId(),
    caseId,
    archiveCode,
    archiveDate: archiveDate.toISOString().split('T')[0],
    archiveStatus,
    physicalLocation,
    keeper,
    borrower,
    borrowDate,
    returnDate,
    remark,
    materialCount,
    exportRecords: [],
    borrowHistory: [],
    createdAt: now,
    updatedAt: now,
  }
}

export const mockArchives: CaseArchive[] = []

export const initMockArchives = () => {
  if (mockArchives.length === 0) {
    const closedCases = mockCases.filter(c => c.status === CaseStatus.CLOSED)

    closedCases.forEach((caseItem, index) => {
      const archiveCode = `GD-${new Date().getFullYear()}-${String(index + 1).padStart(4, '0')}`
    const materialCount = countFiles(caseItem.materials)

    let archive: CaseArchive

    if (index === 0) {
      archive = createMockArchive(
        caseItem.id,
        archiveCode,
        ArchiveStatus.ARCHIVED,
        30,
        '档案柜 A-03',
        '档案管理员-李芳',
        materialCount,
        '二审审结归档',
      )
      archive.exportRecords = [
        createExportRecord(archive.archiveId, 'excel', '陈静', '全部材料', 25, '案件结案归档导出'),
        createExportRecord(archive.archiveId, 'pdf', '陈静', '裁判文书', 20, '供当事人查阅'),
      ]
      archive.borrowHistory = [
        createBorrowRecord(archive.archiveId, '王律师', '案件复盘分析', 15, 10, '李主管'),
        createBorrowRecord(archive.archiveId, '刘律师', '类似案件参考', 5),
      ]
    } else if (index === 1) {
      archive = createMockArchive(
        caseItem.id,
        archiveCode,
        ArchiveStatus.BORROWED,
        45,
        '档案柜 B-01',
        '档案管理员-李芳',
        materialCount,
        '案件已结案归档',
        '张律师',
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      )
      archive.exportRecords = [
        createExportRecord(archive.archiveId, 'excel', '李明', '全部材料', 40, '归档清单'),
      ]
      archive.borrowHistory = [
        createBorrowRecord(archive.archiveId, '张律师', '案件申诉准备', 3),
      ]
    } else {
      archive = createMockArchive(
        caseItem.id,
        archiveCode,
        ArchiveStatus.PENDING,
        5,
        '待归档区',
        '档案管理员-李芳',
        materialCount,
        '等待材料整理中',
      )
    }

      mockArchives.push(archive)
    })
  }
}

initMockArchives()

export const getArchiveList = (): CaseArchiveListItem[] => {
  return mockArchives.map(archive => {
    const caseItem = mockCases.find(c => c.id === archive.caseId)
    return {
      ...archive,
      caseNumber: caseItem?.caseNumber || '',
      caseName: caseItem?.name || '',
      caseType: caseItem?.caseType || '',
      responsibleLawyer: caseItem?.responsibleLawyer || '',
    }
  })
}

export const getArchiveById = (archiveId: string): CaseArchive | undefined => {
  return mockArchives.find(a => a.archiveId === archiveId)
}

export const getArchiveByCaseId = (caseId: string): CaseArchive | undefined => {
  return mockArchives.find(a => a.caseId === caseId)
}

export const getArchiveDetail = (archiveId: string): (CaseArchive & { caseNumber: string; caseName: string; caseType: string; responsibleLawyer: string }) | undefined => {
  const archive = mockArchives.find(a => a.archiveId === archiveId)
  if (!archive) return undefined
  const caseItem = mockCases.find(c => c.id === archive.caseId)
  return {
    ...archive,
    caseNumber: caseItem?.caseNumber || '',
    caseName: caseItem?.name || '',
    caseType: caseItem?.caseType || '',
    responsibleLawyer: caseItem?.responsibleLawyer || '',
  }
}

export const getClosedCasesWithoutArchive = () => {
  const archivedCaseIds = mockArchives.map(a => a.caseId)
  return mockCases.filter(c => c.status === CaseStatus.CLOSED && !archivedCaseIds.includes(c.id))
}

export const createArchive = (
  caseId: string,
  data: {
    archiveCode: string
    physicalLocation: string
    keeper: string
    remark?: string
  }
): CaseArchive => {
  const caseItem = mockCases.find(c => c.id === caseId)
  if (!caseItem) {
    throw new Error('案件不存在')
  }
  const materialCount = countFiles(caseItem.materials)
  const now = new Date().toISOString()
  const archive: CaseArchive = {
    archiveId: generateId(),
    caseId,
    archiveCode: data.archiveCode,
    archiveDate: new Date().toISOString().split('T')[0],
    archiveStatus: ArchiveStatus.ARCHIVED,
    physicalLocation: data.physicalLocation,
    keeper: data.keeper,
    remark: data.remark,
    materialCount,
    exportRecords: [],
    borrowHistory: [],
    createdAt: now,
    updatedAt: now,
  }
  mockArchives.push(archive)
  return archive
}

export const updateArchive = (
  archiveId: string,
  data: Partial<Omit<CaseArchive, 'archiveId' | 'caseId' | 'createdAt' | 'materialCount' | 'exportRecords' | 'borrowHistory'>>
): CaseArchive | undefined => {
  const index = mockArchives.findIndex(a => a.archiveId === archiveId)
  if (index === -1) return undefined
  mockArchives[index] = {
    ...mockArchives[index],
    ...data,
    updatedAt: new Date().toISOString(),
  }
  return mockArchives[index]
}

export const addBorrowRecord = (
  archiveId: string,
  data: {
    borrower: string
    borrowDate: string
    expectedReturnDate?: string
    borrowReason: string
    approver?: string
    remark?: string
  }
): BorrowRecord | undefined => {
  const archive = mockArchives.find(a => a.archiveId === archiveId)
  if (!archive) return undefined

  const now = new Date().toISOString()
  const record: BorrowRecord = {
    borrowId: generateId(),
    archiveId,
    borrower: data.borrower,
    borrowDate: data.borrowDate,
    expectedReturnDate: data.expectedReturnDate,
    borrowReason: data.borrowReason,
    approver: data.approver,
    remark: data.remark,
    createdAt: now,
    updatedAt: now,
  }

  archive.borrowHistory.push(record)
  archive.archiveStatus = ArchiveStatus.BORROWED
  archive.borrower = data.borrower
  archive.borrowDate = data.borrowDate
  archive.returnDate = undefined
  archive.updatedAt = now

  return record
}

export const returnArchive = (
  archiveId: string,
  returnDate: string,
  remark?: string
): CaseArchive | undefined => {
  const archive = mockArchives.find(a => a.archiveId === archiveId)
  if (!archive) return undefined

  archive.archiveStatus = ArchiveStatus.RETURNED
  archive.returnDate = returnDate
  archive.borrower = undefined
  archive.borrowDate = undefined
  archive.updatedAt = new Date().toISOString()

  const lastBorrow = archive.borrowHistory.find(b => !b.returnDate)
  if (lastBorrow) {
    lastBorrow.returnDate = returnDate
    lastBorrow.remark = remark || lastBorrow.remark
    lastBorrow.updatedAt = new Date().toISOString()
  }

  return archive
}

export const addExportRecord = (
  archiveId: string,
  data: {
    exportType: 'excel' | 'pdf'
    exporter: string
    exportRange: string
    remark?: string
  }
): ExportRecord | undefined => {
  const archive = mockArchives.find(a => a.archiveId === archiveId)
  if (!archive) return undefined

  const record: ExportRecord = {
    exportId: generateId(),
    archiveId,
    exportType: data.exportType,
    exportDate: new Date().toISOString().split('T')[0],
    exporter: data.exporter,
    exportRange: data.exportRange,
    remark: data.remark,
  }

  archive.exportRecords.push(record)
  return record
}

export const generateArchiveCode = (): string => {
  const year = new Date().getFullYear()
  const count = mockArchives.filter(a => a.archiveCode.startsWith(`GD-${year}-`)).length + 1
  return `GD-${year}-${String(count).padStart(4, '0')}`
}

export const deleteArchive = (archiveId: string): boolean => {
  const index = mockArchives.findIndex(a => a.archiveId === archiveId)
  if (index === -1) return false
  mockArchives.splice(index, 1)
  return true
}
