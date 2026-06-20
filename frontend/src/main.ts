import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './App.vue'
import HomePage from './pages/HomePage.vue'
import CaseListPage from './pages/CaseListPage.vue'
import CaseDetailPage from './pages/CaseDetailPage.vue'
import TaskListPage from './pages/TaskListPage.vue'
import CaseCalendarPage from './pages/CaseCalendarPage.vue'
import CaseTimelinePage from './pages/CaseTimelinePage.vue'
import CommunicationRecordsPage from './pages/CommunicationRecordsPage.vue'
import ArchiveListPage from './pages/ArchiveListPage.vue'
import ArchiveDetailPage from './pages/ArchiveDetailPage.vue'
import TemplateListPage from './pages/TemplateListPage.vue'
import TemplateEditPage from './pages/TemplateEditPage.vue'
import GenerationRecordPage from './pages/GenerationRecordPage.vue'
import ReportOverviewPage from './pages/ReportOverviewPage.vue'
import ReportCaseDistributionPage from './pages/ReportCaseDistributionPage.vue'
import ReportMaterialStatsPage from './pages/ReportMaterialStatsPage.vue'
import { useCasesStore } from './stores/cases'
import { useUserStore } from './stores/user'
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
    { path: '/archives', name: 'archive-list', component: ArchiveListPage },
    { path: '/archives/:id', name: 'archive-detail', component: ArchiveDetailPage },
    { path: '/templates', name: 'template-list', component: TemplateListPage },
    { path: '/templates/create', name: 'template-create', component: TemplateEditPage },
    { path: '/templates/:id', name: 'template-edit', component: TemplateEditPage },
    { path: '/generation-records', name: 'generation-records', component: GenerationRecordPage },
    { path: '/reports', name: 'report-overview', component: ReportOverviewPage },
    { path: '/reports/case-distribution', name: 'report-case-distribution', component: ReportCaseDistributionPage },
    { path: '/reports/material-stats', name: 'report-material-stats', component: ReportMaterialStatsPage },
  ],
})

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

const casesStore = useCasesStore(pinia)
casesStore.initialize()

const userStore = useUserStore(pinia)
userStore.initialize()

app.mount('#app')
