import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { HOMESTAY, applyHomestayDetails } from '../config'

export default function Details() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useAuth()
  const { showToast } = useToast()

  const [tab, setTab] = useState('basic')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    dob: '',
    phone: '',
    email: '',
    property_name: HOMESTAY.name || 'Escape Home',
    business_phone: '',
    whatsapp: '',
    business_email: '',
    address: HOMESTAY.address || '',
    maps_url: ''
  })

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        dob: profile.dob || '',
        phone: profile.phone || '',
        email: profile.email || '',
        property_name: profile.name || HOMESTAY.name || 'Escape Home',
        business_phone: profile.business_phone || profile.phone || '',
        whatsapp: profile.whatsapp || '',
        business_email: profile.business_email || profile.email || '',
        address: profile.address || HOMESTAY.address || '',
        maps_url: profile.maps_url || ''
      })
    }
  }, [profile])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function save(e) {
    e.preventDefault()
    if (!form.full_name.trim()) { showToast('Full name is required'); return }
    if (!form.property_name.trim()) { showToast('Property name is required'); return }
    setSaving(true)
    try {
      // If the login email changed, update the auth email too (best-effort)
      if (form.email.trim() && profile?.email && form.email.trim() !== profile.email) {
        try {
          await supabase.auth.updateUser({ email: form.email.trim() })
          showToast('Check your new email to confirm the change')
        } catch (err) {
          showToast('Email change needs confirmation: ' + err.message)
        }
      }

      const payload = {
        full_name: form.full_name.trim(),
        dob: form.dob,
        phone: form.phone.trim(),
        email: form.email.trim(),
        name: form.property_name.trim(),
        business_phone: form.business_phone.trim(),
        whatsapp: form.whatsapp.trim(),
        business_email: form.business_email.trim(),
        address: form.address.trim(),
        maps_url: form.maps_url.trim()
      }
      await updateProfile(payload)

      // Apply property details to bills & reports live
      applyHomestayDetails({
        name: payload.name,
        phone: payload.business_phone,
        whatsapp: payload.whatsapp,
        email: payload.business_email,
        address: payload.address,
        maps_url: payload.maps_url
      })

      showToast('Details saved!')
    } catch (err) {
      showToast('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm'

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24 space-y-4">
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => navigate('/')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <i className="fas fa-arrow-left text-gray-600"></i>
        </button>
        <h2 className="text-xl font-bold">Escape Home Details</h2>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab('basic')}
          className={`flex-1 py-3 text-sm font-semibold ${tab === 'basic' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-gray-500'}`}
        >
          Basic Info
        </button>
        <button
          onClick={() => setTab('property')}
          className={`flex-1 py-3 text-sm font-semibold ${tab === 'property' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-gray-500'}`}
        >
          Property Info
        </button>
      </div>

      <form onSubmit={save} className="space-y-3">
        {tab === 'basic' ? (
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Basic Info</h3>
            <div>
              <label className="text-xs font-semibold text-gray-500">Full Name *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => set('full_name', e.target.value)}
                className={inputCls}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Date of Birth</label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => set('dob', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Phone Number</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className={inputCls}
                placeholder="+977-98XXXXXXXX"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className={inputCls}
                placeholder="you@gmail.com"
              />
            </div>
            <p className="text-[10px] text-gray-400">Changing the email will send a confirmation to the new address.</p>
          </div>
        ) : (
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Property Info</h3>
            <div>
              <label className="text-xs font-semibold text-gray-500">Property Name *</label>
              <input
                type="text"
                value={form.property_name}
                onChange={(e) => set('property_name', e.target.value)}
                className={inputCls}
                placeholder="Escape Home"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Phone Number</label>
                <input
                  type="text"
                  value={form.business_phone}
                  onChange={(e) => set('business_phone', e.target.value)}
                  className={inputCls}
                  placeholder="+977-9800000000"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">WhatsApp Number</label>
                <input
                  type="text"
                  value={form.whatsapp}
                  onChange={(e) => set('whatsapp', e.target.value)}
                  className={inputCls}
                  placeholder="9779800000000"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Email Address</label>
              <input
                type="email"
                value={form.business_email}
                onChange={(e) => set('business_email', e.target.value)}
                className={inputCls}
                placeholder="escapehome@gmail.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Location / Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                className={inputCls}
                placeholder="Lakeside, Pokhara 33700, Nepal"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Google Maps URL</label>
              <input
                type="text"
                value={form.maps_url}
                onChange={(e) => set('maps_url', e.target.value)}
                className={inputCls}
                placeholder="Leave blank to auto-generate from address"
              />
            </div>
            <p className="text-[10px] text-gray-400">These property details appear on every bill, invoice and report.</p>
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full text-white font-semibold py-3 rounded-xl text-sm">
          {saving ? <span className="spinner"></span> : <><i className="fas fa-save mr-1"></i> Save {tab === 'basic' ? 'Basic Info' : 'Property Info'}</>}
        </button>
      </form>
    </div>
  )
}

