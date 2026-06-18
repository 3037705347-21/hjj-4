import type { FlatMaterialItem, MaterialNode } from '@/types'
import { MaterialNodeType } from '@/types'

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
