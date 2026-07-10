import json
import re

with open('d:/DEV/PreExamV2/src/views/admin/ExamSetManager.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We just want to remove the specific duplicate block
bad_block = """    };
            }
        }));
        toast.success("ดึงรูปแบบอัตโนมัติ เรียบร้อยแล้ว");
    };"""

content = content.replace(bad_block, "    };")

with open('d:/DEV/PreExamV2/src/views/admin/ExamSetManager.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed exactly!")
