import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { HOMESTAY, applyHomestayDetails } from '../config'

export default function Profile() {
  const navigate = useNavigate()
  const { profile, activeBusiness, updateProfile, updatePassword, updateBusiness } = useAuth()
  const { showToast } = useToast()

  const [tab, setTab] = useState('personal')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    username: '',
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

  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (profile || activeBusiness) {
      setForm({
        full_name: profile?.full_name || '',
        username: profile?.username || '',
        dob: profile?.dob || '',
        phone: profile?.phone || '',
        email: profile?.email || '',
        property_name: activeBusiness?.name || profile?.name || HOMESTAY.name || 'Escape Home',
        business_phone: activeBusiness?.business_phone || profile?.business_phone || '',
        whatsapp: activeBusiness?.whatsapp || profile?.whatsapp || '',
        business_email: activeBusiness?.business_email || profile?.business_email || '',
        address: activeBusiness?.address || profile?.address || HOMESTAY.address || '',
        maps_url: activeBusiness?.maps_url || profile?.maps_url || ''
      })
    }
  }, [profile, activeBusiness])

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
        username: form.username.trim().toLowerCase() || undefined,
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

      if (tab === 'business' && activeBusiness?.id) {
        await updateBusiness(activeBusiness.id, {
          name: payload.name,
          business_phone: payload.business_phone,
          whatsapp: payload.whatsapp,
          business_email: payload.business_email,
          address: payload.address,
          maps_url: payload.maps_url
        })
      }

      await updateProfile(payload)

      // Apply business details to bills & reports live
      applyHomestayDetails({
        name: payload.name,
        phone: payload.business_phone,
        whatsapp: payload.whatsapp,
        email: payload.business_email,
        address: payload.address,
        maps_url: payload.maps_url
      })

      showToast('Profile saved!')
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
        <h2 className="text-xl font-bold">Profile</h2>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab('personal')}
          className={`flex-1 py-3 text-sm font-semibold ${tab === 'personal' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-gray-500'}`}
        >
          Personal Info
        </button>
        <button
          onClick={() => setTab('business')}
          className={`flex-1 py-3 text-sm font-semibold ${tab === 'business' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-gray-500'}`}
        >
          Business Info
        </button>
      </div>

      <form onSubmit={save} className="space-y-3">
{tab === 'personal' ? (
          <>
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Login Info</h3>
            <div>
              <label className="text-xs font-semibold text-gray-500">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => set('username', e.target.value)}
                className={inputCls}
                placeholder="your_username (for sign-in)"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Saved username: {form.username.trim() ? form.username.trim().toLowerCase() : 'Not set yet'}
              </p>
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

          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Set Password</h3>
            <p className="text-[10px] text-gray-400">Set a password for email/username sign-in.</p>
            <div>
              <label className="text-xs font-semibold text-gray-500">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputCls}
                placeholder="At least 6 characters"
                minLength={6}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Confirm Password</label>
              <input
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                className={inputCls}
                placeholder="Re-enter password"
              />
            </div>
            <p className="text-[10px] text-gray-400">Password is stored securely and will not be shown again after saving.</p>
            <button
              type="button"
              disabled={savingPassword}
              onClick={async () => {
                if (!newPassword || newPassword.length < 6) { showToast('Password must be at least 6 characters'); return }
                if (newPassword !== newPasswordConfirm) { showToast('Passwords do not match'); return }
                setSavingPassword(true)
                try {
                  await updatePassword(newPassword)
                  showToast('Password set! You can now sign in with email/username + password.')
                  setNewPassword('')
                  setNewPasswordConfirm('')
                } catch (err) {
                  showToast('Failed: ' + err.message)
                } finally {
                  setSavingPassword(false)
                }
              }}
              className="w-full bg-gray-800 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              {savingPassword ? <span className="spinner"></span> : <><i className="fas fa-key mr-1"></i> Set Password</>}
            </button>
          </div>

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
          </div>
          </>
        ) : (
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Business Info</h3>
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
            <p className="text-[10px] text-gray-400">These business details appear on every bill, invoice and report.</p>
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full text-white font-semibold py-3 rounded-xl text-sm">
          {saving ? <span className="spinner"></span> : <><i className="fas fa-save mr-1"></i> Save {tab === 'personal' ? 'Personal Info' : 'Business Info'}</>}
        </button>
      </form>
    </div>
  )
}

