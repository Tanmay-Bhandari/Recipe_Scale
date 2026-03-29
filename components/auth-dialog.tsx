"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginUser, signupUser, type AuthRole, type AuthSession } from "@/lib/auth-client"

interface AuthDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: (session: AuthSession) => void
}

export function AuthDialog({ open, onClose, onSuccess }: AuthDialogProps) {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<AuthRole>("user")
  const [message, setMessage] = useState("")

  if (!open) return null

  function resetMessage() {
    setMessage("")
  }

  function onLogin() {
    const res = loginUser({ email, password })
    setMessage(res.message)
    if (res.ok && res.session) {
      onSuccess(res.session)
      onClose()
    }
  }

  function onSignup() {
    const res = signupUser({ name, email, password, role })
    setMessage(res.message)
    if (!res.ok) return
    const loginRes = loginUser({ email, password })
    if (loginRes.ok && loginRes.session) {
      onSuccess(loginRes.session)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-xl text-foreground">
            {mode === "login" ? "લોગિન" : "સાઇન અપ"}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            બંધ કરો
          </Button>
        </div>

        <div className="mb-4 flex gap-2">
          <Button
            type="button"
            variant={mode === "login" ? "default" : "outline"}
            onClick={() => {
              setMode("login")
              resetMessage()
            }}
            className="flex-1"
          >
            લોગિન
          </Button>
          <Button
            type="button"
            variant={mode === "signup" ? "default" : "outline"}
            onClick={() => {
              setMode("signup")
              resetMessage()
            }}
            className="flex-1"
          >
            સાઇન અપ
          </Button>
        </div>

        <div className="space-y-3">
          {mode === "signup" ? (
            <div>
              <Label className="mb-1.5 block text-sm">નામ</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="તમારું નામ" />
            </div>
          ) : null}

          <div>
            <Label className="mb-1.5 block text-sm">Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@menu.local"
              type="email"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Password</Label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
            />
          </div>

          {mode === "signup" ? (
            <div>
              <Label className="mb-1.5 block text-sm">રોલ</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AuthRole)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="user">વપરાશકર્તા (user)</option>
                <option value="admin">એડમિન (admin)</option>
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                જો તમે એડમિન પસંદ કરશો, તો સંપૂર્ણ એક્સેસ માટે પહેલાથી રહેલા એડમિનની મંજૂરી જરૂરી છે.
              </p>
            </div>
          ) : null}

          {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}

          <Button type="button" className="w-full" onClick={mode === "login" ? onLogin : onSignup}>
            {mode === "login" ? "લોગિન" : "એકાઉન્ટ બનાવો"}
          </Button>

          {/* <p className="text-[11px] text-muted-foreground">
            Default admin: `admin@menu.local` / `admin123`
          </p> */}
        </div>
      </div>
    </div>
  )
}

