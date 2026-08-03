import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Modal from './Modal'
import { useState } from 'react'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, activeBusiness, signOut, canAccess } = useAuth()
  const { showToast } = useToast()
  const [moreOpen, setMoreOpen] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)

  const navItems = [
    { to: '/', label: 'Home', icon: 'fa-home' },
    { to: '/bookings', label: 'Bookings', icon: 'fa-calendar-alt', module: 'bookings' },
    { to: '/add-booking', label: 'Add', icon: 'fa-plus', center: true, module: 'bookings' },
    { to: '/package-details', label: 'Packages', icon: 'fa-tags', module: 'packages' },
    { to: '#more', label: 'More', icon: 'fa-th-large' }
  ].filter((item) => !item.module || canAccess(item.module, 'view'))

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/'
    if (to.startsWith('/')) return location.pathname.startsWith(to)
    return false
  }

  async function handleLogout() {
    await signOut()
    showToast('Signed out')
  }

  function handleNav(to) {
    if (to === '#more') { setMoreOpen(true); return }
    navigate(to)
  }

  return (
    <div className="min-h-screen text-gray-800">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/businesses')}
              className="flex items-center gap-2"
              title="Switch Business"
            >
              <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center">
                <i className="fas fa-mountain text-white text-sm"></i>
              </div>
              <span className="font-bold text-lg text-gray-800">
                {activeBusiness?.name || 'Escape Home'}
              </span>
              <i className="fas fa-chevron-down text-[10px] text-gray-400"></i>
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/profile')}
              className="text-xs text-gray-500 mr-1 hidden sm:block hover:text-teal-700"
              title="Profile & Escape Home Details"
            >
              {profile?.full_name || profile?.email?.split('@')[0] || 'Admin'}
            </button>
            <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600 p-2">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="safe-bottom">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-lg mx-auto flex justify-around items-center py-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNav(item.to)}
              className={`flex flex-col items-center gap-0.5 p-2 flex-1 ${item.center ? '' : ''} ${isActive(item.to) ? 'text-teal-700' : 'text-gray-400'}`}
            >
              {item.center ? (
                <div className="w-10 h-10 bg-teal-700 rounded-full flex items-center justify-center -mt-5 shadow-lg shadow-teal-900/30">
                  <i className={`fas ${item.icon} text-white`}></i>
                </div>
              ) : (
                <i className={`fas ${item.icon} text-lg`}></i>
              )}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="more-grid">
          <button onClick={() => { setMoreOpen(false); navigate('/profile') }} className="more-item">
            <div className="more-icon bg-teal-100 text-teal-700"><i className="fas fa-user"></i></div>
            <span className="text-xs font-semibold">Profile</span>
          </button>
          {canAccess('inventory', 'view') && (
            <button onClick={() => { setMoreOpen(false); setInventoryOpen(true) }} className="more-item">
              <div className="more-icon bg-amber-100 text-amber-700"><i className="fas fa-boxes"></i></div>
              <span className="text-xs font-semibold">Inventory</span>
            </button>
          )}
          {canAccess('expenses', 'view') && (
            <button onClick={() => { setMoreOpen(false); navigate('/expenses') }} className="more-item">
              <div className="more-icon bg-rose-100 text-rose-700"><i className="fas fa-wallet"></i></div>
              <span className="text-xs font-semibold">Expenses</span>
            </button>
          )}
          {canAccess('reports', 'view') && (
            <button onClick={() => { setMoreOpen(false); navigate('/reports') }} className="more-item">
              <div className="more-icon bg-purple-100 text-purple-700"><i className="fas fa-chart-pie"></i></div>
              <span className="text-xs font-semibold">Reports</span>
            </button>
          )}
          {canAccess('sales', 'view') && (
            <button onClick={() => { setMoreOpen(false); navigate('/sales') }} className="more-item">
              <div className="more-icon bg-teal-100 text-teal-700"><i className="fas fa-chart-line"></i></div>
              <span className="text-xs font-semibold">Sales</span>
            </button>
          )}
          {canAccess('staff', 'view') && (
            <button onClick={() => { setMoreOpen(false); navigate('/staff') }} className="more-item">
              <div className="more-icon bg-indigo-100 text-indigo-700"><i className="fas fa-users"></i></div>
              <span className="text-xs font-semibold">Staff</span>
            </button>
          )}
        </div>
      </Modal>

      {/* Confirmation of Inventory Add -> Purchase redirect */}
      <Modal open={inventoryOpen} onClose={() => setInventoryOpen(false)} title="Add Stock">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            To add stock, go to <b>Expenses → Purchase</b>. Purchases automatically update the inventory.
          </p>
          <button
            onClick={() => { setInventoryOpen(false); navigate('/expenses?tab=purchase') }}
            className="btn-primary w-full text-white font-semibold py-3 rounded-xl text-sm"
          >
            <i className="fas fa-arrow-right mr-1"></i> Go to Purchase Section
          </button>
        </div>
      </Modal>
    </div>
  )
}

