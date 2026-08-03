import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import useHomestayData from '../hooks/useHomestayData'
import Modal from '../components/Modal'

export default function Inventory() {
  const navigate = useNavigate()
  const { inventory, loading, refresh } = useHomestayData()
  const { showToast } = useToast()
  const [reduceOpen, setReduceOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [itemId, setItemId] = useState('')
  const [qty, setQty] = useState(1)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  function openReduce() {
    setItemId(inventory[0]?.id || '')
    setQty(1)
    setReason('')
    setReduceOpen(true)
  }

  async function handleReduce(e) {
    e.preventDefault()
    if (!itemId) { showToast('No inventory items'); return }
    setSaving(true)
    const item = inventory.find((i) => i.id === parseInt(itemId))
    if (!item) { setSaving(false); showToast('Item not found'); return }
    const newQty = Number(item.quantity) - Number(qty)
    if (newQty < 0) { setSaving(false); showToast('Quantity cannot go below zero'); return }
    const history = [...(item.history || []), { type: 'reduce', qty: Number(qty), reason, date: new Date().toISOString().slice(0, 10) }]
    const { error } = await supabase
      .from('inventory')
      .update({ quantity: newQty, history })
      .eq('id', item.id)
    setSaving(false)
    if (error) { showToast('Failed: ' + error.message); return }
    showToast(`Reduced ${qty} unit(s) of stock`)
    setReduceOpen(false)
    refresh()
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <i className="fas fa-arrow-left text-gray-600"></i>
          </button>
          <h2 className="text-xl font-bold">Inventory</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAddOpen(true)}
            className="bg-teal-100 text-teal-700 px-3 py-1.5 rounded-lg text-xs font-semibold"
          >
            <i className="fas fa-plus mr-1"></i> Add
          </button>
          <button
            onClick={openReduce}
            className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-semibold"
          >
            <i className="fas fa-minus mr-1"></i> Reduce
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner border-teal-700 border-t-transparent"></div>
        </div>
      ) : inventory.length === 0 ? (
        <div className="text-center py-12">
          <i className="fas fa-boxes text-4xl text-gray-300 mb-3"></i>
          <p className="text-gray-400 text-sm">No inventory items</p>
          <button
            onClick={() => setAddOpen(true)}
            className="mt-3 text-xs bg-teal-700 text-white px-4 py-2 rounded-lg font-semibold"
          >
            <i className="fas fa-plus mr-1"></i> Add First Item
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {inventory.map((item) => (
            <div key={item.id} className="card inventory-card p-4 border-l-4 border-teal-700">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-sm">{item.name}</h4>
                  <p className="text-xs text-gray-500">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-teal-700">
                    {item.quantity} <span className="text-xs font-normal text-gray-500">{item.unit}</span>
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 mt-2 max-h-24 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-500 mb-1">History</p>
                {(item.history || []).slice(-3).map((h, idx) => (
                  <div key={idx} className="flex justify-between text-xs py-0.5">
                    <span className={h.type === 'add' ? 'text-green-600' : 'text-rose-600'}>
                      {h.type === 'add' ? '+' : '-'}{h.qty} {item.unit}
                    </span>
                    <span className="text-gray-400">{h.date} · {h.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reduce modal */}
      <Modal open={reduceOpen} onClose={() => setReduceOpen(false)} title="Reduce Stock">
        <form onSubmit={handleReduce} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">Select Item</label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
            >
              {inventory.map((i) => (
                <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Quantity to Reduce</label>
            <input
              type="number"
              required
              min="1"
              value={qty}
              onChange={(e) => setQty(parseFloat(e.target.value) || 1)}
              className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Reason</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
              placeholder="e.g., Used for guest, Damaged"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl"
          >
            {saving ? <span className="spinner"></span> : <><i className="fas fa-minus mr-1"></i> Reduce Stock</>}
          </button>
        </form>
      </Modal>

      {/* Add modal -> redirect to purchase */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Stock">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            To add stock, go to <b>Expenses → Purchase</b>. Purchases automatically update the inventory.
          </p>
          <button
            onClick={() => { setAddOpen(false); navigate('/expenses?tab=purchase') }}
            className="btn-primary w-full text-white font-semibold py-3 rounded-xl text-sm"
          >
            <i className="fas fa-arrow-right mr-1"></i> Go to Purchase Section
          </button>
        </div>
      </Modal>
    </div>
  )
}

