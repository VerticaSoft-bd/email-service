const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');
const dashboardDir = path.join(viewsDir, 'dashboard');

// Regex to accurately parse our previous `<%- include(..., { title: '...', body: \`...\` }) %>` format
const regex1 = /<%- include\(['"]layouts\/main['"], \{ title: ['"]([^'"]+)['"], body: `([\s\S]*?)`\}\) %>/g;
const regex2 = /<%- include\(['"]\.\.\/layouts\/dashboard['"], \{ title: ['"]([^'"]+)['"], currentPath: ['"]([^'"]+)['"], body: `([\s\S]*?)`\}\) %>/g;

function replaceInDir(dir, regex, headerName, footerName) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isFile() && fullPath.endsWith('.ejs')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let hasChanges = false;

            content = content.replace(regex, (match, p1, p2, p3) => {
                hasChanges = true;
                if (regex === regex1) {
                    // p1 = title, p2 = body
                    return `<%- include('partials/${headerName}', { title: '${p1}' }) %>\n${p2}\n<%- include('partials/${footerName}') %>`;
                } else {
                    // p1 = title, p2 = currentPath, p3 = body
                    return `<%- include('../partials/${headerName}', { title: '${p1}', currentPath: '${p2}' }) %>\n${p3}\n<%- include('../partials/${footerName}') %>`;
                }
            });

            if (hasChanges) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed', fullPath);
            }
        }
    });
}

replaceInDir(viewsDir, regex1, 'header', 'footer');
replaceInDir(dashboardDir, regex2, 'dashboard_header', 'dashboard_footer');
console.log('Done refactoring EJS layout includes.');
