export type RecipePayload = any

async function handleRes(res: Response) {
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error || json?.message || res.statusText)
  return json
}

export async function listRecipes() {
  const res = await fetch(`/api/recipes`)
  return handleRes(res)
}

import { getDeviceId } from './deviceId'

export async function createRecipe(data: RecipePayload) {
  const deviceId = getDeviceId()
  const payload = deviceId ? { ...data, deviceId } : data
  const res = await fetch(`/api/recipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleRes(res)
}

export async function updateRecipe(id: string, data: RecipePayload) {
  const res = await fetch(`/api/recipes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return handleRes(res)
}

export async function deleteRecipe(id: string) {
  const deviceId = getDeviceId()
  const res = await fetch(`/api/recipes/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  })
  return handleRes(res)
}

export async function uploadImage(payload: { filename: string; data: string; contentType: string }) {
  const res = await fetch(`/api/upload-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return handleRes(res)
}

export default { listRecipes, createRecipe, updateRecipe, deleteRecipe, uploadImage }
