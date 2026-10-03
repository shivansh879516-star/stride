const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('mobile/src');

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/backgroundColor:\s*['"]#(ffffff|f8fafc)['"]/g, "backgroundColor: 'var(--bg-card)'");
  code = code.replace(/backgroundColor:\s*['"]#(f1f5f9)['"]/g, "backgroundColor: 'var(--bg-elevated)'");
  code = code.replace(/color:\s*['"]#(0f172a|1e293b|334155)['"]/g, "color: 'var(--text-primary)'");
  code = code.replace(/color:\s*['"]#(475569|64748b|94a3b8)['"]/g, "color: 'var(--text-muted)'");
  code = code.replace(/border:\s*['"]1px solid #(e2e8f0|cbd5e1)['"]/g, "border: '1px solid var(--border-subtle)'");
  fs.writeFileSync(file, code);
});
console.log('Fixed dark mode!');
