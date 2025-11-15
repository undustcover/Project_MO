const BASE_URL = '/api'

export async function getProjects() {
  const res = await fetch(`${BASE_URL}/projects`)
  if (!res.ok) return []
  return res.json()
}

export async function createProject(payload: any) {
  const res = await fetch(`${BASE_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return res.ok
}

export async function getProject(id: number) {
  const res = await fetch(`${BASE_URL}/projects/` + id)
  if (!res.ok) return null
  return res.json()
}

export async function getProgressDashboard(params: { projectId: number; taskName?: string; from?: string; to?: string; wellNumber?: string }) {
  const u = new URL(`/api/dashboard/progress`, window.location.origin)
  u.searchParams.set('projectId', String(params.projectId))
  if (params.taskName) u.searchParams.set('taskName', params.taskName)
  if (params.from) u.searchParams.set('from', params.from)
  if (params.to) u.searchParams.set('to', params.to)
  if (params.wellNumber) u.searchParams.set('wellNumber', params.wellNumber)
  const res = await fetch(u.toString())
  if (!res.ok) return null
  return res.json()
}

export async function getProgressTasks(projectId: number, wellNumber?: string) {
  const u = new URL(`/api/dashboard/progress/tasks`, window.location.origin)
  u.searchParams.set('projectId', String(projectId))
  if (wellNumber) u.searchParams.set('wellNumber', wellNumber)
  const res = await fetch(u.toString())
  if (!res.ok) return []
  return res.json()
}

export async function getProgressTaskDetail(params: { projectId: number; taskName: string; from?: string; to?: string; wellNumber?: string }) {
  const u = new URL(`/api/dashboard/progress/taskDetail`, window.location.origin)
  u.searchParams.set('projectId', String(params.projectId))
  u.searchParams.set('taskName', params.taskName)
  if (params.from) u.searchParams.set('from', params.from)
  if (params.to) u.searchParams.set('to', params.to)
  if (params.wellNumber) u.searchParams.set('wellNumber', params.wellNumber)
  const res = await fetch(u.toString())
  if (!res.ok) return null
  return res.json()
}

export async function getProgressTaskBreakdown(params: { projectId: number; taskName: string; from?: string; to?: string; wellNumber?: string }) {
  const u = new URL(`/api/dashboard/progress/taskBreakdown`, window.location.origin)
  u.searchParams.set('projectId', String(params.projectId))
  u.searchParams.set('taskName', params.taskName)
  if (params.from) u.searchParams.set('from', params.from)
  if (params.to) u.searchParams.set('to', params.to)
  if (params.wellNumber) u.searchParams.set('wellNumber', params.wellNumber)
  const res = await fetch(u.toString())
  if (!res.ok) return null
  return res.json()
}

export async function getProgressWells(projectId: number) {
  const u = new URL(`/api/dashboard/progress/wells`, window.location.origin)
  u.searchParams.set('projectId', String(projectId))
  const res = await fetch(u.toString())
  if (!res.ok) return []
  return res.json()
}

export async function getProgressCycleDetail(params: { projectId: number; cycleType: 'task' | 'moving' | 'drilling' | 'completion' | 'testing'; from?: string; to?: string; wellNumber?: string }) {
  const u = new URL(`/api/dashboard/progress/cycleDetail`, window.location.origin)
  u.searchParams.set('projectId', String(params.projectId))
  u.searchParams.set('cycleType', params.cycleType)
  if (params.from) u.searchParams.set('from', params.from)
  if (params.to) u.searchParams.set('to', params.to)
  if (params.wellNumber) u.searchParams.set('wellNumber', params.wellNumber)
  const res = await fetch(u.toString())
  if (!res.ok) return null
  return res.json()
}

export async function getProgressCycleBreakdown(params: { projectId: number; cycleType: 'task' | 'moving' | 'drilling' | 'completion' | 'testing'; from?: string; to?: string; wellNumber?: string }) {
  const u = new URL(`/api/dashboard/progress/cycleBreakdown`, window.location.origin)
  u.searchParams.set('projectId', String(params.projectId))
  u.searchParams.set('cycleType', params.cycleType)
  if (params.from) u.searchParams.set('from', params.from)
  if (params.to) u.searchParams.set('to', params.to)
  if (params.wellNumber) u.searchParams.set('wellNumber', params.wellNumber)
  const res = await fetch(u.toString())
  if (!res.ok) return null
  return res.json()
}

export async function getProgressPlanCompare(params: { projectId: number; wellNumber?: string; from?: string; to?: string }) {
  const u = new URL(`/api/dashboard/progress/plan/compare`, window.location.origin)
  u.searchParams.set('projectId', String(params.projectId))
  if (params.wellNumber) u.searchParams.set('wellNumber', params.wellNumber)
  if (params.from) u.searchParams.set('from', params.from)
  if (params.to) u.searchParams.set('to', params.to)
  const res = await fetch(u.toString())
  if (!res.ok) return { rows: [], chart: { categories: [], values: [] } }
  return res.json()
}

export async function getProgressContract(params: { projectId: number; wellNumber?: string }) {
  const u = new URL(`/api/dashboard/progress/contract`, window.location.origin)
  u.searchParams.set('projectId', String(params.projectId))
  if (params.wellNumber) u.searchParams.set('wellNumber', params.wellNumber)
  const res = await fetch(u.toString())
  if (!res.ok) return null
  return res.json()
}