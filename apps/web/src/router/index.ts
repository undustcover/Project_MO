import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import ListProjects from '../pages/projects/ListProjects.vue'
import NewProject from '../pages/projects/NewProject.vue'
const ProgressDashboard = () => import('../pages/progress/ProgressDashboard.vue')
const CostDashboard = () => import('../pages/cost/CostDashboard.vue')
const RevenueDashboard = () => import('../pages/revenue/RevenueDashboard.vue')
const AlertsBoard = () => import('../pages/alerts/AlertsBoard.vue')

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/projects' },
  { path: '/projects', component: ListProjects },
  { path: '/projects/new', component: NewProject },
  { path: '/progress', component: ProgressDashboard },
  { path: '/cost', component: CostDashboard },
  { path: '/revenue', component: RevenueDashboard },
  { path: '/alerts', component: AlertsBoard }
]

export default createRouter({
  history: createWebHistory(),
  routes
})