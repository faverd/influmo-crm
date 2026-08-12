import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  // Public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/webhook') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/api/branding' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/icon-') ||
    pathname === '/apple-icon.png'
  ) {
    return res
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Guard the auth check with a timeout. If Supabase is slow/paused, do NOT
  // let the request hang until the platform kills the middleware with a
  // MIDDLEWARE_INVOCATION_TIMEOUT (504) — fail fast to /login instead so the
  // site degrades gracefully during a DB blip instead of going fully down.
  const TIMEOUT = Symbol('timeout')
  let user: unknown = null
  try {
    const result = await Promise.race([
      supabase.auth.getUser().then(r => r.data.user).catch(() => null),
      new Promise(resolve => setTimeout(() => resolve(TIMEOUT), 4000)),
    ])
    if (result === TIMEOUT) return NextResponse.redirect(new URL('/login', req.url))
    user = result
  } catch {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
