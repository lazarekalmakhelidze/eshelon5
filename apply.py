import json

with open('d:/DEV/PreExamV2/src/views/admin/ExamSetManager.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add catalog queries
query_str = """    const { data: setsResponse, isLoading } = useQuery({
        queryKey: ['adminExamSets'],
        queryFn: adminApi.getExamSets
    });

    const { data: uniqueCatalogsResponse } = useQuery({
        queryKey: ['adminUniqueCatalogs'],
        queryFn: adminApi.getUniqueCatalogs
    });
    const uniqueCatalogs = uniqueCatalogsResponse?.data || [];

    const { data: catalogCountsResponse } = useQuery({
        queryKey: ['adminCatalogCounts'],
        queryFn: adminApi.getCatalogCounts
    });
    const catalogCounts = catalogCountsResponse?.data || {};

    const createMutation = useMutation({"""
content = content.replace("    const { data: setsResponse, isLoading } = useQuery({\n        queryKey: ['adminExamSets'],\n        queryFn: adminApi.getExamSets\n    });\n\n    const createMutation = useMutation({", query_str)

# 2. Add handleAutoFillKorPor63 logic before handleCreate
handle_create = """    const handleCreate = (e) => {"""
auto_fill_str = """    const totalSelectedQuestions = (formData.rules?.catalogs || []).reduce((sum, catalog) => {
        return sum + (parseInt(formData.rules?.catalog_counts?.[catalog]) || 0);
    }, 0);
    const difference = formData.total_questions - totalSelectedQuestions;

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
            const newCatalogs = prev.rules.catalogs?.includes(catalog)
                ? prev.rules.catalogs.filter(c => c !== catalog)
                : [...(prev.rules.catalogs || []), catalog];
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
                catalog_counts: { ...(prev.rules.catalog_counts || {}), [catalog]: safeCount }
            }
        }));
    };

    const handleCreate = (e) => {"""
content = content.replace(handle_create, auto_fill_str)

# 3. Add UI inside modal right before <div className="pt-4 flex justify-end space-x-3">
modal_end = """                            <div className="pt-4 flex justify-end space-x-3">"""
ui_str = """                            <div className="border-t border-slate-200 pt-4 mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-slate-700">หมวดหมู่ข้อสอบ (Catalogs)</label>
                                    <button 
                                        type="button" 
                                        onClick={handleAutoFillKorPor63}
                                        className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-200 font-medium transition-colors"
                                    >
                                        ✨ เลือกข้ออัตโนมัติ
                                    </button>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                                    {Array.from(new Set([...uniqueCatalogs, ...(formData.rules.catalogs || [])])).map(catalog => (
                                        <div key={catalog} className="flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                id={catalog-}
                                                checked={formData.rules.catalogs?.includes(catalog)}
                                                onChange={() => handleCatalogToggle(catalog)}
                                                className="rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor={catalog-} className="text-sm font-medium text-slate-700 flex-1">{catalog}</label>
                                            {formData.rules.catalogs?.includes(catalog) && (
                                                <input
                                                    type="number"
                                                    placeholder="จำนวนข้อ"
                                                    value={formData.rules.catalog_counts?.[catalog] || ''}
                                                    onChange={(e) => handleCatalogCountChange(catalog, e.target.value)}
                                                    className="w-24 px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2 text-sm font-medium">
                                    {difference > 0 ? (
                                        <span className="text-amber-600 flex items-center">จำนวนข้อที่เลือกยังขาดอีก {difference} ข้อ (รวม {totalSelectedQuestions}/{formData.total_questions})</span>
                                    ) : difference < 0 ? (
                                        <span className="text-red-600 flex items-center">จำนวนข้อที่เลือกเกินมา {Math.abs(difference)} ข้อ (รวม {totalSelectedQuestions}/{formData.total_questions})</span>
                                    ) : formData.total_questions > 0 ? (
                                        <span className="text-green-600 flex items-center">จำนวนข้อที่เลือกครบถ้วนพอดี (รวม {totalSelectedQuestions}/{formData.total_questions})</span>
                                    ) : null}
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end space-x-3">"""
content = content.replace(modal_end, ui_str)

with open('d:/DEV/PreExamV2/src/views/admin/ExamSetManager.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied!")
