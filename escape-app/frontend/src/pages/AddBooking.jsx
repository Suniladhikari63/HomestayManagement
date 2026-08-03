import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import useHomestayData from '../hooks/useHomestayData'
import { compressImage } from '../utils/image'
import { loadRoomInventory } from '../utils/roomInventory'
import { loadPackageCompositions, getCompositionForPackage } from '../utils/packageCompositions'

function getUnitLabel(pricingType) {
  switch (pricingType) {
    case 'room': return 'room'
    case 'guest': return 'guest'
    case 'night': return 'night'
    case 'stay': return 'stay'
    default: return 'use'
  }
}

export default function AddBooking() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { activeBusiness } = useAuth()
  const { refresh, packages: dbPackages, bookings } = useHomestayData()

  const PACKAGES = dbPackages || []

  const [guestName, setGuestName] = useState('')
  const [contactNo, setContactNo] = useState('')
  const [totalGuests, setTotalGuests] = useState(1)
  const [bookingType, setBookingType] = useState('Night Stay')
  const [checkIn, setCheckIn] = useState(() => {
    const d = new Date()
    return d.toISOString().slice(0, 16)
  })
  const [checkOut, setCheckOut] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(12, 0, 0, 0) // checkout fixed at 12:00 PM next day
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T12:00`
  })
  const [packageIdx, setPackageIdx] = useState(-1)
  const [customPrice, setCustomPrice] = useState(0)
  const [advance, setAdvance] = useState(0)
  const [guestPhoto, setGuestPhoto] = useState(null)
  const [idPhoto, setIdPhoto] = useState(null)
  const [extras, setExtras] = useState({
    guest: { qty: 0, price: 500 }
  })
  
  const [extraRoom, setExtraRoom] = useState({ name: '', qty: 0, price: 1000 })
  const [adjustMode, setAdjustMode] = useState('')
  const [packageCompositions, setPackageCompositions] = useState({})
  const [roomInventory, setRoomInventory] = useState({})
  const [saving, setSaving] = useState(false)

  const pkg = packageIdx >= 0 ? PACKAGES[packageIdx] : null
  const packageComp = pkg ? getCompositionForPackage(packageCompositions, pkg) : { rooms: [], addons: [], persons: 1 }
  const packageCapacity = Number(packageComp.persons || 1)
  const packageRoomItems = packageComp.rooms || []
  const noPackages = PACKAGES.length === 0
  const packageChargeGuests = pkg && pkg.per_person ? Math.min(totalGuests, packageCapacity) : 1
  const packageBase = pkg ? (pkg.per_person ? pkg.price * packageChargeGuests : pkg.price) : 0
  const packageTotal = customPrice > 0 ? customPrice : packageBase
  const extraRoomEntry = extraRoom.name ? roomInventory?.[extraRoom.name] : null
  function computeRemaining(roomName) {
    const capacity = roomInventory?.[roomName]?.total || 0
    if (!capacity) return null
    const newStart = new Date(checkIn)
    const newEnd = new Date(checkOut)
    let reserved = 0
    ;(bookings || []).forEach((b) => {
      if (b.business_id !== activeBusiness?.id) return
      if (!b.check_in || !b.check_out) return
      const bStart = new Date(b.check_in)
      const bEnd = new Date(b.check_out)
      if (!(newEnd <= bStart || newStart >= bEnd)) {
        const qty = (b.add_ons || []).reduce((s, a) => s + ((a.name === roomName) ? Number(a.qty || 0) : 0), 0)
        reserved += qty
      }
    })
    const packageReserved = packageRoomItems.reduce((sum, item) => (
      item.name === roomName ? sum + Number(item.qty || 0) : sum
    ), 0)
    return Math.max(0, capacity - reserved - packageReserved)
  }
  const extraRoomRemaining = extraRoom.name ? computeRemaining(extraRoom.name) : null
  const canAddExtraRoom = extraRoom.name && extraRoomRemaining !== null
    ? Number(extraRoom.qty || 0) <= Number(extraRoomRemaining)
    : true
  const overflowGuests = Math.max(0, totalGuests - packageCapacity)
  const extrasTotal = Number(extras.guest.qty || 0) * Number(extras.guest.price || 0)
  const extraRoomTotal = Number(extraRoom.qty || 0) * Number(extraRoom.price || 0)
  const totalPrice = packageTotal + extrasTotal + extraRoomTotal
  const balance = totalPrice - advance
  const extraRoomOverbook = extraRoom.name && extraRoomEntry && Number(extraRoom.qty || 0) > Number((extraRoomRemaining ?? (extraRoomEntry.available || 0)))

  function updatePackage(idx) {
    setPackageIdx(idx)
    setCustomPrice(0)
    setExtras({ guest: { qty: 0, price: 500 } })
    setExtraRoom({ name: '', qty: 0, price: 1000 })
    setAdjustMode('')
  }

  useEffect(() => {
    async function loadPersistence() {
      if (!activeBusiness?.id) return
      try {
        const [comps, inventory] = await Promise.all([
          loadPackageCompositions(activeBusiness.id),
          loadRoomInventory(activeBusiness.id)
        ])
        setPackageCompositions(comps)
        setRoomInventory(inventory)
      } catch (err) {
        showToast('Failed to load package or room data: ' + err.message)
      }
    }

    loadPersistence()
  }, [activeBusiness?.id])

  useEffect(() => {
    if (overflowGuests > 0 && extras.guest.qty === 0) {
      setExtras((prev) => ({
        ...prev,
        guest: { ...prev.guest, qty: overflowGuests }
      }))
    }
  }, [overflowGuests, extras.guest.qty])

  if (noPackages) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <i className="fas fa-arrow-left text-gray-600"></i>
          </button>
          <h2 className="text-xl font-bold">New Booking</h2>
        </div>
        <div className="card p-8 text-center space-y-3">
          <i className="fas fa-tags text-4xl text-gray-300"></i>
          <p className="text-gray-500 text-sm">No packages configured yet.</p>
          <button
            onClick={() => navigate('/package-details')}
            className="btn-primary text-white font-semibold py-3 rounded-xl text-sm w-full"
          >
            <i className="fas fa-cog mr-1"></i> Configure Packages
          </button>
        </div>
      </div>
    )
  }

  function onPhotoChange(e, setter) {
    const file = e.target.files?.[0]
    if (!file) return
    compressImage(file)
      .then((dataUrl) => setter(dataUrl))
      .catch((err) => showToast(err.message))
  }

  function updateExtra(key, field, value) {
    setExtras((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }))
  }

  function adjustExtraQty(key, delta) {
    setExtras((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        qty: Math.max(0, (prev[key]?.qty || 0) + delta)
      }
    }))
  }

  function clearForm() {
    setGuestName('')
    setContactNo('')
    setTotalGuests(1)
    setBookingType('Night Stay')
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(12, 0, 0, 0) // fixed 12 PM checkout
    const pad = (n) => String(n).padStart(2, '0')
    setCheckIn(now.toISOString().slice(0, 16))
    setCheckOut(`${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T12:00`)
    setPackageIdx(-1)
    setCustomPrice(0)
    setAdvance(0)
    setGuestPhoto(null)
    setIdPhoto(null)
    setExtras({ guest: { qty: 0, price: 500 } })
    setExtraRoom({ name: '', qty: 0, price: 1000 })
    // reset file inputs
    document.getElementById('guestPhotoInput') && (document.getElementById('guestPhotoInput').value = '')
    document.getElementById('idPhotoInput') && (document.getElementById('idPhotoInput').value = '')
  }

  async function save(e) {
    e.preventDefault()
    if (!guestName || !contactNo || !checkIn || !checkOut) {
      showToast('Please fill required fields')
      return
    }
    if (!pkg) {
      showToast('Please choose a package option before saving')
      return
    }
    setSaving(true)
    const addOnsPayload = Object.entries(extras).flatMap(([key, value]) => {
      const qty = Number(value?.qty || 0)
      if (!qty) return []
      const meta = key === 'room'
        ? { name: 'Extra Room', pricing_type: 'room', unit_label: 'room' }
        : { name: 'Extra Guest', pricing_type: 'guest', unit_label: 'guest' }
      return [{
        name: meta.name,
        qty,
        price: Number(value?.price || 0),
        pricing_type: meta.pricing_type,
        unit_label: meta.unit_label
      }]
    })
    
    // include selected room from room inventory
    if (packageRoomItems.length > 0) {
      packageRoomItems.forEach((item) => {
        const roomEntry = roomInventory?.[item.name]
        if (!roomEntry) return
        addOnsPayload.push({
          name: roomEntry.name,
          qty: Number(item.qty || 1),
          price: 0,
          pricing_type: roomEntry.pricing_type || (roomEntry.price_per_person ? 'guest' : 'room'),
          unit_label: roomEntry.unit_label || getUnitLabel(roomEntry.pricing_type || (roomEntry.price_per_person ? 'guest' : 'room'))
        })
      })
    }

    if (extraRoom.name && Number(extraRoom.qty || 0) > 0) {
      const roomEntry = roomInventory?.[extraRoom.name]
      if (roomEntry) {
        const remainingQty = extraRoomRemaining ?? roomEntry.available ?? roomEntry.total ?? 0
        const qtyToAdd = Math.min(Number(extraRoom.qty || 0), remainingQty)
        if (qtyToAdd > 0) {
          addOnsPayload.push({
            name: roomEntry.name,
            qty: qtyToAdd,
            price: Number(roomEntry.price || 0),
            pricing_type: roomEntry.pricing_type || (roomEntry.price_per_person ? 'guest' : 'room'),
            unit_label: roomEntry.unit_label || getUnitLabel(roomEntry.pricing_type || (roomEntry.price_per_person ? 'guest' : 'room'))
          })
        }
      }
    }
    const payload = {
      guest_name: guestName,
      booking_type: bookingType,
      contact_no: contactNo,
      total_guests: totalGuests,
      check_in: checkIn,
      check_out: checkOut,
      stay_type: bookingType,
      package_option: pkg.name,
      package_price: packageTotal,
      add_ons: addOnsPayload,
      total_price: totalPrice,
      advance,
      balance,
      status: 'followup',
      photo: guestPhoto,
      id_photo: idPhoto,
      kot_items: [],
      subtotal: 0,
      discount: 0,
      total: totalPrice,
      date: new Date().toISOString().slice(0, 10),
      business_id: activeBusiness?.id
    }
    const { error } = await supabase.from('bookings').insert(payload)
    setSaving(false)
    if (error) {
      showToast('Save failed: ' + error.message)
      return
    }
    showToast('Booking saved successfully!')
    // clear form
    clearForm()
    refresh()
    navigate('/bookings')
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <i className="fas fa-arrow-left text-gray-600"></i>
        </button>
        <h2 className="text-xl font-bold">New Booking</h2>
      </div>

      <form onSubmit={save} className="space-y-4">
        {/* Photos */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-3">
            <label className="text-xs font-semibold text-gray-500 block mb-2">Guest Photo</label>
            <div className="relative">
              {guestPhoto ? (
                <img src={guestPhoto} className="photo-preview bg-gray-100" alt="Guest" />
              ) : (
                <div
                  onClick={() => document.getElementById('guestPhotoInput').click()}
                  className="photo-preview bg-gray-100 flex flex-col items-center justify-center cursor-pointer"
                >
                  <i className="fas fa-camera text-2xl text-gray-400 mb-1"></i>
                  <span className="text-xs text-gray-400">Capture / Upload</span>
                </div>
              )}
              <input type="file" id="guestPhotoInput" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhotoChange(e, setGuestPhoto)} />
            </div>
            {guestPhoto && (
              <button type="button" onClick={() => { setGuestPhoto(null); document.getElementById('guestPhotoInput').value = '' }} className="mt-1 w-full text-[10px] text-rose-600 font-semibold">
                <i className="fas fa-trash mr-1"></i> Remove
              </button>
            )}
          </div>
          <div className="card p-3">
            <label className="text-xs font-semibold text-gray-500 block mb-2">ID Photo</label>
            <div className="relative">
              {idPhoto ? (
                <img src={idPhoto} className="photo-preview bg-gray-100" alt="ID" />
              ) : (
                <div
                  onClick={() => document.getElementById('idPhotoInput').click()}
                  className="photo-preview bg-gray-100 flex flex-col items-center justify-center cursor-pointer"
                >
                  <i className="fas fa-id-card text-2xl text-gray-400 mb-1"></i>
                  <span className="text-xs text-gray-400">Capture / Upload</span>
                </div>
              )}
              <input type="file" id="idPhotoInput" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhotoChange(e, setIdPhoto)} />
            </div>
            {idPhoto && (
              <button type="button" onClick={() => { setIdPhoto(null); document.getElementById('idPhotoInput').value = '' }} className="mt-1 w-full text-[10px] text-rose-600 font-semibold">
                <i className="fas fa-trash mr-1"></i> Remove
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 -mt-2">Photos are auto-compressed and saved as URLs in the booking record.</p>

        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-sm text-gray-700">Booking Information</h3>
          <div>
            <label className="text-xs font-semibold text-gray-500">Booking Type</label>
            <select
              value={bookingType}
              onChange={(e) => setBookingType(e.target.value)}
              className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
            >
              <option value="Day Stay">Day Stay</option>
              <option value="Night Stay">Night Stay</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Guest Name *</label>
            <input
              type="text"
              required
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
              placeholder="Enter guest name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Contact No. *</label>
              <input
                type="tel"
                required
                value={contactNo}
                onChange={(e) => setContactNo(e.target.value)}
                className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
                placeholder="+977-XXXXXXXXXX"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Total Guests *</label>
              <input
                type="number"
                min="1"
                required
                value={totalGuests}
                onChange={(e) => setTotalGuests(Math.max(1, parseInt(e.target.value) || 1))}
                className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Check-in *</label>
              <input
                type="datetime-local"
                required
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Check-out *</label>
              <input
                type="datetime-local"
                required
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-sm text-gray-700">Package Details</h3>
          <div>
            <label className="text-xs font-semibold text-gray-500">Package Option</label>
            <select
              value={packageIdx}
              onChange={(e) => updatePackage(parseInt(e.target.value))}
              className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
            >
              <option value={-1}>--- Pick a package ---</option>
              {PACKAGES.map((p, i) => (
                <option key={p.name} value={i}>
                  {p.name} — {p.per_person ? `Rs. ${p.price}/person` : `Rs. ${p.price}`}
                </option>
              ))}
            </select>
          </div>

          {pkg ? (
            <div className="rounded-3xl bg-white border border-gray-200 p-4 shadow-sm space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-600">
                  {pkg.per_person
                    ? `Rs. ${pkg.price} × ${packageChargeGuests} guest${packageChargeGuests !== 1 ? 's' : ''}`
                    : 'Package base'}
                </div>
                <div className="text-xl font-bold text-gray-900">Rs. {packageBase}</div>
              </div>
              {packageRoomItems.length > 0 && (
                <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-4">
                  <div className="flex items-center justify-between mb-2 text-sm text-teal-800 font-semibold">
                    <span>{packageRoomItems.length === 1 ? `${packageRoomItems[0].name} — package room allocation` : 'Package room allocation'}</span>
                    <span>{packageRoomItems.reduce((sum, item) => sum + Number(item.qty || 0), 0)} room{packageRoomItems.reduce((sum, item) => sum + Number(item.qty || 0), 0) !== 1 ? 's' : ''}</span>
                  </div>
                  {packageRoomItems.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm mb-1">
                      <span>{item.name}</span>
                      <span className="font-semibold">{item.qty || 1} room{Number(item.qty || 1) !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                  <p className="text-xs text-teal-700/80 mt-3">Capacity: {packageCapacity} guest{packageCapacity !== 1 ? 's' : ''}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl bg-white border border-gray-200 p-4 shadow-sm text-sm text-gray-500">
              <p>Please select a package to see pricing and room availability.</p>
            </div>
          )}

          {overflowGuests > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 mt-3">
              <p className="text-sm font-semibold text-rose-700">Capacity exceeded</p>
              <p className="text-xs text-rose-600 mt-1">Package covers {packageCapacity} guests. You have {overflowGuests} extra guest{overflowGuests !== 1 ? 's' : ''} beyond package capacity.</p>
            </div>
          )}

          {/* Custom package price override */}
          <div>
            <label className="text-xs font-semibold text-gray-500">Custom Package Price (optional override)</label>
            <input
              type="number"
              min="0"
              value={customPrice || ''}
              onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
              className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
              placeholder="Leave empty to use calculated price"
            />
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-gray-500">Adjust guests or rooms</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => setAdjustMode(adjustMode === 'guest' ? '' : 'guest')}
                className={`w-full rounded-full px-4 py-2 text-sm font-semibold ${adjustMode === 'guest' ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                + Add guests
              </button>
              <button
                type="button"
                onClick={() => setAdjustMode(adjustMode === 'room' ? '' : 'room')}
                className={`w-full rounded-full px-4 py-2 text-sm font-semibold ${adjustMode === 'room' ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                + Add rooms
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Extra rooms beyond the package allocation are billed separately below.</p>

            {adjustMode === 'guest' && (
              <div className="rounded-xl border border-teal-100 bg-teal-50 p-3 mt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Extra Guests</p>
                    <p className="text-xs text-gray-500">Charge per added guest</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => adjustExtraQty('guest', -1)} className="w-7 h-7 rounded-full bg-white text-gray-700 font-bold border border-gray-200">−</button>
                    <span className="w-8 text-center font-semibold text-sm">{extras.guest.qty}</span>
                    <button type="button" onClick={() => adjustExtraQty('guest', 1)} className="w-7 h-7 rounded-full bg-teal-700 text-white font-bold">+</button>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="text-[10px] text-gray-500 font-semibold">Charge per guest (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={extras.guest.price}
                    onChange={(e) => updateExtra('guest', 'price', parseFloat(e.target.value) || 0)}
                    className="input-field w-full mt-1 px-2 py-1.5 rounded-lg bg-white text-sm"
                  />
                </div>
              </div>
            )}

            {adjustMode === 'room' && (
              <div className="rounded-xl border border-teal-100 bg-teal-50 p-3 mt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Extra Room</p>
                    <p className="text-xs text-gray-500">Choose an available room and charge by room price</p>
                  </div>
                  <button type="button" onClick={() => setExtraRoom({ name: '', qty: 0, price: 1000 })} className="text-xs text-rose-600 font-semibold">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <select value={extraRoom.name} onChange={(e) => {
                    const roomName = e.target.value
                    const entry = roomInventory?.[roomName]
                    setExtraRoom({
                      name: roomName,
                      qty: 1,
                      price: entry ? Number(entry.price || 0) : 1000
                    })
                  }} className="input-field w-full px-3 py-2.5 rounded-xl bg-white text-sm">
                    <option value="">-- Pick extra room --</option>
                    {Object.values(roomInventory || {}).map((r) => {
                      const remaining = computeRemaining(r.name)
                      return (
                        <option key={r.name} value={r.name}>
                          {r.name} — {remaining !== null ? `${remaining}/${r.total}` : `${r.available}/${r.total}`} available
                        </option>
                      )
                    })}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={extraRoom.qty}
                    onChange={(e) => setExtraRoom((prev) => ({ ...prev, qty: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="input-field px-3 py-2.5 rounded-xl bg-white text-sm"
                  />
                </div>
                {extraRoom.name && (
                  <div className="mt-3 text-xs text-gray-500">
                    <p>Price per room: Rs. {extraRoom.price}</p>
                    <p>{extraRoomRemaining !== null ? `${extraRoomRemaining}/${extraRoomEntry?.total || 0} available for selected dates` : 'Availability not set'}</p>
                  </div>
                )}
                {extraRoom.name && !canAddExtraRoom && (
                  <p className="text-xs text-rose-600 mt-2">Only {extraRoomRemaining} room{extraRoomRemaining !== 1 ? 's' : ''} available for selected dates.</p>
                )}
              </div>
            )}
          </div>


          <div className="rounded-[28px] bg-teal-950 text-white p-5 space-y-4">
            <div className="text-[10px] uppercase tracking-[0.24em] text-teal-300 font-semibold">Price summary</div>
            <div className="flex justify-between items-center text-sm text-teal-200">
              <span>Package total</span>
              <span className="font-semibold text-white">Rs. {packageTotal}</span>
            </div>
            {extrasTotal + extraRoomTotal > 0 && (
              <div className="flex justify-between items-center text-sm text-teal-200">
                <span>Extra guests / rooms</span>
                <span className="font-semibold text-white">Rs. {extrasTotal + extraRoomTotal}</span>
              </div>
            )}
            <div className="border-t border-teal-700 pt-4 flex justify-between items-center">
              <span className="text-sm font-semibold text-teal-100">Total price</span>
              <span className="text-2xl font-bold text-white">Rs. {totalPrice}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Advance (Rs.)</label>
            <input
              type="number"
              min="0"
              value={advance}
              onChange={(e) => setAdvance(parseFloat(e.target.value) || 0)}
              className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
            />
          </div>
          <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Remaining Balance</span>
            <span className="text-lg font-bold text-gray-700">Rs. {balance}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || extraRoomOverbook}
          className="btn-primary w-full text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-teal-900/20 flex items-center justify-center gap-2"
        >
          {saving ? <span className="spinner"></span> : <><i className="fas fa-save"></i> Save New Booking</>}
        </button>
        <button
          type="button"
          onClick={clearForm}
          className="w-full bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
        >
          <i className="fas fa-undo"></i> Clear Form
        </button>
      </form>
    </div>
  )
}

