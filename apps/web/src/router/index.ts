import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import ListProjects from '../pages/projects/ListProjects.vue'
import NewProject from '../pages/projects/NewProject.vue'
const ProjectDetail = () => import('../pages/projects/ProjectDetail.vue')
const ProjectGoals = () => import('../pages/projects/ProjectGoals.vue')
const ProgressDashboard = () => import('../pages/progress/ProgressDashboard.vue')
const CostDashboard = () => import('../pages/cost/CostDashboard.vue')
const RevenueDashboard = () => import('../pages/revenue/RevenueDashboard.vue')
const AlertsBoard = () => import('../pages/alerts/AlertsBoard.vue')
const AlertsConfigPage = () => import('../pages/alerts/AlertsConfigPage.vue')
const HomeDashboard = () => import('../pages/home/HomeDashboard.vue')
const HomeConfig = () => import('../pages/home/HomeConfig.vue')

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/home' },
  { path: '/home', component: HomeDashboard },
  { path: '/home/config', component: HomeConfig },
  { path: '/projects', component: ListProjects },
  { path: '/projects/new', component: NewProject },
  { path: '/projects/:id', component: ProjectDetail },
  { path: '/projects/:id/goals', component: ProjectGoals },
  { path: '/progress', component: ProgressDashboard },
  { path: '/cost', component: CostDashboard },
  { path: '/revenue', component: RevenueDashboard },
  { path: '/alerts', component: AlertsBoard }
  ,{ path: '/alerts/configs', component: AlertsConfigPage }
]

export default createRouter({
  history: createWebHistory(),
  routes
})