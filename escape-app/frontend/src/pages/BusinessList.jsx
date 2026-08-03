import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'

const EMPTY_FORM = {
  name: '',
  business_phone: '',
  whatsapp: '',
  business_email: '',
  address: '',
  maps_url: ''
}

export default function BusinessList() {
  const navigate = useNavigate()
  const { businesses, activeBusiness, addBusiness, updateBusiness, deleteBusiness, selectBusiness } = useAuth()
  const { showToast } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  function openEdit(b) {
    setEditing(b)
    setForm({
      name: b.name || '',
      business_phone: b.business_phone || '',
      whatsapp: b.whatsapp || '',
      business_email: b.business_email || '',
      address: b.address || '',
      maps_url: b.maps_url || ''
    })
    setFormOpen(true)
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) { showToast('Business name is required'); return }
    setSaving(true)
    try {
      if (editing) {
        await updateBusiness(editing.id, form)
        showToast('Business updated!')
      } else {
        const row = await addBusiness(form)
        await selectBusiness(row.id)
        showToast('Business added!')
        navigate('/')
      }
      setFormOpen(false)
    } catch (err) {
      showToast('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSelect(b) {
    try {
      await selectBusiness(b.id)
      showToast('Welcome to ' + b.name)
      navigate('/')
    } catch (err) {
      showToast('Failed: ' + err.message)
    }
  }

  async function handleDelete(b) {
    if (!window.confirm(`Delete "${b.name}"? This removes the business entry.`)) return
    try {
      await deleteBusiness(b.id)
      showToast('Business deleted')
    } catch (err) {
      showToast('Delete failed: ' + err.message)
    }
  }

  const inputCls = 'input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm'

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-2">
          <div className="w-16 h-16 bg-teal-100 rounded-2xl mx-auto mb-3 flex items-center justify-center">
            <i className="fas fa-building text-2xl text-teal-700"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Your Businesses</h1>
          <p className="text-sm text-gray-500 mt-1">Select a business to continue, or add a new one</p>
        </div>

        <div className="space-y-3">
          {businesses.map((b) => (
            <div
              key={b.id}
              className={`card p-4 cursor-pointer transition ${
                activeBusiness?.id === b.id ? 'ring-2 ring-teal-600' : 'hover:shadow-md'
              }`}
              onClick={() => handleSelect(b)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-teal-100 rounded-xl flex items-center justify-center text-teal-700 font-bold text-lg">
                    {b.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{b.name}</h4>
                    <p className="text-xs text-gray-500">
                      {b.business_phone || '—'} {b.address ? '· ' + b.address : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(b)} className="text-xs bg-teal-100 text-teal-700 px-3 py-1.5 rounded-lg font-semibold">
                    <i className="fas fa-edit mr-1"></i> Edit
                  </button>
                  <button onClick={() => handleDelete(b)} className="text-xs bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg font-semibold">
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
              {activeBusiness?.id === b.id && (
                <p className="text-[10px] text-teal-700 font-semibold mt-2"><i className="fas fa-check-circle mr-1"></i> Currently active</p>
              )}
            </div>
          ))}

          {businesses.length === 0 && (
            <div className="text-center py-10">
              <i className="fas fa-building text-4xl text-gray-300 mb-3"></i>
              <p className="text-gray-400 text-sm">No businesses yet — add your first one to get started</p>
            </div>
          )}
        </div>

        <button onClick={openAdd} className="btn-primary w-full text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-teal-900/20 flex items-center justify-center gap-2">
          <i className="fas fa-plus"></i> Add Business
        </button>
      </div>

      {/* Add / Edit Business modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Business' : 'Add Business'}>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">Business / Property Name *</label>
            <input type="text" required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="e.g. Escape Home" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Phone Number</label>
              <input type="tel" value={form.business_phone} onChange={(e) => set('business_phone', e.target.value)} className={inputCls} placeholder="+977-9800000000" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">WhatsApp</label>
              <input type="tel" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} className={inputCls} placeholder="9779800000000" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Email Address</label>
            <input type="email" value={form.business_email} onChange={(e) => set('business_email', e.target.value)} className={inputCls} placeholder="escapehome@gmail.com" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Location / Address</label>
            <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)} className={inputCls} placeholder="Lakeside, Pokhara 33700, Nepal" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Google Maps URL (optional)</label>
            <input type="url" value={form.maps_url} onChange={(e) => set('maps_url', e.target.value)} className={inputCls} placeholder="Leave blank to auto-generate" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full text-white font-semibold py-3 rounded-xl text-sm">
            {saving ? <span className="spinner"></span> : <><i className="fas fa-save mr-1"></i> {editing ? 'Update Business' : 'Add Business'}</>}
          </button>
        </form>
      </Modal>
    </div>
  )
}

