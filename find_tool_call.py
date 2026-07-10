import json
import re

transcript_path = r'C:\Users\Boss-QA\.gemini\antigravity\brain\ad33c6d9-2a36-47bb-a0f5-8593f37109d9\.system_generated\logs\transcript_full.jsonl'
with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        if 'multi_replace_file_content' in line or 'replace_file_content' in line:
            if 'ExamSetManager.jsx' in line and '✨ เลือกข้ออัตโนมัติ' in line:
                try:
                    data = json.loads(line)
                    if 'tool_calls' in data:
                        for tc in data['tool_calls']:
                            if 'ExamSetManager.jsx' in str(tc):
                                with open('d:/DEV/PreExamV2/tool_call.json', 'w', encoding='utf-8') as out:
                                    json.dump(tc, out, indent=2)
                except:
                    pass
