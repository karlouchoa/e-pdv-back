from pathlib import Path
import re
p = Path('src/inventory/inventory.service.ts')
text = p.read_text(encoding='utf-8')
text = re.sub(r'\n{3,}', '\n\n', text)
p.write_text(text, encoding='utf-8')
