import json
import re

with open('d:/DEV/PreExamV2/src/views/admin/ExamSetManager.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_functions = """
    const handleAutoFillKorPor63 = () => {
        const template = {
            "อนุกรม": 5, "เลขทั่วไป": 5, "ตาราง": 5, "เงื่อนไขสัญลักษณ์": 10, "เงื่อนไขภาษา": 5,
            "เรียงประโยค": 5, "สรุปความ": 10, "อุปมาอุปไมย": 5, "พ.ร.บ.บริหารราชการแผ่นดิน": 6,
            "พ.ร.ฎ.กิจการบ้านเมืองที่ดี": 6, "พ.ร.บ.วิธีปฏิบัติราชการทางปกครอง": 6, "พ.ร.บ.มาตรฐานทางจริยธรรม": 3,
            "พ.ร.บ.ความรับผิดทางละเมิดของเจ้าหน้าที่": 2, "ประมวลกฎหมายอาญาความผิดต่อตำแหน่งหน้าที่ราชการ": 2,
            "CONVERSATION": 5, "VOCABULARY": 5, "STRUCTURE": 5, "READING": 10
        };

        const newCounts = {};
        let actualTotal = 0;
        let newCatalogs = [];

        Object.entries(template).forEach(([cat, targetCount]) => {
            const available = catalogCounts[cat] || 0;
            const actualCount = Math.min(targetCount, available);
            if (actualCount > 0) {
                newCounts[cat] = actualCount;
                actualTotal += actualCount;
                newCatalogs.push(cat);
            }
        });

        setFormData(prev => ({
            ...prev,
            time_limit_minutes: 180,
            total_questions: actualTotal,
            is_korpor_format: true,
            rules: {
                catalogs: newCatalogs,
                catalog_counts: newCounts
            }
        }));
        toast.success("ดึงรูปแบบอัตโนมัติ เรียบร้อยแล้ว (เฉพาะข้อที่มี)");
    };

    const handleCatalogToggle = (catalog) => {
        setFormData(prev => {
            const newCatalogs = prev.rules.catalogs.includes(catalog)
                ? prev.rules.catalogs.filter(c => c !== catalog)
                : [...prev.rules.catalogs, catalog];
            return { ...prev, rules: { ...prev.rules, catalogs: newCatalogs } };
        });
    };

    const handleCatalogCountChange = (catalog, count) => {
        const numCount = parseInt(count) || 0;
        const available = catalogCounts[catalog] || 0;
        const safeCount = Math.min(numCount, available);
        setFormData(prev => ({
            ...prev,
            rules: {
                ...prev.rules,
                catalog_counts: { ...prev.rules.catalog_counts, [catalog]: safeCount }
            }
        }));
    };
"""

# We'll use greedy regex to eat all the garbage before openEditModal
new_content = re.sub(r'const handleAutoFillKorPor63 = \(\) => \{.*const openEditModal = \(set\) => \{', new_functions + '\n    const openEditModal = (set) => {', content, flags=re.DOTALL)

with open('d:/DEV/PreExamV2/src/views/admin/ExamSetManager.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Block replaced aggressively!")
