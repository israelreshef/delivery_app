const fs = require('fs');
const path = require('path');

const classMap = {
    // OLD -> NEW
    // Backgrounds & Surfaces
    'Color(0xFF001C44)': 'Navy950', // #05101F
    'Color(0xFF00251A)': 'Navy900', // #0A1929
    'Color(0xFF004E92)': 'Navy600', // #1A3557

    // Primary Accents (was cyan/turquoise)
    'Color(0xFF00D4FF)': 'Amber',
    'Color(0xFF00C4B4)': 'Amber',
    'Color(0xFF00E5FF)': 'Amber',

    // Secondary Accents (was royal blue)
    'Color(0xFF1565C0)': 'Navy600',
    'Color(0xFF004D40)': 'Navy700',

    // Light Backgrounds
    'Color(0xFFF8FBFE)': 'BackgroundLight',
    'Color(0xFFE0F7FA)': 'AmberLight',
    'Color(0xFFE3F2FD)': 'Surface2Light',

    // Overwrite previous generic TZIR replacements we might have bumped into
    'PrimaryDark': 'Navy950',
    'PrimaryMedium': 'Amber',
    'PrimaryLight': 'Navy400',
    'AccentTeal': 'Amber',
    'AccentGreen': 'Success',
    'NeutralWhite': 'SurfaceLight',
    'NeutralOffWhite': 'BackgroundLight',
    'NeutralDark': 'Navy950',
};

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file === 'build' || file === '.gradle') return;
            processDir(fullPath);
        } else if (fullPath.endsWith('.kt') && !fullPath.includes('Theme.kt') && !fullPath.includes('Color.kt') && !fullPath.includes('Type.kt')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // Simple string replacement for exact hex codes
            Object.entries(classMap).forEach(([oldClass, newClass]) => {
                const regex = new RegExp(oldClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                content = content.replace(regex, newClass);
            });

            if (content !== originalContent) {
                // Ensure the new TZIR Command Color variables are imported where used
                if (!content.includes('import com.tzir.delivery.android.ui.theme.*') && !content.includes('package com.tzir.delivery.android.ui.theme')) {
                    // Try to insert after the last import, or just at the top below package
                    if (content.includes('import ')) {
                        content = content.replace(/(import .*?\n)(?!import)/s, '$1import com.tzir.delivery.android.ui.theme.*\n');
                    } else {
                        content = content.replace(/(package .*?\n)/, '$1\nimport com.tzir.delivery.android.ui.theme.*\n');
                    }
                }

                fs.writeFileSync(fullPath, content);
                console.log(`Updated TZIR Command Colors in ${fullPath}`);
            }
        }
    });
}

processDir('src/main/java');
console.log("TZIR Command Android replacement complete.");
