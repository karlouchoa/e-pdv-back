const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema_tenant.prisma');
const contents = fs.readFileSync(schemaPath, 'utf8');
const eol = contents.includes('\r\n') ? '\r\n' : '\n';

const lines = contents.split(/\r?\n/);
let found = false;
let changed = false;

const updatedLines = lines.map((line) => {
  if (/^\s*t_itpromo\s+t_itpromo\[\]/.test(line)) {
    found = true;
    if (!line.includes('@ignore')) {
      changed = true;
      return `${line} @ignore`;
    }
  }
  return line;
});

if (!found) {
  console.error('t_itpromo relation not found in schema_tenant.prisma');
  process.exit(1);
}

if (changed) {
  fs.writeFileSync(schemaPath, updatedLines.join(eol), 'utf8');
  console.log('Added @ignore to t_itpromo relation.');
} else {
  console.log('t_itpromo relation already has @ignore.');
}
