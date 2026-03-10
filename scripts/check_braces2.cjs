const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'App.jsx');
if (!fs.existsSync(file)) { console.error('FILE_NOT_FOUND', file); process.exit(1); }
const s = fs.readFileSync(file, 'utf8');
const pairs = { '{': '}', '(': ')', '[': ']' };
let stack = [];
let errors = [];
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  if (pairs[ch]) stack.push({ ch, i });
  else if (Object.values(pairs).includes(ch)) {
    if (stack.length === 0) errors.push({ i, ch, type: 'unmatched' });
    else { let last = stack[stack.length-1]; if (pairs[last.ch] === ch) stack.pop(); else errors.push({ i, ch, type: 'mismatch', last }); }
  }
}
console.log('remaining_stack=', stack.length);
if (stack.length) {
  const lines = s.split(/\r?\n/);
  const positions = stack.map(({ch,i}) => {
    let line = 0, col = 0, count = 0;
    for (let ln = 0; ln < lines.length; ln++) {
      const L = lines[ln] + '\n';
      if (count + L.length > i) { line = ln+1; col = i - count + 1; break; }
      count += L.length;
    }
    return { ch, i, line, col, context: lines[line-1].slice(0,200) };
  });
  console.log('unclosed positions:', positions);
}
if (errors.length) {
  console.log('errors_sample=', errors.slice(0,10));
}
const lines = s.split(/\r?\n/);
const start = Math.max(0, lines.length - 200);
for (let ln = start; ln < lines.length; ln++) {
  console.log((ln+1).toString().padStart(4,' ') + ': ' + lines[ln]);
}
