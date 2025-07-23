// debug-multiline.mjs - Test multi-line course detection logic
const lines = [
  'Select three of the following: 2,3    9',
  'MGT 3075',
  'Security Valuation    ',
  'MGT 3082',
  'Fundamentals of Real Estate Development    ',
  'MGT 3084',
  'Free Electives 1    10'
];

console.log('🔬 TESTING MULTI-LINE COURSE DETECTION');
console.log('═'.repeat(50));

// Simulate the logic from the parser
let i = 1; // Start after "Select..." line
let optionCount = 0;

while (i < lines.length) {
  const optionLine = lines[i].trim();
  console.log(`\n📍 Line ${i}: "${optionLine}"`);
  
  // Check if this is just a course code (might have title on next line)
  const courseCodeMatch = optionLine.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)$/);
  console.log(`  Course code match: ${courseCodeMatch ? courseCodeMatch[1] : 'NO MATCH'}`);
  
  if (courseCodeMatch && i + 1 < lines.length) {
    const nextLine = lines[i + 1].trim();
    console.log(`  Next line: "${nextLine}"`);
    
    // Check if next line looks like a course title (not a course code or category)
    const isNextLineCoursCode = nextLine.match(/^[A-Z]{2,4}\s+\d{4}/);
    const isCategoryHeader = nextLine.match(/^[A-Z][a-z]+\s+(Requirements?|Concentration)/);
    
    // Simplified credit bearing check
    const isCreditBearing = nextLine.match(/^[A-Za-z\s]+\s+\d+\s+\d+$/);
    
    console.log(`  Next line is course code: ${!!isNextLineCoursCode}`);
    console.log(`  Next line is category: ${!!isCategoryHeader}`);
    console.log(`  Next line is credit bearing: ${!!isCreditBearing}`);
    
    if (!isNextLineCoursCode && !isCategoryHeader && !isCreditBearing && nextLine.length > 0) {
      console.log(`  ✅ MULTI-LINE COURSE DETECTED: ${courseCodeMatch[1]} + "${nextLine}"`);
      
      const multiLineCourse = {
        code: courseCodeMatch[1],
        title: nextLine,
        courseType: 'regular'
      };
      
      console.log(`  ➕ Would add: ${multiLineCourse.code} - ${multiLineCourse.title}`);
      optionCount++;
      i++; // Skip the title line
      i++; // Move to next iteration
      continue;
    } else {
      console.log(`  ❌ Next line not suitable for multi-line course`);
    }
  }
  
  // If we get here, it means single-line parsing would be attempted
  console.log(`  ⚠️ Would attempt single-line parsing (likely to fail for "${optionLine}")`);
  
  i++;
}

console.log(`\n🏁 FINAL RESULT: ${optionCount} multi-line courses detected`);
console.log('\n💡 EXPECTED:');
console.log('  1. MGT 3075 - Security Valuation');
console.log('  2. MGT 3082 - Fundamentals of Real Estate Development');
console.log('  3. MGT 3084 - (would need to continue...)');