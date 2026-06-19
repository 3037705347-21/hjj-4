import type { FlatMaterialItem, MaterialNode } from '@/types'
import { MaterialNodeType } from '@/types'

export interface FilterOptions {
  nameKeyword?: string
  nodeType?: 'all' | 'folder' | 'file'
  uploader?: string
  uploadDateFrom?: string
  uploadDateTo?: string
  hasFileSize?: 'all' | 'yes' | 'no'
}

const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj))

const nodeMatchesFilter = (node: MaterialNode, options: FilterOptions): boolean => {
  const { nameKeyword, nodeType, uploader, uploadDateFrom, uploadDateTo, hasFileSize } = options

  if (nameKeyword && nameKeyword.trim()) {
    const keyword = nameKeyword.trim().toLowerCase()
    if (!node.name.toLowerCase().includes(keyword)) {
      return false
    }
  }

  if (nodeType && nodeType !== 'all') {
    if (nodeType === 'folder' && node.type !== MaterialNodeType.FOLDER) return false
    if (nodeType === 'file' && node.type !== MaterialNodeType.FILE) return false
  }

  if (uploader && uploader.trim()) {
    if (!node.uploader || !node.uploader.toLowerCase().includes(uploader.trim().toLowerCase())) {
      return false
    }
  }

  if (uploadDateFrom && node.uploadDate) {
    if (node.uploadDate < uploadDateFrom) return false
  }
  if (uploadDateTo && node.uploadDate) {
    if (node.uploadDate > uploadDateTo) return false
  }

  if (hasFileSize && hasFileSize !== 'all') {
    if (hasFileSize === 'yes' && !node.fileSize) return false
    if (hasFileSize === 'no' && node.fileSize) return false
  }

  return true
}

export const filterMaterialTree = (
  nodes: MaterialNode[],
  options: FilterOptions
): MaterialNode[] => {
  const hasFilter = Object.values(options).some(v => {
    if (v === undefined || v === null) return false
    if (typeof v === 'string' && v.trim() === '') return false
    if (v === 'all') return false
    return true
  })

  if (!hasFilter) return nodes

  const filterNodes = (nodeList: MaterialNode[]): MaterialNode[] => {
    const result: MaterialNode[] = []

    for (const node of nodeList) {
      const selfMatches = nodeMatchesFilter(node, options)

      let filteredChildren: MaterialNode[] = []
      if (node.children && node.children.length > 0) {
        filteredChildren = filterNodes(node.children)
      }

      if (selfMatches || filteredChildren.length > 0) {
        const clonedNode = deepClone(node)
        if (clonedNode.type === MaterialNodeType.FOLDER) {
          clonedNode.children = filteredChildren
          clonedNode.expanded = true
        }
        result.push(clonedNode)
      }
    }

    return result
  }

  return filterNodes(nodes)
}

export const getAllUploaders = (nodes: MaterialNode[]): string[] => {
  const uploaders = new Set<string>()

  const traverse = (nodeList: MaterialNode[]) => {
    for (const node of nodeList) {
      if (node.uploader) {
        uploaders.add(node.uploader)
      }
      if (node.children) {
        traverse(node.children)
      }
    }
  }

  traverse(nodes)
  return Array.from(uploaders).sort()
}

export const flattenMaterialTree = (
  nodes: MaterialNode[],
  parentPath: string = ''
): FlatMaterialItem[] => {
  const result: FlatMaterialItem[] = []

  for (const node of nodes) {
    const currentPath = parentPath ? `${parentPath} / ${node.name}` : node.name

    if (node.type === MaterialNodeType.FILE) {
      result.push({
        id: node.id,
        name: node.name,
        type: node.type,
        path: currentPath,
        uploadDate: node.uploadDate || '',
        uploader: node.uploader || '',
        fileSize: node.fileSize || '',
        description: node.description || '',
      })
    }

    if (node.type === MaterialNodeType.FOLDER && node.children) {
      result.push({
        id: node.id,
        name: node.name,
        type: node.type,
        path: parentPath,
        uploadDate: '',
        uploader: '',
        fileSize: '',
        description: '文件夹',
      })
      result.push(...flattenMaterialTree(node.children, currentPath))
    }
  }

  return result
}

