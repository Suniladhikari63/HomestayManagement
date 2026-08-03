import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AddBooking from './pages/AddBooking'
import Bookings from './pages/Bookings'
import Sales from './pages/Sales'
import Inventory from './pages/Inventory'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import PackageDetails from './pages/PackageDetails'
import Profile from './pages/Profile'
import BusinessSetup from './pages/BusinessSetup'
import BusinessList from './pages/BusinessList'
import Staff from './pages/Staff'
import Layout from './components/Layout'
import { ToastProvider } from './context/ToastContext'
import { applyHomestayDetails } from './config'

export default function App() {
  const { user, profile, businesses, activeBusiness, loading, configured, accessBlocked, canAccess } = useAuth()

  // After login, pull the latest profile from Supabase
  // (cross-device sync) and apply details to the live HOMESTAY object.
  useEffect(() => {
    if (!user) return
    let active = true
    supabase
      .from('profile')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (active && !error && data) {
          applyHomestayDetails(data)
          if (data.active_business_id) {
            supabase
              .from('businesses')
              .select('*')
              .eq('id', data.active_business_id)
              .single()
              .then(({ data: biz }) => {
                if (biz) applyHomestayDetails(biz)
              })
              .catch(() => {})
          }
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-teal-900 text-white">
        <div className="w-16 h-16 bg-white/10 rounded-2xl mb-4 flex items-center justify-center">
          <i className="fas fa-mountain text-2xl"></i>
        </div>
        <div className="spinner border-white/30 border-t-white"></div>
        <p className="text-sm text-teal-200 mt-3">Loading…</p>
      </div>
    )
  }

  if (accessBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
        <div className="card p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl mx-auto flex items-center justify-center">
            <i className="fas fa-user-lock text-2xl text-amber-600"></i>
          </div>
          <h1 className="text-xl font-bold">Access revoked</h1>
          <p className="text-sm text-gray-500">Your staff access has been suspended or no longer applies to this business. Please contact the owner.</p>
        </div>
      </div>
    )
  }

  if (!configured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
        <div className="card p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl mx-auto flex items-center justify-center">
            <i className="fas fa-exclamation-triangle text-2xl text-amber-600"></i>
          </div>
          <h1 className="text-xl font-bold">Supabase Not Configured</h1>
          <p className="text-sm text-gray-500">
            Create a <code className="bg-gray-100 px-1.5 py-0.5 rounded">.env</code> file in{' '}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded">escape-app/</code> with your Supabase URL and anon key.
            See <code className="bg-gray-100 px-1.5 py-0.5 rounded">.env.example</code>.
          </p>
        </div>
      </div>
    )
  }

  // Not logged in → Login
  if (!user) {
    return (
      <ToastProvider>
        <Login />
      </ToastProvider>
    )
  }

  // Logged in but profile not yet complete → BusinessSetup (basic info)
  const setupComplete = profile?.setup_complete === true
  if (!setupComplete) {
    return (
      <ToastProvider>
        <BusinessSetup />
      </ToastProvider>
    )
  }

  // Profile complete but no active business → BusinessList
  if (!activeBusiness && businesses.length === 0) {
    return (
      <ToastProvider>
        <BusinessList />
      </ToastProvider>
    )
  }

  // Fully onboarded → the main app
  return (
    <ToastProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add-booking" element={canAccess('bookings', 'view') ? <AddBooking /> : <div className="p-6 text-center text-sm text-gray-500">Access denied</div>} />
          <Route path="/bookings" element={canAccess('bookings', 'view') ? <Bookings /> : <div className="p-6 text-center text-sm text-gray-500">Access denied</div>} />
          <Route path="/sales" element={canAccess('sales', 'view') ? <Sales /> : <div className="p-6 text-center text-sm text-gray-500">Access denied</div>} />
          <Route path="/inventory" element={canAccess('inventory', 'view') ? <Inventory /> : <div className="p-6 text-center text-sm text-gray-500">Access denied</div>} />
          <Route path="/expenses" element={canAccess('expenses', 'view') ? <Expenses /> : <div className="p-6 text-center text-sm text-gray-500">Access denied</div>} />
          <Route path="/reports" element={canAccess('reports', 'view') ? <Reports /> : <div className="p-6 text-center text-sm text-gray-500">Access denied</div>} />
          <Route path="/package-details" element={canAccess('packages', 'view') ? <PackageDetails /> : <div className="p-6 text-center text-sm text-gray-500">Access denied</div>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/staff" element={canAccess('staff', 'view') ? <Staff /> : <div className="p-6 text-center text-sm text-gray-500">Access denied</div>} />
          <Route path="/businesses" element={<BusinessList />} />
        </Routes>
      </Layout>
    </ToastProvider>
  )
}

