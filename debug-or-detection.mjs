// debug-or-detection.mjs - Test OR detection logic specifically
const lines = [
  'MATH 1551',
  '& MATH 1553    Differential Calculus', 
  'and Introduction to Linear Algebra    4',
  'or MATH 1711    Finite Mathematics'
];

console.log('🔬 TESTING OR DETECTION LOGIC');
console.log('═'.repeat(50));

// Simulate the multi-line AND detection logic
console.log('📋 Input lines:');
lines.forEach((line, i) => {
  console.log(`  ${i}: "${line}"`);
});

// Test the title continuation logic
console.log('\n📄 Title Continuation Test:');
let titleLineIndex = 2; // Start after "& MATH 1553    Differential Calculus"

console.log(`Starting title continuation check at line ${titleLineIndex}`);

while (titleLineIndex < lines.length) {
  const possibleTitleLine = lines[titleLineIndex].trim();
  console.log(`  🔍 Examining line ${titleLineIndex}: "${possibleTitleLine}"`);
  
  // Test each stopping condition
  const isCourseCode = possibleTitleLine.match(/^[A-Z]{2,4}\s+\d{4}/);
  const isOrClause = possibleTitleLine.toLowerCase().startsWith('or ');
  const isCreditBearing = possibleTitleLine.match(/^[A-Za-z\s]+\s+\d+\s+\d+$/);
  
  console.log(`    Course code: ${!!isCourseCode}`);
  console.log(`    OR clause: ${!!isOrClause}`);
  console.log(`    Credit bearing: ${!!isCreditBearing}`);
  
  if (isCourseCode) {
    console.log(`    ⏹️ Would stop at course code`);
    break;
  }
  if (isOrClause) {
    console.log(`    ⏹️ Would stop at OR clause`);
    break;
  }
  if (isCreditBearing) {
    console.log(`    ⏹️ Would stop at credit-bearing line`);
    break;
  }
  
  // Check if it looks like title continuation
  if (possibleTitleLine.length > 0 && 
      !possibleTitleLine.match(/^\d+$/) &&
      possibleTitleLine.match(/^[a-zA-Z]/)) {
    console.log(`    ➕ Would add as title continuation: "${possibleTitleLine}"`);
    titleLineIndex++;
  } else {
    console.log(`    ⏭️ Would skip non-title line`);
    break;
  }
}

console.log(`\n📍 Title parsing would end at line ${titleLineIndex}`);

// Test OR detection
console.log('\n🔄 OR Detection Test:');
if (titleLineIndex < lines.length) {
  const followingLine = lines[titleLineIndex].trim();
  console.log(`Next line after title parsing: "${followingLine}"`);
  
  if (followingLine.toLowerCase().startsWith('or ')) {
    console.log('✅ OR pattern would be detected!');
    
    // Test OR option parsing
    const orOptionText = followingLine.replace(/^or\s+/i, '');
    console.log(`OR option text: "${orOptionText}"`);
    
    // Simple course parsing test
    const courseMatch = orOptionText.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)\s*(.*)$/);
    if (courseMatch) {
      console.log(`✅ OR option would parse as: ${courseMatch[1]} - ${courseMatch[2]}`);
    } else {
      console.log(`❌ OR option would not parse correctly`);
    }
  } else {
    console.log('❌ OR pattern would NOT be detected');
  }
} else {
  console.log('❌ No line available for OR detection (end of input)');
}

console.log('\n💡 EXPECTED RESULT:');
console.log('Should create OR group with:');
console.log('  1. AND_GROUP (MATH 1551 & MATH 1553)');
console.log('  2. MATH 1711 - Finite Mathematics');