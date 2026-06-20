import { ref } from 'vue'

const isOpen = ref(false)

export const useGlobalSearch = () => {
  const openSearch = () => {
    isOpen.value = true
  }

  const closeSearch = () => {
    isOpen.value = false
  }

  return {
    isOpen,
    openSearch,
    closeSearch,
  }
}
