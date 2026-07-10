const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const { db } = require('./server/config/firebase');

const newQuestions = [
    // --- อุปมาอุปไมย ---
    {
        question_text: "มะกรูด : ผม --> ....?.... : ....?....",
        choice_a: "น้ำมัน : มะพร้าว", choice_b: "มะนาว : น้ำผึ้ง", choice_c: "เกลือ : ปลา", choice_d: "มะยม : น้ำตาล",
        correct_answer: "c",
        category: "ความสามารถในการวิเคราะห์", catalogs: ["ความสามารถในการวิเคราะห์", "อุปมาอุปไมย"]
    },
    {
        question_text: "ขาล : เสือ --> วันอาทิตย์ : ....?....",
        choice_a: "สีแดง", choice_b: "ร้อนแรง", choice_c: "พระอาทิตย์", choice_d: "วันหยุด",
        correct_answer: "a",
        category: "ความสามารถในการวิเคราะห์", catalogs: ["ความสามารถในการวิเคราะห์", "อุปมาอุปไมย"]
    },
    {
        question_text: "สิ้นบุญ : สิ้นใจ --> ....?.... : ....?....",
        choice_a: "ภูมิธรรม : ภูมิฐาน", choice_b: "โภชนากร : โภชนาการ", choice_c: "ไพร่พล : ไพร่ฟ้า", choice_d: "ปากฉลาม : ปากช้าง",
        correct_answer: "d",
        category: "ความสามารถในการวิเคราะห์", catalogs: ["ความสามารถในการวิเคราะห์", "อุปมาอุปไมย"]
    },
    {
        question_text: "สายโทรศัพท์ : เสาอากาศ --> ....?.... : ....?....",
        choice_a: "ถนน : ทางม้าลาย", choice_b: "สะพานลอย : เสาไฟฟ้า", choice_c: "เสาธง : สายไฟฟ้า", choice_d: "ต้นสัก : สายเคเบิล",
        correct_answer: "c",
        category: "ความสามารถในการวิเคราะห์", catalogs: ["ความสามารถในการวิเคราะห์", "อุปมาอุปไมย"]
    },
    {
        question_text: "ผึ้ง : ผีเสื้อ --> ....?.... : ....?....",
        choice_a: "ม้า : ลา", choice_b: "กิ้งกือ : ตะขาบ", choice_c: "โลมา : วาฬ", choice_d: "งูเห่า : งูเหลือม",
        correct_answer: "b",
        category: "ความสามารถในการวิเคราะห์", catalogs: ["ความสามารถในการวิเคราะห์", "อุปมาอุปไมย"]
    },

    // --- ตาราง ---
    {
        question_text: "จากข้อมูลในตาราง ใช้ตอบคำถามข้อ 28 - 32\n(ตารางจำนวนนักท่องเที่ยวและรายได้)\n\nข้อ 28) ในปี 2564 จำนวนนักท่องเที่ยวจากเอเชียใต้คิดเป็นร้อยละเท่าไรของนักท่องเที่ยวจากยุโรปในปีเดียวกัน",
        choice_a: "5.76", choice_b: "6.64", choice_c: "7.34", choice_d: "8.56",
        correct_answer: "b",
        category: "ความสามารถในการวิเคราะห์", catalogs: ["ความสามารถในการวิเคราะห์", "วิเคราะห์ข้อมูลตาราง"]
    },
    {
        question_text: "ข้อ 29) ในปี 2565 ภูมิภาคที่มีจำนวนนักท่องเที่ยวมากสุดคิดเป็นกี่เท่าของภูมิภาคที่มีจำนวนนักท่องเที่ยวน้อยที่สุด",
        choice_a: "50", choice_b: "55", choice_c: "62", choice_d: "67",
        correct_answer: "c",
        category: "ความสามารถในการวิเคราะห์", catalogs: ["ความสามารถในการวิเคราะห์", "วิเคราะห์ข้อมูลตาราง"]
    },
    {
        question_text: "ข้อ 30) รายได้รวมจากการท่องเที่ยวในปี 2565 เพิ่มขึ้นจากปี 2564 ร้อยละเท่าใด",
        choice_a: "20.27", choice_b: "18.76", choice_c: "22.43", choice_d: "17.82",
        correct_answer: "a",
        category: "ความสามารถในการวิเคราะห์", catalogs: ["ความสามารถในการวิเคราะห์", "วิเคราะห์ข้อมูลตาราง"]
    },
    {
        question_text: "ข้อ 31) จำนวนนักท่องเที่ยวอเมริกา ยุโรป และแอฟริกา ในปี 2564 คิดเป็นร้อยละเท่าใดของนักท่องเที่ยวทั้งหมด",
        choice_a: "56.65", choice_b: "58.45", choice_c: "60.25", choice_d: "61.95",
        correct_answer: "d",
        category: "ความสามารถในการวิเคราะห์", catalogs: ["ความสามารถในการวิเคราะห์", "วิเคราะห์ข้อมูลตาราง"]
    },
    {
        question_text: "ข้อ 32) รายได้จากการท่องเที่ยวของภูมิภาคใดมีอัตราการเพิ่มขึ้นน้อยที่สุด",
        choice_a: "ตะวันออกกลาง", choice_b: "อเมริกา", choice_c: "อาเซียน", choice_d: "เอเชียตะวันออกเฉียงเหนือ",
        correct_answer: "b",
        category: "ความสามารถในการวิเคราะห์", catalogs: ["ความสามารถในการวิเคราะห์", "วิเคราะห์ข้อมูลตาราง"]
    },

    // --- อนุกรม ---
    {
        question_text: "-10, 2, 11, 22, 40, 70, .........",
        choice_a: "117", choice_b: "100", choice_c: "72", choice_d: "69",
        correct_answer: "a",
        category: "ความสามารถทั่วไป (คณิตศาสตร์)", catalogs: ["ความสามารถทั่วไป (คณิตศาสตร์)", "อนุกรม"]
    },
    {
        question_text: "1, 9, 25, 49, .........",
        choice_a: "64", choice_b: "81", choice_c: "98", choice_d: "121",
        correct_answer: "b",
        category: "ความสามารถทั่วไป (คณิตศาสตร์)", catalogs: ["ความสามารถทั่วไป (คณิตศาสตร์)", "อนุกรม"]
    },
    {
        question_text: "12, 15, 20, 20, 17, 32, 28, 21, 48, 36, 27, 68, 44, 35, .......",
        choice_a: "74", choice_b: "81", choice_c: "92", choice_d: "108",
        correct_answer: "c",
        category: "ความสามารถทั่วไป (คณิตศาสตร์)", catalogs: ["ความสามารถทั่วไป (คณิตศาสตร์)", "อนุกรม"]
    },
    {
        question_text: "18/39, 23/67, 28/105, 33/153, ........",
        choice_a: "39/191", choice_b: "39/211", choice_c: "38/191", choice_d: "38/211",
        correct_answer: "d",
        category: "ความสามารถทั่วไป (คณิตศาสตร์)", catalogs: ["ความสามารถทั่วไป (คณิตศาสตร์)", "อนุกรม"]
    },
    {
        question_text: "3, 8, 22, 63, .........",
        choice_a: "134", choice_b: "156", choice_c: "185", choice_d: "192",
        correct_answer: "c",
        category: "ความสามารถทั่วไป (คณิตศาสตร์)", catalogs: ["ความสามารถทั่วไป (คณิตศาสตร์)", "อนุกรม"]
    },

    // --- โอเปอเรชัน ---
    {
        question_text: "กำหนดให้ 5*2 = 27 และ 3*6 = -27 จงหา 2*4 = ?",
        choice_a: "8", choice_b: "-8", choice_c: "4", choice_d: "-4",
        correct_answer: "b",
        category: "ความสามารถทั่วไป (คณิตศาสตร์)", catalogs: ["ความสามารถทั่วไป (คณิตศาสตร์)", "โอเปอเรชัน"]
    },
    {
        question_text: "กำหนดให้ 2*7 = 7 และ 3*4 = 6 จงหา 11*2 = ?",
        choice_a: "11", choice_b: "12", choice_c: "13", choice_d: "14",
        correct_answer: "a",
        category: "ความสามารถทั่วไป (คณิตศาสตร์)", catalogs: ["ความสามารถทั่วไป (คณิตศาสตร์)", "โอเปอเรชัน"]
    },

    // --- Reading (Letter) 66-67 ---
    {
        question_text: "Directions: Questions 66 - 70 refer to the following letter\nFrom: Arun Phan (arunphan@tnet.com)\nTo: Customer Support (support@sparkypaints.com)\nDate: March 12\nSubject: Order #3397\n\nHello,\nThanks for sending my order #3397. I selected my top color 2 gallons online on March 10 and it arrived this morning. Unfortunately, the paint was not the one I had asked for. I had selected color SP 944 (Misty Gray) but received SP 945 (Ocean Waves). They appear right next to each other on your Web site, so the two may have been confused at your end. Could you send me the correct paint, along with additional samples that are close in color to SP 722 (Stormy Blue)? That sample worked well in my house; the others looked too green on my walls.\n\nThank you,\nArun Phan\n\n66) The word \"top\" in line 1, is closest in meaning to .........",
        choice_a: "upper", choice_b: "favorite", choice_c: "maximum", choice_d: "important",
        correct_answer: "b",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Reading Comprehension"]
    },
    {
        question_text: "(อ้างอิงจดหมายเรื่อง Order #3397 ของ Arun Phan)\n67) What are Sparky Paints customers advised to do?",
        choice_a: "Apply an adhesive to color samples.", choice_b: "Visit a store to compare paint colors.", choice_c: "Adjust the color on their computer monitor.", choice_d: "Order samples of several similar colors.",
        correct_answer: "d",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Reading Comprehension"]
    },

    // --- Reading (Missing Passage) 72-75 ---
    {
        question_text: "[ไม่มีบทความให้อ่าน]\n72) What problem is highlighted in the above passage?",
        choice_a: "capacity of teachers", choice_b: "the digital learning gap", choice_c: "dropouts during pandemic", choice_d: "decline in learning outcomes",
        correct_answer: "b",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Reading Comprehension"]
    },
    {
        question_text: "[ไม่มีบทความให้อ่าน]\n73) \"pilot\" (paragraph 2 line 3) refers to ______",
        choice_a: "trial", choice_b: "video", choice_c: "official", choice_d: "approach",
        correct_answer: "a",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Reading Comprehension"]
    },
    {
        question_text: "[ไม่มีบทความให้อ่าน]\n74) Which of the following is NOT mentioned in this passage?",
        choice_a: "online school platform leading to quality relationship between student and educator.", choice_b: "they prefer a hybrid form of instruction that combines distance and face-to-face instruction.", choice_c: "most of students faced technical difficulties during distance learning, such as poor internet connection, lack of access to online platform.", choice_d: "Department of Teacher Education is beginning a project to support learning continuity.",
        correct_answer: "a",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Reading Comprehension"]
    },
    {
        question_text: "[ไม่มีบทความให้อ่าน]\n75) Which of the following is TRUE?",
        choice_a: "students received three hours of online tutoring a week via online school platform.", choice_b: "the students who cannot access internet at home are the largest group of students in Malaysia.", choice_c: "the new approach led to more benefits, such as cost and time efficiency and flexibility.", choice_d: "traditional face-to-face learning could help address the learning gap.",
        correct_answer: "d",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Reading Comprehension"]
    }
];

