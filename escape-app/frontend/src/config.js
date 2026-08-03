// ============================================================
// HOMESTAY COMPANY DETAILS — edit these to match your business.
// These appear on the invoice/bill header and are clickable:
//   • address  -> opens Google Maps
//   • phone    -> opens the dialer (tel:)
//   • whatsapp -> opens WhatsApp chat (wa.me)
//   • email    -> opens the email app (mailto:)
// ============================================================
export const HOMESTAY = {
  name: 'Escape Home',
  address: 'Lakeside, Pokhara 33700, Nepal',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Lakeside%2C%20Pokhara%2033700%2C%20Nepal',
  phone: '+977-9800000000',
  phoneHref: 'tel:+9779800000000',
  whatsapp: 'WhatsApp',
  whatsappHref: 'https://wa.me/9779800000000',
  email: 'escapehome@gmail.com',
  emailHref: 'mailto:escapehome@gmail.com'
}

// ============================================================
// GLOBAL SIGNATURE
// Set this once — it will appear on every bill automatically.
// Option A: Upload via the app (saved to localStorage)
// Option B: Paste a Base64 data-URL here for permanent use.
// ============================================================
export const STORAGE_KEY_SIGNATURE = 'escape_home_signature'

// ============================================================
// ESCAPE HOME DETAILS (editable via the "Details" page)
// When the user saves details in the app, the HOMESTAY object
// is patched at runtime (mirrors what is stored in the
// `profile` Supabase table). Bills & reports pick up the
// live values automatically.
// ============================================================
export const STORAGE_KEY_HOMESTAY = 'escape_home_details'

// Build the clickable hrefs + maps URL from raw inputs.
// - whatsapp/phone: digits only -> wa.me / tel:
// - maps_url: use if provided, otherwise auto-generate from address
// Prefers the "business" contact columns used by the Details page and
// signup flow (business_email / business_phone), falling back to the
// generic email / phone columns.
export function buildHomestayDetails(raw = {}) {
  const name = raw.name?.trim() || HOMESTAY.name || 'Escape Home'
  const email = raw.business_email?.trim() || raw.email?.trim() || ''
  const phone = raw.business_phone?.trim() || raw.phone?.trim() || ''
  const whatsapp = (raw.whatsapp || '').trim()
  const address = raw.address?.trim() || ''
  const mapsUrl = raw.maps_url?.trim() ||
    (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : HOMESTAY.mapsUrl)

  const digits = (v) => String(v || '').replace(/[^0-9]/g, '')
  const waDigits = whatsapp ? digits(whatsapp) : digits(phone)

  return {
    ...HOMESTAY,
    name,
    email,
    emailHref: email ? `mailto:${email}` : HOMESTAY.emailHref,
    phone,
    phoneHref: phone ? `tel:${digits(phone)}` : HOMESTAY.phoneHref,
    whatsapp: whatsapp || (phone ? `+${digits(phone)}` : 'WhatsApp'),
    whatsappHref: waDigits ? `https://wa.me/${waDigits}` : HOMESTAY.whatsappHref,
    address,
    mapsUrl
  }
}

// Patch the exported HOMESTAY object in place so all components
// that imported it see the new values immediately.
export function applyHomestayDetails(raw) {
  const details = buildHomestayDetails(raw)
  Object.assign(HOMESTAY, details)
  return details
}

// Deprecated: homestay details are now loaded from Supabase profile/business data on login.
export function loadHomestayFromStorage() {
  return
}

