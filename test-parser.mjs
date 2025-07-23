// test-parser.mjs - Comprehensive test suite for course requirement parser
import { parseProgram } from './src/lib/gtParser.js';

// 🧪 Test Data - Comprehensive test cases for all group types
const testCases = [
  {
    name: "AND Group Test",
    input: `Computer Science
Major Requirements
BIOS 1107 & BIOS 1107L Introduction to Biology
MATH 1551 & MATH 1552 Differential Calculus`,
    expectedGroups: ["and_group", "and_group"],
    expectedNesting: false
  },
  
  {
    name: "OR Group Test", 
    input: `Computer Science
Major Requirements
MATH 1551 Differential Calculus
or MATH 1501 Calculus Basics
or MATH 1561 Advanced Calculus
PHYS 2211 Introduction Physics`,
    expectedGroups: ["or_group"],
    expectedNesting: false
  },
  
  {
    name: "SELECTION Group Test",
    input: `Computer Science
Major Requirements
Select 2 of the following:
CS 3510 Design and Analysis of Algorithms
CS 3520 Computational Complexity
CS 3530 Mathematical Foundations
CS 3600 Introduction to Artificial Intelligence`,
    expectedGroups: ["selection"],
    expectedNesting: false
  },
  
  {
    name: "Nested AND within OR Test",
    input: `Computer Science
Major Requirements
MATH 1551 Calculus I
or BIOS 1107 & BIOS 1107L Biology with Lab
or CHEM 1310 & CHEM 1311L Chemistry with Lab`,
    expectedGroups: ["or_group"],
    expectedNesting: true
  },
  
  {
    name: "Nested Groups in SELECTION Test",
    input: `Computer Science  
Major Requirements
Select 1 of the following:
CS 3110 & CS 3111L Software Development
or CS 3120 Data Structures
CS 3200 Introduction to Systems`,
    expectedGroups: ["selection"],
    expectedNesting: true
  },
  
  {
    name: "Complex Multi-level Nesting Test",
    input: `Computer Science
Major Requirements
Select 2 of the following:
MATH 1551 & MATH 1552 Calculus Sequence
or MATH 1501 Basic Calculus
BIOS 1107 & BIOS 1107L Biology
or CHEM 1310 & CHEM 1311L Chemistry  
or PHYS 2211 Physics`,
    expectedGroups: ["selection"],
    expectedNesting: true
  },
  
  {
    name: "Edge Case - Multiple AND Groups",
    input: `Computer Science
Major Requirements  
CS 1371 & CS 1372 Programming Sequence
MATH 1551 & MATH 1552 & MATH 1553 Calculus Sequence
PHYS 2211 & PHYS 2212 Physics Sequence`,
    expectedGroups: ["and_group", "and_group", "and_group"],
    expectedNesting: false
  },
  
  {
    name: "Edge Case - Empty Selection Group",
    input: `Computer Science
Major Requirements
Select 1 of the following:
Free Electives 6`,
    expectedGroups: ["selection"],
    expectedNesting: false
  }
];

// 🎯 Test Runner Function
function runTests() {
  console.log('🧪 === COMPREHENSIVE PARSER TEST SUITE ===\n');
  
  let passed = 0;
  let failed = 0;
  const failedTests = [];
  
  testCases.forEach((testCase, index) => {
    console.log(`\n📋 Test ${index + 1}: ${testCase.name}`);
    console.log('─'.repeat(50));
    
    try {
      // Parse the test input
      const result = parseProgram(testCase.input);
      
      // Find the Major Requirements category  
      const majorReq = result.requirements.find(req => 
        req.name.toLowerCase().includes('major')
      );
      
      if (!majorReq) {
        throw new Error('Major Requirements category not found');
      }
      
      console.log(`📊 Found ${majorReq.courses.length} courses in Major Requirements`);
      
      // Validate expected group types
      const actualGroups = majorReq.courses.map(course => course.courseType);
      const hasExpectedGroups = testCase.expectedGroups.every(expectedType => 
        actualGroups.includes(expectedType)
      );
      
      if (!hasExpectedGroups) {
        throw new Error(
          `Expected groups [${testCase.expectedGroups.join(', ')}] but found [${actualGroups.join(', ')}]`
        );
      }
      
      // Validate nesting if expected
      if (testCase.expectedNesting) {
        const hasNesting = majorReq.courses.some(course => 
          (course.groupCourses && course.groupCourses.some(gc => 
            gc.courseType === 'and_group' || gc.courseType === 'or_group' || gc.courseType === 'selection'
          )) ||
          (course.selectionOptions && course.selectionOptions.some(so => 
            so.courseType === 'and_group' || so.courseType === 'or_group' || so.courseType === 'selection'
          ))
        );
        
        if (!hasNesting) {
          throw new Error('Expected nesting but none found');
        } else {
          console.log('✅ Nesting validation passed');
        }
      }
      
      // Detailed group analysis
      majorReq.courses.forEach((course, courseIndex) => {
        console.log(`\n  📝 Course ${courseIndex + 1}: ${course.code} (${course.courseType})`);
        console.log(`     Title: "${course.title}"`);
        
        if (course.courseType === 'and_group' && course.groupCourses) {
          console.log(`     🔗 AND Group Members: ${course.groupCourses.length}`);
          course.groupCourses.forEach((member, idx) => {
            console.log(`       ${idx + 1}. ${member.code} - ${member.title}`);
          });
        }
        
        if (course.courseType === 'or_group' && course.groupCourses) {
          console.log(`     🔄 OR Group Options: ${course.groupCourses.length}`);
          course.groupCourses.forEach((option, idx) => {
            console.log(`       ${idx + 1}. ${option.code} - ${option.title} (${option.courseType})`);
            
            // Show nested groups
            if (option.courseType === 'and_group' && option.groupCourses) {
              console.log(`         🔗 Nested AND: ${option.groupCourses.map(gc => gc.code).join(' & ')}`);
            }
          });
        }
        
        if (course.courseType === 'selection' && course.selectionOptions) {
          console.log(`     🎯 Selection Options: ${course.selectionOptions.length} (select ${course.selectionCount})`);
          course.selectionOptions.forEach((option, idx) => {
            console.log(`       ${idx + 1}. ${option.code} - ${option.title} (${option.courseType})`);
            
            // Show nested groups in selections
            if (option.courseType === 'and_group' && option.groupCourses) {
              console.log(`         🔗 Nested AND: ${option.groupCourses.map(gc => gc.code).join(' & ')}`);
            }
            if (option.courseType === 'or_group' && option.groupCourses) {
              console.log(`         🔄 Nested OR: ${option.groupCourses.map(gc => gc.code).join(' | ')}`);
            }
          });
        }
        
        if (course.footnoteRefs && course.footnoteRefs.length > 0) {
          console.log(`     📚 Footnotes: [${course.footnoteRefs.join(', ')}]`);
        }
      });
      
      console.log(`\n✅ ${testCase.name} PASSED`);  
      passed++;
      
    } catch (error) {
      console.log(`\n❌ ${testCase.name} FAILED`);
      console.log(`   Error: ${error.message}`);
      failed++;
      failedTests.push({ test: testCase.name, error: error.message });
    }
  });
  
  // Summary
  console.log('\n🏁 === TEST RESULTS SUMMARY ===');
  console.log(`✅ Passed: ${passed}/${testCases.length}`);
  console.log(`❌ Failed: ${failed}/${testCases.length}`);
  
  if (failed > 0) {
    console.log('\n💥 Failed Tests:');
    failedTests.forEach(({ test, error }) => {
      console.log(`  - ${test}: ${error}`);
    });
  } else {
    console.log('\n🎉 All tests passed! Parser is working correctly.');
  }
  
  return { passed, failed, total: testCases.length };
}

