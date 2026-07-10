const fetch = require('node-fetch'); // wait node 18+ has fetch natively

async function run() {
    const r = await fetch('https://job.ocsc.go.th/portal');
    const t = await r.text();
    const match = t.match(/src=\"(\/portal\/assets\/index-[^\"]+\.js)\"/);
    if(match) {
        const jsRes = await fetch('https://job.ocsc.go.th' + match[1]);
        const js = await jsRes.text();
        const apis = js.match(/https?:\/\/job\.ocsc\.go\.th[^\s\"'\`]+/g);
        console.log("APIs found:");
        if (apis) {
            console.log(Array.from(new Set(apis)));
        } else {
            console.log("No API matches");
        }

        const otherEndpoints = js.match(/\/api\/[a-zA-Z0-9_\-\/]+/g);
        console.log("Other Endpoints:", otherEndpoints ? Array.from(new Set(otherEndpoints)).slice(0, 20) : "None");
    } else {
        console.log("No JS found");
    }
}
run();
