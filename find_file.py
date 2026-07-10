import json
import re

transcript_path = r'C:\Users\Boss-QA\.gemini\antigravity\brain\ad33c6d9-2a36-47bb-a0f5-8593f37109d9\.system_generated\logs\transcript_full.jsonl'
found = []
with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        if 'ExamSetManager.jsx' in line and 'Total Lines:' in line:
            m = re.search(r'Total Lines: (\d+)', line)
            if m:
                found.append(int(m.group(1)))
print(list(set(found)))
