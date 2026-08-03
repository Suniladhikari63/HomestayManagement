// Minimal PNG encoder to generate PWA icons (no external deps)
// Creates icon-192.png and icon-512.png with a teal gradient + white mountain + dark circle.
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// ---------- PNG encoding primitives ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // color type RGBA
  ihdr[10] = 0  // compression
  ihdr[11] = 0  // filter
  ihdr[12] = 0  // interlace

  // raw data: each row prefixed with filter byte 0
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, y * width * 4 + width * 4)
  }
  const idat = zlib.deflateSync(raw)

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// ---------- Drawing helpers ----------
function lerp(a, b, t) { return a + (b - a) * t }

function inRoundRect(x, y, size, radius) {
  const r = radius
  const min = r
  const max = size - r
  if (x < min) return false
  if (x > max) return false
  if (y < min) return false
  if (y > max) return false
  // corners
  if (x < size - r && x >= r && y >= r && y <= size - r) {
    // check corner circles
    const cx = x < r ? r : x > size - r ? size - r : x
    const cy = y < r ? r : y > size - r ? size - r : y
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
  }
  return true
}

function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by)
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy)
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay)
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNeg && hasPos)
}

function inCircle(px, py, cx, cy, r) {
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r
}

// ---------- Generate icon ----------
function renderIcon(size) {
  const buf = Buffer.alloc(size * size * 4)
  const r = Math.round(size * 0.2)
  // Mountain triangle spanning the icon
  const mx1 = size * 0.5, my1 = size * 0.14, mx2 = size * 0.86, my2 = size * 0.72, mx3 = size * 0.14, my3 = size * 0.72
  // Snow cap / inner dark circle
  const cCx = size * 0.5, cCy = size * 0.5, cR = size * 0.16

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      let cr = 0, cg = 0, cb = 0, ca = 0

      const inside = inRoundRect(x + 0.5, y + 0.5, size, r)
      if (inside) {
        // gradient teal background
        const t = y / size
        cr = lerp(15, 19, t)
        cg = lerp(118, 78, t)
        cb = lerp(110, 74, t)
        ca = 255

        const inMountain = inTriangle(x + 0.5, y + 0.5, mx1, my1, mx2, my2, mx3, my3)
        if (inMountain) {
          cr = 255; cg = 255; cb = 255
        }
        if (inMountain && inCircle(x + 0.5, y + 0.5, cCx, cCy, cR)) {
          cr = 19; cg = 78; cb = 74
        }
      }

      buf[i] = cr
      buf[i + 1] = cg
      buf[i + 2] = cb
      buf[i + 3] = ca
    }
  }

  return encodePNG(size, size, buf)
}

const outDir = path.join(process.cwd(), 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

fs.writeFileSync(path.join(outDir, 'icon-192.png'), renderIcon(192))
fs.writeFileSync(path.join(outDir, 'icon-512.png'), renderIcon(512))

console.log('✅ Generated public/icons/icon-192.png and icon-512.png')

