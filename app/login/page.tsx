import Link from 'next/link'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-6 bg-card rounded-md shadow">
        <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Sign in to manage your recipes. This page is a server-rendered placeholder—
          implement client-side Firebase sign-in UI in a client component if needed.
        </p>

        <div className="flex flex-col gap-3">
          {/* Replace href with your client-side sign-in flow or OAuth endpoint */}
          <a
            href="#"
            role="button"
            className="inline-flex items-center justify-center w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Sign in with Google
          </a>

          <Link
            href="/"
            className="inline-flex items-center justify-center w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}
