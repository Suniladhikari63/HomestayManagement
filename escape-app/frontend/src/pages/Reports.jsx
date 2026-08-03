import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useHomestayData from '../hooks/useHomestayData'
import ReportBillingModal from '../components/ReportBillingModal'

// lightweight bar chart with pure SVG (no chart.js dependency needed)
function BarChart({ data, labels, color }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px] text-gray-500 font-semibold">Rs.{v.toLocaleString()}</span>
          <div
            className="w-full rounded-t-lg"
            style={{ height: `${Math.max((v / max) * 120, 4)}px`, background: color || '#0f766e' }}
          ></div>
          <span className="text-[9px] text-gray-400">{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

export default function Reports() {
  const navigate = useNavigate()
  const { sales, expenses, payroll, loading } = useHomestayData()
  const [period, setPeriod] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [billingReport, setBillingReport] = useState(null) // { type, title, records, periodLabel }

  // Build month groupings
  const monthLabels = {}
  const monthSales = {}
  const monthExpenses = {}
  const monthPurchases = {}

  sales.forEach((s) => {
    const key = (s.date || '').slice(0, 7)
    if (!key) return
    monthLabels[key] = key
    monthSales[key] = (monthSales[key] || 0) + Number(s.amount || 0)
  })
  expenses.forEach((e) => {
    const key = (e.date || '').slice(0, 7)
    if (!key) return
    monthLabels[key] = key
    if (e.type === 'purchase') monthPurchases[key] = (monthPurchases[key] || 0) + Number(e.total || 0)
    else monthExpenses[key] = (monthExpenses[key] || 0) + Number(e.amount || 0)
  })

  const months = Object.keys(monthLabels).sort().reverse()

  let startDate = new Date('2000-01-01')
  if (period === 'week') { startDate = new Date(); startDate.setDate(startDate.getDate() - 7) }
  if (period === 'month') { startDate = new Date(); startDate.setMonth(startDate.getMonth() - 1) }

  const periodLabel = period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Time'

  const filteredSales = sales.filter((s) => new Date(s.date) >= startDate)
  const filteredExpenses = expenses.filter((e) => new Date(e.date) >= startDate)

  const totalSales = filteredSales.reduce((a, s) => a + Number(s.amount || 0), 0)
  const totalExpenses = filteredExpenses.reduce((a, e) => a + Number(e.total || e.amount || 0), 0)
  const totalPurchases = filteredExpenses.filter((e) => e.type === 'purchase').reduce((a, e) => a + Number(e.total || 0), 0)
  const totalOps = filteredExpenses.filter((e) => e.type !== 'purchase').reduce((a, e) => a + Number(e.amount || 0), 0)
  // Staff payroll (from Staff page) is consumed as an expense in P&L
  const filteredPayroll = payroll.filter((p) => new Date(p.paid_date) >= startDate)
  const totalPayroll = filteredPayroll.reduce((a, p) => a + Number(p.total || p.amount || 0), 0)
  const totalAllExpenses = totalExpenses + totalPayroll
  const profit = totalSales - totalAllExpenses

  const filteredPurchases = filteredExpenses.filter((e) => e.type === 'purchase')
  const filteredOperations = filteredExpenses.filter((e) => e.type !== 'purchase')

  const chartLabels = months.slice(0, 6).map((m) => {
    const [y, mo] = m.split('-')
    return `${y.slice(2)}/${mo}`
  })
  const chartSales = months.slice(0, 6).map((m) => monthSales[m] || 0)
  const chartExpenses = months.slice(0, 6).map((m) => (monthExpenses[m] || 0) + (monthPurchases[m] || 0))

  function openBillingReport(type, title, records) {
    setBillingReport({ type, title, records, periodLabel })
  }

  // Month detail view
  if (selectedMonth) {
    const mSales = sales.filter((s) => (s.date || '').slice(0, 7) === selectedMonth)
    const mExpenses = expenses.filter((e) => (e.date || '').slice(0, 7) === selectedMonth)
    const mPurchases = mExpenses.filter((e) => e.type === 'purchase')
    const mOps = mExpenses.filter((e) => e.type !== 'purchase')
    const mSalesTotal = mSales.reduce((a, s) => a + Number(s.amount || 0), 0)
    const mExpTotal = mExpenses.reduce((a, e) => a + Number(e.total || e.amount || 0), 0)
    const mProfit = mSalesTotal - mExpTotal
    const monthLabel = new Date(selectedMonth + '-01').toLocaleString('en-US', { month: 'long', year: 'numeric' })

    return (
      <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setSelectedMonth(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <i className="fas fa-arrow-left text-gray-600"></i>
          </button>
          <h2 className="text-xl font-bold">Report — {monthLabel}</h2>
        </div>

        <div className="report-card card p-4 mb-4">
          <h3 className="font-semibold text-sm text-teal-800 mb-3">Monthly Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Sales</span>
              <span className="font-semibold text-green-600">Rs. {mSalesTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Expenses</span>
              <span className="font-semibold text-rose-600">Rs. {mExpTotal.toLocaleString()}</span>
            </div>
            <div className="border-t border-teal-200 pt-2 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Net Profit / Loss</span>
              <span className={`font-bold text-lg ${mProfit >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                Rs. {Math.abs(mProfit).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700">Sales ({mSales.length} transactions)</h3>
            <button
              onClick={() => openBillingReport('sales', `Sales Report — ${monthLabel}`, mSales)}
              className="text-xs bg-teal-700 text-white px-3 py-1.5 rounded-lg font-semibold"
            >
              <i className="fas fa-eye mr-1"></i> View
            </button>
          </div>
          {mSales.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No sales this month</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {mSales.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs font-semibold">{s.guest_name || 'Guest'}</p>
                    <p className="text-[10px] text-gray-400">{s.date}</p>
                  </div>
                  <span className="text-xs font-bold text-green-600">+Rs. {s.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700">Purchase Expenses ({mPurchases.length})</h3>
            <button
              onClick={() => openBillingReport('purchases', `Purchase Report — ${monthLabel}`, mPurchases)}
              className="text-xs bg-teal-700 text-white px-3 py-1.5 rounded-lg font-semibold"
            >
              <i className="fas fa-eye mr-1"></i> View
            </button>
          </div>
          {mPurchases.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No purchases this month</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {mPurchases.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs font-semibold">{p.item}</p>
                    <p className="text-[10px] text-gray-400">{p.vendor} · {p.date}</p>
                  </div>
                  <span className="text-xs font-bold text-rose-600">-Rs. {p.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700">Operation Expenses ({mOps.length})</h3>
            <button
              onClick={() => openBillingReport('operations', `Operation Expenses Report — ${monthLabel}`, mOps)}
              className="text-xs bg-teal-700 text-white px-3 py-1.5 rounded-lg font-semibold"
            >
              <i className="fas fa-eye mr-1"></i> View
            </button>
          </div>
          {mOps.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No operation expenses this month</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {mOps.map((o) => (
                <div key={o.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs font-semibold capitalize">{o.category} {o.payee ? '· ' + o.payee : ''}</p>
                    <p className="text-[10px] text-gray-400">{o.date}</p>
                  </div>
                  <span className="text-xs font-bold text-rose-600">-Rs. {o.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {billingReport && (
          <ReportBillingModal
            open={true}
            onClose={() => setBillingReport(null)}
            title={billingReport.title}
            type={billingReport.type}
            records={billingReport.records}
            periodLabel={billingReport.periodLabel}
          />
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-10 flex justify-center">
        <div className="spinner border-teal-700 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <i className="fas fa-arrow-left text-gray-600"></i>
        </button>
        <h2 className="text-xl font-bold">Reports</h2>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto scroll-hide pb-1">
        {['week', 'month', 'all'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap ${period === p ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
          </button>
        ))}
      </div>

      <div className="report-card card p-4 mb-4">
        <h3 className="font-semibold text-sm text-teal-800 mb-3">Profit & Loss Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Sales</span>
            <span className="font-semibold text-green-600">Rs. {totalSales.toLocaleString()}</span>
            <button
              onClick={() => openBillingReport('sales', 'Sales Report', filteredSales)}
              className="text-xs bg-teal-100 text-teal-700 px-2.5 py-1 rounded-lg font-semibold"
            >
              <i className="fas fa-eye mr-1"></i> View
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Purchase Expenses</span>
            <span className="font-semibold text-rose-600">Rs. {totalPurchases.toLocaleString()}</span>
            <button
              onClick={() => openBillingReport('purchases', 'Purchase Report', filteredPurchases)}
              className="text-xs bg-teal-100 text-teal-700 px-2.5 py-1 rounded-lg font-semibold"
            >
              <i className="fas fa-eye mr-1"></i> View
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Operation Expenses</span>
            <span className="font-semibold text-rose-600">Rs. {totalOps.toLocaleString()}</span>
            <button
              onClick={() => openBillingReport('operations', 'Operation Expenses Report', filteredOperations)}
              className="text-xs bg-teal-100 text-teal-700 px-2.5 py-1 rounded-lg font-semibold"
            >
              <i className="fas fa-eye mr-1"></i> View
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Staff Payroll</span>
            <span className="font-semibold text-rose-600">Rs. {totalPayroll.toLocaleString()}</span>
            <button
              onClick={() => openBillingReport('payroll', 'Staff Payroll Report', filteredPayroll)}
              className="text-xs bg-teal-100 text-teal-700 px-2.5 py-1 rounded-lg font-semibold"
            >
              <i className="fas fa-eye mr-1"></i> View
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Expenses</span>
            <span className="font-semibold text-rose-600">Rs. {totalAllExpenses.toLocaleString()}</span>
          </div>
          <div className="border-t border-teal-200 pt-2 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Net Profit / Loss</span>
            <span className={`font-bold text-lg ${profit >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
              Rs. {Math.abs(profit).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">Sales vs Expenses (last 6 months)</h3>
        <BarChart data={chartSales} labels={chartLabels} color="#0f766e" />
        <div className="flex justify-center gap-4 mt-2 text-[10px] text-gray-500">
          <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-700 mr-1"></span>Sales</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 mr-1"></span>Expenses</span>
        </div>
        <div className="mt-3">
          <BarChart data={chartExpenses} labels={chartLabels} color="#f43f5e" />
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">Monthly Reports</h3>
        <p className="text-xs text-gray-500 mb-3">Tap a month to see the detailed sales, purchase & operation report.</p>
        {months.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No data yet</p>
        ) : (
          <div className="space-y-2">
            {months.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className="w-full card p-3 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center text-teal-700">
                    <i className="fas fa-calendar text-sm"></i>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{new Date(m + '-01').toLocaleString('en-US', { month: 'long', year: 'numeric' })}</p>
                    <p className="text-xs text-gray-500">
                      Sales Rs. {(monthSales[m] || 0).toLocaleString()} · Exp Rs. {((monthExpenses[m] || 0) + (monthPurchases[m] || 0)).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-teal-600">View <i className="fas fa-chevron-right ml-1"></i></span>
              </button>
            ))}
          </div>
        )}
      </div>

      {billingReport && (
        <ReportBillingModal
          open={true}
          onClose={() => setBillingReport(null)}
          title={billingReport.title}
          type={billingReport.type}
          records={billingReport.records}
          periodLabel={billingReport.periodLabel}
        />
      )}
    </div>
  )
}

