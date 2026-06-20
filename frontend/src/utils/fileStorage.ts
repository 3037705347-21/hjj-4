const FILE_STORAGE_PREFIX = 'case_file_'
const MAX_BASE64_SIZE = 5 * 1024 * 1024
const PLACEHOLDER_MARKER = '__placeholder__'

export interface FileStorageItem {
  fileDataId: string
  name: string
  mimeType: string
  fileSize: number
  isPlaceholder: boolean
  data?: string
  uploadDate: string
}

export const getFileExtension = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return ext
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const parseFileSize = (sizeStr: string): number => {
  if (!sizeStr) return 0
  const match = sizeStr.match(/^([\d.]+)\s*(B|KB|MB|GB)$/i)
  if (!match) return 0
  const value = parseFloat(match[1])
  const unit = match[2].toUpperCase()
  const multipliers: Record<string, number> = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 }
  return Math.round(value * (multipliers[unit] || 1))
}

export const canPreview = (mimeType: string): { previewable: boolean; type: 'image' | 'pdf' | 'text' | 'none' } => {
  if (mimeType.startsWith('image/')) {
    return { previewable: true, type: 'image' }
  }
  if (mimeType === 'application/pdf') {
    return { previewable: true, type: 'pdf' }
  }
  if (mimeType.startsWith('text/') || 
      mimeType === 'application/json' || 
      mimeType === 'application/javascript' ||
      mimeType === 'text/markdown') {
    return { previewable: true, type: 'text' }
  }
  return { previewable: false, type: 'none' }
}

export const canActuallyPreview = (fileItem: FileStorageItem | null): { previewable: boolean; type: 'image' | 'pdf' | 'text' | 'none' } => {
  if (!fileItem || fileItem.isPlaceholder || !fileItem.data) {
    return { previewable: false, type: 'none' }
  }
  return canPreview(fileItem.mimeType)
}

export const getFileIconType = (mimeType: string, extension: string): 'pdf' | 'excel' | 'word' | 'image' | 'text' | 'zip' | 'audio' | 'video' | 'other' => {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType === 'application/zip' || mimeType === 'application/x-rar-compressed' || 
      extension === 'zip' || extension === 'rar' || extension === '7z') return 'zip'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'
  if (extension === 'xlsx' || extension === 'xls' || extension === 'csv' || 
      mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'excel'
  if (extension === 'docx' || extension === 'doc' || mimeType.includes('word') ||
      extension === 'pages') return 'word'
  if (mimeType.startsWith('text/') || extension === 'txt' || extension === 'md' || 
      extension === 'json' || extension === 'js' || extension === 'ts' ||
      extension === 'html' || extension === 'css') return 'text'
  return 'other'
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

export const saveFile = async (file: File): Promise<FileStorageItem> => {
  const fileDataId = `${FILE_STORAGE_PREFIX}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const isPlaceholder = file.size > MAX_BASE64_SIZE

  let data: string | undefined

  if (!isPlaceholder) {
    try {
      data = await fileToBase64(file)
    } catch (e) {
      console.warn('Failed to read file, using placeholder:', e)
    }
  }

  const storageItem: FileStorageItem = {
    fileDataId,
    name: file.name,
    mimeType: file.type,
    fileSize: file.size,
    isPlaceholder: isPlaceholder || !data,
    data,
    uploadDate: new Date().toISOString().split('T')[0],
  }

  try {
    const itemToStore: FileStorageItem = { ...storageItem }
    if (storageItem.isPlaceholder) {
      itemToStore.data = PLACEHOLDER_MARKER
    }
    localStorage.setItem(fileDataId, JSON.stringify(itemToStore))
  } catch (e) {
    console.warn('Failed to save to localStorage, using placeholder:', e)
    storageItem.isPlaceholder = true
    storageItem.data = undefined
    const fallbackItem: FileStorageItem = {
      ...storageItem,
      data: PLACEHOLDER_MARKER,
    }
    localStorage.setItem(fileDataId, JSON.stringify(fallbackItem))
  }

  return storageItem
}

export const getFile = (fileDataId: string): FileStorageItem | null => {
  try {
    const raw = localStorage.getItem(fileDataId)
    if (!raw) return null
    const item = JSON.parse(raw) as FileStorageItem
    if (item.data === PLACEHOLDER_MARKER) {
      item.data = undefined
      item.isPlaceholder = true
    }
    return item
  } catch {
    return null
  }
}

export const deleteFile = (fileDataId: string): void => {
  try {
    localStorage.removeItem(fileDataId)
  } catch (e) {
    console.warn('Failed to delete file from storage:', e)
  }
}

export const downloadFile = (fileDataId: string, filename: string): void => {
  const fileItem = getFile(fileDataId)
  if (!fileItem) {
    alert('文件不存在或已被清理')
    return
  }

  if (fileItem.isPlaceholder || !fileItem.data) {
    alert('该文件仅存储了元数据，原始文件内容已丢失。\n\n' +
      `文件名：${fileItem.name}\n` +
      `大小：${formatFileSize(fileItem.fileSize)}\n` +
      `类型：${fileItem.mimeType}\n` +
      `上传日期：${fileItem.uploadDate}`)
    return
  }

  const link = document.createElement('a')
  link.href = fileItem.data
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const openFileInNewTab = (fileDataId: string): void => {
  const fileItem = getFile(fileDataId)
  if (!fileItem) {
    alert('文件不存在或已被清理')
    return
  }

  if (fileItem.isPlaceholder || !fileItem.data) {
    alert('该文件仅存储了元数据，无法预览原始内容。\n\n' +
      `文件名：${fileItem.name}\n` +
      `大小：${formatFileSize(fileItem.fileSize)}\n` +
      `类型：${fileItem.mimeType}\n` +
      `上传日期：${fileItem.uploadDate}`)
    return
  }

  const previewInfo = canPreview(fileItem.mimeType)
  if (previewInfo.previewable) {
    window.open(fileItem.data, '_blank')
  } else {
    alert('该文件类型暂不支持在线预览，请下载后查看。')
    downloadFile(fileDataId, fileItem.name)
  }
}