async function addBatch() {
    try {
        const batch = db.batch();
        
        // Update the 3 existing reading questions (68-70) that were added in the previous step
        const existingDocs = await db.collection('questions')
            .where('exam_year', '==', '2566')
            .where('category', '==', 'ภาษาอังกฤษ')
            .get();
        
        const textForReading = "(อ้างอิงจดหมายเรื่อง Order #3397 ของ Arun Phan)\n";
        
        existingDocs.forEach(doc => {
            const data = doc.data();
            if (data.question_text && data.question_text.includes("Order #3397")) {
                const updatedText = textForReading + data.question_text.replace("[ไม่มีบทความให้อ่าน]\n", "");
                batch.update(doc.ref, { 
                    question_text: updatedText,
                    correct_answer: data.question_text.includes("68)") ? "a" : (data.question_text.includes("69)") ? "c" : "a") 
                });
            }
        });

        // Add the new 23 questions
        const snapshot = await db.collection('questions').orderBy('id', 'desc').limit(1).get();
        let startId = 1000;
        if (!snapshot.empty) {
            const maxId = parseInt(snapshot.docs[0].id) || parseInt(snapshot.docs[0].data().id);
            if (!isNaN(maxId)) {
                startId = maxId + 1;
            }
        }
        
        newQuestions.forEach((q, index) => {
            const docId = (startId + index).toString();
            const docRef = db.collection('questions').doc(docId);
            
            const fullQuestion = {
                id: docId,
                ...q,
                subject: 'กพ ภาค ก',
                skill: q.category, 
                exam_set: 'ข้อสอบจริง (Past Exam)',
                exam_year: '2566',
                explanation: 'ข้อสอบจริง กพ ภาค ก ปี 66',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                difficulty: 50,
                rating: 0,
                ratingCount: 0
            };
            
            batch.set(docRef, fullQuestion);
        });
        
        await batch.commit();
        console.log(`Successfully added ${newQuestions.length} questions and updated references.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

addBatch();
