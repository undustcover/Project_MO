const BASE_URL = '/api'

export async function getProjects() {
  const res = await fetch(`${BASE_URL}/projects`)
  if (!res.ok) return []
  return res.json()
}

export async function createProject(payload: any) {
  try {
    const res = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const text = await res.text()
    let body: any = null
    try { body = text ? JSON.parse(text) : null } catch {}
    return { ok: res.ok, status: res.status, body: body ?? text }
  } catch (e: any) {
    return { ok: false, status: 0, body: e?.message || 'Network error' }
  }
}

export async function getProject(id: number) {
  const res = await fetch(`${BASE_URL}/projects/` + id)
  if (!res.ok) return null
  return res.json()
}

export async function updateProject(id: number, payload: any) {
  const res = await fetch(`${BASE_URL}/projects/` + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return res.ok
}

export async function deleteProject(id: number) {
  const res = await fetch(`${BASE_URL}/projects/` + id, { method: 'DELETE' })
  return res.ok
}

export async function getProjectHomeConfig(projectId: number) {
  const res = await fetch(`${BASE_URL}/projects/${projectId}/home-config`)
  if (!res.ok) return null
  const text = await res.text()
  if (!text) return null
  try { return JSON.parse(text) } catch { return null }
}

export async function setProjectHomeConfig(projectId: number, config: any) {
  const res = await fetch(`${BASE_URL}/projects/${projectId}/home-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })
  const d = await res.json().catch(() => ({ ok: res.ok }))
  return !!(d?.ok)
}

export async function getProjectGoals(projectId: number) {
  const res = await fetch(`${BASE_URL}/projects/${projectId}/goals`)
  if (!res.ok) return []
  return res.json()
}

export async function setProjectGoals(projectId: number, goals: Array<{ dimension: string; indicatorKey: string; comparator?: string; targetValue: number; unit?: string; wellNumber?: string; taskName?: string }>) {
  const res = await fetch(`${BASE_URL}/projects/${projectId}/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goals)
  })
  return res.ok
}

export async function getProjectGoalsSummary(projectId: number) {
  const res = await fetch(`${BASE_URL}/projects/${projectId}/goals/summary`)
  if (!res.ok) return { total: 0, completed: 0, unsupported: 0 }
  return res.json()
}

export async function evaluateProjectGoals(projectId: number) {
  const res = await fetch(`${BASE_URL}/projects/${projectId}/goals/evaluate`)
  if (!res.ok) return { results: [], summary: { total: 0, completed: 0, unsupported: 0 } }
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

export async function getProgressSixRadar(params: { projectId: number; from?: string; to?: string; wellNumber?: string }) {
  const u = new URL(`/api/dashboard/progress/sixRadar`, window.location.origin)
  u.searchParams.set('projectId', String(params.projectId))
  if (params.from) u.searchParams.set('from', params.from)
  if (params.to) u.searchParams.set('to', params.to)
  if (params.wellNumber) u.searchParams.set('wellNumber', params.wellNumber)
  const res = await fetch(u.toString())
  if (!res.ok) return { ok: false }
  return res.json()
}

export async function getRevenueSixRadar(params: { projectId: number; from?: string; to?: string; wellNumber?: string; taskName?: string }) {
  const u = new URL(`/api/dashboard/revenue/sixRadar`, window.location.origin)
  u.searchParams.set('projectId', String(params.projectId))
  if (params.from) u.searchParams.set('from', params.from)
  if (params.to) u.searchParams.set('to', params.to)
  if (params.wellNumber) u.searchParams.set('wellNumber', params.wellNumber)
  if (params.taskName) u.searchParams.set('taskName', params.taskName)
  const res = await fetch(u.toString())
  if (!res.ok) return { ok: false }
  return res.json()
}

export async function getTrackingSummary(projectId: number) {
  const u = new URL(`/api/dashboard/tracking/summary`, window.location.origin)
  u.searchParams.set('projectId', String(projectId))
  const res = await fetch(u.toString())
  if (!res.ok) return null
  return res.json()
}

export async function getTrackingTable(projectId: number) {
  const u = new URL(`/api/dashboard/tracking/table`, window.location.origin)
  u.searchParams.set('projectId', String(projectId))
  const res = await fetch(u.toString())
  if (!res.ok) return { rows: [] }
  return res.json()
}

export async function setTrackingFocus(projectId: number, payload: { contractNo?: string; projectName?: string }) {
  const u = new URL(`/api/dashboard/tracking/focus/set`, window.location.origin)
  u.searchParams.set('projectId', String(projectId))
  if (payload.contractNo) u.searchParams.set('contractNo', payload.contractNo)
  if (payload.projectName) u.searchParams.set('projectName', payload.projectName)
  const res = await fetch(u.toString(), { method: 'POST' })
  const d = await res.json().catch(() => ({ ok: res.ok }))
  return !!(d?.ok)
}

export async function getTrackingFocusList(projectId: number) {
  const u = new URL(`/api/dashboard/tracking/focus/list`, window.location.origin)
  u.searchParams.set('projectId', String(projectId))
  const res = await fetch(u.toString())
  if (!res.ok) return { rows: [] }
  return res.json()
}

export async function deleteTrackingFocus(projectId: number, payload: { contractNo?: string; projectName?: string }) {
  const u = new URL(`/api/dashboard/tracking/focus`, window.location.origin)
  u.searchParams.set('projectId', String(projectId))
  if (payload.contractNo) u.searchParams.set('contractNo', payload.contractNo)
  if (payload.projectName) u.searchParams.set('projectName', payload.projectName)
  const res = await fetch(u.toString(), { method: 'DELETE' })
  const d = await res.json().catch(() => ({ ok: res.ok }))
  return !!(d?.ok)
}