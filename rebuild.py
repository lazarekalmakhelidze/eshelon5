import json
import re
import sys

transcript_path = r'C:\Users\Boss-QA\.gemini\antigravity\brain\ad33c6d9-2a36-47bb-a0f5-8593f37109d9\.system_generated\logs\transcript_full.jsonl'
lines = {}
for line in open(transcript_path, 'r', encoding='utf-8'):
    try:
        data = json.loads(line)
        if data.get('type') == 'GENERIC' and 'content' in data:
            content = data['content']
            if 'File Path: ile:///d:/DEV/PreExamV2/src/views/admin/ExamSetManager.jsx' in content:
                # Find Total Lines
                m = re.search(r'Total Lines: (\d+)', content)
                if m and int(m.group(1)) > 250:
                    # Parse lines
                    for match in re.finditer(r'^(\d+): (.*)$', content, re.MULTILINE):
                        line_num = int(match.group(1))
                        lines[line_num] = match.group(2)
    except:
        pass

if lines:
    max_line = max(lines.keys())
    with open(r'd:\DEV\PreExamV2\exam_set_manager_rebuilt.jsx', 'w', encoding='utf-8') as f:
        for i in range(1, max_line + 1):
            f.write(lines.get(i, f'// MISSING LINE {i}') + '\n')
    print(f'Rebuilt up to line {max_line}')
else:
    print('No lines found')
