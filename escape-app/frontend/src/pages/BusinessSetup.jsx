import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function BusinessSetup() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useAuth()
  const { showToast } = useToast()

  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    dob: profile?.dob || '',
    phone: profile?.phone || '',
    email: profile?.email || ''
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.full_name.trim()) { showToast('Enter your full name'); return }
    if (!form.dob) { showToast('Enter your date of birth'); return }
    if (!form.phone.trim()) { showToast('Enter your phone number'); return }
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) { showToast('Enter a valid email'); return }
    setSaving(true)
    try {
      const payload = {
        full_name: form.full_name.trim(),
        dob: form.dob,
        phone: form.phone.trim(),
        email: form.email.trim(),
        setup_complete: true
      }
      await updateProfile(payload)
      showToast('Basic info saved!')
      navigate('/businesses')
    } catch (err) {
      showToast('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'input-field w-full mt-1 px-4 py-3 rounded-xl bg-gray-50'
  const labelCls = 'text-xs font-semibold text-gray-500 uppercase tracking-wider'

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-teal-100 rounded-2xl mx-auto mb-3 flex items-center justify-center">
            <i className="fas fa-user-circle text-2xl text-teal-700"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome!</h1>
          <p className="text-sm text-gray-500 mt-1">Let's set up your profile first</p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Basic Info</h2>
          <p className="text-xs text-gray-500 mb-4">This is your personal account info.</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className={labelCls}>Full Name *</label>
              <input type="text" required value={form.full_name} onChange={(e) => set('full_name', e.target.value)} className={inputCls} placeholder="e.g. Sunil Gurung" />
            </div>
            <div>
              <label className={labelCls}>Date of Birth *</label>
              <input type="date" required value={form.dob} onChange={(e) => set('dob', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone Number *</label>
              <input type="tel" required value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} placeholder="+977-9800000000" />
            </div>
            <div>
              <label className={labelCls}>Email *</label>
              <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} placeholder="you@gmail.com" />
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-teal-900/20 mt-2 flex items-center justify-center gap-2">
              {saving ? <span className="spinner"></span> : <><i className="fas fa-arrow-right mr-1"></i> Next: Add Your Business</>}
            </button>
          </form>
        </div>


      </div>
    </div>
  )
}

