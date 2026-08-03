import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import Modal from './Modal'
import amountToWords from '../utils/amountToWords'
import { HOMESTAY } from '../config'

async function loadSignature(businessId) {
  if (!businessId) return ''
  const { data, error } = await supabase
    .from('business_signatures')
    .select('signature_data')
    .eq('business_id', businessId)
    .maybeSingle()

  if (error) throw error
  return data?.signature_data || ''
}

async function saveSignature(businessId, signatureData) {
  if (!businessId) return
  const { error } = await supabase
    .from('business_signatures')
    .upsert({ business_id: businessId, signature_data: signatureData }, { onConflict: 'business_id' })

  if (error) throw error
}

export default function BookingDetail({ booking, onClose, onComplete, inventory, refresh }) {
  const { showToast } = useToast()
  const { activeBusiness } = useAuth()
  const [kotItems, setKotItems] = useState(booking.kot_items || [])
  const [discount, setDiscount] = useState(booking.discount || 0)
  const [extras, setExtras] = useState([]) // { name, qty, rate } for extra guests/rooms
const [billedBy, setBilledBy] = useState('')
  const [globalSignature, setGlobalSignature] = useState('')
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showBill, setShowBill] = useState(false)

  const baseGuests = booking.total_guests || 1
  const existingAddons = booking.add_ons || []
  const addonsTotal = existingAddons.reduce((a, ad) => a + (Number(ad.qty || 0) * Number(ad.price || 0)), 0)
  const packagePrice = Number(booking.package_price || booking.total_price || 0)
  const advance = Number(booking.advance || 0)

  const kotSubtotal = kotItems.reduce((a, i) => a + Number(i.amount || 0), 0)
  const extrasTotal = extras.reduce((a, e) => a + (Number(e.qty || 0) * Number(e.rate || 0)), 0)
  const subtotal = packagePrice + addonsTotal + extrasTotal + kotSubtotal
  const discountVal = Number(discount) || 0
  const grandTotal = Math.max(0, subtotal - discountVal)
  const totalPayable = Math.max(0, grandTotal - advance)
  const checkoutStamp = new Date()
  const billDate = checkoutStamp.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const billTime = checkoutStamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const invoiceNo = `INV-${String(booking.id).padStart(5, '0')}`
  const amountInWords = amountToWords(totalPayable).toUpperCase()

  useEffect(() => {
    if (!activeBusiness?.id) return
    loadSignature(activeBusiness.id)
      .then(setGlobalSignature)
      .catch((err) => showToast('Could not load signature: ' + err.message))
  }, [activeBusiness?.id])

  // ----- Editable KOT -----
  function updateRow(index, field, value) {
    const rows = [...kotItems]
    rows[index][field] = value
    rows[index].amount = Number(rows[index].qty || 0) * Number(rows[index].rate || 0)
    setKotItems(rows)
  }
  function addRow() { setKotItems([...kotItems, { name: 'New Item', qty: 1, rate: 0, amount: 0 }]) }
  function removeRow(index) { setKotItems(kotItems.filter((_, i) => i !== index)) }

  // ----- Extra guests / rooms -----
  function addExtra(name, defaultRate) {
    setExtras([...extras, { name, qty: 1, rate: defaultRate }])
  }
  function updateExtra(idx, field, value) {
    const rows = [...extras]
    rows[idx][field] = field === 'qty' ? (parseFloat(value) || 0) : (parseFloat(value) || 0)
    setExtras(rows)
  }
  function removeExtra(idx) { setExtras(extras.filter((_, i) => i !== idx)) }

  const mergedAddons = [...existingAddons, ...extras]

  // ----- Save edits -----
  async function saveEdits() {
    setSaving(true)
    const { error } = await supabase.from('bookings').update({
      kot_items: kotItems,
      subtotal,
      discount: discountVal,
      add_ons: mergedAddons,
      advance,
      package_price: packagePrice,
      total: grandTotal
    }).eq('id', booking.id)
    setSaving(false)
    if (error) { showToast('Save failed: ' + error.message); return }
    showToast('Saved successfully!')
    refresh()
    onClose()
  }

  // ----- Print bill -----
  function printBill() {
    const lineRows = buildLineItems()
    const bodyRows = lineRows.map((r, i) => `
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td>${r.name}</td>
        <td style="text-align:center;">${r.qty}</td>
        <td style="text-align:right;">${Number(r.rate).toLocaleString()}</td>
        <td style="text-align:right;">${Number(r.amount).toLocaleString()}</td>
      </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center;">No items</td></tr>'

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${invoiceNo}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 32px; color: #1f2937; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f766e; padding-bottom: 14px; }
  .brand h1 { margin: 0; font-size: 28px; color: #0f766e; letter-spacing: 3px; }
  .brand .contacts { margin-top: 8px; font-size: 12px; color: #4b5563; }
  .brand .contacts div { margin: 2px 0; }
  .brand .contacts a { color: #0f766e; text-decoration: none; }
  .meta { text-align: right; font-size: 13px; }
  .meta .inv { font-size: 18px; font-weight: 800; color: #0f766e; }
  .meta .cust { margin-top: 8px; border-top: 1px dashed #d1d5db; padding-top: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 18px; }
  th, td { border: 1px solid #d1d5db; padding: 7px 10px; }
  th { background: #f0fdfa; color: #0f766e; font-size: 11px; text-transform: uppercase; }
  .bottom { display: flex; justify-content: space-between; gap: 20px; margin-top: 20px; }
  .words { flex: 1; font-size: 12px; }
  .words .label { color: #6b7280; font-size: 11px; text-transform: uppercase; }
  .words .val { font-weight: 700; color: #0f766e; margin-top: 4px; font-size: 13px; }
  .totals { width: 300px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals .grand { font-size: 17px; font-weight: 800; color: #0f766e; border-top: 2px solid #0f766e; margin-top: 4px; padding-top: 8px; }
  .footer { margin-top: 56px; display: flex; justify-content: space-between; text-align: center; font-size: 12px; color: #4b5563; }
  .sig { width: 220px; }
  .sig img { width: 160px; height: 50px; object-fit: contain; }
  .signline { border-top: 1px solid #9ca3af; margin-top: 46px; padding-top: 6px; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>${HOMESTAY.name.toUpperCase()}</h1>
      <div class="contacts">
        <div><a href="${HOMESTAY.mapsUrl}">${HOMESTAY.address}</a></div>
        <div><a href="${HOMESTAY.phoneHref}">${HOMESTAY.phone}</a> &nbsp;&middot;&nbsp; <a href="${HOMESTAY.whatsappHref}" target="_blank">WhatsApp</a> &nbsp;&middot;&nbsp; <a href="${HOMESTAY.emailHref}">${HOMESTAY.email}</a></div>
      </div>
    </div>
    <div class="meta">
      <div class="inv">${invoiceNo}</div>
      <div>${billDate} &middot; ${billTime}</div>
      <div class="cust"><b>Guest:</b> ${booking.guest_name}<br><b>Contact:</b> ${booking.contact_no || '—'}</div>
    </div>
  </div>
  <table>
    <thead><tr><th style="width:40px;">S.N</th><th>Particular</th><th style="width:60px;">Qty</th><th style="width:90px;">Rate</th><th style="width:100px;">Amount</th></tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div class="bottom">
    <div class="words">
      <div class="label">Amount in Words</div>
      <div class="val">${amountInWords}</div>
    </div>
    <div class="totals">
      <div><span>Subtotal</span><b>Rs. ${subtotal.toLocaleString()}</b></div>
      ${discountVal > 0 ? `<div><span>Discount</span><b>- Rs. ${discountVal.toLocaleString()}</b></div>` : ''}
      ${advance > 0 ? `<div><span>Advance Paid</span><b>- Rs. ${advance.toLocaleString()}</b></div>` : ''}
      <div class="grand"><span>Total Payable</span><span>Rs. ${totalPayable.toLocaleString()}</span></div>
    </div>
  </div>
<div class="footer">
    <div class="sig">
      <div><b>Billed by</b></div>
      <div class="signline" style="margin-top:32px;">${billedBy || '________________________'}</div>
    </div>
    <div class="sig">
      <div><b>Signature</b></div>
      ${globalSignature ? `<img src="${globalSignature}" alt="signature" style="width:160px;height:50px;object-fit:contain;margin-top:4px;">` : '<div class="signline">________________________</div>'}
    </div>
  </div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
  }

  function buildLineItems() {
    const items = [
      { name: `${booking.package_option} (${baseGuests} guest${baseGuests > 1 ? 's' : ''})`, qty: 1, rate: packagePrice, amount: packagePrice },
      ...existingAddons.filter(a => (Number(a.qty || 0) * Number(a.price || 0)) > 0).map(a => ({
        name: `Add-on: ${a.name}`, qty: a.qty, rate: a.price, amount: Number(a.qty || 0) * Number(a.price || 0)
      })),
      ...extras.filter(e => (Number(e.qty || 0) * Number(e.rate || 0)) > 0).map(e => ({
        name: e.name, qty: e.qty, rate: e.rate, amount: Number(e.qty || 0) * Number(e.rate || 0)
      })),
      ...kotItems.filter(i => Number(i.amount || 0) > 0).map(i => ({
        name: i.name, qty: i.qty || 0, rate: i.rate || 0, amount: Number(i.amount || 0)
      }))
    ]
    return items.filter(i => Number(i.amount) > 0)
  }

  // ----- Send to sales + complete -----
  async function finalizeCheckout() {
    setProcessing(true)
    // First persist edits to the booking
    const { error: bookErr0 } = await supabase.from('bookings').update({
      kot_items: kotItems,
      subtotal,
      discount: discountVal,
      add_ons: mergedAddons,
      advance,
      total: grandTotal
    }).eq('id', booking.id)
    if (bookErr0) { setProcessing(false); showToast('Save failed: ' + bookErr0.message); return }

    const sale = {
      guest_name: booking.guest_name,
      items: buildLineItems(),
      amount: grandTotal,
      date: checkoutStamp.toISOString().slice(0, 10),
      booking_id: booking.id,
      business_id: activeBusiness?.id
    }
    const { error: saleErr } = await supabase.from('sales').insert(sale)
    if (saleErr) { setProcessing(false); showToast('Send failed: ' + saleErr.message); return }
    const { error: bookErr } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', booking.id)
    setProcessing(false)
    if (bookErr) { showToast('Sale saved but booking update failed: ' + bookErr.message); refresh(); onClose(); return }
    showToast('Sent to Sales & booking completed!')
    refresh()
    onClose()
  }

  async function markCompletedOnly() {
    setProcessing(true)
    const { error } = await supabase.from('bookings').update({
      status: 'completed',
      kot_items: kotItems,
      subtotal,
      discount: discountVal,
      add_ons: mergedAddons,
      advance,
      total: grandTotal
    }).eq('id', booking.id)
    setProcessing(false)
    if (error) { showToast('Failed: ' + error.message); return }
    showToast('Booking marked completed')
    refresh()
    onClose()
  }

  return (
    <Modal open={true} onClose={onClose} title={showBill ? 'Checkout Bill' : 'Booking Details'}>
      {!showBill ? (
        <div className="space-y-4">
          {/* Guest header */}
          <div className="flex items-center gap-3 mb-4">
            {booking.photo ? (
              <img src={booking.photo} alt="Guest" className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <div className="w-16 h-16 bg-teal-100 rounded-xl flex items-center justify-center text-teal-700 font-bold text-xl">
                {booking.guest_name.charAt(0)}
              </div>
            )}
            <div>
              <h4 className="font-bold text-lg">{booking.guest_name}</h4>
              <p className="text-sm text-gray-500">{booking.contact_no}</p>
              <span className={`status-badge status-${booking.status} mt-1 inline-block`}>{booking.status}</span>
            </div>
          </div>

          {booking.id_photo && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-semibold">ID Photo:</span>
              <img src={booking.id_photo} alt="ID" className="w-20 h-14 rounded-lg object-cover" />
            </div>
          )}

          {/* Stay info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 p-3 rounded-xl">
              <p className="text-xs text-gray-500">Check-in</p>
              <p className="font-semibold">{booking.check_in ? new Date(booking.check_in).toLocaleString() : '—'}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl">
              <p className="text-xs text-gray-500">Check-out</p>
              <p className="font-semibold">{booking.check_out ? new Date(booking.check_out).toLocaleString() : '—'}</p>
            </div>
          </div>

          {/* Package / Guests section */}
          <div className="bg-teal-50 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-teal-800 uppercase tracking-wider">Package & Guests</h4>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Package: {booking.package_option}</span>
              <span className="font-semibold">Rs. {packagePrice.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm bg-white/60 rounded-lg px-3 py-2">
              <span className="text-gray-600">Base Guests ({booking.booking_type || 'Night Stay'})</span>
              <span className="font-bold text-teal-700">{baseGuests}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => addExtra('Extra Guest', 500)}
                className="bg-teal-700 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
              >
                <i className="fas fa-user-plus"></i> Add Extra Guest
              </button>
              <button
                type="button"
                onClick={() => addExtra('Couple Room', 500)}
                className="bg-teal-700 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
              >
                <i className="fas fa-bed"></i> Add Couple Room
              </button>
            </div>

            {/* Extras list (editable) */}
            {extras.length > 0 && (
              <div className="space-y-2">
                {extras.map((e, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white rounded-lg p-2 text-xs">
                    <span className="font-semibold w-24 truncate">{e.name}</span>
                    <input
                      type="number"
                      min="0"
                      value={e.qty}
                      onChange={(ev) => updateExtra(idx, 'qty', ev.target.value)}
                      className="w-12 text-center border border-gray-200 rounded px-1 py-1"
                      placeholder="Qty"
                    />
                    <input
                      type="number"
                      min="0"
                      value={e.rate}
                      onChange={(ev) => updateExtra(idx, 'rate', ev.target.value)}
                      className="w-20 text-right border border-gray-200 rounded px-1 py-1"
                      placeholder="Rate"
                    />
                    <button onClick={() => removeExtra(idx)} className="text-rose-400"><i className="fas fa-trash-alt"></i></button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-teal-700/70">Adjust qty & rate for each extra guest/room. They appear on the bill and in sales.</p>

            {addonsTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Add-ons</span>
                <span className="font-semibold">Rs. {addonsTotal.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Advance Paid</span>
              <span className="font-semibold">Rs. {advance.toLocaleString()}</span>
            </div>
          </div>

          {/* KOT & Billing */}
          <div className="card p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">KOT & Billing</h4>
              <button onClick={addRow} className="text-xs bg-teal-100 text-teal-700 px-3 py-1 rounded-lg font-semibold">
                <i className="fas fa-plus mr-1"></i> Add Item
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b text-[10px] uppercase tracking-wide">
                    <th className="text-left py-2 pr-2">Particular</th>
                    <th className="text-center py-2 px-1 w-12">Qty</th>
                    <th className="text-right py-2 px-1 w-14">Rate</th>
                    <th className="text-right py-2 px-1 w-16">Amount</th>
                    <th className="w-7"></th>
                  </tr>
                </thead>
                <tbody>
                  {kotItems.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-gray-400">No KOT items added</td>
                    </tr>
                  )}
                  {kotItems.map((item, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-1.5 pr-2">
                        <input
                          type="text"
                          className="w-full min-w-[90px] bg-gray-50 rounded px-2 py-1 text-xs border border-gray-100 focus:border-teal-500 focus:outline-none"
                          value={item.name}
                          onChange={(e) => updateRow(i, 'name', e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 px-1 text-center">
                        <input
                          type="number"
                          className="w-10 text-center bg-gray-50 rounded px-1 py-1 text-xs border border-gray-100 focus:border-teal-500 focus:outline-none"
                          value={item.qty}
                          onChange={(e) => updateRow(i, 'qty', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="py-1.5 px-1 text-right">
                        <input
                          type="number"
                          className="w-14 text-right bg-gray-50 rounded px-1 py-1 text-xs border border-gray-100 focus:border-teal-500 focus:outline-none"
                          value={item.rate}
                          onChange={(e) => updateRow(i, 'rate', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="py-1.5 px-1 text-right font-semibold">Rs.{Number(item.amount || 0).toLocaleString()}</td>
                      <td className="py-1.5 text-center">
                        <button onClick={() => removeRow(i)} className="text-rose-400 hover:text-rose-600">
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold">Rs. {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Discount</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-20 text-right border border-gray-200 rounded-lg px-2 py-1 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Advance Paid</span>
                <span className="font-semibold text-gray-700">− Rs. {advance.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold">Total Payable</span>
                <span className="font-bold text-lg text-teal-700">Rs. {totalPayable.toLocaleString()}</span>
              </div>
            </div>
          </div>

{/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={saveEdits}
              disabled={saving}
              className="btn-primary text-white font-semibold py-3 rounded-xl text-sm"
            >
              {saving ? <span className="spinner"></span> : <><i className="fas fa-save mr-1"></i> Save Edits</>}
            </button>
            <button
              onClick={() => { setShowBill(true) }}
              disabled={booking.status === 'completed'}
              className={`bg-green-600 text-white font-semibold py-3 rounded-xl text-sm ${booking.status === 'completed' ? 'opacity-50' : ''}`}
            >
              <i className="fas fa-sign-out-alt mr-1"></i> Checkout
            </button>
          </div>
        </div>
      ) : (
        /* ================= BILL VIEW ================= */
        <div className="space-y-4">
          <div className="border rounded-xl overflow-hidden bg-white">
            {/* Header */}
            <div className="px-4 py-4 border-b-2 border-teal-700 flex justify-between items-start gap-3">
              <div>
                <h2 className="text-xl font-bold text-teal-700 tracking-widest">{HOMESTAY.name.toUpperCase()}</h2>
                <div className="text-[10px] text-gray-500 space-y-0.5 mt-1">
                  <div>
                    <a href={HOMESTAY.mapsUrl} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">
                      <i className="fas fa-map-marker-alt mr-1"></i>{HOMESTAY.address}
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <a href={HOMESTAY.phoneHref} className="text-teal-700 hover:underline"><i className="fas fa-phone mr-1"></i>{HOMESTAY.phone}</a>
                    <a href={HOMESTAY.whatsappHref} target="_blank" rel="noreferrer" className="text-green-600 hover:underline"><i className="fab fa-whatsapp mr-1"></i>WhatsApp</a>
                    <a href={HOMESTAY.emailHref} className="text-teal-700 hover:underline"><i className="fas fa-envelope mr-1"></i>{HOMESTAY.email}</a>
                  </div>
                </div>
              </div>
              <div className="text-right text-xs text-gray-600 shrink-0">
                <p className="text-base font-extrabold text-teal-700">{invoiceNo}</p>
                <p>{billDate} &middot; <span className="font-semibold">{billTime}</span></p>
                <div className="mt-1 border-t border-dashed border-gray-300 pt-1">
                  <p><span className="text-gray-400">Guest:</span> <b>{booking.guest_name}</b></p>
                  <p><span className="text-gray-400">Contact:</span> {booking.contact_no || '—'}</p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-teal-50 text-teal-700 uppercase text-[10px] border-b border-gray-100">
                    <th className="text-center py-2 px-2 w-8">S.N</th>
                    <th className="text-left py-2 px-2">Particular</th>
                    <th className="text-center py-2 px-2 w-10">Qty</th>
                    <th className="text-right py-2 px-2 w-14">Rate</th>
                    <th className="text-right py-2 px-2 w-16">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {buildLineItems().length === 0 && (
                    <tr><td colSpan="5" className="text-center py-3 text-gray-400">No items</td></tr>
                  )}
                  {buildLineItems().map((it, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-1.5 px-2 text-center">{i + 1}</td>
                      <td className="py-1.5 px-2">{it.name}</td>
                      <td className="py-1.5 px-2 text-center">{it.qty}</td>
                      <td className="py-1.5 px-2 text-right">{Number(it.rate).toLocaleString()}</td>
                      <td className="py-1.5 px-2 text-right font-semibold">{Number(it.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom: words left, totals right */}
            <div className="px-4 py-3 flex flex-wrap gap-6 items-start">
              <div className="min-w-[160px] flex-1">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Amount in Words</p>
                <p className="text-xs font-bold text-teal-700 leading-snug">{amountInWords}</p>
              </div>
              <div className="w-52 ml-auto text-xs space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><b>Rs. {subtotal.toLocaleString()}</b></div>
                <div className="flex justify-between text-rose-600"><span>Discount</span><b>− Rs. {discountVal.toLocaleString()}</b></div>
                <div className="flex justify-between text-gray-600"><span>Advance Paid</span><b>− Rs. {advance.toLocaleString()}</b></div>
                <div className="flex justify-between border-t-2 border-teal-700 pt-1.5 text-teal-700">
                  <span className="font-bold">Total Payable</span>
                  <span className="font-extrabold text-base">Rs. {totalPayable.toLocaleString()}</span>
                </div>
              </div>
            </div>

{/* Billed by (left) + Signature (right) on one row */}
            <div className="px-4 py-4 border-t border-dashed border-gray-300">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold block mb-1">Billed By (name)</label>
                  <input
                    type="text"
                    value={billedBy}
                    onChange={(e) => setBilledBy(e.target.value)}
                    placeholder="e.g. Sunil, Ram, Sita..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div className="text-right">
                  <label className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold block mb-1">Signature</label>
                  <div className="flex items-center justify-end gap-3">
                    {globalSignature ? (
                      <div className="relative inline-block">
                        <img
                          src={globalSignature}
                          alt="Signature"
                          className="h-14 rounded-lg border border-gray-200 object-contain"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await saveSignature(activeBusiness?.id, '')
                              setGlobalSignature('')
                            } catch (err) {
                              showToast('Failed to remove signature: ' + err.message)
                            }
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs text-gray-500 hover:bg-gray-100 transition">
                        <i className="fas fa-upload"></i> Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = async (ev) => {
                                const dataUrl = ev.target.result
                                try {
                                  await saveSignature(activeBusiness?.id, dataUrl)
                                  setGlobalSignature(dataUrl)
                                } catch (err) {
                                  showToast('Could not save signature: ' + err.message)
                                }
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-gray-400 mt-2 text-center">Signature is saved in your browser and appears on every bill automatically.</p>
            </div>
          </div>

          {/* Bill actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={markCompletedOnly}
              disabled={processing}
              className="bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl text-sm"
            >
              {processing ? <span className="spinner border-gray-700 border-t-transparent"></span> : <><i className="fas fa-check-circle mr-1"></i> Mark as Completed</>}
            </button>
            <button
              onClick={finalizeCheckout}
              disabled={processing}
              className="bg-green-600 text-white font-semibold py-3 rounded-xl text-sm"
            >
              {processing ? <span className="spinner"></span> : <><i className="fas fa-paper-plane mr-1"></i> Send to Sales</>}
            </button>
          </div>
          <button
            onClick={printBill}
            className="w-full bg-gray-800 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <i className="fas fa-print"></i> Print Bill
          </button>
          <button onClick={() => setShowBill(false)} className="w-full text-teal-600 text-xs font-semibold py-1">
            ← Back to Edit
          </button>
        </div>
      )}
    </Modal>
  )
}

