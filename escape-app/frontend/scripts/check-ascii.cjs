// Quick check for non-ASCII characters in migration_final.sql
// Run: node scripts/check-ascii.cjs
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'supabase', 'migration_final.sql');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

let found = false;
lines.forEach((line, idx) => {
  for (let i = 0; i < line.length; i++) {
    const code = line.charCodeAt(i);
    if (code > 127) {
      found = true;
      console.log(
        `Line ${idx + 1}, col ${i + 1}: codepoint ${code} (0x${code.toString(16).toUpperCase().padStart(4, '0')}) -> "${line.slice(Math.max(0, i - 15), i + 15)}"`
      );
    }
  }
});

// Also detect BOM / other edge chars at file level
const bom = content.charCodeAt(0);
if (content.startsWith('\uFEFF')) {
  found = true;
  console.log('FILE STARTS WITH A BOM (U+FEFF) - can cause parser issues.');
}

if (!found) {
  console.log('CLEAN: No non-ASCII characters found in migration_final.sql');
} else {
  console.log('FOUND non-ASCII characters (see above).');
  process.exit(1);
}

