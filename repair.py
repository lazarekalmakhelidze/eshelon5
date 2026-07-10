import json

lines = []
with open('d:/DEV/PreExamV2/src/views/admin/ExamSetManager.jsx', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.rstrip()
        if line:
            lines.append(line)

# lines now has everything up to the <input> element.
# We will truncate it up to the <input> element and append the correct closing tags.
# We will just write out the final expected content.

tail = """
                                                    className="w-24 px-2 py-1 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2 text-sm font-medium">
                                    {difference > 0 ? (
                                        <span className="text-amber-600 flex items-center"><AlertTriangle size={16} className="mr-1" /> จำนวนข้อที่เลือกยังขาดอีก {difference} ข้อ (รวม {totalSelectedQuestions}/{formData.total_questions})</span>
                                    ) : difference < 0 ? (
                                        <span className="text-red-600 flex items-center"><AlertTriangle size={16} className="mr-1" /> จำนวนข้อที่เลือกเกินมา {abs(difference)} ข้อ (รวม {totalSelectedQuestions}/{formData.total_questions})</span>
                                    ) : formData.total_questions > 0 ? (
                                        <span className="text-green-600 flex items-center"><CheckCircle size={16} className="mr-1" /> จำนวนข้อที่เลือกครบถ้วนพอดี (รวม {totalSelectedQuestions}/{formData.total_questions})</span>
                                    ) : null}
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreateModalOpen(false);
                                        setIsEditModalOpen(false);
                                    }}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    {isEditModalOpen ? 'Save Changes' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamSetManager;
"""

# Find where the input onChange is
idx = -1
for i, line in enumerate(lines):
    if 'onChange={(e) => handleCatalogCountChange(catalog, e.target.value)}' in line:
        idx = i
        break

if idx != -1:
    lines = lines[:idx+1]
    
    with open('d:/DEV/PreExamV2/src/views/admin/ExamSetManager.jsx', 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
        f.write('\n' + tail)
    print("Repaired!")
else:
    print("Could not find the onChange line.")
