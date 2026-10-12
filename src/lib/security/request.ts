import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from './rateLimit'

/** The only reward values the product offers. Anything else is rejected. */
export const ALLOWED_PRIZES = [5, 10, 15] as const
export type Prize = (typeof ALLOWED_PRIZES)[number]
export const isPrize = (value: unknown): value is Prize =>
  typeof value === 'number' && (ALLOWED_PRIZES as readonly number[]).includes(value)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID_RE.test(value)

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/
export const isSlug = (value: unknown): value is string => typeof value === 'string' && SLUG_RE.test(value)

/**
 * Normalises a guest's first name: letters, numbers, spaces, apostrophes,
 * periods and hyphens only, max 60 characters. Returns null if nothing usable
 * remains (e.g. the input was only symbols or markup).
 */
export function cleanName(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const cleaned = input
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N} .'\-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
  return /\p{L}/u.test(cleaned) ? cleaned : null
}

/**
 * Converts user-entered phone numbers to E.164.
 * 10-digit and 1+10-digit numbers must be valid North American numbers.
 * Other 11–15 digit numbers are treated as international unless usOnly is set.
 */
export function normalizePhone(input: unknown, { usOnly = false } = {}): string | null {
  if (typeof input !== 'string' || input.length > 32) return null
  const digits = input.replace(/\D/g, '')
  const nanp = /^[2-9]\d{2}[2-9]\d{6}$/
  if (digits.length === 10) return nanp.test(digits) ? `+1${digits}` : null
  if (digits.length === 11 && digits.startsWith('1')) return nanp.test(digits.slice(1)) ? `+${digits}` : null
  if (usOnly) return null
  return digits.length >= 11 && digits.length <= 15 && !digits.startsWith('0') ? `+${digits}` : null
}

/** Client IP as reported by the hosting proxy (Vercel overwrites this header). */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

function requestHost(req: NextRequest): string {
  return (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim().toLowerCase()
}

/**
 * Rejects browser requests that were sent from a different website (CSRF-style
 * abuse of our POST endpoints). Requests without an Origin header (curl, server
 * to server) are left to the rate limiter.
 */
export function isCrossSite(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return false
  try {
    return new URL(origin).host.toLowerCase() !== requestHost(req)
  } catch {
    return true
  }
}

const FALLBACK_BASE_URL = 'https://micrositedemo.vercel.app'

function trustedHosts(): Set<string> {
  const hosts = new Set<string>(['micrositedemo.vercel.app'])
  const add = (value?: string) => {
    if (!value) return
    try {
      hosts.add(new URL(value.includes('://') ? value : `https://${value}`).host.toLowerCase())
    } catch {
      /* ignore malformed env values */
    }
  }
  add(process.env.NEXT_PUBLIC_BASE_URL)
  add(process.env.VERCEL_URL)
  add(process.env.VERCEL_BRANCH_URL)
  add(process.env.VERCEL_PROJECT_PRODUCTION_URL)
  for (const extra of (process.env.TRUSTED_HOSTS || '').split(',')) add(extra.trim())
  return hosts
}

/**
 * Public base URL used inside Wallet passes (QR / redeem links).
 * The request Host header is only honoured when it is a known deployment host,
 * so a forged Host header cannot point a pass at an attacker's site.
 */
export function getBaseUrl(req: NextRequest): string {
  const host = requestHost(req)
  const isLocal = host.startsWith('localhost') || host.startsWith('127.') || host.startsWith('192.168.')
  if (host && !isLocal && trustedHosts().has(host)) return `https://${host}`
  const configured = process.env.NEXT_PUBLIC_BASE_URL
  if (configured && /^https?:\/\/[^\s]+$/.test(configured)) return configured.replace(/\/+$/, '')
  return FALLBACK_BASE_URL
}

/** Reads a small JSON object body. Rejects oversized, malformed or non-object bodies. */
export async function readJsonBody(req: NextRequest, maxBytes = 4096): Promise<Record<string, unknown> | null> {
  const declared = Number(req.headers.get('content-length') || 0)
  if (declared > maxBytes) return null
  let text: string
  try {
    text = await req.text()
  } catch {
    return null
  }
  if (text.length > maxBytes) return null
  try {
    const parsed: unknown = JSON.parse(text)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

const NO_STORE = { 'Cache-Control': 'no-store' }

export function jsonError(message: string, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json({ error: message }, { status, headers: { ...NO_STORE, ...headers } })
}

export function jsonOk(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE })
}

/**
 * Applies a per-IP rate limit for a route. Returns a 429 response when the
 * caller is over the limit, otherwise null.
 */
export function limitByIp(req: NextRequest, route: string, limit: number, windowMs: number) {
  const result = rateLimit(`${route}:${getClientIp(req)}`, limit, windowMs)
  if (result.ok) return null
  return jsonError('Too many requests. Please wait a moment and try again.', 429, {
    'Retry-After': String(result.retryAfterSeconds),
  })
}
