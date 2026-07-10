async function test() {
    const targetUrl = "https://jobapp.ocsc.go.th/jobapi/portal/jobs?department=กรมการแพทย์";
    const res = await fetch(targetUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0"
        }
    });
    console.log(res.status);
    const jsonResponse = await res.json();
    console.log(jsonResponse.length);
}
test();
