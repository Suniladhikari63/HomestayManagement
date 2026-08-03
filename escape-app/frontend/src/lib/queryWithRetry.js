import { supabase } from './supabase'

// Small helper that re-runs a Supabase query (up to `retries` times)
// when it fails with transient network/timeout errors (status 408,
// 429, 502, 503, 504, or a TypeError from the network).
// Free-tier Supabase projects occasionally drop connections, so a
// short backoff makes the app feel much more robust.
export function shouldRetry(status) {
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504 || status === 0
}

export async function queryWithRetry(fn, { retries = 3, baseDelay = 800 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fn()
      if (res && res.error && shouldRetry(res.error.status)) {
        throw res.error
      }
      return res
    } catch (err) {
      const status = err && err.status
      const isTransient = shouldRetry(status) || err instanceof TypeError
      if (!isTransient || attempt === retries) {
        throw err
      }
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw new Error('Query failed after retries')
}

export async function getAllWithRetry(table, options = {}) {
  return queryWithRetry(() => supabase.from(table).select('*').order(options.orderBy || 'id', { ascending: options.ascending ?? false }))
}


