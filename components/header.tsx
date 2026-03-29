"use client"

import { ChefHat, CakeSlice, Package, CalendarDays, Bell } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { AdminApprovalRequest, AuthSession } from "@/lib/auth-client"

interface HeaderProps {
  activeTab: "todayMenu" | "recipes" | "packet" | "daily"
  onTabChange: (tab: "todayMenu" | "recipes" | "packet" | "daily") => void
  isAdmin: boolean
  session: AuthSession | null
  onAuthClick: () => void
  onLogoutClick: () => void
  pendingAdminRequests: AdminApprovalRequest[]
  onApproveAdminRequest: (userId: string) => void
  onRejectAdminRequest: (userId: string) => void
}

export function Header({
  activeTab,
  onTabChange,
  isAdmin,
  session,
  onAuthClick,
  onLogoutClick,
  pendingAdminRequests,
  onApproveAdminRequest,
  onRejectAdminRequest,
}: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false)
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-serif text-xl tracking-tight text-foreground md:text-2xl">
                RecipeScale
              </h1>
              <p className="hidden text-xs text-muted-foreground md:block">
                તમારી રેસીપીને ચોકસાઈથી સ્કેલ કરો
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session ? (
              <>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {session.email} ({session.role})
                </span>
                {isAdmin ? (
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNotifOpen((v) => !v)}
                      className="gap-2"
                    >
                      <Bell className="h-4 w-4" />
                      {pendingAdminRequests.length > 0 ? `(${pendingAdminRequests.length})` : ""}
                    </Button>
                    {notifOpen ? (
                      <div className="absolute right-0 top-11 z-50 w-80 rounded-lg border border-border bg-card p-3 shadow-xl">
                        <p className="mb-2 text-sm font-semibold text-foreground">
                          એડમિન રોલ વિનંતીઓ
                        </p>
                        {pendingAdminRequests.length === 0 ? (
                          <p className="text-xs text-muted-foreground">કોઈ બાકી વિનંતી નથી.</p>
                        ) : (
                          <div className="space-y-2">
                            {pendingAdminRequests.map((req) => (
                              <div
                                key={req.id}
                                className="rounded-md border border-border bg-background p-2"
                              >
                                <p className="text-sm font-medium text-foreground">{req.name}</p>
                                <p className="text-xs text-muted-foreground">{req.email}</p>
                                <div className="mt-2 flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onRejectAdminRequest(req.id)}
                                  >
                                    નકારો
                                  </Button>
                                  <Button size="sm" onClick={() => onApproveAdminRequest(req.id)}>
                                    મંજૂરી આપો
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <Button variant="outline" size="sm" onClick={onLogoutClick}>
                  લોગઆઉટ
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={onAuthClick}>
                લોગીન / સાઇન અપ
              </Button>
            )}
          </div>
        </div>

        {/* Nav tabs */}
        <div className="overflow-x-auto pb-px [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <nav className="-mb-px flex min-w-max gap-1" aria-label="Main navigation">
          {isAdmin ? (
            <>
              <button
                suppressHydrationWarning
                onClick={() => onTabChange("todayMenu")}
                className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "todayMenu"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <CalendarDays className="h-4 w-4" />
                આજનું દૈનિક મેનુ
              </button>
              <button
                suppressHydrationWarning
                onClick={() => onTabChange("daily")}
                className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "daily"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <CalendarDays className="h-4 w-4" />
                દૈનિક મેનુ
              </button>
              <button
                suppressHydrationWarning
                onClick={() => onTabChange("recipes")}
                className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "recipes"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <CakeSlice className="h-4 w-4" />
                વાનગી લિસ્ટ
              </button>
              <button
                suppressHydrationWarning
                onClick={() => onTabChange("packet")}
                className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "packet"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <Package className="h-4 w-4" />
                ફૂડ પેકેટ કેલ્ક્યુલેટર
              </button>
            </>
          ) : (
            <button
              suppressHydrationWarning
              onClick={() => onTabChange("todayMenu")}
              className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "todayMenu"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              આજનું દૈનિક મેનુ
            </button>
          )}
          </nav>
        </div>
      </div>
    </header>
  )
}
