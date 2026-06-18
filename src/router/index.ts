import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import CaseListPage from '@/pages/CaseListPage.vue'
import CaseDetailPage from '@/pages/CaseDetailPage.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/cases',
    name: 'case-list',
    component: CaseListPage,
  },
  {
    path: '/cases/:id',
    name: 'case-detail',
    component: CaseDetailPage,
  },
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
