const fs = require('fs');
const path = require('path');

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file === 'node_modules' || file === '.next') return;
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.local') || fullPath.endsWith('.env')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // Simple string replacement for ports
            content = content.replace(/localhost:5001/g, 'localhost:5001');
            content = content.replace(/127\.0\.0\.1:5000/g, '127.0.0.1:5001');

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated port 5000 -> 5001 in ${fullPath}`);
            }
        }
    });
}

processDir('.');
console.log("Port swap complete.");
