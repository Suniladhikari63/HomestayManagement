import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import useHomestayData from '../hooks/useHomestayData'
import BookingDetail from '../components/BookingDetail'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'followup', label: 'Follow-up' },
  { key: 'checkedin', label: 'Checked-in' },
  { key: 'completed', label: 'Completed' }
]

export default function Bookings() {
  const navigate = useNavigate()
  const { bookings, inventory, refresh } = useHomestayData()
  const { showToast } = useToast()
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  async function checkIn(id) {
    const { error } = await supabase.from('bookings').update({ status: 'checkedin' }).eq('id', id)
    if (error) { showToast('Failed: ' + error.message); return }
    showToast('Guest checked in!')
    refresh()
  }

  async function completeBooking(id) {
    const { error } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', id)
    if (error) { showToast('Failed: ' + error.message); return }
    showToast('Booking marked completed')
    setSelected(null)
    refresh()
  }

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter)
  const activeCount = bookings.filter((b) => b.status !== 'completed').length
  const recentToday = bookings.filter((b) => b.date === new Date().toISOString().slice(0, 10)).length

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <i className="fas fa-arrow-left text-gray-600"></i>
          </button>
          <h2 className="text-xl font-bold">Bookings</h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Active: <span className="font-bold text-teal-600">{activeCount}</span></p>
          <p className="text-xs text-gray-500">Recent: <span className="font-bold text-blue-600">{recentToday}</span></p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto scroll-hide pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap ${filter === f.key ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <i className="fas fa-calendar-times text-4xl text-gray-300 mb-3"></i>
          <p className="text-gray-400 text-sm">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm">
                    {b.guest_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{b.guest_name}</p>
                    <p className="text-xs text-gray-500">{b.contact_no}</p>
                  </div>
                </div>
                <span className={`status-badge status-${b.status}`}>
                  {b.status === 'followup' ? 'Follow-up' : b.status === 'checkedin' ? 'Checked-in' : 'Completed'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-xs font-semibold">{b.date}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">Package</p>
                  <p className="text-xs font-semibold truncate">{b.package_option}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">Price</p>
                  <p className="text-xs font-semibold">Rs. {b.total_price}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {b.status === 'followup' && (
                  <button
                    onClick={() => checkIn(b.id)}
                    className="flex-1 bg-teal-100 text-teal-700 py-2 rounded-lg text-xs font-semibold"
                  >
                    <i className="fas fa-check mr-1"></i> Check-in
                  </button>
                )}
                <button
                  onClick={() => setSelected(b)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-xs font-semibold"
                >
                  <i className="fas fa-eye mr-1"></i> View / Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <BookingDetail
          booking={selected}
          onClose={() => setSelected(null)}
          onComplete={completeBooking}
          inventory={inventory}
          refresh={refresh}
        />
      )}
    </div>
  )
}

