export type RecipePayload = any

const BASE = (process.env.NEXT_PUBLIC_SERVER_URL || '').replace(/\/$/, '')

export function apiUrl(path: string) {
  if (!path.startsWith('/')) path = `/${path}`
  return BASE ? `${BASE}${path}` : path
}

async function handleRes(res: Response) {
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error || json?.message || res.statusText)
  return json
}

import { getDeviceId } from './deviceId'

export async function listRecipes() {
  const res = await fetch(apiUrl('/api/recipes'))
  return handleRes(res)
}

export async function createRecipe(data: RecipePayload) {
  const deviceId = getDeviceId()
  const payload = deviceId ? { ...data, deviceId } : data
  const res = await fetch(apiUrl('/api/recipes'), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleRes(res)
}

export async function updateRecipe(id: string, data: RecipePayload) {
  const res = await fetch(apiUrl(`/api/recipes/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return handleRes(res)
}

export async function deleteRecipe(id: string) {
  const deviceId = getDeviceId()
  const res = await fetch(apiUrl(`/api/recipes/${id}`), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  })
  return handleRes(res)
}

export async function uploadImage(payload: { filename: string; data: string; contentType: string }) {
  const res = await fetch(apiUrl('/api/upload-image'), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleRes(res)
}

export default { listRecipes, createRecipe, updateRecipe, deleteRecipe, uploadImage, apiUrl }
