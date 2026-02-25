const fs = require('fs');
const path = require('path');

const replacements = [
    // Deep Navy / Dark colors -> Primary Dark (#1C3D2A)
    { regex: /0xFF001C44|0xFF00251A|0xFF004E92/gi, replace: "0xFF1C3D2A" },
    // Cyan / Bright Turquoise -> Primary Medium (#6B8F3E)
    { regex: /0xFF00D4FF|0xFF00C4B4|0xFF00E5FF/gi, replace: "0xFF6B8F3E" },
    // Royal Blue / Deep Turquoise -> Accent Teal (#1A7A8A)
    { regex: /0xFF1565C0|0xFF004D40|0xFF00695C/gi, replace: "0xFF1A7A8A" },
    // Soft/Light Blues -> Off-White (#F5F5F0) or Primary Light (#8FB84A)
    // We'll use Off-White for backgrounds and Primary Light for accents
    { regex: /0xFFE0F7FA|0xFFF8FBFE|0xFFE3F2FD/gi, replace: "0xFFF5F5F0" },
    { regex: /0xFF81D4FA|0xFF4DD0E1/gi, replace: "0xFF8FB84A" },
    { regex: /0xFF10B981/gi, replace: "0xFF4CAF50" } // Tailwind Emerald -> Accent Green
];

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file === 'build' || file === '.idea' || file === 'Theme') return;
            processDir(fullPath);
        } else if (fullPath.endsWith('.kt') && !fullPath.includes('Theme.kt')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            replacements.forEach(r => {
                content = content.replace(r.regex, r.replace);
            });

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated Android Color in ${fullPath}`);
            }
        }
    });
}

processDir('.');
console.log("Android Color replacement complete.");
