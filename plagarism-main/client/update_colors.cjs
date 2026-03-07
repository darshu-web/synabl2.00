const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
    });
}

const replacements = [
    { regex: /text-white/g, replacement: 'text-textHeading' },
    { regex: /text-gray-400/g, replacement: 'text-textBody' },
    { regex: /text-gray-300/g, replacement: 'text-textBody' },
    { regex: /text-gray-500/g, replacement: 'text-textMuted' },
    { regex: /bg-\[\#0F172A\]/g, replacement: 'bg-white' },
    { regex: /bg-\[\#0B1120\]/g, replacement: 'bg-secondary' },
    { regex: /border-white\/10/g, replacement: 'border-borderLight' },
    { regex: /border-white\/5/g, replacement: 'border-borderLight' },
    { regex: /bg-white\/5/g, replacement: 'bg-white' },
    { regex: /bg-white\/10/g, replacement: 'bg-gray-100' },
];

walk(srcDir, (filePath) => {
    if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content;

        replacements.forEach(({ regex, replacement }) => {
            newContent = newContent.replace(regex, replacement);
        });

        const lines = newContent.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if ((lines[i].includes('bg-accent') || lines[i].includes('from-accent') || lines[i].includes('bg-emerald') || lines[i].includes('bg-gray-700') || lines[i].includes('bg-red')) && lines[i].includes('text-textHeading')) {
                lines[i] = lines[i].replace(/text-textHeading/g, 'text-white');
            }
        }
        newContent = lines.join('\n');

        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Updated: ${filePath}`);
        }
    }
});
