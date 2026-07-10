const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    // Intercept network requests
    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('api') || url.includes('json') || url.includes('jobapp.ocsc.go.th')) {
            console.log(`[API CALL] ${url} | Status: ${response.status()}`);
            try {
                if (response.request().resourceType() === 'fetch' || response.request().resourceType() === 'xhr') {
                    const data = await response.json();
                    console.log(`[DATA] Keys: ${Object.keys(data).join(', ')}`);
                }
            } catch (e) {
                // Ignore parsing errors for non-json
            }
        }
    });

    console.log('Navigating to OCSC...');
    await page.goto('https://job.ocsc.go.th/portal/search?department=กรมการแพทย์', { waitUntil: 'networkidle2' });
    
    console.log('Done waiting. Closing.');
    await browser.close();
})();