export const findNodeById = (
  nodes: MaterialNode[],
  id: string
): MaterialNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

export const findParentNode = (
  nodes: MaterialNode[],
  id: string,
  parent: MaterialNode | null = null
): MaterialNode | null => {
  for (const node of nodes) {
    if (node.id === id) return parent
    if (node.children) {
      const found = findParentNode(node.children, id, node)
      if (found !== null || node.children.some(c => c.id === id)) {
        return found !== null ? found : node
      }
    }
  }
  return null
}

export const removeNodeById = (
  nodes: MaterialNode[],
  id: string
): MaterialNode[] => {
  return nodes
    .filter(node => node.id !== id)
    .map(node => ({
      ...node,
      children: node.children ? removeNodeById(node.children, id) : undefined,
    }))
}

export const addChildNode = (
  nodes: MaterialNode[],
  parentId: string | null,
  newNode: MaterialNode
): MaterialNode[] => {
  if (parentId === null) {
    return [...nodes, newNode]
  }

  return nodes.map(node => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...(node.children || []), newNode],
        expanded: true,
      }
    }
    if (node.children) {
      return {
        ...node,
        children: addChildNode(node.children, parentId, newNode),
      }
    }
    return node
  })
}

export const updateNodeById = (
  nodes: MaterialNode[],
  id: string,
  updates: Partial<MaterialNode>
): MaterialNode[] => {
  return nodes.map(node => {
    if (node.id === id) {
      return { ...node, ...updates }
    }
    if (node.children) {
      return {
        ...node,
        children: updateNodeById(node.children, id, updates),
      }
    }
    return node
  })
}

export const toggleExpandNode = (
  nodes: MaterialNode[],
  id: string
): MaterialNode[] => {
  return nodes.map(node => {
    if (node.id === id) {
      return { ...node, expanded: !node.expanded }
    }
    if (node.children) {
      return {
        ...node,
        children: toggleExpandNode(node.children, id),
      }
    }
    return node
  })
}

export const isDescendant = (
  nodes: MaterialNode[],
  ancestorId: string,
  descendantId: string
): boolean => {
  const ancestor = findNodeById(nodes, ancestorId)
  if (!ancestor || !ancestor.children) return false

  const checkChildren = (children: MaterialNode[]): boolean => {
    for (const child of children) {
      if (child.id === descendantId) return true
      if (child.children && checkChildren(child.children)) return true
    }
    return false
  }

  return checkChildren(ancestor.children)
}

export const moveNode = (
  nodes: MaterialNode[],
  sourceId: string,
  targetId: string | null,
  position: 'inside' | 'before' | 'after'
): MaterialNode[] => {
  if (sourceId === targetId) return nodes
  if (targetId && isDescendant(nodes, sourceId, targetId)) return nodes

  const sourceNode = findNodeById(nodes, sourceId)
  if (!sourceNode) return nodes

  let result = removeNodeById(nodes, sourceId)

  if (position === 'inside' || targetId === null) {
    result = addChildNode(result, targetId, sourceNode)
  } else {
    const targetParent = findParentNode(result, targetId)
    const siblings = targetParent ? targetParent.children || result : result

    const targetIndex = siblings.findIndex(n => n.id === targetId)
    if (targetIndex === -1) return nodes

    const insertIndex = position === 'before' ? targetIndex : targetIndex + 1

    if (targetParent) {
      const newSiblings = [...siblings]
      newSiblings.splice(insertIndex, 0, sourceNode)
      result = updateNodeById(result, targetParent.id, { children: newSiblings })
    } else {
      const newSiblings = [...siblings]
      newSiblings.splice(insertIndex, 0, sourceNode)
      result = newSiblings
    }
  }

  return result
}

export const countFiles = (nodes: MaterialNode[]): number => {
  let count = 0
  for (const node of nodes) {
    if (node.type === MaterialNodeType.FILE) {
      count++
    }
    if (node.children) {
      count += countFiles(node.children)
    }
  }
  return count
}

