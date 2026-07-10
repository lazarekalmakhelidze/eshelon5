const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const { db } = require('../server/config/firebase');
const examController = require('../server/controllers/examController');
const fs = require('fs');

// Mock response to capture output from the controller
const callSubmitExam = (req) => {
    return new Promise((resolve, reject) => {
        const res = {
            statusCode: 200,
            status: function (code) {
                this.statusCode = code;
                return this;
            },
            json: function (data) {
                resolve({ statusCode: this.statusCode, data });
            }
        };
        try {
            // examController.submitExam is an async function
            examController.submitExam(req, res).catch(reject);
        } catch (e) {
            reject(e);
        }
    });
};

const SIMULATIONS_PER_CATEGORY = 10;
const QUESTIONS_PER_EXAM = 50;

async function runSimulation() {
    console.log('Starting QA Exam Simulation...');
    let report = {
        totalCategories: 0,
        categoriesTested: [],
        totalExamsGenerated: 0,
        successfulSubmissions: 0,
        errors: [],
        startTime: new Date().toISOString()
    };

    try {
        console.log('Fetching all questions to extract categories...');
        const questionsSnapshot = await db.collection('questions').get();
        const allQuestions = [];
        const categoriesMap = new Map(); // categoryName -> array of questions

        questionsSnapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id; // important for answers mock
            allQuestions.push(data);

            const cat = data.category;
            if (cat) {
                if (!categoriesMap.has(cat)) {
                    categoriesMap.set(cat, []);
                }
                categoriesMap.get(cat).push(data);
            }
        });

        const categories = Array.from(categoriesMap.keys());
        report.totalCategories = categories.length;
        console.log(`Found ${categories.length} categories.`);

        for (const category of categories) {
            console.log(`\nTesting category: ${category}`);
            const categoryQuestions = categoriesMap.get(category);
            report.categoriesTested.push(category);

            for (let i = 1; i <= SIMULATIONS_PER_CATEGORY; i++) {
                report.totalExamsGenerated++;
                // 1. Fetch random questions
                const shuffled = categoryQuestions.sort(() => 0.5 - Math.random());
                const selected = shuffled.slice(0, QUESTIONS_PER_EXAM);

                // 2. Generate random answers
                const answers = {};
                const choices = ['A', 'B', 'C', 'D'];
                selected.forEach(q => {
                    // Just pick a random choice
                    answers[q.id] = choices[Math.floor(Math.random() * choices.length)];
                });

                // 3. Submit exam
                const req = {
                    body: {
                        answers,
                        mode: 'simulation',
                        total_time: Math.floor(Math.random() * 3600) // random time up to 1 hour
                    },
                    user: {
                        id: 'qa_mock_user_123',
                        role: 'user'
                    }
                };

                try {
                    const response = await callSubmitExam(req);
                    if (response.statusCode === 201 || response.statusCode === 200) {
                        report.successfulSubmissions++;
                        process.stdout.write('.');
                    } else {
                        console.error(`\nError in simulation ${i} for ${category}: Status ${response.statusCode}`);
                        report.errors.push({
                            category,
                            simulationIndex: i,
                            statusCode: response.statusCode,
                            data: response.data
                        });
                    }
                } catch (err) {
                    console.error(`\nException in simulation ${i} for ${category}: ${err.message}`);
                    report.errors.push({
                        category,
                        simulationIndex: i,
                        error: err.message
                    });
                }
            }
            console.log(`\nFinished 10 simulations for ${category}`);
        }

        report.endTime = new Date().toISOString();

        // Write report to file so the agent can read it
        fs.writeFileSync(path.join(__dirname, '../qa_report_data.json'), JSON.stringify(report, null, 2));
        console.log('\nSimulation completed. Results written to qa_report_data.json');
        
        process.exit(0);

    } catch (error) {
        console.error('Fatal error during simulation:', error);
        process.exit(1);
    }
}

runSimulation();
