// debug-parser.mjs - Debug the actual parser output
import fs from 'fs';

// Sample Business Administration Finance text from the requirements
const sampleInput = `**Bachelor of Science in Business Administration - Finance**
Course List**CodeTitleCredit HoursWellness Requirement**APPH 1040Scientific Foundations of Health2or APPH 1050The Science of Physical Activity and Healthor APPH 1060Flourishing: Strategies for Well-being and Resilience**Technology, Mathematics, and Sciences**Lab Science4Lab Science4MATH 1551 & MATH 1553Differential Calculus and Introduction to Linear Algebra4or MATH 1711Finite Mathematics**Finance Concentration**MGT 3076Investments 23MGT 3079Management of Financial Institutions 23Select three of the following: 2,39
MGT 3075
Security Valuation
MGT 3082
Fundamentals of Real Estate Development
MGT 3084
Derivative Securities**Total Credit Hours122**
**1**
Maximum 3 credit hours of internship
**2**
Minimum grade of C required.`;

console.log('🔍 DEBUGGING PARSER OUTPUT');
console.log('='.repeat(50));
console.log(`Input length: ${sampleInput.length}`);
console.log(`First 100 chars: "${sampleInput.substring(0, 100)}..."`);
console.log('');

// Test each parsing step manually
console.log('Step 1: Program Info Extraction');
console.log('-'.repeat(30));

// Find the first **title** line
const titleMatch = sampleInput.match(/\*\*([^*]+)\*\*/);
const titleLine = titleMatch ? titleMatch[1].trim() : '';
console.log(`📄 Title line: "${titleLine}"`);

if (!titleLine) {
  console.log('❌ ERROR: No title found!');
} else {
  // Extract degree type
  let degreeType = 'BS';
  if (titleLine.toLowerCase().includes('master')) degreeType = 'MS';
  if (titleLine.toLowerCase().includes('phd') || titleLine.toLowerCase().includes('doctor')) degreeType = 'PhD';
  if (titleLine.toLowerCase().includes('minor')) degreeType = 'Minor';
  
  // Extract base name and concentration
  let programName = titleLine
    .replace(/^(Bachelor of Science in|Master of Science in|Minor in|BS in|MS in|PhD in)\s*/i, '')
    .trim();
    
  let concentration = undefined;
  
  // Handle concentration/thread patterns
  const concentrationMatch = programName.match(/^(.+?)\s*-\s*(.+)$/);
  if (concentrationMatch) {
    programName = concentrationMatch[1].trim();
    concentration = concentrationMatch[2].trim();
  }
  
  console.log(`🎓 Degree type: ${degreeType}`);
  console.log(`📝 Program name: "${programName}"`);
  console.log(`🎯 Concentration: "${concentration}"`);
}

console.log('\nStep 2: Total Credits Extraction');
console.log('-'.repeat(30));

const patterns = [
  /Total Credit Hours\s*(\d+)/i,
  /Total\s+Credits?\s*:?\s*(\d+)/i,
  /(\d+)\s+Total\s+Credit\s+Hours/i
];

let totalCredits = 0;
for (const pattern of patterns) {
  const match = sampleInput.match(pattern);
  if (match) {
    totalCredits = parseInt(match[1]);
    console.log(`💯 Found total credits: ${totalCredits}`);
    break;
  }
}

if (totalCredits === 0) {
  console.log('❌ ERROR: No total credits found!');
}

console.log('\nStep 3: Requirements Parsing');
console.log('-'.repeat(30));

// Apply the new normalization logic
let normalized = sampleInput
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
  .replace(/\t/g, ' ');

// Add line breaks before course codes that are stuck to category headers
normalized = normalized.replace(/([a-zA-Z\s]+)\*\*([A-Z]{2,4}\s+\d{4})/g, '$1**\n$2');

// Add line breaks before "or" options
normalized = normalized.replace(/([a-zA-Z0-9\s]+)(or [A-Z]{2,4}\s+\d{4})/g, '$1\n$2');

// Add line breaks before category headers (but not the first one)
normalized = normalized.replace(/([^*])\*\*([A-Z][^*]+)\*\*/g, '$1\n**$2**');

// Add line breaks before "Select" patterns
normalized = normalized.replace(/([a-zA-Z0-9\s]+)(Select\s+(one|two|three|four|five|\d+)\s+of\s+the\s+following)/gi, '$1\n$2');

// Add line breaks before footnote sections
normalized = normalized.replace(/([a-zA-Z0-9])\*\*(\d+)\*\*/g, '$1\n**$2**');

// Clean up multiple spaces but preserve line breaks
normalized = normalized.replace(/ +/g, ' ').trim();

console.log(`📝 Normalized text:\n"${normalized}"`);
console.log('');

// First, handle multi-line category headers by combining them
const finalNormalized = normalized.replace(/\*\*([^*]+)\n([^*]+)\*\*/g, '**$1 $2**');

// Split by **category headers**
const sections = finalNormalized.split(/(?=\*\*[^*]+\*\*)/);
console.log(`📂 Found ${sections.length} sections`);

sections.forEach((section, index) => {
  console.log(`\nSection ${index}:`);
  console.log(`  Length: ${section.length}`);
  console.log(`  First 100 chars: "${section.substring(0, 100)}..."`);
  
  if (index === 0) {
    console.log('  ⏭️ Skipping program title section');
    return;
  }
  
  const lines = section.split('\n').filter(line => line.trim());
  console.log(`  📄 Lines: ${lines.length}`);
  
  if (lines.length === 0) {
    console.log('  ❌ No lines in section');
    return;
  }
  
  // Extract category name - handle both single and multi-line
  let categoryName = '';
  let startIndex = 1; // Start looking for courses after header
  
  // Check if first line contains complete header
  const singleLineMatch = lines[0].match(/\*\*([^*]+)\*\*/);
  if (singleLineMatch) {
    categoryName = singleLineMatch[1].trim();
    console.log(`  📋 Category name: "${categoryName}"`);
  } else {
    console.log(`  ❌ No category match in: "${lines[0]}"`);
  }
  
  // Skip non-course sections
  const skipPatterns = [
    'Total Credit Hours',
    'Course List',
    'Pass-fail only',
    /^\d+$/  // Just numbers
  ];
  
  const shouldSkip = skipPatterns.some(pattern => 
    typeof pattern === 'string' ? 
      categoryName.toLowerCase().includes(pattern.toLowerCase()) :
      pattern.test(categoryName)
  );
  
  if (shouldSkip) {
    console.log(`  ⏭️ Skipping section: ${categoryName}`);
    return;
  }
  
  // Parse courses in this section
  const courseLines = lines.slice(startIndex).filter(line => 
    line.trim() && 
    !line.includes('Course List') && 
    !line.includes('Code') && 
    !line.includes('Title') &&
    !line.includes('Credit Hours')
  );
  
  console.log(`  📚 Course lines: ${courseLines.length}`);
  courseLines.slice(0, 3).forEach((line, i) => {
    console.log(`    ${i + 1}. "${line}"`);
  });
  if (courseLines.length > 3) {
    console.log(`    ... and ${courseLines.length - 3} more`);
  }
});

console.log('\n🏁 DEBUG COMPLETE');
console.log('Issues to investigate:');
console.log('1. Check if program name extraction is working');
console.log('2. Check if requirements sections are being processed');
console.log('3. Verify course line parsing logic');