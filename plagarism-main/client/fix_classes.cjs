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
    { regex: /text-textHeading/g, replacement: 'text-heading' },
    { regex: /text-textBody/g, replacement: 'text-body' },
    { regex: /text-textMuted/g, replacement: 'text-muted' },
];

walk(srcDir, (filePath) => {
    if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content;

        replacements.forEach(({ regex, replacement }) => {
            newContent = newContent.replace(regex, replacement);
        });

        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Fixed: ${filePath}`);
        }
    }
});
