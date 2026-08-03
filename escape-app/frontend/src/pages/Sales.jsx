import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useHomestayData from '../hooks/useHomestayData'

const FILTERS = [
  { key: 'all', label: 'All Sales' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' }
]

export default function Sales() {
  const navigate = useNavigate()
  const { sales, loading } = useHomestayData()
  const [filter, setFilter] = useState('all')

  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  let filtered = sales
  if (filter === 'today') filtered = sales.filter((s) => s.date === today)
  if (filter === 'week') filtered = sales.filter((s) => new Date(s.date) >= weekAgo)

  const total = filtered.reduce((a, s) => a + Number(s.amount || 0), 0)
  const itemCount = filtered.reduce((a, s) => a + (s.items ? s.items.length : 0), 0)

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <i className="fas fa-arrow-left text-gray-600"></i>
        </button>
        <h2 className="text-xl font-bold">Sales</h2>
      </div>

      <div className="card p-4 mb-4 bg-gradient-to-r from-green-50 to-teal-50">
        <p className="text-xs text-gray-500 mb-1">Total Sales Revenue</p>
        <p className="text-3xl font-bold text-gray-800">Rs. {total.toLocaleString()}</p>
        <div className="flex gap-4 mt-2">
          <p className="text-xs text-gray-400">{filtered.length} transactions</p>
          <p className="text-xs text-gray-400">{itemCount} items sold</p>
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

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner border-teal-700 border-t-transparent"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <i className="fas fa-chart-line text-4xl text-gray-300 mb-3"></i>
          <p className="text-gray-400 text-sm">No sales yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm">
                    {(s.guest_name || 'S').charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{s.guest_name || 'Guest'}</p>
                    <p className="text-xs text-gray-500">{s.date}</p>
                  </div>
                </div>
                <span className="font-bold text-green-600">Rs. {s.amount}</span>
              </div>
              {s.items && s.items.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-2 mt-2">
                  {s.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between text-xs py-1">
                      <span>{i.name} x{i.qty}</span>
                      <span>Rs. {i.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

