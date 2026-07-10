const http = require('http'); 
const data = JSON.stringify({ category: 'General', question_text: 'Test', options: ['A','B','C','D'], correct_answer: 'A' }); 
const req = http.request({ 
  hostname: 'localhost', 
  port: 3000, 
  path: '/api/questions', 
  method: 'POST', 
  headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } 
}, res => { 
  console.log('STATUS:', res.statusCode); 
  res.on('data', d => console.log('BODY:', d.toString())); 
}); 
req.on('error', console.error); 
req.write(data); 
req.end();
