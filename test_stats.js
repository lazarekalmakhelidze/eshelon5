const { ExamResult } = require('./server/firebaseModels');

async function test() {
    try {
        const results = await ExamResult.findAll({
            where: { user_id: 1 } // try with user_id: 1, assuming test user
        });
        console.log('Results length:', results.length);
        if (results.length > 0) {
            console.log('Sample:', results[0]);
        }
    } catch (e) {
        console.error(e);
    }
}
test();
