from pathlib import Path
text = Path("components/TeacherPanel.tsx").read_text(encoding='utf-8')
idx = text.index('←')
print('found arrow at', idx)
