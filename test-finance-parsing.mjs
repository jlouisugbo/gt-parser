// test-finance-parsing.mjs - Test Finance Concentration parsing with debug output
const fs = require('fs');

// Read the TypeScript parser file and extract the required functions
const parserContent = fs.readFileSync('./src/lib/gtParser.ts', 'utf8');

// Test input from the user's exact case
const testInput = `Business Administration  
Finance Concentration    
MGT 3076    Investments 2    3
MGT 3079    Management of Financial Institutions 2    3
MGT 4070    International Finance 2    3
Select three of the following: 2,3    9
MGT 3075
Security Valuation    
MGT 3082
Fundamentals of Real Estate Development    
MGT 3084
Derivative Securities    
MGT 4026
Financial Reporting and Analysis I    
MGT 4066
Corporate Restructuring    
MGT 4067
Financial Markets: Trading and Structure    
MGT 4068
Fixed Income    
MGT 4072
Entrepreneurial Finance    
MGT 4073
Financial Modeling    
MGT 4074
Fintech and Crypto Tokens    
Free Electives 1    10`;

console.log('🔬 TESTING FINANCE CONCENTRATION PARSING');
console.log('═'.repeat(60));

console.log('\n📋 Input:');
console.log(testInput);

console.log('\n🚀 Running parser...');
console.log('─'.repeat(40));

// Since we can't directly import TypeScript, let's build the project first
const { exec } = require('child_process');

console.log('Building project to get compiled JavaScript...');
exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Build failed:', error);
    console.log('Trying to run TypeScript directly with tsx...');
    
    // Create a simple test file that imports the TypeScript parser
    const testFile = `
import { parseProgram } from './src/lib/gtParser.js';

const testInput = \`Business Administration  
Finance Concentration    
MGT 3076    Investments 2    3
MGT 3079    Management of Financial Institutions 2    3
MGT 4070    International Finance 2    3
Select three of the following: 2,3    9
MGT 3075
Security Valuation    
MGT 3082
Fundamentals of Real Estate Development    
MGT 3084
Derivative Securities    
MGT 4026
Financial Reporting and Analysis I    
MGT 4066
Corporate Restructuring    
MGT 4067
Financial Markets: Trading and Structure    
MGT 4068
Fixed Income    
MGT 4072
Entrepreneurial Finance    
MGT 4073
Financial Modeling    
MGT 4074
Fintech and Crypto Tokens    
Free Electives 1    10\`;

console.log('🔬 RUNNING PARSER WITH DEBUG OUTPUT');
console.log('═'.repeat(60));

try {
  const result = parseProgram(testInput);
  
  console.log('\\n✅ PARSING COMPLETED');
  console.log('─'.repeat(40));
  console.log(\`Program: \${result.program}\`);
  console.log(\`Requirements found: \${result.requirements.length}\`);
  
  result.requirements.forEach((req, i) => {
    console.log(\`\\n\${i + 1}. \${req.name} (\${req.courses.length} courses)\`);
    req.courses.forEach((course, j) => {
      if (course.courseType === 'selection') {
        console.log(\`   \${j + 1}. \${course.code} - \${course.title} (\${course.selectionOptions?.length || 0} options)\`);
        course.selectionOptions?.forEach((opt, k) => {
          console.log(\`      \${k + 1}. \${opt.code} - \${opt.title}\`);
        });
      } else {
        console.log(\`   \${j + 1}. \${course.code} - \${course.title} (\${course.courseType})\`);
      }
    });
  });
  
} catch (error) {
  console.error('❌ Parsing failed:', error);
  console.error(error.stack);
}
\`;
    
    fs.writeFileSync('./test-with-debug.mjs', testFile);
    console.log('Created test-with-debug.mjs - please run it manually with the compiled parser');
    return;
  }
  
  console.log('✅ Build successful');
  console.log(stdout);
});