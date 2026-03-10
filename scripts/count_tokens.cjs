const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'App.jsx');
const s = fs.readFileSync(file, 'utf8');
const counts = {
  '{': (s.match(/\{/g) || []).length,
  '}': (s.match(/\}/g) || []).length,
  '(': (s.match(/\(/g) || []).length,
  ')': (s.match(/\)/g) || []).length,
  '[': (s.match(/\[/g) || []).length,
  ']': (s.match(/\]/g) || []).length
};
console.log(counts);