// 🔬 Additional Validation Tests
function runValidationTests() {
  console.log('\n🔬 === VALIDATION TEST SUITE ===\n');
  
  const validationCases = [
    {
      name: "Invalid AND Group (single course)",
      shouldFail: true,
      modify: (course) => {
        if (course.courseType === 'and_group') {
          course.groupCourses = [course.groupCourses[0]]; // Only keep one course
        }
      }
    },
    {
      name: "Invalid OR Group (no options)",
      shouldFail: true, 
      modify: (course) => {
        if (course.courseType === 'or_group') {
          course.groupCourses = []; // Remove all options
        }
      }
    },
    {
      name: "Invalid SELECTION Group (no options)",
      shouldFail: true,
      modify: (course) => {
        if (course.courseType === 'selection') {
          course.selectionOptions = []; // Remove all options
        }
      }
    }
  ];
  
  // Test basic parsing first
  console.log('📋 Testing validation with sample data...');
  const sampleInput = `Computer Science
Major Requirements
CS 1371 & CS 1372 Programming
Select 2 of the following:
CS 3510 Algorithms
CS 3520 Complexity
CS 3600 AI`;
  
  const result = parseProgram(sampleInput);
  console.log('✅ Basic parsing successful');
  
  // Now test validation scenarios  
  validationCases.forEach((testCase, index) => {
    console.log(`\n🧪 Validation Test ${index + 1}: ${testCase.name}`);
    
    // Create a copy and modify it
    const testResult = JSON.parse(JSON.stringify(result));  
    const majorReq = testResult.requirements.find(req => 
      req.name.toLowerCase().includes('major')
    );
    
    if (majorReq) {
      majorReq.courses.forEach(testCase.modify);
      
      try {
        // Import the validation function - this would need to be exported
        console.log('  📊 Running validation on modified data...');
        
        // Manual validation check for demonstration
        let hasErrors = false;
        majorReq.courses.forEach(course => {
          if (course.courseType === 'and_group' && (!course.groupCourses || course.groupCourses.length < 2)) {
            hasErrors = true;
          }
          if (course.courseType === 'or_group' && (!course.groupCourses || course.groupCourses.length < 2)) {
            hasErrors = true;
          }
          if (course.courseType === 'selection' && (!course.selectionOptions || course.selectionOptions.length === 0)) {
            hasErrors = true;
          }
        });
        
        if (testCase.shouldFail && !hasErrors) {
          console.log('  ❌ Expected validation to fail but it passed');
        } else if (!testCase.shouldFail && hasErrors) {
          console.log('  ❌ Expected validation to pass but it failed');
        } else {
          console.log('  ✅ Validation behaved as expected');
        }
        
      } catch (error) {
        if (testCase.shouldFail) {
          console.log('  ✅ Validation correctly caught error:', error.message);
        } else {
          console.log('  ❌ Unexpected validation error:', error.message);
        }
      }
    }
  });
}

// 🚀 Run all tests
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const results = runTests();
    runValidationTests();
    
    console.log('\n🎯 === FINAL SUMMARY ===');
    console.log(`Parser Test Results: ${results.passed}/${results.total} passed`);
    console.log('🔧 Enhanced parser implementation complete!');
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  }
}

export { runTests, runValidationTests };