import { supabase } from '../lib/supabase'

export async function loadPackageCompositions(businessId) {
  if (!businessId) return {}
  const { data, error } = await supabase
    .from('package_compositions')
    .select('*')
    .eq('business_id', businessId)
    .order('id', { ascending: true })

  if (error) throw error

  return (data || []).reduce((acc, row) => {
    acc[row.package_key] = {
      rooms: row.rooms || [],
      addons: row.addons || [],
      persons: Number(row.persons || 1)
    }
    return acc
  }, {})
}

export async function savePackageCompositions(businessId, data) {
  if (!businessId) return
  const rows = Object.entries(data || {}).map(([package_key, value]) => ({
    business_id: businessId,
    package_key,
    rooms: value.rooms || [],
    addons: value.addons || [],
    persons: Number(value.persons || 1)
  }))

  const { error: deleteError } = await supabase
    .from('package_compositions')
    .delete()
    .eq('business_id', businessId)

  if (deleteError) throw deleteError

  if (rows.length === 0) return

  const { error } = await supabase
    .from('package_compositions')
    .insert(rows)

  if (error) throw error
}

export async function deletePackageComposition(businessId, package_key) {
  if (!businessId || !package_key) return
  const { error } = await supabase
    .from('package_compositions')
    .delete()
    .match({ business_id: businessId, package_key })

  if (error) throw error
}

export function getCompositionKeyForPackage(pkg) {
  // prefer id when present, otherwise use name
  return pkg?.id ? `id:${pkg.id}` : `name:${(pkg?.name||'').trim()}`
}

export function getCompositionForPackage(allComps, pkg) {
  const key = getCompositionKeyForPackage(pkg)
  return allComps?.[key] || { rooms: [], addons: [], persons: 1 }
}
