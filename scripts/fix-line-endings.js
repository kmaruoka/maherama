#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixLineEndings(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, .git, and other common directories
      if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(file)) {
        fixLineEndings(filePath);
      }
    } else {
      // Only process text files
      const ext = path.extname(file).toLowerCase();
      const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.scss', '.html', '.yml', '.yaml', '.txt'];

      if (textExtensions.includes(ext)) {
        try {
          let content = fs.readFileSync(filePath, 'utf8');
          const originalContent = content;

          // Convert Windows line endings (CRLF) to Unix line endings (LF)
          content = content.replace(/\r\n/g, '\n');

          // Remove trailing spaces from each line
          content = content.split('\n').map(line => line.replace(/\s+$/, '')).join('\n');

          // Add final newline if missing
          if (!content.endsWith('\n')) {
            content += '\n';
          }

          // Only write if content changed
          if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Fixed line endings and trailing spaces: ${filePath}`);
          }
        } catch (error) {
          console.error(`Error processing ${filePath}:`, error.message);
        }
      }
    }
  });
}

// Start from the current directory
const startDir = process.cwd();
console.log(`Fixing line endings and trailing spaces in: ${startDir}`);
fixLineEndings(startDir);
console.log('Line ending and trailing space fix completed!');
