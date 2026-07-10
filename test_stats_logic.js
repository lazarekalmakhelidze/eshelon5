const { ExamResult } = require('./server/firebaseModels');

async function test() {
    try {
        const results = await ExamResult.findAll({
            where: { user_id: '6' }
        });
        console.log('Results length:', results.length);

        if (!results || !Array.isArray(results)) {
            console.log('Not an array');
            return;
        }

        const validResults = results.filter(r => r !== null && typeof r === 'object');
        const totalExams = validResults.length;

        const totalScore = validResults.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
        const totalQuestions = validResults.reduce((acc, curr) => acc + (Number(curr.total_score) || 0), 0);
        const timeTaken = validResults.reduce((acc, curr) => acc + (Number(curr.time_taken) || 0), 0);
        
        const gamesWon = validResults.filter(r => {
            const sc = Number(r.score) || 0;
            const ts = Number(r.total_score) || 10;
            return sc >= ts * 0.8;
        }).length;

        const accuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
        const avgAnswerTime = totalQuestions > 0 ? (timeTaken / totalQuestions).toFixed(1) : 0;

        console.log({
            success: true,
            data: {
                totalExams,
                totalQuestions,
                totalScore,
                timeTaken,
                gamesWon,
                accuracy,
                avgAnswerTime,
                badgesEarned: 0,
                friendsCount: 0
            }
        });
    } catch (e) {
        console.error(e);
    }
}
test();
