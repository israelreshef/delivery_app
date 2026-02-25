const fs = require('fs');
const path = require('path');

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file === 'node_modules' || file === '.next') return;
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // Replace standard variants
            content = content.replace(/(bg|text|border|ring|stroke|fill|from|via|to)-blue-[567]00/g, '$1-primary');
            content = content.replace(/(bg|text|border|ring|stroke|fill|from|via|to)-blue-[89]00/g, '$1-foreground');
            content = content.replace(/(bg|text|border|ring|stroke|fill|from|via|to)-blue-[12]00/g, '$1-primary/20');
            content = content.replace(/(bg|text|border|ring|stroke|fill|from|via|to)-blue-50/g, '$1-primary/10');
            content = content.replace(/(bg|text|border|ring|stroke|fill|from|via|to)-blue-[34]00/g, '$1-primary/80');

            content = content.replace(/(hover:.*)-blue-[567]00/g, '$1-primary/90');
            content = content.replace(/(hover:.*)-blue-[12]00/g, '$1-primary/30');

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath}`);
            }
        }
    });
}

processDir('.');
console.log("Color replacement complete.");
