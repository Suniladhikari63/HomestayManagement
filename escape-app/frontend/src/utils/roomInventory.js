import { supabase } from '../lib/supabase'

export async function loadRoomInventory(businessId) {
  if (!businessId) return {}
  const { data, error } = await supabase
    .from('room_inventory')
    .select('*')
    .eq('business_id', businessId)
    .order('id', { ascending: true })

  if (error) throw error

  return (data || []).reduce((acc, row) => {
    acc[row.name] = {
      name: row.name,
      price: Number(row.price || 0),
      pricing_type: row.pricing_type || 'guest',
      unit_label: row.unit_label || 'guest',
      max_persons: row.max_persons,
      total: Number(row.total || 0),
      available: Number(row.available != null ? row.available : (row.total || 0))
    }
    return acc
  }, {})
}

export async function saveRoomInventory(data, businessId) {
  if (!businessId) return
  const rows = Object.values(data || {}).map((entry) => ({
    business_id: businessId,
    name: entry.name,
    price: Number(entry.price || 0),
    pricing_type: entry.pricing_type || 'guest',
    unit_label: entry.unit_label || 'guest',
    max_persons: entry.max_persons,
    total: Number(entry.total || 0),
    available: Number(entry.available != null ? entry.available : (entry.total || 0))
  }))

  const { error: deleteError } = await supabase
    .from('room_inventory')
    .delete()
    .eq('business_id', businessId)

  if (deleteError) throw deleteError

  if (rows.length === 0) return

  const { error } = await supabase
    .from('room_inventory')
    .insert(rows)

  if (error) throw error
}

export async function deleteRoomInventoryEntry(businessId, name) {
  if (!businessId || !name) return
  const { error } = await supabase
    .from('room_inventory')
    .delete()
    .match({ business_id: businessId, name })

  if (error) throw error
}

export function createRoomInventoryEntry(name, total = 0) {
  const safeTotal = Number(total) || 0
  return {
    name,
    total: safeTotal,
    available: safeTotal
  }
}

export function getRoomAvailability(roomInventory, roomName) {
  const entry = roomInventory?.[roomName]
  if (!entry) return null
  return {
    name: roomName,
    total: Number(entry.total || 0),
    available: Number(entry.available || 0)
  }
}

export function reserveRooms(roomInventory, roomName, qty) {
  if (!roomInventory || !roomName) return roomInventory
  const current = roomInventory[roomName]
  if (!current) return roomInventory
  const nqty = Math.max(0, Number(qty) || 0)
  const available = Number(current.available || 0)
  const used = Math.min(available, nqty)
  const next = { ...current, available: Math.max(0, available - used) }
  return { ...roomInventory, [roomName]: next }
}

export function releaseRooms(roomInventory, roomName, qty) {
  if (!roomInventory || !roomName) return roomInventory
  const current = roomInventory[roomName]
  if (!current) return roomInventory
  const nqty = Math.max(0, Number(qty) || 0)
  const total = Number(current.total || 0)
  const available = Number(current.available || 0)
  const nextAvailable = Math.min(total, available + nqty)
  const next = { ...current, available: nextAvailable }
  return { ...roomInventory, [roomName]: next }
}
