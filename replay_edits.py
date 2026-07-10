import json

path = r'C:\Users\Boss-QA\.gemini\antigravity\brain\ad33c6d9-2a36-47bb-a0f5-8593f37109d9\.system_generated\logs\transcript_full.jsonl'

import subprocess
initial_content = subprocess.check_output(['git', 'cat-file', '-p', '2352f67']).decode('utf-8')
lines = initial_content.split('\n')

with open(path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get('type') == 'PLANNER_RESPONSE' and 'tool_calls' in data:
                for tc in data['tool_calls']:
                    if tc['name'] == 'replace_file_content' and 'ExamSetManager.jsx' in tc['args'].get('TargetFile', ''):
                        args = tc['args']
                        start = int(args['StartLine'])
                        end = int(args['EndLine'])
                        rep = args['ReplacementContent'].split('\n')
                        lines = lines[:start-1] + rep + lines[end:]
                    elif tc['name'] == 'multi_replace_file_content' and 'ExamSetManager.jsx' in tc['args'].get('TargetFile', ''):
                        args = tc['args']
                        # apply chunks in reverse order to not mess up line numbers
                        chunks = sorted(args['ReplacementChunks'], key=lambda x: int(x['StartLine']), reverse=True)
                        for chunk in chunks:
                            start = int(chunk['StartLine'])
                            end = int(chunk['EndLine'])
                            rep = chunk['ReplacementContent'].split('\n')
                            lines = lines[:start-1] + rep + lines[end:]
        except:
            pass

with open('d:/DEV/PreExamV2/src/views/admin/ExamSetManager.jsx', 'w', encoding='utf-8') as out:
    out.write('\n'.join(lines))
print("Replayed edits successfully!")
