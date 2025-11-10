# -*- coding: utf-8 -*-
import re
from pathlib import Path
path = Path('components/LeaderboardScreen.tsx')
text = path.read_text(encoding='utf-8')
pattern = r"(title: 'Katılım Puanı',\s+description: )'[^']*',"
replacement = r"\1\"''Soru üretme,Soru çözme, sınav üretme ve düellolara katılma gibi etkinlikleri ödüllendirir. Çeşitli modları denemek ekstra puan sağlar.''\"," 
new_text, count = re.subn(pattern, replacement, text, count=1)
if count == 0:
    raise SystemExit('Target block not found for replacement')
path.write_text(new_text, encoding='utf-8')
