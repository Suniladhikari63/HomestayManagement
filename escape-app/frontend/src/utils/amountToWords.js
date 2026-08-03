// Convert an amount (Rs.) into words using Indian/Nepali numbering system.
// e.g. 5231.50 -> "Five Thousand Two Hundred Thirty One Rupees and Fifty Paisa"

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigits(n) {
  if (n < 20) return ONES[n]
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')
}

function threeDigits(n) {
  const h = Math.floor(n / 100)
  const r = n % 100
  return (h ? ONES[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? twoDigits(r) : '')
}

function integerToWords(num) {
  if (num === 0) return 'Zero'
  const crore = Math.floor(num / 10000000)
  const lakh = Math.floor((num % 10000000) / 100000)
  const thousand = Math.floor((num % 100000) / 1000)
  const rest = num % 1000

  let out = ''
  if (crore) out += twoDigits(crore) + ' Crore '
  if (lakh) out += twoDigits(lakh) + ' Lakh '
  if (thousand) out += twoDigits(thousand) + ' Thousand '
  if (rest) out += threeDigits(rest)
  return out.trim()
}

export default function amountToWords(amount) {
  const value = Math.max(0, Number(amount) || 0)
  const paise = Math.round(value * 100)
  const rupees = Math.floor(paise / 100)
  const paisa = paise % 100

  let words = integerToWords(rupees)
  if (rupees >= 0) words = words + (rupees === 1 ? ' Rupee' : ' Rupees')
  if (paisa) words += ' and ' + twoDigits(paisa) + ' Paisa'
  return words.trim()
}

