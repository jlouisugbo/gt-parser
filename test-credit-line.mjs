// test-credit-line.mjs - Test the isCreditBearingLine function
import fs from 'fs';

// Extract just the isCreditBearingLine function logic
function isCreditBearingLine(line) {
  const trimmed = line.trim();
  
  console.log(`Testing line: "${trimmed}"`);
  
  // Pattern 1: "Free Electives 1    10" - flexible requirement with footnote and credits
  if (trimmed.match(/^[A-Za-z\s]+\s+\d+\s+\d+$/)) {
    console.log(`  ✅ Credit pattern 1 detected: "${trimmed}"`);
    return true;
  }
  
  // Pattern 2: "Total Credit Hours    122" - total credits line
  if (trimmed.match(/^Total\s+Credit\s+Hours?\s+\d+$/i)) {
    console.log(`  ✅ Credit pattern 2 detected: "${trimmed}"`);
    return true;
  }
  
  // Pattern 3: Lines that end with standalone numbers (credits) and aren't course codes
  if (trimmed.match(/\s+\d{1,3}$/) && !trimmed.match(/^[A-Z]{2,4}\s+\d{4}/)) {
    // Additional check: make sure it's not just a course title with a year
    if (!trimmed.includes('since') && !trimmed.includes('1877')) {
      console.log(`  ✅ Credit pattern 3 detected: "${trimmed}"`);
      return true;
    }
  }
  
  console.log(`  ❌ No credit pattern matched`);
  return false;
}

console.log('🧪 TESTING isCreditBearingLine FUNCTION');
console.log('═'.repeat(50));

const testLines = [
  'Free Electives 1    10',
  'Total Credit Hours    122',  
  'MGT 3075',
  'Security Valuation    ',
  'Fintech and Crypto Tokens    ',
  'MGT 3076    Investments 2    3',
  'Business Administration  '
];

testLines.forEach((line, i) => {
  console.log(`\n${i + 1}. Testing: "${line}"`);
  const result = isCreditBearingLine(line);
  console.log(`   Result: ${result ? '✅ IS credit line' : '❌ NOT credit line'}`);
});

console.log('\n🔍 SPECIFIC ANALYSIS of "Free Electives 1    10":');
const testLine = 'Free Electives 1    10';
const trimmed = testLine.trim();

console.log(`Trimmed: "${trimmed}"`);
console.log(`Pattern 1 regex: /^[A-Za-z\\s]+\\s+\\d+\\s+\\d+$/`);
console.log(`Pattern 1 test: ${trimmed.match(/^[A-Za-z\s]+\s+\d+\s+\d+$/) ? 'MATCH' : 'NO MATCH'}`);

console.log(`Pattern 2 regex: /^Total\\s+Credit\\s+Hours?\\s+\\d+$/i`);
console.log(`Pattern 2 test: ${trimmed.match(/^Total\s+Credit\s+Hours?\s+\d+$/i) ? 'MATCH' : 'NO MATCH'}`);

console.log(`Pattern 3 condition 1: ${trimmed.match(/\s+\d{1,3}$/) ? 'MATCH' : 'NO MATCH'} (ends with number)`);
console.log(`Pattern 3 condition 2: ${!trimmed.match(/^[A-Z]{2,4}\s+\d{4}/) ? 'MATCH' : 'NO MATCH'} (not course code)`);
console.log(`Pattern 3 condition 3: ${!trimmed.includes('since') && !trimmed.includes('1877') ? 'MATCH' : 'NO MATCH'} (not year reference)`);