const fs = require('fs');
const path = require('path');

const classMap = {
    // Backgrounds
    'bg-primary': 'bg-brand',
    'bg-primary/90': 'hover:bg-brand-dark', // we previously replaced hover:bg-blue-600 with bg-primary/90
    'bg-primary/80': 'bg-brand-dark',
    'bg-primary/20': 'bg-navy-800', // Typically old bg-blue-100 or 200
    'bg-primary/10': 'bg-brand-dim', // old bg-blue-50 -> amber translucent mapping
    'bg-secondary': 'bg-navy-900', // was old light blue mapping
    'bg-navy-950': 'bg-navy-950',
    'bg-indigo-600': 'bg-navy-600',

    // Text colors
    'text-primary': 'text-brand',
    'text-primary/90': 'hover:text-brand',
    'text-primary/80': 'text-brand-dark',
    'text-primary/20': 'text-navy-400',
    'text-primary/10': 'text-navy-200',
    'text-secondary': 'text-navy-400',

    // Borders & Rings
    'border-primary': 'border-brand',
    'border-primary/90': 'border-brand-dark',
    'border-primary/20': 'border-brand-dim',
    'border-primary/10': 'border-brand-light',
    'border-secondary': 'border-navy-700',
    'ring-primary': 'ring-brand',

    // Gradients
    'from-primary': 'from-brand',
    'to-indigo-600': 'to-brand-dark',
    'to-primary/80': 'to-brand-dark',
    'via-primary': 'via-brand',
};

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file === 'node_modules' || file === '.next') return;
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // Replace standard variants ensuring word boundaries to avoid double replacement
            Object.entries(classMap).forEach(([oldClass, newClass]) => {
                const regex = new RegExp(`(?<!-)\\b${oldClass}\\b(?!-)`, 'g');
                content = content.replace(regex, newClass);
            });

            // Hover overrides based on the spec
            content = content.replace(/hover:bg-brand\b/g, 'hover:bg-brand-dark');

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated TZIR Command UI in ${fullPath}`);
            }
        }
    });
}

processDir('.');
console.log("TZIR Command bulk replacement complete.");
