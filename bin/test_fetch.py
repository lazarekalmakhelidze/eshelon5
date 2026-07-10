import requests

try:
    res = requests.get("https://job.ocsc.go.th/portal/jobs/10598", timeout=10)
    html = res.text
    if "ลักษณะงานที่ปฏิบัติ" in html:
        print("Found text in HTML!")
    else:
        print("Text not found in HTML. It might be loaded via API.")
        
    print(html[:1000])
except Exception as e:
    print(e)
