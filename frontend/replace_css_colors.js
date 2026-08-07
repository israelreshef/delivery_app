const fs = require('fs');
const path = require('path');

const REPLACEMENTS = {
  '#0B0E14': '#07162C',
  '#0B0E17': '#07162C',
  '#111827': '#0C1E3A',
  '#1F293B': '#112648',
  '#374151': '#1A3566',
  '#3B82F6': '#145DDB',
  '#60A5FA': '#5AA0FF',
  '#93C5FD': '#5AA0FF',
  '#94A3B8': '#5A8AC0',
  '#CBD5E1': '#B8CDE5',
  '#0F172A': '#07162C',
  '#2563EB': '#1048B0',
};

const RGBA_REPLACEMENTS = {
  'rgba(59, 130, 246,': 'rgba(20, 93, 219,',
  'rgba(96, 165, 250,': 'rgba(90, 160, 255,',
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  for (const [from, to] of Object.entries(REPLACEMENTS)) {
    const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    content = content.replace(regex, to);
  }

  for (const [from, to] of Object.entries(RGBA_REPLACEMENTS)) {
    const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    content = content.replace(regex, to);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
    return true;
  }
  return false;
}

function processDir(dir) {
  let count = 0;
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file === 'node_modules' || file === '.next') return;
      count += processDir(fullPath);
    } else if (fullPath.endsWith('.css') && fullPath.includes('module')) {
      if (processFile(fullPath)) count++;
    }
  });
  return count;
}

const updated = processDir(path.join(__dirname, 'app', 'admin'));
console.log(`\nTotal files updated: ${updated}`);
