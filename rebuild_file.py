import json
import re

transcript_path = r'C:\Users\Boss-QA\.gemini\antigravity\brain\ad33c6d9-2a36-47bb-a0f5-8593f37109d9\.system_generated\logs\transcript_full.jsonl'
lines = {}

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if 'content' in data:
                content = data['content']
                if 'ExamSetManager.jsx' in content and 'Total Lines: 365' in content:
                    for match in re.finditer(r'^(\d+): (.*)$', content, re.MULTILINE):
                        line_num = int(match.group(1))
                        lines[line_num] = match.group(2)
        except:
            pass

if lines:
    max_line = max(lines.keys())
    with open('d:/DEV/PreExamV2/src/views/admin/ExamSetManager.jsx', 'w', encoding='utf-8') as out:
        for i in range(1, max_line + 1):
            out.write(lines.get(i, f'// MISSING LINE {i}') + '\n')
    print(f'Rebuilt {max_line} lines successfully!')
else:
    print('Failed to extract lines.')
