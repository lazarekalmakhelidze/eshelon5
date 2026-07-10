const html = `<div class="flex flex-col gap-4 mt-8"><a class="job-card" href="/portal/jobs/10732" data-discover="true"><div class="content flex gap-5 items-start text-left"><img alt="" class="min-w-14 w-14 h-14 md:min-w-18 md:w-18 md:h-18 object-contain" src="https://job.ocsc.go.th/content/accreditation/departments/162.png"><div><p class="line-clamp-1" id="category">ข้าราชการพลเรือน</p><p class="mt-1.5" id="position">นายแพทย์ปฏิบัติการ (สาขาอายุรศาสตร์ โรงพยาบาลราชวิถี 2 (รังสิต))</p><a id="department-link" class="mt-2" href="/portal/search?department=กรมการแพทย์" data-discover="true"><p class="line-clamp-3">กรมการแพทย์</p></a><label class="mt-5">เปิดรับสมัคร</label><span>4 มิ.ย. 2569</span><span> - </span><span class="pr-4">11 มิ.ย. 2569</span></div></div><div class="text-right"><p class="position-chip ml-auto">1 อัตรา</p><span class="view text-right text-xs font-light absolute right-5 bottom-4">อ่าน 124 ครั้ง</span></div></a><a class="job-card" href="/portal/jobs/10733" data-discover="true"><div class="content flex gap-5 items-start text-left"><img alt="" class="min-w-14 w-14 h-14 md:min-w-18 md:w-18 md:h-18 object-contain" src="https://job.ocsc.go.th/content/accreditation/departments/162.png"><div><p class="line-clamp-1" id="category">ข้าราชการพลเรือน</p><p class="mt-1.5" id="position">นายแพทย์ปฏิบัติการ (สาขาจักษุวิทยา โรงพยาบาลราชวิถี 2 (รังสิต))</p><a id="department-link" class="mt-2" href="/portal/search?department=กรมการแพทย์" data-discover="true"><p class="line-clamp-3">กรมการแพทย์</p></a><label class="mt-5">เปิดรับสมัคร</label><span>4 มิ.ย. 2569</span><span> - </span><span class="pr-4">11 มิ.ย. 2569</span></div></div><div class="text-right"><p class="position-chip ml-auto">1 อัตรา</p><span class="view text-right text-xs font-light absolute right-5 bottom-4">อ่าน 40 ครั้ง</span></div></a>`;

const regex = /<a class="job-card" href="([^"]+)"[\s\S]*?id="category">([^<]+)<\/p>[\s\S]*?id="position">([^<]+)<\/p>[\s\S]*?id="department-link"[^>]*>[\s\S]*?<p[^>]*>([^<]+)<\/p>[\s\S]*?<label[^>]*>[^<]*<\/label>\s*<span>([^<]+)<\/span>\s*<span>[^<]*<\/span>\s*<span[^>]*>([^<]+)<\/span>[\s\S]*?<p class="position-chip[^"]*">([^<]+)<\/p>/g;

let match;
while ((match = regex.exec(html)) !== null) {
    console.log({
        href: match[1],
        category: match[2],
        position: match[3],
        department: match[4],
        start: match[5],
        end: match[6],
        vacancy: match[7]
    });
}
