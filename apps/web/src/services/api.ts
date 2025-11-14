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