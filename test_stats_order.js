const { ExamResult } = require('./server/firebaseModels');

async function test() {
    try {
        const results = await ExamResult.findAll({
            where: { user_id: 6 }, // using number 6
            order: [['taken_at', 'DESC']]
        });
        console.log('Results length with Number:', results.length);
        
        const resultsStr = await ExamResult.findAll({
            where: { user_id: '6' }, // using string '6'
            order: [['taken_at', 'DESC']]
        });
        console.log('Results length with String:', resultsStr.length);
    } catch (e) {
        console.error(e);
    }
}
test();
