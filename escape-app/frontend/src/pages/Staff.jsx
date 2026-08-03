import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function Staff() {
  const navigate = useNavigate()
  const { activeBusiness, role, canAccess } = useAuth()
  const { showToast } = useToast()
  const [tab, setTab] = useState('staff')
  const [staffList, setStaffList] = useState([])
  const [payrolls, setPayrolls] = useState([])
  const [loading, setLoading] = useState(true)

  // Staff form
  const [staffFormOpen, setStaffFormOpen] = useState(false)
  const [staffEditing, setStaffEditing] = useState(null)
  const [staffForm, setStaffForm] = useState({ name: '', username: '', password: '', role: 'front_desk', salary: '', salary_type: 'Monthly', status: 'active' })

  // Payroll form
  const [payFormOpen, setPayFormOpen] = useState(false)
  const [payForm, setPayForm] = useState({ staff_id: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), amount: '', bonus: '0', paid_date: new Date().toISOString().slice(0, 10), notes: '' })

  async function load() {
    setLoading(true)
    let staffQuery = supabase.from('staff').select('*')
    let payQuery = supabase.from('staff_payroll').select('*, staff:staff_id(name)')
    if (activeBusiness?.id) {
      staffQuery = staffQuery.eq('business_id', activeBusiness.id)
      payQuery = payQuery.eq('business_id', activeBusiness.id)
    }
    const [staffRes, payRes] = await Promise.all([
      staffQuery.order('name'),
      payQuery.order('year', { ascending: false }).order('month', { ascending: false })
    ])
    if (staffRes.error) showToast('Staff load failed: ' + staffRes.error.message)
    else setStaffList(staffRes.data || [])
    if (payRes.error) showToast('Payroll load failed: ' + payRes.error.message)
    else setPayrolls(payRes.data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [activeBusiness?.id])

  // ----- Staff CRUD -----
  function openAddStaff() {
    setStaffEditing(null)
    setStaffForm({ name: '', username: '', password: '', role: 'front_desk', salary: '', salary_type: 'Monthly', status: 'active' })
    setStaffFormOpen(true)
  }
  function openEditStaff(s) {
    setStaffEditing(s)
    setStaffForm({ name: s.name, username: s.username || '', password: '', role: s.role || 'front_desk', salary: s.salary || '', salary_type: s.salary_type || 'Monthly', status: s.status || 'active' })
    setStaffFormOpen(true)
  }
  async function saveStaff(e) {
    e.preventDefault()
    if (!staffForm.name.trim()) { showToast('Staff name is required'); return }
    if (!staffForm.username.trim()) { showToast('Username is required'); return }
    if (!staffForm.password.trim() && !staffEditing) { showToast('Password is required'); return }
    if (!activeBusiness?.id) { showToast('Select a business first'); return }

    const payload = {
      name: staffForm.name.trim(),
      username: staffForm.username.trim().toLowerCase(),
      role: staffForm.role,
      salary: parseFloat(staffForm.salary) || 0,
      salary_type: staffForm.salary_type,
      status: staffForm.status,
      business_id: activeBusiness.id
    }

    try {
      if (staffEditing) {
        const { error } = await supabase.from('staff').update(payload).eq('id', staffEditing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('staff').insert(payload)
        if (error) throw error
      }
      showToast(staffEditing ? 'Staff updated!' : 'Staff added!')
      setStaffFormOpen(false)
      load()
    } catch (error) {
      showToast('Save failed: ' + error.message)
    }
  }
  async function deleteStaff(s) {
    if (!window.confirm(`Delete staff "${s.name}"? All payroll records will also be deleted.`)) return
    const { error } = await supabase.from('staff').delete().eq('id', s.id)
    if (error) { showToast('Delete failed: ' + error.message); return }
    showToast('Staff deleted')
    load()
  }

  // ----- Payroll -----
  function openAddPayroll() {
    setPayForm({ staff_id: staffList[0]?.id || '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), amount: '', bonus: '0', paid_date: new Date().toISOString().slice(0, 10), notes: '' })
    setPayFormOpen(true)
  }
  async function savePayroll(e) {
    e.preventDefault()
    if (!payForm.staff_id) { showToast('Select a staff member'); return }
    const amount = parseFloat(payForm.amount) || 0
    const bonus = parseFloat(payForm.bonus) || 0
    if (amount <= 0) { showToast('Enter a valid salary amount'); return }
    const payload = {
      staff_id: payForm.staff_id,
      month: parseInt(payForm.month),
      year: parseInt(payForm.year),
      amount,
      bonus,
      total: amount + bonus,
      paid_date: payForm.paid_date,
      notes: payForm.notes,
      business_id: activeBusiness?.id
    }
    const { error } = await supabase.from('staff_payroll').insert(payload)
    if (error) { showToast('Payroll save failed: ' + error.message); return }
    showToast('Payroll record added!')
    setPayFormOpen(false)
    load()
  }
  async function deletePayroll(p) {
    if (!window.confirm('Delete this payroll record?')) return
    const { error } = await supabase.from('staff_payroll').delete().eq('id', p.id)
    if (error) { showToast('Delete failed: ' + error.message); return }
    showToast('Payroll record deleted')
    load()
  }

  const inputCls = 'input-field w-full mt-1 px-3 py-2.5 rounded-xl bg-gray-50 text-sm'
  const canManageStaff = role === 'owner' || role === 'manager'
  const canViewPayroll = canAccess('staff', 'view')

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24 space-y-4">
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => navigate('/')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <i className="fas fa-arrow-left text-gray-600"></i>
        </button>
        <h2 className="text-xl font-bold">Staff Management</h2>
      </div>

      <div className="flex border-b border-gray-200">
        <button onClick={() => setTab('staff')} className={`flex-1 py-3 text-sm font-semibold ${tab === 'staff' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-gray-500'}`}>Staff</button>
        {(role === 'owner' || role === 'accountant') && (
          <button onClick={() => setTab('payroll')} className={`flex-1 py-3 text-sm font-semibold ${tab === 'payroll' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-gray-500'}`}>Payroll</button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner border-teal-700 border-t-transparent"></div></div>
      ) : tab === 'staff' ? (
        <div className="space-y-3">
          {canManageStaff && (
            <button onClick={openAddStaff} className="btn-primary w-full text-white font-semibold py-3 rounded-xl text-sm">
              <i className="fas fa-plus mr-1"></i> Add Staff Member
            </button>
          )}
          {staffList.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-users text-4xl text-gray-300 mb-3"></i>
              <p className="text-gray-400 text-sm">No staff members yet — add your first one</p>
            </div>
          ) : (
            staffList.map((s) => (
              <div key={s.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{s.name}</h4>
                      <p className="text-xs text-gray-500 capitalize">{s.role} · {s.phone || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManageStaff && (
                      <>
                        <button onClick={() => openEditStaff(s)} className="text-xs bg-teal-100 text-teal-700 px-3 py-1.5 rounded-lg font-semibold"><i className="fas fa-edit mr-1"></i> Edit</button>
                        <button onClick={() => deleteStaff(s)} className="text-xs bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg font-semibold"><i className="fas fa-trash-alt mr-1"></i> Delete</button>
                      </>
                    )}
                  </div>
                </div>
                {s.salary > 0 && <p className="text-xs text-gray-500 mt-2">Salary: Rs. {s.salary.toLocaleString()}/month</p>}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {canManageStaff && (
            <button onClick={openAddPayroll} className="btn-primary w-full text-white font-semibold py-3 rounded-xl text-sm">
              <i className="fas fa-plus mr-1"></i> Add Payroll Record
            </button>
          )}
          {payrolls.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-money-check-alt text-4xl text-gray-300 mb-3"></i>
              <p className="text-gray-400 text-sm">No payroll records yet</p>
            </div>
          ) : (
            payrolls.map((p) => (
              <div key={p.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">{p.staff?.name || 'Unknown'}</h4>
                    <p className="text-xs text-gray-500">{MONTHS[p.month - 1]} {p.year}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">Rs. {p.total.toLocaleString()}</p>
                    {p.bonus > 0 && <p className="text-[10px] text-green-600">+Bonus Rs. {p.bonus.toLocaleString()}</p>}
                    <p className="text-[10px] text-gray-400">{p.paid_date}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  {canManageStaff && (
                    <button onClick={() => deletePayroll(p)} className="text-xs bg-rose-100 text-rose-700 px-3 py-1 rounded-lg font-semibold"><i className="fas fa-trash-alt mr-1"></i> Delete</button>
                  )}
                  {p.notes && <span className="text-[10px] text-gray-400">{p.notes}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Staff add/edit modal */}
      <Modal open={staffFormOpen} onClose={() => setStaffFormOpen(false)} title={staffEditing ? 'Edit Staff' : 'Add Staff'}>
        <form onSubmit={saveStaff} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">Full Name *</label>
            <input type="text" required value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} className={inputCls} placeholder="e.g. Ram Thapa" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Username *</label>
            <input type="text" required value={staffForm.username} onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })} className={inputCls} placeholder="ram" />
          </div>
          {!staffEditing && (
            <div>
              <label className="text-xs font-semibold text-gray-500">Password *</label>
              <input type="password" required value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} className={inputCls} placeholder="Temporary password" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Role</label>
              <select value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })} className={inputCls}>
                <option value="manager">Manager</option>
                <option value="accountant">Accountant</option>
                <option value="front_desk">Front Desk</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Salary (Rs.)</label>
              <input type="number" min="0" value={staffForm.salary} onChange={(e) => setStaffForm({ ...staffForm, salary: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Salary Type</label>
            <select value={staffForm.salary_type} onChange={(e) => setStaffForm({ ...staffForm, salary_type: e.target.value })} className={inputCls}>
              <option value="Monthly">Monthly</option>
              <option value="Daily">Daily</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Status</label>
            <select value={staffForm.status} onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value })} className={inputCls}>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <button type="submit" className="btn-primary w-full text-white font-semibold py-3 rounded-xl text-sm">
            <i className="fas fa-save mr-1"></i> {staffEditing ? 'Update Staff' : 'Add Staff'}
          </button>
        </form>
      </Modal>

      {/* Payroll modal */}
      <Modal open={payFormOpen} onClose={() => setPayFormOpen(false)} title="Add Payroll Record">
        <form onSubmit={savePayroll} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">Staff Member *</label>
            <select required value={payForm.staff_id} onChange={(e) => setPayForm({ ...payForm, staff_id: e.target.value })} className={inputCls}>
              <option value="">Select staff...</option>
              {staffList.filter((s) => s.status !== 'terminated').map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Month</label>
              <select value={payForm.month} onChange={(e) => setPayForm({ ...payForm, month: e.target.value })} className={inputCls}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Year</label>
              <input type="number" min="2020" max="2099" value={payForm.year} onChange={(e) => setPayForm({ ...payForm, year: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Salary (Rs.) *</label>
              <input type="number" required min="0" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Bonus (Rs.)</label>
              <input type="number" min="0" value={payForm.bonus} onChange={(e) => setPayForm({ ...payForm, bonus: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Paid Date</label>
            <input type="date" value={payForm.paid_date} onChange={(e) => setPayForm({ ...payForm, paid_date: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Notes</label>
            <input type="text" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} className={inputCls} placeholder="Optional" />
          </div>
          <button type="submit" className="btn-primary w-full text-white font-semibold py-3 rounded-xl text-sm">
            <i className="fas fa-save mr-1"></i> Add Payroll Record
          </button>
        </form>
      </Modal>
    </div>
  )
}
