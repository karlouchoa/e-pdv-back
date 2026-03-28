const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema_tenant.prisma');
const contents = fs.readFileSync(schemaPath, 'utf8');
const eol = contents.includes('\r\n') ? '\r\n' : '\n';

const lines = contents.split(/\r?\n/);
let foundRelations = 0;
let changedRelations = 0;

const updatedLines = lines.map((line) => {
  if (/^\s+\w+\s+t_itpromo\[\](?:\s+.*)?$/.test(line)) {
    foundRelations += 1;
    if (!line.includes('@ignore')) {
      changedRelations += 1;
      return `${line} @ignore`;
    }
  }
  return line;
});

if (changedRelations > 0) {
  fs.writeFileSync(schemaPath, updatedLines.join(eol), 'utf8');
  console.log(`Added @ignore to ${changedRelations} t_itpromo relation field(s).`);
} else if (foundRelations > 0) {
  console.log('t_itpromo relation field already has @ignore.');
} else {
  console.log('No t_itpromo relation field found in schema_tenant.prisma; nothing to patch.');
}
