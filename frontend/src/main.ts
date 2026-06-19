import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import HomePage from './pages/HomePage.vue'
import CaseListPage from './pages/CaseListPage.vue'
import CaseDetailPage from './pages/CaseDetailPage.vue'
import TaskListPage from './pages/TaskListPage.vue'
import './style.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/cases', name: 'case-list', component: CaseListPage },
    { path: '/cases/:id', name: 'case-detail', component: CaseDetailPage },
    { path: '/tasks', name: 'task-list', component: TaskListPage },
  ],
})

createApp(App).use(router).mount('#app')
