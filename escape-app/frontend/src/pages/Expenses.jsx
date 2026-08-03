import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import useHomestayData from '../hooks/useHomestayData'

const OPERATION_CATEGORIES = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Water / Electricity Bills' },
  { value: 'furniture', label: 'Furniture / Items Purchase' },
  { value: 'miscellaneous', label: 'Miscellaneous' }
]

const UNITS = ['pcs', 'kg', 'ltr', 'box', 'pack']

export default function Expenses() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { showToast } = useToast()
  const { activeBusiness } = useAuth()
  const { expenses, inventory, refresh } = useHomestayData()
  const [tab, setTab] = useState(params.get('tab') === 'operation' ? 'operation' : 'purchase')

  // Purchase form
  const [item, setItem] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState('pcs')
  const [unitPrice, setUnitPrice] = useState(0)
  const [vendor, setVendor] = useState('')
  const [savingPurchase, setSavingPurchase] = useState(false)

// Operation form
  const [category, setCategory] = useState('maintenance')
  const [payee, setPayee] = useState('')
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [savingOp, setSavingOp] = useState(false)

  const purchaseTotal = quantity * unitPrice

  function switchTab(t) {
    setTab(t)
  }

  async function savePurchase(e) {
    e.preventDefault()
    if (!item || !quantity || unitPrice <= 0) { showToast('Fill all purchase fields'); return }
    setSavingPurchase(true)
    const today = new Date().toISOString().slice(0, 10)
    const total = quantity * unitPrice

    // insert expense (type purchase)
    const expensePayload = {
      type: 'purchase',
      item,
      unit,
      quantity,
      unit_price: unitPrice,
      total,
      vendor,
      date: today,
      business_id: activeBusiness?.id
    }
    const { data: expenseRow, error: expErr } = await supabase.from('expenses').insert(expensePayload).select().single()
    if (expErr) { setSavingPurchase(false); showToast('Failed: ' + expErr.message); return }

    // upsert inventory
    const existing = inventory.find((i) => i.name.toLowerCase() === item.toLowerCase())
    if (existing) {
      const newQty = Number(existing.quantity) + Number(quantity)
      const history = [...(existing.history || []), { type: 'add', qty: Number(quantity), reason: 'Purchase: ' + vendor, date: today }]
      const { error: invErr } = await supabase.from('inventory').update({ quantity: newQty, history }).eq('id', existing.id)
      if (invErr) { setSavingPurchase(false); showToast('Expense saved but inventory failed: ' + invErr.message); refresh(); return }
    } else {
      const history = [{ type: 'add', qty: Number(quantity), reason: 'Purchase: ' + vendor, date: today }]
      const { error: invErr } = await supabase.from('inventory').insert({
        name: item,
        category: 'General',
        unit,
        quantity,
        history,
        business_id: activeBusiness?.id
      })
      if (invErr) { setSavingPurchase(false); showToast('Expense saved but inventory failed: ' + invErr.message); refresh(); return }
    }

    setSavingPurchase(false)
    showToast('Purchase saved and stock updated!')
    setItem('')
    setQuantity(1)
    setUnitPrice(0)
    setVendor('')
    refresh()
  }

  async function saveOperation(e) {
    e.preventDefault()
    if (!amount || amount <= 0) { showToast('Enter a valid amount'); return }
    setSavingOp(true)
const payload = {
      type: 'operation',
      category,
      payee,
      amount,
      description,
      date: new Date().toISOString().slice(0, 10),
      business_id: activeBusiness?.id
    }
    const { error } = await supabase.from('expenses').insert(payload)
    setSavingOp(false)
    if (error) { showToast('Failed: ' + error.message); return }
    showToast('Operation expense added!')
    setCategory('maintenance')
    setPayee('')
    setAmount(0)
    setDescription('')
    refresh()
  }

  const purchases = expenses.filter((e) => e.type === 'purchase')
  const operations = expenses.filter((e) => e.type === 'operation')

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <i className="fas fa-arrow-left text-gray-600"></i>
        </button>
        <h2 className="text-xl font-bold">Expenses</h2>
      </div>

      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => switchTab('purchase')}
          className={`flex-1 py-3 text-sm font-semibold ${tab === 'purchase' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-gray-500'}`}
        >
          Purchase
        </button>
        <button
          onClick={() => switchTab('operation')}
          className={`flex-1 py-3 text-sm font-semibold ${tab === 'operation' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-gray-500'}`}
        >
          Operation
        </button>
      </div>

      {tab === 'purchase' ? (
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Add Purchase (Stock In)</h3>
            <form onSubmit={savePurchase} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Item Name</label>
                <input
                  type="text"
                  required
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
                  placeholder="e.g., Rice, Toilet Paper"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                    className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Unit Price (Rs.)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                    className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Total (Rs.)</label>
                  <input
                    type="number"
                    readOnly
                    value={purchaseTotal}
                    className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-100 text-sm font-semibold"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Vendor / Supplier</label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
                  placeholder="Vendor name"
                />
              </div>
              <button
                type="submit"
                disabled={savingPurchase}
                className="btn-primary w-full text-white font-semibold py-3 rounded-xl text-sm"
              >
                {savingPurchase ? <span className="spinner"></span> : <><i className="fas fa-plus mr-1"></i> Add Purchase & Stock</>}
              </button>
            </form>
          </div>
          <h4 className="font-semibold text-sm text-gray-700">Purchase History</h4>
          {purchases.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">No purchases yet</p>
          ) : (
            <div className="space-y-2">
              {purchases.map((p) => (
                <div key={p.id} className="card p-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{p.item}</p>
                    <p className="text-xs text-gray-500">{p.vendor} · {p.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">Rs. {p.total}</p>
                    <p className="text-xs text-gray-400">{p.quantity} {p.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Add Operation Expense</h3>
            <form onSubmit={saveOperation} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
                >
                  {OPERATION_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
</select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Amount (Rs.)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Description</label>
                <textarea
                  rows="2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
                  placeholder="Details..."
                />
              </div>
              <button
                type="submit"
                disabled={savingOp}
                className="btn-primary w-full text-white font-semibold py-3 rounded-xl text-sm"
              >
                {savingOp ? <span className="spinner"></span> : <><i className="fas fa-plus mr-1"></i> Add Expense</>}
              </button>
            </form>
          </div>
          <h4 className="font-semibold text-sm text-gray-700">Operation History</h4>
          {operations.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">No operation expenses yet</p>
          ) : (
            <div className="space-y-2">
              {operations.map((o) => (
                <div key={o.id} className="card p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold capitalize bg-gray-100 px-2 py-0.5 rounded">
                      {OPERATION_CATEGORIES.find((c) => c.value === o.category)?.label || o.category}
                    </span>
                    <span className="font-bold text-sm">Rs. {o.amount}</span>
                  </div>
                  <p className="text-sm font-medium">{o.payee || 'N/A'}</p>
                  <p className="text-xs text-gray-500">{o.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{o.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