export const hasDuplicateName = (
  nodes: MaterialNode[],
  parentId: string | null,
  name: string,
  excludeId?: string
): boolean => {
  const parent = parentId ? findNodeById(nodes, parentId) : null
  const siblings = parent ? parent.children || [] : nodes

  return siblings.some(
    sibling => sibling.id !== excludeId && sibling.name === name
  )
}

export const getSiblings = (
  nodes: MaterialNode[],
  nodeId: string
): MaterialNode[] => {
  const parent = findParentNode(nodes, nodeId)
  return parent ? parent.children || nodes : nodes
}

export const removeNodesByIds = (
  nodes: MaterialNode[],
  ids: string[]
): MaterialNode[] => {
  const idSet = new Set(ids)
  return nodes
    .filter(node => !idSet.has(node.id))
    .map(node => ({
      ...node,
      children: node.children ? removeNodesByIds(node.children, ids) : undefined,
    }))
}

export const getNodesByIds = (
  nodes: MaterialNode[],
  ids: string[]
): MaterialNode[] => {
  const idSet = new Set(ids)
  const result: MaterialNode[] = []
  const traverse = (nodeList: MaterialNode[]) => {
    for (const node of nodeList) {
      if (idSet.has(node.id)) {
        result.push(node)
      }
      if (node.children) {
        traverse(node.children)
      }
    }
  }
  traverse(nodes)
  return result
}

export const isDescendantOfAny = (
  nodes: MaterialNode[],
  targetId: string,
  ancestorIds: string[]
): boolean => {
  for (const ancestorId of ancestorIds) {
    if (ancestorId === targetId) return true
    if (isDescendant(nodes, ancestorId, targetId)) return true
  }
  return false
}

export const updateNodesByIds = (
  nodes: MaterialNode[],
  ids: string[],
  updates: Partial<MaterialNode>
): MaterialNode[] => {
  const idSet = new Set(ids)
  return nodes.map(node => {
    if (idSet.has(node.id)) {
      return { ...node, ...updates }
    }
    if (node.children) {
      return { ...node, children: updateNodesByIds(node.children, ids, updates) }
    }
    return node
  })
}

export const getAllFolderNodes = (nodes: MaterialNode[]): MaterialNode[] => {
  const result: MaterialNode[] = []
  const traverse = (nodeList: MaterialNode[]) => {
    for (const node of nodeList) {
      if (node.type === MaterialNodeType.FOLDER) {
        result.push(node)
      }
      if (node.children) {
        traverse(node.children)
      }
    }
  }
  traverse(nodes)
  return result
}

export const flattenSelectedNodes = (
  allNodes: MaterialNode[],
  selectedIds: string[]
): FlatMaterialItem[] => {
  const result: FlatMaterialItem[] = []
  const idSet = new Set(selectedIds)

  const traverse = (nodes: MaterialNode[], parentPath: string = '') => {
    for (const node of nodes) {
      const currentPath = parentPath ? `${parentPath} / ${node.name}` : node.name

      if (idSet.has(node.id)) {
        if (node.type === MaterialNodeType.FILE) {
          result.push({
            id: node.id,
            name: node.name,
            type: node.type,
            path: currentPath,
            uploadDate: node.uploadDate || '',
            uploader: node.uploader || '',
            fileSize: node.fileSize || '',
            description: node.description || '',
          })
        } else if (node.type === MaterialNodeType.FOLDER) {
          result.push({
            id: node.id,
            name: node.name,
            type: node.type,
            path: parentPath,
            uploadDate: '',
            uploader: '',
            fileSize: '',
            description: node.description || '文件夹',
          })
          if (node.children) {
            traverse(node.children, currentPath)
          }
        }
      } else if (node.children) {
        traverse(node.children, currentPath)
      }
    }
  }

  traverse(allNodes)
  return result
}

export const getNodePath = (
  nodes: MaterialNode[],
  nodeId: string,
  parentPath: string = ''
): string => {
  for (const node of nodes) {
    const currentPath = parentPath ? `${parentPath} / ${node.name}` : node.name
    if (node.id === nodeId) return currentPath
    if (node.children) {
      const found = getNodePath(node.children, nodeId, currentPath)
      if (found) return found
    }
  }
  return ''
}
