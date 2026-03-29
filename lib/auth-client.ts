export type AuthRole = "admin" | "user"

export type AuthUser = {
  id: string
  name: string
  email: string
  password: string
  role: AuthRole
  requestedRole?: AuthRole
  approvalStatus?: "none" | "pending" | "approved" | "rejected"
}

export type AuthSession = {
  id: string
  name: string
  email: string
  role: AuthRole
}

export type AdminApprovalRequest = {
  id: string
  name: string
  email: string
  requestedRole: "admin"
  approvalStatus: "pending"
}

const USERS_KEY = "menu-auth-users-v1"
const SESSION_KEY = "menu-auth-session-v1"

function seedAdminIfNeeded(users: AuthUser[]): AuthUser[] {
  if (users.some((u) => u.email.toLowerCase() === "admin@menu.local")) return users
  return [
    ...users,
    {
      id: `u-${Date.now()}`,
      name: "Super Admin",
      email: "admin@menu.local",
      password: "admin123",
      role: "admin",
      requestedRole: "admin",
      approvalStatus: "approved",
    },
  ]
}

export function loadUsers(): AuthUser[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(USERS_KEY)
    const parsed = raw ? (JSON.parse(raw) as AuthUser[]) : []
    const seeded = seedAdminIfNeeded(Array.isArray(parsed) ? parsed : [])
    localStorage.setItem(USERS_KEY, JSON.stringify(seeded))
    return seeded
  } catch {
    const seeded = seedAdminIfNeeded([])
    localStorage.setItem(USERS_KEY, JSON.stringify(seeded))
    return seeded
  }
}

export function signupUser(input: {
  name: string
  email: string
  password: string
  role: AuthRole
}): { ok: boolean; message: string } {
  const users = loadUsers()
  const email = input.email.trim().toLowerCase()
  if (!email) return { ok: false, message: "Email લખવું જરૂરી છે" }
  if (users.some((u) => u.email.toLowerCase() === email)) {
    return { ok: false, message: "આ Email પહેલાથી નોંધાયેલું છે" }
  }
  const next: AuthUser = {
    id: `u-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: input.name.trim() || "વપરાશકર્તા",
    email,
    password: input.password,
    role: input.role === "admin" ? "user" : "user",
    requestedRole: input.role,
    approvalStatus: input.role === "admin" ? "pending" : "approved",
  }
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, next]))
  if (input.role === "admin") {
    return { ok: true, message: "સાઇન અપ સફળ. એડમિનની મંજૂરી બાકી છે." }
  }
  return { ok: true, message: "સાઇન અપ સફળ" }
}

export function loginUser(input: {
  email: string
  password: string
}): { ok: boolean; message: string; session?: AuthSession } {
  const users = loadUsers()
  const email = input.email.trim().toLowerCase()
  const found = users.find((u) => u.email.toLowerCase() === email)
  if (!found || found.password !== input.password) {
    return { ok: false, message: "ખોટો Email અથવા Password" }
  }
  if (found.requestedRole === "admin" && found.approvalStatus === "pending") {
    // Can still login as user-only while waiting for approval.
  }
  const session: AuthSession = {
    id: found.id,
    name: found.name,
    email: found.email,
    role: found.role,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return { ok: true, message: "", session }
}

export function listPendingAdminRequests(): AdminApprovalRequest[] {
  return loadUsers()
    .filter((u) => u.requestedRole === "admin" && u.approvalStatus === "pending")
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      requestedRole: "admin",
      approvalStatus: "pending",
    }))
}

export function approveAdminRequest(userId: string): { ok: boolean; message: string } {
  const users = loadUsers()
  const idx = users.findIndex((u) => u.id === userId)
  if (idx < 0) return { ok: false, message: "વપરાશકર્તા મળ્યો નથી" }
  const u = users[idx]
  users[idx] = {
    ...u,
    role: "admin",
    requestedRole: "admin",
    approvalStatus: "approved",
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  return { ok: true, message: "એડમિન રોલ મંજૂર કર્યો" }
}

export function rejectAdminRequest(userId: string): { ok: boolean; message: string } {
  const users = loadUsers()
  const idx = users.findIndex((u) => u.id === userId)
  if (idx < 0) return { ok: false, message: "વપરાશકર્તા મળ્યો નથી" }
  const u = users[idx]
  users[idx] = {
    ...u,
    role: "user",
    requestedRole: "admin",
    approvalStatus: "rejected",
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  return { ok: true, message: "એડમિન વિનંતી નકારી કાઢી" }
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.email) return null
    return parsed
  } catch {
    return null
  }
}

export function logoutUser(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(SESSION_KEY)
}

