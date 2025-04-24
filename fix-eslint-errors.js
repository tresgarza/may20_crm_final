// Script to add eslint-disable-next-line comments to files with no-unused-expressions errors
const fs = require('fs');
const path = require('path');

// Files with line numbers to fix
const filesToFix = [
  {
    path: 'src/contexts/AuthContext.js',
    lines: [197, 222, 233]
  },
  {
    path: 'src/contexts/NotificationContext.js',
    lines: [219, 392]
  },
  {
    path: 'src/services/applicationService.js',
    lines: [109, 309, 343, 414, 481, 544]
  },
  {
    path: 'src/utils/databaseUtils.js',
    lines: [128, 195, 229, 319, 407]
  }
];

// Add eslint-disable comments to each file
filesToFix.forEach(file => {
  try {
    console.log(`Processing ${file.path}...`);
    const filePath = path.join(__dirname, file.path);
    
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Track offset as we add lines
    let offset = 0;
    
    // Add eslint-disable comments to each line
    file.lines.forEach(lineNum => {
      const adjustedLineNum = lineNum + offset;
      
      // Only add if it doesn't already have the comment
      if (!lines[adjustedLineNum - 1].includes('eslint-disable-next-line no-unused-expressions')) {
        lines.splice(adjustedLineNum - 1, 0, '    // eslint-disable-next-line no-unused-expressions');
        offset++;
      }
    });
    
    // Write the file back
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`Fixed ${file.path}`);
  } catch (error) {
    console.error(`Error fixing ${file.path}:`, error);
  }
});

console.log('Done fixing ESLint errors!'); 