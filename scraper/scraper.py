import requests
from bs4 import BeautifulSoup
import json
import logging
import sys
import os
from datetime import datetime
import time

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

def parse_date(date_str):
    # Example: 4 มิ.ย. 2569
    # Just return as string for now since we just display it, but we could convert to ISO if needed.
    return date_str

def scrape_jobs():
    logging.info(f"Starting scrape at {BASE_URL}/portal")
    
    try:
        # Fetch the main portal page
        response = requests.get(f"{BASE_URL}/portal", timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        departments = []
        
        # Find all department links (e.g. href="/portal/search?department=...")
        for a_tag in soup.find_all('a', class_='job-board-card'):
            href = a_tag.get('href')
            if href and '/portal/search?department=' in href:
                # Extract image if any
                img = a_tag.find('img')
                logo = img['src'] if img and img.has_attr('src') else ''
                departments.append({
                    'url': BASE_URL + href,
                    'logo': logo
                })
        
        logging.info(f"Found {len(departments)} departments to scrape.")
        
        # Fetch each department
        for dept in departments:
            logging.info(f"Scraping department: {dept['url']}")
            dept_res = requests.get(dept['url'], timeout=10)
            if dept_res.status_code != 200:
                logging.error(f"Failed to fetch {dept['url']}")
                continue
            
            dept_soup = BeautifulSoup(dept_res.text, 'html.parser')
            
            job_cards = dept_soup.find_all('a', class_='job-card')
            for card in job_cards:
                href = card.get('href')
                job_url = BASE_URL + href if href else ''
                
                # Extract data
                category_p = card.find('p', id='category')
                category_text = category_p.text.strip() if category_p else ''
                
                position_p = card.find('p', id='position')
                position_text = position_p.text.strip() if position_p else ''
                
                dept_link = card.find('a', id='department-link')
                dept_text = dept_link.text.strip() if dept_link else ''
                
                # Dates
                spans = card.find_all('span')
                start_date = ''
                end_date = ''
                for i, span in enumerate(spans):
                    if 'มิ.ย.' in span.text or 'พ.ค.' in span.text or '256' in span.text:
                        # rough extraction, assumes first date is start, second is end
                        if not start_date:
                            start_date = span.text.strip()
                        elif not end_date and span.text.strip() != '-':
                            end_date = span.text.strip()
                
                vacancy_p = card.find('p', class_='position-chip')
                vacancy_text = vacancy_p.text.strip() if vacancy_p else '1 อัตรา'
                
                img_tag = card.find('img')
                agency_logo = img_tag['src'] if img_tag and img_tag.has_attr('src') else dept['logo']
                
                job_data = {
                    "title": position_text,
                    "content": f"ประกาศรับสมัครงาน {position_text} หน่วยงาน {dept_text}",
                    "summary": f"{category_text} - {position_text} ({vacancy_text})",
                    "image_url": agency_logo,
                    "pdf_url": "",
                    "external_link": job_url,
                    "keywords": f"{dept_text}, {category_text}, หางานราชการ",
                    "source_memo": "job.ocsc.go.th",
                    "agency": dept_text,
                    "end_date": end_date,
                    "metadata": {
                        "organization": dept_text,
                        "agency_logo": agency_logo,
                        "recruitment_type": category_text,
                        "position_type": category_text,
                        "vacancy_count": vacancy_text,
                        "application_start": start_date,
                        "application_end": end_date,
                        "location": "",
                        "salary": ""
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
                        logging.info(f"Successfully posted job: {position_text} at {dept_text}")
                    else:
                        logging.warning(f"Failed to post job: {position_text} - Status: {res.status_code}")
                except Exception as e:
                    logging.error(f"Error posting job to API: {str(e)}")
                    
            time.sleep(1) # Be polite to the server
            
    except Exception as e:
        logging.error(f"Error during scrape: {str(e)}")

if __name__ == "__main__":
    scrape_jobs()
