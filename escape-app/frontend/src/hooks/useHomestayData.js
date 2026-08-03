import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const RETRY_OPTS = { retries: 3, baseDelay: 700 }

export default function useHomestayData() {
  const { activeBusiness } = useAuth()
  const [bookings, setBookings] = useState([])
  const [sales, setSales] = useState([])
  const [inventory, setInventory] = useState([])
  const [expenses, setExpenses] = useState([])
  const [packages, setPackages] = useState([])
  const [addons, setAddons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [setupRequired, setSetupRequired] = useState(false)

  const businessId = activeBusiness?.id

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSetupRequired(false)

    // Fetch each table with a small retry/backoff so a single 408
    // timeout on the free tier doesn't break the whole dashboard.
    const fetchTable = async (table, orderBy = 'id', ascending = false) => {
      try {
        let query = supabase.from(table).select('*')
        if (businessId) query = query.eq('business_id', businessId)
        const { error, data } = await query.order(orderBy, { ascending })
        if (error) throw error
        return { data }
      } catch (err) {
        return { error: err }
      }
    }

    const fetchWithRetry = async (table, orderBy = 'id', ascending = false) => {
      for (let attempt = 0; attempt <= RETRY_OPTS.retries; attempt++) {
        const res = await fetchTable(table, orderBy, ascending)
        if (res && res.data) return res
        if (attempt === RETRY_OPTS.retries) return res
        await new Promise((r) => setTimeout(r, RETRY_OPTS.baseDelay * Math.pow(2, attempt)))
      }
    }

    const [bRes, sRes, iRes, eRes, pRes, aRes] = await Promise.all([
      fetchWithRetry('bookings', 'id', false),
      fetchWithRetry('sales', 'id', false),
      fetchWithRetry('inventory', 'name', true),
      fetchWithRetry('expenses', 'id', false),
      fetchWithRetry('packages', 'id', true),
      fetchWithRetry('add_ons', 'id', true)
    ])

    if (bRes.error) { setError(bRes.error.message || 'Could not load bookings'); setSetupRequired(true) } else setBookings(bRes.data || [])
    if (sRes.error) { setError(sRes.error.message || 'Could not load sales'); setSetupRequired(true) } else setSales(sRes.data || [])
    if (iRes.error) { setError(iRes.error.message || 'Could not load inventory'); setSetupRequired(true) } else setInventory(iRes.data || [])
    if (eRes.error) { setError(eRes.error.message || 'Could not load expenses'); setSetupRequired(true) } else setExpenses(eRes.data || [])
    if (pRes.error) setPackages([])
    else setPackages(pRes.data || [])
    if (aRes.error) setAddons([])
    else setAddons(aRes.data || [])

    setLoading(false)
  }, [businessId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { bookings, sales, inventory, expenses, packages, addons, loading, error, setupRequired, refresh }
}

