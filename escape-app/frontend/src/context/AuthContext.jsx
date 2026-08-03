import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { applyHomestayDetails } from '../config'
import { normalizeRole, can } from '../lib/permissions'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [businesses, setBusinesses] = useState([])
  const [activeBusiness, setActiveBusiness] = useState(null)
  const [activeRole, setActiveRole] = useState('owner')
  const [accessBlocked, setAccessBlocked] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        fetchBusinesses(session.user.id)
      } else {
        setAccessBlocked(false)
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        fetchBusinesses(session.user.id)
      } else {
        setProfile(null)
        setBusinesses([])
        setActiveBusiness(null)
        setAccessBlocked(false)
        setActiveRole('owner')
      }
      setLoading(false)
    })

    return () => sub?.subscription?.unsubscribe()
  }, [])

  async function fetchProfile(id) {
    try {
      const { data } = await supabase.from('profile').select('*').eq('user_id', id).maybeSingle()
      setProfile(data || null)
      if (data) applyHomestayDetails(data)
    } catch (err) {
      setProfile(null)
    }
  }

  async function fetchBusinesses(ownerId) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', ownerId)
        .order('id', { ascending: true })
      if (error) throw error
      const list = data || []
      setBusinesses(list)

      const activeId = profile?.active_business_id
      const active = list.find((b) => b.id === activeId) || list[0] || null
      setActiveBusiness(active)
      if (active) {
        applyHomestayDetails(active)
        setActiveRole('owner')
        setAccessBlocked(false)
      }
    } catch (err) {
      setBusinesses([])
      setActiveBusiness(null)
      setActiveRole('owner')
      setAccessBlocked(false)
    }
  }

async function signIn(emailOrUsername, password) {
    // If input contains @, treat as email; otherwise look up the username
    let email = emailOrUsername
    if (!emailOrUsername.includes('@')) {
      const { data: profile } = await supabase
        .from('profile')
        .select('email')
        .eq('username', emailOrUsername.trim().toLowerCase())
        .maybeSingle()
      if (!profile?.email) throw new Error('User not found with that username')
      email = profile.email
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signInStaff(username, password) {
    if (!username?.trim() || !password?.trim()) throw new Error('Enter your username and password')

    const normalizedUsername = username.trim().toLowerCase()
    const { data: staffRow, error } = await supabase
      .from('staff')
      .select('*')
      .eq('username', normalizedUsername)
      .maybeSingle()

    if (error) throw error
    if (!staffRow || staffRow.password !== password || staffRow.status === 'suspended') {
      throw new Error('Invalid username or password')
    }

    const syntheticUser = {
      id: `staff-${staffRow.id}`,
      email: `${normalizedUsername}@staff.internal`
    }

    setUser(syntheticUser)
    setProfile({
      full_name: staffRow.name,
      username: staffRow.username,
      email: syntheticUser.email,
      role: staffRow.role,
      setup_complete: true
    })
    setActiveRole(normalizeRole(staffRow.role))
    setAccessBlocked(false)

    if (staffRow.business_id) {
      const { data: business } = await supabase.from('businesses').select('*').eq('id', staffRow.business_id).maybeSingle()
      setActiveBusiness(business || null)
      if (business) applyHomestayDetails(business)
    }

    return { user: syntheticUser, role: staffRow.role }
  }

  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) throw error
    return data
  }

  async function signInWithFacebook() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) throw error
    return data
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  async function updateProfile(payload) {
    let uid = user?.id
    if (!uid) {
      const { data: { user: u } } = await supabase.auth.getUser()
      uid = u?.id
    }
    if (!uid) throw new Error('Not signed in')

    const { data: existing } = await supabase
      .from('profile')
      .select('id')
      .eq('user_id', uid)
      .maybeSingle()

    let result
    if (existing) {
      result = await supabase.from('profile').update({ ...payload, user_id: uid }).eq('id', existing.id)
    } else {
      result = await supabase.from('profile').insert({ ...payload, user_id: uid })
    }
    if (result.error) throw result.error
    await fetchProfile(uid)
    return result.data
  }

  // ----- Business CRUD -----
  async function refreshBusinesses() {
    if (!user?.id) return
    await fetchBusinesses(user.id)
  }

  async function addBusiness(data) {
    const payload = {
      owner_id: user?.id,
      name: data.name?.trim(),
      business_phone: data.business_phone?.trim() || '',
      whatsapp: data.whatsapp?.trim() || '',
      business_email: data.business_email?.trim() || '',
      address: data.address?.trim() || '',
      maps_url: data.maps_url?.trim() || ''
    }
    if (!payload.name) throw new Error('Business name is required')
    const { data: row, error } = await supabase.from('businesses').insert(payload).select().single()
    if (error) throw error
    await refreshBusinesses()
    return row
  }

  async function updateBusiness(id, data) {
    const payload = {
      name: data.name?.trim(),
      business_phone: data.business_phone?.trim() || '',
      whatsapp: data.whatsapp?.trim() || '',
      business_email: data.business_email?.trim() || '',
      address: data.address?.trim() || '',
      maps_url: data.maps_url?.trim() || ''
    }
    if (!payload.name) throw new Error('Business name is required')
    const { error } = await supabase.from('businesses').update(payload).eq('id', id)
    if (error) throw error
    await refreshBusinesses()
  }

  async function deleteBusiness(id) {
    const { error } = await supabase.from('businesses').delete().eq('id', id)
    if (error) throw error
    await refreshBusinesses()
  }

  async function selectBusiness(id) {
    const business = businesses.find((b) => b.id === id)
    if (!business) throw new Error('Business not found')
    await updateProfile({ active_business_id: id })
    setActiveBusiness(business)
    applyHomestayDetails(business)
    return business
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setBusinesses([])
    setActiveBusiness(null)
    setAccessBlocked(false)
    setActiveRole('owner')
  }

  return (
    <AuthContext.Provider
value={{
        user, profile, businesses, activeBusiness, loading, accessBlocked, role: activeRole,
        signIn, signInStaff, signInWithGoogle, signInWithFacebook, updatePassword, updateProfile,
        refreshBusinesses, addBusiness, updateBusiness, deleteBusiness, selectBusiness,
        signOut, configured: isSupabaseConfigured,
        canAccess: (module, level = 'view') => can(activeRole, module, level)
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

