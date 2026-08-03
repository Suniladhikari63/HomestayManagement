import Modal from './Modal'
import { HOMESTAY } from '../config'

export default function ReportBillingModal({ open, onClose, title, records, type, periodLabel }) {
  if (!open) return null

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  function amountOf(r) {
    if (type === 'purchases') return Number(r.total || 0)
    if (type === 'payroll') return Number(r.total || 0)
    return Number(r.amount || 0)
  }

  const grandTotal = records.reduce((a, r) => a + amountOf(r), 0)
  const categoryLabel = (c) => (c || '').split('_').join(' ').replace(/\b\w/g, (m) => m.toUpperCase())
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const monthYear = (r) => `${MONTHS[(r.month - 1)] || ''} ${r.year || ''}`

  function printReport() {
    const rows = records
      .map((r, i) => {
        if (type === 'sales') {
          const items = (r.items || []).map((it) => `${it.name} x${it.qty}`).join(', ') || '—'
          return `<tr><td>${i + 1}</td><td>${r.date || '—'}</td><td>${r.guest_name || 'Guest'}</td><td>${items}</td><td class="amt">Rs. ${amountOf(r).toLocaleString()}</td></tr>`
        }
        if (type === 'purchases') {
          return `<tr><td>${i + 1}</td><td>${r.date || '—'}</td><td>${r.item || '—'}</td><td>${r.vendor || '—'}</td><td>${r.quantity || 0} ${r.unit || ''}</td><td class="amt">Rs. ${Number(r.unit_price || 0).toLocaleString()}</td><td class="amt">Rs. ${amountOf(r).toLocaleString()}</td></tr>`
        }
        if (type === 'payroll') {
          return `<tr><td>${i + 1}</td><td>${r.paid_date || '—'}</td><td>${r.staff?.name || '—'}</td><td>${monthYear(r)}</td><td class="amt">Rs. ${Number(r.amount || 0).toLocaleString()}</td><td class="amt">Rs. ${Number(r.bonus || 0).toLocaleString()}</td><td class="amt">Rs. ${amountOf(r).toLocaleString()}</td></tr>`
        }
        return `<tr><td>${i + 1}</td><td>${r.date || '—'}</td><td>${categoryLabel(r.category)}</td><td>${r.payee || '—'}</td><td>${r.description || '—'}</td><td class="amt">Rs. ${amountOf(r).toLocaleString()}</td></tr>`
      })
      .join('')

    const colHead =
      type === 'sales'
        ? '<th>#</th><th>Date</th><th>Guest</th><th>Items</th><th class="amt">Amount</th>'
        : type === 'purchases'
        ? '<th>#</th><th>Date</th><th>Item</th><th>Vendor</th><th>Qty</th><th class="amt">Unit Price</th><th class="amt">Total</th>'
        : type === 'payroll'
        ? '<th>#</th><th>Paid Date</th><th>Staff</th><th>Month</th><th class="amt">Salary</th><th class="amt">Bonus</th><th class="amt">Total</th>'
        : '<th>#</th><th>Date</th><th>Category</th><th>Payee</th><th>Description</th><th class="amt">Amount</th>'

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1f2937; }
  .header { text-align: center; border-bottom: 3px solid #0f766e; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { margin: 0; font-size: 28px; color: #0f766e; letter-spacing: 2px; }
  .header p { margin: 4px 0; color: #6b7280; font-size: 13px; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; color: #374151; }
  .meta b { color: #0f766e; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; }
  th { background: #f0fdfa; color: #0f766e; font-size: 12px; text-transform: uppercase; }
  td.amt, th.amt { text-align: right; }
  tr:nth-child(even) { background: #f9fafb; }
  .total { margin-top: 20px; text-align: right; font-size: 18px; font-weight: 700; color: #0f766e; }
  .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 11px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
</style>
</head>
<body>
  <div class="header">
    <h1>${HOMESTAY.name.toUpperCase()}</h1>
    <p>${HOMESTAY.address}</p>
    <p><a href="${HOMESTAY.phoneHref}">${HOMESTAY.phone}</a> &nbsp;&middot;&nbsp; <a href="${HOMESTAY.whatsappHref}" target="_blank">WhatsApp</a> &nbsp;&middot;&nbsp; <a href="${HOMESTAY.emailHref}">${HOMESTAY.email}</a></p>
  </div>
  <div class="meta">
    <div><b>Report:</b> ${title}</div>
    <div><b>Period:</b> ${periodLabel || '—'}</div>
    <div><b>Generated:</b> ${today}</div>
    <div><b>Records:</b> ${records.length}</div>
  </div>
  <table>
    <thead><tr>${colHead}</tr></thead>
    <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#9ca3af;">No records</td></tr>'}</tbody>
  </table>
  <div class="total">Grand Total: Rs. ${grandTotal.toLocaleString()}</div>
<div class="footer">Thank you for your business</div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {/* Billing header */}
        <div className="text-center border-b-2 border-teal-700 pb-3">
          <h2 className="text-xl font-bold text-teal-700 tracking-widest">{HOMESTAY.name.toUpperCase()}</h2>
          <p className="text-[10px] text-gray-500">
            <a href={HOMESTAY.mapsUrl} target="_blank" rel="noreferrer" className="text-teal-700 hover:underline">
              <i className="fas fa-map-marker-alt mr-1"></i>{HOMESTAY.address}
            </a>
          </p>
          <p className="text-[10px] text-gray-500 flex flex-wrap justify-center gap-x-2">
            <a href={HOMESTAY.phoneHref} className="text-teal-700 hover:underline"><i className="fas fa-phone mr-1"></i>{HOMESTAY.phone}</a>
            <a href={HOMESTAY.whatsappHref} target="_blank" rel="noreferrer" className="text-green-600 hover:underline"><i className="fab fa-whatsapp mr-1"></i>WhatsApp</a>
            <a href={HOMESTAY.emailHref} className="text-teal-700 hover:underline"><i className="fas fa-envelope mr-1"></i>{HOMESTAY.email}</a>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div><span className="text-gray-400">Report:</span> <b className="text-teal-700">{title}</b></div>
          <div><span className="text-gray-400">Period:</span> <b>{periodLabel || '—'}</b></div>
          <div><span className="text-gray-400">Generated:</span> <b>{today}</b></div>
          <div><span className="text-gray-400">Records:</span> <b>{records.length}</b></div>
        </div>

        {/* Records table */}
        <div className="overflow-x-auto border rounded-xl">
          {records.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No records found</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-teal-50 text-teal-700 uppercase text-[10px] border-b border-gray-100">
                  <th className="text-left py-2 px-2">#</th>
                  <th className="text-left py-2 px-2">Date</th>
                  {type === 'sales' && <th className="text-left py-2 px-2">Guest</th>}
                  {type === 'purchases' && <th className="text-left py-2 px-2">Item</th>}
                  {type === 'operations' && <th className="text-left py-2 px-2">Category</th>}
                  {type === 'payroll' && <th className="text-left py-2 px-2">Staff</th>}
                  {type === 'sales' && <th className="text-left py-2 px-2">Items</th>}
                  {type === 'purchases' && <th className="text-left py-2 px-2">Vendor</th>}
                  {type === 'operations' && <th className="text-left py-2 px-2">Payee</th>}
                  {type === 'operations' && <th className="text-left py-2 px-2">Description</th>}
                  {type === 'payroll' && <th className="text-left py-2 px-2">Month</th>}
                  {type === 'purchases' && <th className="text-center py-2 px-2">Qty</th>}
                  {type === 'purchases' && <th className="text-right py-2 px-2">Rate</th>}
                  {type === 'payroll' && <th className="text-right py-2 px-2">Salary</th>}
                  {type === 'payroll' && <th className="text-right py-2 px-2">Bonus</th>}
                  <th className="text-right py-2 px-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.id} className="border-b border-gray-50 even:bg-gray-50">
                    <td className="py-2 px-2 text-gray-400">{i + 1}</td>
                    <td className="py-2 px-2">{type === 'payroll' ? (r.paid_date || '—') : (r.date || '—')}</td>
                    {type === 'sales' && <td className="py-2 px-2 font-medium">{r.guest_name || 'Guest'}</td>}
                    {type === 'purchases' && <td className="py-2 px-2 font-medium">{r.item || '—'}</td>}
                    {type === 'operations' && <td className="py-2 px-2 capitalize">{categoryLabel(r.category)}</td>}
                    {type === 'payroll' && <td className="py-2 px-2 font-medium">{r.staff?.name || '—'}</td>}
                    {type === 'sales' && (
                      <td className="py-2 px-2 text-gray-500">
                        {(r.items || []).map((it) => `${it.name} x${it.qty}`).join(', ') || '—'}
                      </td>
                    )}
                    {type === 'purchases' && <td className="py-2 px-2">{r.vendor || '—'}</td>}
                    {type === 'operations' && <td className="py-2 px-2">{r.payee || '—'}</td>}
                    {type === 'operations' && <td className="py-2 px-2 text-gray-500">{r.description || '—'}</td>}
                    {type === 'payroll' && <td className="py-2 px-2 capitalize">{monthYear(r)}</td>}
                    {type === 'purchases' && (
                      <td className="py-2 px-2 text-center">{r.quantity || 0} {r.unit || ''}</td>
                    )}
                    {type === 'purchases' && <td className="py-2 px-2 text-right">Rs. {Number(r.unit_price || 0).toLocaleString()}</td>}
                    {type === 'payroll' && <td className="py-2 px-2 text-right">Rs. {Number(r.amount || 0).toLocaleString()}</td>}
                    {type === 'payroll' && <td className="py-2 px-2 text-right">Rs. {Number(r.bonus || 0).toLocaleString()}</td>}
                    <td className="py-2 px-2 text-right font-semibold">Rs. {amountOf(r).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-teal-50">
                  <td colSpan="1" className="py-2 px-2"></td>
                  <td colSpan={type === 'sales' || type === 'operations' ? 4 : type === 'payroll' ? 5 : 5} className="py-2 px-2 font-semibold text-teal-800 text-right">Grand Total</td>
                  <td className="py-2 px-2 text-right font-bold text-teal-700">Rs. {grandTotal.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <button
          onClick={printReport}
          className="w-full bg-gray-800 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          <i className="fas fa-print"></i> Print / Save as PDF
        </button>
      </div>
    </Modal>
  )
}

