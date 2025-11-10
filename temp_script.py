# -*- coding: utf-8 -*-
from pathlib import Path
path = Path("components/CreditResources.tsx")
text = path.read_text(encoding="utf-8")
needle = '''<div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-emerald-200 sm:text-base">Kredi Paketleri</h3>
                                                    </div>
'''
replacement = '''<div className="mb-3">
                            <h3 className="text-sm font-semibold text-emerald-200 sm:text-base">Kredi Paketleri</h3>
                        </div>
'''
text = text.replace(needle, replacement, 1)
path.write_text(text, encoding="utf-8")
