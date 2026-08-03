import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useHomestayData from '../hooks/useHomestayData'

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { bookings, sales, expenses, loading } = useHomestayData()

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-10 flex justify-center">
        <div className="spinner border-teal-700 border-t-transparent"></div>
      </div>
    )
  }

  const active = bookings.filter((b) => b.status !== 'completed').length
  const followup = bookings.filter((b) => b.status === 'followup').length
  const today = new Date().toISOString().slice(0, 10)
  const todaySales = sales.filter((s) => s.date === today).reduce((a, s) => a + Number(s.amount || 0), 0)
  const totalExp = expenses.reduce((a, e) => a + Number(e.total || e.amount || 0), 0)

  const recent = [...bookings].sort((a, b) => b.id - a.id).slice(0, 3)

  const quickActions = [
    { to: '/add-booking', label: 'New', icon: 'fa-plus', bg: 'bg-teal-100 text-teal-700' },
    { to: '/bookings', label: 'Bookings', icon: 'fa-list', bg: 'bg-blue-100 text-blue-700' },
    { to: '/sales', label: 'Sales', icon: 'fa-chart-line', bg: 'bg-green-100 text-green-700' }
  ]

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">Welcome back,</p>
          <h2 className="text-xl font-bold">{profile?.full_name || 'Admin'}</h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 bg-gradient-to-br from-teal-50 to-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-teal-600">Active Bookings</span>
            <i className="fas fa-calendar-check text-teal-400"></i>
          </div>
          <p className="text-2xl font-bold text-gray-800">{active}</p>
        </div>
        <div className="card p-4 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-blue-600">Today Sales</span>
            <i className="fas fa-dollar-sign text-blue-400"></i>
          </div>
          <p className="text-2xl font-bold text-gray-800">Rs. {todaySales.toLocaleString()}</p>
        </div>
        <div className="card p-4 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-600">Follow-ups</span>
            <i className="fas fa-phone text-amber-400"></i>
          </div>
          <p className="text-2xl font-bold text-gray-800">{followup}</p>
        </div>
        <div className="card p-4 bg-gradient-to-br from-rose-50 to-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-rose-600">Expenses</span>
            <i className="fas fa-wallet text-rose-400"></i>
          </div>
          <p className="text-2xl font-bold text-gray-800">Rs. {totalExp.toLocaleString()}</p>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((a) => (
            <button
              key={a.to}
              onClick={() => navigate(a.to)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 transition"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${a.bg}`}>
                <i className={`fas ${a.icon}`}></i>
              </div>
              <span className="text-xs font-medium">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Recent Bookings</h3>
          <button onClick={() => navigate('/bookings')} className="text-xs text-teal-600 font-medium">View All</button>
        </div>
        {recent.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">No bookings yet</p>
        ) : (
          <div className="space-y-2">
            {recent.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm">
                    {b.guest_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{b.guest_name}</p>
                    <p className="text-xs text-gray-500">{b.date} · {b.stay_type}</p>
                  </div>
                </div>
                <span className={`status-badge status-${b.status}`}>{b.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

