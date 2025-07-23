// debug-selection.mjs - Debug the exact selection parsing issue
import fs from 'fs';

// Read the test input
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

console.log('🔍 DEBUGGING SELECTION GROUP PARSING');
console.log('═'.repeat(60));

console.log('\n📋 Input Lines:');
const lines = testInput.split('\n');
lines.forEach((line, i) => {
  console.log(`${(i + 1).toString().padStart(2)}: "${line}"`);
});

console.log('\n🔬 ANALYSIS:');
console.log('─'.repeat(40));

// Find the selection line
let selectionLineIndex = -1;
lines.forEach((line, i) => {
  if (line.includes('Select three of the following')) {
    selectionLineIndex = i;
    console.log(`✅ Selection line found at index ${i}: "${line}"`);
  }
});

if (selectionLineIndex === -1) {
  console.log('❌ No selection line found');
  process.exit(1);
}

// Analyze what should be in the selection vs what should end it
console.log('\n📦 What should be IN the selection group:');
let inSelection = false;
lines.forEach((line, i) => {
  if (i === selectionLineIndex) {
    inSelection = true;
    return;  // Skip the "Select..." line itself
  }
  
  if (inSelection) {
    const trimmed = line.trim();
    
    // Check if this should end the selection
    const shouldEndSelection = 
      !trimmed ||  // Empty line
      trimmed.match(/^[A-Za-z\s]+\s+\d+\s+\d+$/) ||  // Credit bearing line like "Free Electives 1    10"
      trimmed.match(/^Total\s+Credit\s+Hours?\s+\d+$/i) ||  // Total credits
      trimmed.includes('Business Administration') ||  // New program
      trimmed.match(/^[A-Z][a-z]+\s+(Requirements?|Concentration)$/);  // New category
    
    if (shouldEndSelection) {
      console.log(`🛑 SHOULD END selection at line ${i + 1}: "${trimmed}"`);
      console.log(`   Reason: ${
        !trimmed ? 'Empty line' :
        trimmed.match(/^[A-Za-z\s]+\s+\d+\s+\d+$/) ? 'Credit bearing pattern' :
        trimmed.match(/^Total\s+Credit\s+Hours?\s+\d+$/i) ? 'Total credits' :
        trimmed.includes('Business Administration') ? 'New program' :
        'New category'
      }`);
      inSelection = false;
      return;
    }
    
    console.log(`  ✅ Should be option ${i - selectionLineIndex}: "${trimmed}"`);
  }
});

console.log('\n💡 EXPECTED RESULT:');
console.log('Selection group should contain:');
console.log('  1. MGT 3075 - Security Valuation');
console.log('  2. MGT 3082 - Fundamentals of Real Estate Development');
console.log('  3. MGT 3084 - Derivative Securities');
console.log('  4. MGT 4026 - Financial Reporting and Analysis I');
console.log('  5. MGT 4066 - Corporate Restructuring');
console.log('  6. MGT 4067 - Financial Markets: Trading and Structure');
console.log('  7. MGT 4068 - Fixed Income');
console.log('  8. MGT 4072 - Entrepreneurial Finance');
console.log('  9. MGT 4073 - Financial Modeling');
console.log(' 10. MGT 4074 - Fintech and Crypto Tokens');
console.log('');
console.log('And it should STOP before "Free Electives 1    10"');

console.log('\n🔧 ISSUE DETECTED:');
console.log('The parser is likely not detecting "Free Electives 1    10" as a credit-bearing line');
console.log('that should end the selection group.');