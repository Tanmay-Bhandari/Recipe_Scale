import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_ALLOWED = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)

function isOriginAllowed(origin: string | null) {
	if (!origin) return false
	if (DEFAULT_ALLOWED.length === 0) return true // allow all when not configured
	return DEFAULT_ALLOWED.includes(origin)
}

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl

	// Only apply CORS handling for API routes
	if (!pathname.startsWith('/api/')) return NextResponse.next()

	const origin = request.headers.get('origin')

	// Handle preflight
	if (request.method === 'OPTIONS') {
		const res = new NextResponse(null, { status: 204 })
		if (isOriginAllowed(origin)) {
			res.headers.set('Access-Control-Allow-Origin', origin as string)
		} else if (!origin) {
			res.headers.set('Access-Control-Allow-Origin', '*')
		}
		res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
		res.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization')
		res.headers.set('Access-Control-Allow-Credentials', 'true')
		return res
	}

	// For actual requests, continue but attach CORS headers on the response
	const response = NextResponse.next()
	if (isOriginAllowed(origin)) {
		response.headers.set('Access-Control-Allow-Origin', origin as string)
	} else if (!origin) {
		response.headers.set('Access-Control-Allow-Origin', '*')
	}
	response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
	response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization')
	response.headers.set('Access-Control-Allow-Credentials', 'true')
	return response
}

export const config = {
	matcher: '/:path*',
}
