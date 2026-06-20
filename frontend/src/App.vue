<script setup lang="ts">
import { ref } from 'vue'
import { Shield, Users, ChevronDown } from 'lucide-vue-next'
import GlobalSearch from '@/components/GlobalSearch.vue'
import { usePermissions } from '@/composables/usePermissions'
import { UserRole } from '@/types'

const permissions = usePermissions()
const showRoleMenu = ref(false)

const roleOptions = [
  { role: UserRole.ADMIN, label: '管理员', icon: Shield, color: 'bg-purple-500' },
  { role: UserRole.LAWYER, label: '承办律师', icon: Users, color: 'bg-blue-500' },
  { role: UserRole.VIEWER, label: '查看者', icon: Users, color: 'bg-gray-500' },
]

const handleRoleChange = (role: UserRole) => {
  permissions.switchRole(role)
  showRoleMenu.value = false
}
</script>

<template>
  <div class="min-h-screen">
    <router-view />
    <GlobalSearch />
    
    <div class="fixed bottom-6 right-6 z-50">
      <div class="relative">
        <button
          class="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl hover:border-gray-300 transition-all group"
          @click="showRoleMenu = !showRoleMenu"
        >
          <div 
          class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
          :class="permissions.currentRoleInfo?.color"
        >
          {{ permissions.currentRoleInfo?.label?.charAt(0) || 'U' }}
          </div>
          <div class="text-left">
          <div class="text-xs text-gray-500">当前角色</div>
          <div class="text-sm font-semibold text-gray-800">{{ permissions.currentRoleInfo?.label }}</div>
          </div>
          <ChevronDown class="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" :class="{ 'rotate-180': showRoleMenu }" />
        </button>
        
        <div
          v-if="showRoleMenu"
          class="absolute bottom-full right-0 mb-2 w-52 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 overflow-hidden"
        >
          <div class="px-3 py-2 border-b border-gray-100">
          <div class="text-xs text-gray-500">切换角色（演示用）</div>
          </div>
          <div class="py-1">
          <button
            v-for="option in roleOptions"
            :key="option.role"
            class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors"
            :class="{ 'bg-blue-50': permissions.currentRole === option.role }"
            @click="handleRoleChange(option.role)"
          >
            <div class="flex-1 text-left">
              <div class="flex items-center gap-2">
                <option.icon class="w-4 h-4 text-gray-500" />
                <span class="text-sm font-medium text-gray-700">{{ option.label }}</span>
              </div>
              <div class="text-xs text-gray-400 mt-0.5">
                <span v-if="option.role === UserRole.ADMIN">全部操作权限</span>
                <span v-else-if="option.role === UserRole.LAWYER">可编辑材料，不可删除案件</span>
                <span v-else>只读，仅查看和导出</span>
              </div>
            </div>
            <div
              v-if="permissions.currentRole === option.role"
              class="w-2 h-2 rounded-full bg-green-500"
            ></div>
          </button>
          </div>
        </div>
      </div>
    </div>
    
    <Teleport to="body">
      <div v-if="showRoleMenu" class="fixed inset-0 z-40" @click="showRoleMenu = false"></div>
    </Teleport>
  </div>
</template>