export const USER_ROLES = ['owner', 'manager', 'accountant', 'front_desk']

export const PERMISSIONS = {
  owner: {
    dashboard: 'edit',
    bookings: 'edit',
    sales: 'edit',
    inventory: 'edit',
    expenses: 'edit',
    reports: 'edit',
    packages: 'edit',
    staff: 'edit',
    profile: 'edit',
    settings: 'edit'
  },
  manager: {
    dashboard: 'edit',
    bookings: 'edit',
    sales: 'edit',
    inventory: 'edit',
    expenses: 'edit',
    reports: 'edit',
    packages: 'edit',
    staff: 'none',
    profile: 'edit',
    settings: 'none'
  },
  accountant: {
    dashboard: 'edit',
    bookings: 'view',
    sales: 'edit',
    inventory: 'view',
    expenses: 'edit',
    reports: 'edit',
    packages: 'view',
    staff: 'view',
    profile: 'edit',
    settings: 'none'
  },
  front_desk: {
    dashboard: 'edit',
    bookings: 'edit',
    sales: 'view',
    inventory: 'view',
    expenses: 'none',
    reports: 'none',
    packages: 'view',
    staff: 'none',
    profile: 'edit',
    settings: 'none'
  }
}

export function normalizeRole(role) {
  const value = (role || 'owner').toLowerCase()
  return USER_ROLES.includes(value) ? value : 'owner'
}

export function can(role, module, level = 'view') {
  const normalizedRole = normalizeRole(role)
  const access = PERMISSIONS[normalizedRole]?.[module] || 'none'
  const levels = ['none', 'view', 'edit']
  return levels.indexOf(access) >= levels.indexOf(level)
}
