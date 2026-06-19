import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import HomePage from './pages/HomePage.vue'
import CaseListPage from './pages/CaseListPage.vue'
import CaseDetailPage from './pages/CaseDetailPage.vue'
import TaskListPage from './pages/TaskListPage.vue'
import CaseCalendarPage from './pages/CaseCalendarPage.vue'
import CaseTimelinePage from './pages/CaseTimelinePage.vue'
import CommunicationRecordsPage from './pages/CommunicationRecordsPage.vue'
import './style.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/cases', name: 'case-list', component: CaseListPage },
    { path: '/cases/:id', name: 'case-detail', component: CaseDetailPage },
    { path: '/tasks', name: 'task-list', component: TaskListPage },
    { path: '/calendar', name: 'case-calendar', component: CaseCalendarPage },
    { path: '/timeline', name: 'case-timeline', component: CaseTimelinePage },
    { path: '/communications', name: 'communication-list', component: CommunicationRecordsPage },
  ],
})

createApp(App).use(router).mount('#app')
