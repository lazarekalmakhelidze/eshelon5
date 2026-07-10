fetch('https://job.ocsc.go.th/portal/assets/index-BO0wSeMA.js', {headers: {'User-Agent': 'Mozilla/5.0'}})
  .then(r => r.text())
  .then(t => { 
    const m = t.match(/https:\/\/[^\'\"\`]+/g); 
    if (m) console.log([...new Set(m)].filter(u => u.includes('ocsc')).slice(0, 20)); 
  })
  .catch(e => console.error(e));
