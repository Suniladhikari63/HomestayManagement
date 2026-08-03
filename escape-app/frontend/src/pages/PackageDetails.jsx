import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { createRoomInventoryEntry, loadRoomInventory, saveRoomInventory } from '../utils/roomInventory'
import { loadPackageCompositions, savePackageCompositions, getCompositionForPackage, getCompositionKeyForPackage } from '../utils/packageCompositions'


function getUnitLabel(pricingType) {
  switch (pricingType) {
    case 'room': return 'room'
    case 'guest': return 'guest'
    case 'night': return 'night'
    case 'stay': return 'stay'
    default: return 'use'
  }
}

export default function PackageDetails() {
  const navigate = useNavigate()
  const { activeBusiness } = useAuth()
  const { showToast } = useToast()
  const [tab, setTab] = useState('packages')
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [roomModalOpen, setRoomModalOpen] = useState(false)
  const [roomEditing, setRoomEditing] = useState(null)
  const [roomForm, setRoomForm] = useState({ name: '', price: 0, pricing_type: 'guest', unit_label: 'guest', max_persons: 2, total: 1 })

  // Package form state
  const [pkgFormOpen, setPkgFormOpen] = useState(false)
  const [pkgEditing, setPkgEditing] = useState(null)
  const [pkgForm, setPkgForm] = useState({ name: '', price: '', per_person: false, description: '' })
  const [packageCompositions, setPackageCompositions] = useState({})
  const [compForm, setCompForm] = useState({ rooms: [], addons: [], persons: 1 })
  const [roomInventory, setRoomInventory] = useState({})
  const [roomSearch, setRoomSearch] = useState('')

  async function load() {
    setLoading(true)
    let pQuery = supabase.from('packages').select('*')
    if (activeBusiness?.id) {
      pQuery = pQuery.eq('business_id', activeBusiness.id)
    }
    const pRes = await pQuery.order('id')
    if (activeBusiness?.id) {
      try {
        const [inventory, comps] = await Promise.all([
          loadRoomInventory(activeBusiness.id),
          loadPackageCompositions(activeBusiness.id)
        ])
        setRoomInventory(inventory)
        setPackageCompositions(comps)
      } catch (err) {
        showToast('Failed to load room or package composition data: ' + err.message)
      }
    }
    if (pRes.error) showToast('Packages load failed: ' + pRes.error.message)
    else setPackages(pRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [activeBusiness?.id])

  // ----- Package CRUD -----
  function openAddPackage() {
    setPkgEditing(null)
    setPkgForm({ name: '', price: '', per_person: false, description: '' })
    setCompForm({ rooms: [], addons: [], persons: 1 })
    setPkgFormOpen(true)
  }
  function openAddRoom() {
    setRoomEditing(null)
    setRoomForm({ name: '', price: 0, pricing_type: 'guest', unit_label: '', max_persons: 2, total: 1 })
    setRoomModalOpen(true)
  }
  function openEditRoom(name) {
    const r = roomInventory?.[name]
    if (!r) return
    setRoomEditing(name)
    const pricing_type = r.pricing_type || (r.price_per_person ? 'guest' : 'room')
    setRoomForm({ name: r.name, price: r.price || 0, pricing_type, unit_label: r.unit_label || getUnitLabel(pricing_type), max_persons: r.max_persons || 2, total: r.total || 1 })
    setRoomModalOpen(true)
  }
  async function saveRoom(e) {
    e.preventDefault()
    const key = roomForm.name.trim()
    if (!key) { showToast('Room type name is required'); return }
    const pricing_type = roomForm.pricing_type || 'guest'
    const unit_label = roomForm.unit_label || getUnitLabel(pricing_type)
    const next = {
      ...roomInventory,
      [key]: {
        name: key,
        price: Number(roomForm.price || 0),
        pricing_type,
        unit_label,
        max_persons: (function(v){ const s = String(v||'').trim(); const n = Number(s); return (!s || isNaN(n)) ? s || '' : n })(roomForm.max_persons),
        total: Number(roomForm.total || 0),
        available: roomInventory?.[key]?.available ?? Number(roomForm.total || 0)
      }
    }
    setRoomInventory(next)
    await saveRoomInventory(next, activeBusiness?.id)
    setRoomModalOpen(false)
    load()
    showToast(roomEditing ? 'Room updated' : 'Room added')
  }
  async function deleteRoomByName(name) {
    if (!window.confirm(`Delete room type "${name}"? This will not affect existing bookings.`)) return
    const next = { ...roomInventory }
    delete next[name]
    setRoomInventory(next)
    await saveRoomInventory(next, activeBusiness?.id)
    showToast('Room deleted')
    load()
  }
  function openEditPackage(p) {
    setPkgEditing(p)
    setPkgForm({ name: p.name, price: p.price, per_person: p.per_person, description: p.description || '' })
    const comp = getCompositionForPackage(packageCompositions, p)
    setCompForm({ rooms: comp.rooms || [], addons: comp.addons || [], persons: comp.persons || 1 })
    setPkgFormOpen(true)
  }
  async function savePackage(e) {
    e.preventDefault()
    if (!pkgForm.name.trim()) { showToast('Package name is required'); return }
    const payload = {
      name: pkgForm.name.trim(),
      price: parseFloat(pkgForm.price) || 0,
      per_person: Boolean(pkgForm.per_person),
      description: pkgForm.description,
      business_id: activeBusiness?.id
    }
    let res
    if (pkgEditing) {
      res = await supabase.from('packages').update(payload).eq('id', pkgEditing.id)
    } else {
      res = await supabase.from('packages').insert(payload).select().single()
    }
    if (res.error) { showToast('Save failed: ' + res.error.message); return }
    const savedPkg = pkgEditing ? pkgEditing : (res.data || null)
    const key = getCompositionKeyForPackage(savedPkg || { name: pkgForm.name.trim(), id: res.data?.id })
    const nextComps = { ...packageCompositions, [key]: { rooms: compForm.rooms || [], addons: compForm.addons || [], persons: compForm.persons || 1 } }
    setPackageCompositions(nextComps)
    await savePackageCompositions(activeBusiness?.id, nextComps)
    showToast(pkgEditing ? 'Package updated!' : 'Package added!')
    setPkgFormOpen(false)
    load()
  }
  async function deletePackage(p) {
    if (!window.confirm(`Delete package "${p.name}"? This will not affect existing bookings.`)) return
    const { error } = await supabase.from('packages').delete().eq('id', p.id)
    if (error) { showToast('Delete failed: ' + error.message); return }
    showToast('Package deleted')
    load()
  }


  // --- Package composition helpers ---
  function isRoomInComp(name) {
    return (compForm.rooms || []).some(r => r.name === name)
  }
  function toggleRoomInComp(name) {
    const exists = isRoomInComp(name)
    if (exists) {
      const nextRooms = (compForm.rooms || []).filter(r => r.name !== name)
      setCompForm({ ...compForm, rooms: nextRooms })
      return
    }
    const nextRooms = [...(compForm.rooms || []), { name, qty: 1 }]
    // suggest persons from room max_persons when available and persons is default/1
    const rEntry = roomInventory?.[name]
    let suggestedPersons = compForm.persons || 1
    if (rEntry) {
      const mp = rEntry.max_persons
      const n = typeof mp === 'number' ? mp : (Number(mp) || NaN)
      if (!isNaN(n) && (!compForm.persons || Number(compForm.persons) <= 1)) {
        suggestedPersons = n
      }
    }
    setCompForm({ ...compForm, rooms: nextRooms, persons: suggestedPersons })
  }
  function setRoomQty(name, qty) {
    const next = (compForm.rooms || []).map(r => r.name === name ? { ...r, qty: Math.max(0, Number(qty) || 0) } : r)
    setCompForm({ ...compForm, rooms: next })
  }

  function computeCompositionPrice(comp = compForm) {
    let total = 0
    ;(comp.addons || []).forEach(a => {
      total += Number(a.price || 0) * Number(a.qty || 0)
    })
    return total
  }

  function computeRoomSelectionPrice(comp = compForm) {
    let total = 0
    ;(comp.rooms || []).forEach(r => {
      const entry = roomInventory?.[r.name]
      if (entry) total += Number(entry.price || 0) * Number(r.qty || 0)
    })
    return total
  }

  function computePackageFormTotal() {
    const addonTotal = computeCompositionPrice()
    if (pkgForm.per_person) {
      const persons = Number(String(compForm.persons || '').replace(/[^0-9]/g, '')) || 1
      return Number(pkgForm.price || 0) * persons + addonTotal
    }
    return computeRoomSelectionPrice() + addonTotal
  }

  function computePackageCompositionPrice(pkg) {
    const comp = getCompositionForPackage(packageCompositions, pkg)
    return computeCompositionPrice(comp)
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <i className="fas fa-arrow-left text-gray-600"></i>
        </button>
        <h2 className="text-xl font-bold">Package Details</h2>
      </div>

      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setTab('packages')}
          className={`expense-tab flex-1 py-3 text-sm font-semibold ${tab === 'packages' ? 'active text-teal-700' : 'text-gray-500'}`}
        >
          Packages
        </button>
        <button
          onClick={() => setTab('rooms')}
          className={`expense-tab flex-1 py-3 text-sm font-semibold ${tab === 'rooms' ? 'active text-teal-700' : 'text-gray-500'}`}
        >
          Rooms
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner border-teal-700 border-t-transparent"></div></div>
      ) : tab === 'packages' ? (
        <div className="space-y-3">
          <button onClick={openAddPackage} className="btn-primary w-full text-white font-semibold py-3 rounded-xl text-sm">
            <i className="fas fa-plus mr-1"></i> Add New Package
          </button>
          {packages.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-tags text-4xl text-gray-300 mb-3"></i>
              <p className="text-gray-400 text-sm">No packages yet — add your first one</p>
            </div>
          ) : (
            packages.map((p) => {
              const addonTotal = computePackageCompositionPrice(p)
              const comp = getCompositionForPackage(packageCompositions, p)
              const stayCount = Number(comp?.persons || 1)
              const roomPrice = (comp?.rooms || []).reduce((sum, r) => {
                const entry = roomInventory?.[r.name]
                return sum + (entry ? Number(entry.price || 0) * Number(r.qty || 0) : 0)
              }, 0)
              const packageTotal = p.per_person
                ? Number(p.price || 0) * stayCount + addonTotal
                : roomPrice + addonTotal
              return (
                <div key={p.id} className="card p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <h4 className="font-semibold text-sm">{p.name}</h4>
                      <p className="text-xs text-gray-500">{p.per_person ? `Rs. ${p.price} per person` : `Rs. ${p.price} flat`}</p>
                      <p className="text-xs text-gray-700 mt-1">Package total: Rs. {packageTotal}</p>
                      {addonTotal > 0 && (
                        <p className="text-xs text-gray-700 mt-1">Add-on total: Rs. {addonTotal}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditPackage(p)} className="text-xs bg-teal-100 text-teal-700 px-3 py-1.5 rounded-lg font-semibold">
                        <i className="fas fa-edit mr-1"></i> Edit
                      </button>
                      <button onClick={() => deletePackage(p)} className="text-xs bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg font-semibold">
                        <i className="fas fa-trash-alt mr-1"></i> Delete
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Total {stayCount} person{stayCount !== 1 ? 's' : ''} can stay</p>
                </div>
              )
            })
          )}
        </div>
      ) : tab === 'rooms' ? (
        <div className="space-y-3">
          <button onClick={openAddRoom} className="btn-primary w-full text-white font-semibold py-3 rounded-xl text-sm">
            <i className="fas fa-plus mr-1"></i> Add Room
          </button>
          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            <p className="font-semibold text-gray-800">Room availability</p>
            <p className="mt-1 text-xs text-gray-500">This section shows current inventory availability for each room type. Use Add Booking to check date-specific availability.</p>
          </div>
          {Object.keys(roomInventory || {}).length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-bed text-4xl text-gray-300 mb-3"></i>
              <p className="text-gray-400 text-sm">No rooms yet — add room types such as Deluxe, Suite, or Couple Room.</p>
            </div>
          ) : (
            Object.values(roomInventory).map((r) => (
              <div key={r.name} className="card p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm truncate">{r.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">Rs. {r.price} / {r.unit_label || getUnitLabel(r.pricing_type)}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full bg-teal-50 text-teal-700 px-2 py-1">Available: {r.available}/{r.total}</span>
                      <span className="rounded-full bg-gray-100 text-gray-700 px-2 py-1">Max {r.max_persons} pax</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditRoom(r.name)} className="text-xs bg-teal-100 text-teal-700 px-3 py-1.5 rounded-lg font-semibold">
                      <i className="fas fa-edit mr-1"></i> Edit
                    </button>
                    <button onClick={() => deleteRoomByName(r.name)} className="text-xs bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg font-semibold">
                      <i className="fas fa-trash-alt mr-1"></i> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {/* Package add/edit modal */}
      <Modal open={pkgFormOpen} onClose={() => setPkgFormOpen(false)} title={pkgEditing ? 'Edit Package' : 'Add Package'}>
        <form onSubmit={savePackage} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">Package Name *</label>
            <input
              type="text"
              value={pkgForm.name}
              onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })}
              className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
              placeholder="e.g., Per Person Package"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Price (Rs.) *</label>
            <input
              type="number"
              min="0"
              value={pkgForm.price}
              onChange={(e) => setPkgForm({ ...pkgForm, price: e.target.value })}
              className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={pkgForm.per_person}
              onChange={(e) => setPkgForm({ ...pkgForm, per_person: e.target.checked })}
              className="w-4 h-4 accent-teal-700"
            />
            Per person pricing (total = price × guests)
          </label>
          <div>
            <label className="text-xs font-semibold text-gray-500">Description (optional)</label>
            <input
              type="text"
              value={pkgForm.description}
              onChange={(e) => setPkgForm({ ...pkgForm, description: e.target.value })}
              className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
              placeholder="Short description"
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <h4 className="font-semibold text-sm">Compose Package</h4>
            <p className="text-xs text-gray-500">Select rooms to include in this package.</p>

            <div className="mt-3">
              <label className="text-xs font-semibold text-gray-500">Number of persons</label>
              <input type="text" value={compForm.persons || ''} onChange={(e)=>setCompForm({...compForm, persons: e.target.value})} className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm" placeholder="e.g. 2 persons, 1-3 guests, family of 4" />

              <label className="text-xs font-semibold text-gray-500 mt-3 block">Rooms</label>
              <div className="space-y-2 mt-2">
                {Object.values(roomInventory || {}).length === 0 ? (
                  <p className="text-xs text-gray-400">No rooms available</p>
                ) : Object.values(roomInventory).map((r) => (
                  <div key={r.name} className="flex items-center gap-2">
                    <input type="checkbox" checked={isRoomInComp(r.name)} onChange={() => toggleRoomInComp(r.name)} className="w-4 h-4" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm">{r.name} <span className="text-xs text-gray-500">(Rs. {r.price})</span></div>
                        {isRoomInComp(r.name) && (
                          <input type="number" min="0" value={(compForm.rooms.find(x=>x.name===r.name)?.qty)||1} onChange={(e)=>setRoomQty(r.name, e.target.value)} className="w-20 input-field px-2 py-1 rounded-lg" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm">Add-on</h4>
                  <p className="text-xs text-gray-500">Add a price item directly into this package.</p>
                </div>
                <button type="button" onClick={() => setCompForm({ ...compForm, addons: [...(compForm.addons || []), { id: Date.now(), name: '', price: 0, qty: 1, unit_label: '' }] })} className="text-xs bg-teal-100 text-teal-700 px-3 py-1.5 rounded-lg font-semibold">
                  + Add Add-on
                </button>
              </div>
              <div className="space-y-3 mt-3">
                {(compForm.addons || []).map((addon, index) => (
                  <div key={addon.id} className="grid grid-cols-[1fr_auto] gap-3 items-center rounded-xl border border-gray-200 p-3">
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-gray-500">Name</label>
                        <input type="text" value={addon.name} onChange={(e) => {
                          const next = [...compForm.addons]
                          next[index] = { ...next[index], name: e.target.value }
                          setCompForm({ ...compForm, addons: next })
                        }} className="input-field w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 text-sm" placeholder="Add-on name" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold uppercase text-gray-500">Price</label>
                          <input type="number" min="0" value={addon.price} onChange={(e) => {
                            const next = [...compForm.addons]
                            next[index] = { ...next[index], price: Number(e.target.value) }
                            setCompForm({ ...compForm, addons: next })
                          }} className="input-field w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 text-sm" placeholder="0" />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase text-gray-500">Unit label</label>
                          <input type="text" value={addon.unit_label} onChange={(e) => {
                            const next = [...compForm.addons]
                            next[index] = { ...next[index], unit_label: e.target.value }
                            setCompForm({ ...compForm, addons: next })
                          }} className="input-field w-full mt-1 px-3 py-2 rounded-xl bg-gray-50 text-sm" placeholder="per person" />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => {
                          const next = [...compForm.addons]
                          next[index] = { ...next[index], qty: Math.max(0, Number(next[index].qty || 0) - 1) }
                          setCompForm({ ...compForm, addons: next })
                        }} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700">-</button>
                        <span className="text-sm w-8 text-center">{addon.qty}</span>
                        <button type="button" onClick={() => {
                          const next = [...compForm.addons]
                          next[index] = { ...next[index], qty: Number(next[index].qty || 0) + 1 }
                          setCompForm({ ...compForm, addons: next })
                        }} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700">+</button>
                      </div>
                      <button type="button" onClick={() => {
                        const next = (compForm.addons || []).filter((_, i) => i !== index)
                        setCompForm({ ...compForm, addons: next })
                      }} className="text-[10px] text-rose-600 font-semibold">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <p className="text-sm font-semibold">Package total: Rs. {computePackageFormTotal()}</p>
              {(compForm.addons || []).length > 0 && (
                <p className="text-xs text-gray-500 mt-1">Add-on total: Rs. {computeCompositionPrice()}</p>
              )}
            </div>
          </div>
          <button type="submit" className="btn-primary w-full text-white font-semibold py-3 rounded-xl text-sm">
            <i className="fas fa-save mr-1"></i> {pkgEditing ? 'Update Package' : 'Add Package'}
          </button>
        </form>
      </Modal>

      {/* Room add/edit modal */}
      <Modal open={roomModalOpen} onClose={() => setRoomModalOpen(false)} title={roomEditing ? 'Edit Room' : 'Add Room'}>
        <form onSubmit={saveRoom} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">Room Type Name *</label>
            <input
              type="text"
              value={roomForm.name}
              onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
              className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
              placeholder="e.g., Deluxe, Suite"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Price (Rs.)</label>
            <input
              type="number"
              min="0"
              value={roomForm.price}
              onChange={(e) => setRoomForm({ ...roomForm, price: e.target.value })}
              className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Price Per (unit label)</label>
            <input
              type="text"
              value={roomForm.unit_label}
              onChange={(e) => setRoomForm({ ...roomForm, unit_label: e.target.value })}
              className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm"
              placeholder="e.g., per night, per person, per room"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Max Persons</label>
              <input type="text" value={roomForm.max_persons} onChange={(e) => setRoomForm({ ...roomForm, max_persons: e.target.value })} className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm" placeholder="e.g., 2 or 2-3 or 10-12" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Total Count</label>
              <input type="number" min="0" value={roomForm.total} onChange={(e) => setRoomForm({ ...roomForm, total: e.target.value })} className="input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm" />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full text-white font-semibold py-3 rounded-xl text-sm">{roomEditing ? 'Update Room' : 'Add Room'}</button>
        </form>
      </Modal>

    </div>
  )
}


