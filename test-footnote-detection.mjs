// Test footnote vs credit detection
function parseCourseTitleAndCredits(titlePart) {
  let title = titlePart.trim();
  let footnoteRefs = [];
  
  console.log(`Testing: "${titlePart}"`);
  
  // Special handling for "or MATH" patterns
  if (title.toLowerCase().startsWith('or ') && title.includes('MATH')) {
    console.log(`  OR MATH pattern detected, keeping full title: "${title}"`);
    return { title: title.trim(), footnoteRefs: [] };
  }
  
  // Handle year patterns like "since 1877"
  const yearInTitleMatch = title.match(/^(.+?)\s+(since\s+)(\d{4})$/i);
  if (yearInTitleMatch) {
    title = `${yearInTitleMatch[1]} ${yearInTitleMatch[2]}${yearInTitleMatch[3]}`;
    console.log(`  Found year in title, keeping as: "${title}"`);
    return { title: title.trim(), footnoteRefs: [] };
  }
  
  // Skip tab-separated numbers (these are credits, not footnotes)
  if (title.includes('\t')) {
    console.log(`  ❌ CREDITS (tab-separated): ignoring tab-separated numbers`);
    return { title: title.trim(), footnoteRefs: [] };
  }
  
  // Look for potential footnote references with improved pattern
  const footnoteMatch = title.match(/^(.+?)\s+(\d+(?:,\s*\d+)*)\s*$/);
  if (footnoteMatch) {
    const [, titleWithoutNumbers, numberStr] = footnoteMatch;
    const numbers = numberStr.split(',').map(n => parseInt(n.trim()));
    
    console.log(`  Potential footnotes found: "${numberStr}" -> [${numbers}]`);
    
    // Check if this looks like a "title footnote credit" pattern (e.g., "Calculus I 1 4")
    const hasMultipleNumberGroups = /\s+\d+\s+\d+\s*$/.test(title);
    
    if (hasMultipleNumberGroups) {
      console.log(`  Multiple number groups detected - likely "title footnote credit" pattern`);
      // Extract all numbers from the end
      const allNumbersMatch = title.match(/(\d+)\s+(\d+)\s*$/);
      if (allNumbersMatch) {
        const [, firstNum, secondNum] = allNumbersMatch.map(n => parseInt(n));
        console.log(`  Found number pattern: ${firstNum} ${secondNum}`);
        
        // Take the first number as footnote if it's 1-9, ignore the second (credit)
        if (firstNum >= 1 && firstNum <= 9) {
          footnoteRefs = [firstNum];
          title = title.replace(/\s+\d+\s+\d+\s*$/, '').trim();
          console.log(`  ✅ FOOTNOTES (complex): title="${title}", footnote=[${firstNum}], credit ignored: ${secondNum}`);
        } else {
          console.log(`  ❌ CREDITS (first number too large): ${firstNum}`);
        }
      }
    } else {
      // Regular footnote pattern - all numbers should be single digits (1-9)
      if (numbers.every(num => num >= 1 && num <= 9)) {
        footnoteRefs = numbers;
        title = titleWithoutNumbers.trim();
        console.log(`  ✅ FOOTNOTES: title="${title}", footnotes=[${footnoteRefs}]`);
      } else {
        console.log(`  ❌ CREDITS (numbers too large): [${numbers}]`);
      }
    }
  } else {
    console.log(`  ❌ No trailing numbers found`);
  }
  
  return { title: title.trim(), footnoteRefs };
}

// Test cases from real GT data
console.log('🔬 TESTING FOOTNOTE VS CREDIT DETECTION');
console.log('═'.repeat(60));

const testCases = [
  // FOOTNOTES (should be detected)
  "Computing for Engineers 3",
  "Scientific Foundations of Health 2", 
  "The United States to 1877 3",
  "Differential Calculus 1,2",
  "Introduction to Linear Algebra 1,7",
  "Principles of Physics I 1,2",
  
  // CREDITS (should be ignored)
  "English Composition I\t3",
  "English Composition II\t3", 
  "Differential Calculus and Introduction to Linear Algebra 4",
  "Finite Mathematics 4",
  "Multivariable Calculus 1 4", // This could be tricky - footnote 1, credit 4
  "Lab Science 4",
  
  // MIXED CASES
  "Calculus I 1 4", // footnote 1, credit 4 - should only get footnote
  "Physics Lab 12", // credit 12 - should be ignored
  "Chemistry 10", // credit 10 - should be ignored
  "Biology since 1877", // year case
];

testCases.forEach((testCase, i) => {
  console.log(`\n${i + 1}. Testing: "${testCase}"`);
  const result = parseCourseTitleAndCredits(testCase);
  console.log(`   Result: title="${result.title}", footnotes=[${result.footnoteRefs}]`);
});

console.log('\n📊 ANALYSIS:');
console.log('Expected behavior:');
console.log('- Single digits 1-9 at end = FOOTNOTES');
console.log('- Double digits 10+ at end = CREDITS (ignore)');
console.log('- Tab + number = CREDITS (ignore)'); 
console.log('- Comma-separated 1-9 = MULTIPLE FOOTNOTES');