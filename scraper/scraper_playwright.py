import time
import json
import logging
import sys
import os
from playwright.sync_api import sync_playwright
import requests

# Configure logging
log_file = os.path.join(os.path.dirname(__file__), 'scraper.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

BASE_URL = "https://job.ocsc.go.th"
API_URL = "http://localhost:3000/api/scraper/jobs"
API_KEY = "dev_scraper_key"

def scrape_jobs():
    logging.info(f"Starting scrape at {BASE_URL}/portal using Playwright")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            page.goto(f"{BASE_URL}/portal", wait_until="networkidle")
            time.sleep(2) # Give it some extra time to render React components
            
            # Find department links
            dept_links = page.locator("a.job-board-card").all()
            departments = []
            
            for dept in dept_links:
                href = dept.get_attribute("href")
                if href and '/portal/search?department=' in href:
                    img = dept.locator("img").first
                    logo = img.get_attribute("src") if img else ""
                    departments.append({
                        "url": BASE_URL + href,
                        "logo": logo
                    })
            
            logging.info(f"Found {len(departments)} departments to scrape.")
            
            for dept in departments:
                logging.info(f"Scraping department: {dept['url']}")
                page.goto(dept['url'], wait_until="networkidle")
                time.sleep(2)
                
                # Fetch job cards
                job_links = page.locator("a.job-card").all()
                job_urls = []
                for job in job_links:
                    href = job.get_attribute("href")
                    if href:
                        job_urls.append(BASE_URL + href)
                
                for job_url in job_urls:
                    logging.info(f"Scraping job detail: {job_url}")
                    page.goto(job_url, wait_until="networkidle")
                    time.sleep(1.5)
                    
                    # Extract from detail page
                    # Job title is usually in a prominent header or we can get it from specific layout
                    # Let's extract all text and do some heuristic, or find specific labels
                    # Based on user's image:
                    # "รับสมัคร" -> พนักงานราชการ
                    # "ตำแหน่ง" -> เจ้าพนักงานผู้ช่วยประมง...
                    # "จังหวัดที่บรรจุ" -> สมุทรสาคร
                    # "เงินเดือน" -> 16,700 บาท
                    # "ระดับการศึกษา" -> ปวส., อนุปริญญา
                    # "ลักษณะงานที่ปฏิบัติ" -> text
                    
                    try:
                        category = page.locator("text='รับสมัคร'").locator("..").locator("div, p, span, a").nth(1).inner_text().strip()
                    except:
                        category = ""
                        
                    try:
                        position = page.locator("text='ตำแหน่ง'").locator("..").locator("div, p, span").nth(1).inner_text().strip()
                    except:
                        position = page.title()
                        
                    try:
                        agency = page.locator("img").locator("..").locator("p, h1, h2, h3, h4").first.inner_text().strip()
                    except:
                        agency = ""
                        
                    try:
                        location = page.locator("text='จังหวัดที่บรรจุ'").locator("..").locator("div, p, span, li").nth(1).inner_text().strip()
                    except:
                        location = ""
                        
                    try:
                        salary = page.locator("text='เงินเดือน'").locator("..").locator("div, p, span").nth(1).inner_text().strip()
                    except:
                        salary = ""
                        
                    try:
                        vacancy = page.locator("text='จำนวน'").locator("..").locator("div, p, span").nth(1).inner_text().strip()
                    except:
                        vacancy = "1 อัตรา"
                        
                    try:
                        education = page.locator("text='ระดับการศึกษา'").locator("..").locator("ul, div, p").nth(1).inner_text().strip().replace('\n', ', ')
                    except:
                        education = ""
                        
                    try:
                        description = page.locator("text='ลักษณะงานที่ปฏิบัติ'").locator("..").locator("p, div, span").nth(1).inner_text().strip()
                    except:
                        description = ""
                        
                    job_data = {
                        "title": position,
                        "content": description or f"ประกาศรับสมัครงาน {position} หน่วยงาน {agency}",
                        "summary": f"{category} - {position} ({vacancy})",
                        "image_url": dept['logo'],
                        "pdf_url": "",
                        "external_link": job_url,
                        "keywords": f"{agency}, {category}, หางานราชการ",
                        "source_memo": "job.ocsc.go.th",
                        "agency": agency,
                        "end_date": "",
                        "metadata": {
                            "organization": agency,
                            "agency_logo": dept['logo'],
                            "recruitment_type": category,
                            "position_type": category,
                            "vacancy_count": vacancy,
                            "location": location,
                            "salary": salary,
                            "education_level": education
                        }
                    }
                    
                    # Post to API
                    try:
                        headers = {
                            "Content-Type": "application/json",
                            "x-api-key": API_KEY
                        }
                        res = requests.post(API_URL, json=job_data, headers=headers)
                        if res.status_code in [200, 201]:
                            logging.info(f"Successfully posted job: {position} at {agency}")
                        else:
                            logging.warning(f"Failed to post job: {position} - Status: {res.status_code}")
                    except Exception as e:
                        logging.error(f"Error posting job to API: {str(e)}")
                        
        except Exception as e:
            logging.error(f"Error during scrape: {str(e)}")
        finally:
            browser.close()

if __name__ == "__main__":
    scrape_jobs()
