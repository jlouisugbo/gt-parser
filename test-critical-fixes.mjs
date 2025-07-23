// test-critical-fixes.mjs - Test the critical parser fixes
import { parseProgram } from './src/lib/gtParser.js';

// 🧪 Critical Test Cases - Based on the user's reported issues

const testCases = [
  {
    name: "AND/OR Nesting Test - MATH 1551 & 1553 case",
    input: `Business Administration
Technology, Mathematics, and Sciences    
Lab Science    4
Lab Science    4
MATH 1551
& MATH 1553    Differential Calculus
and Introduction to Linear Algebra    4
or MATH 1711    Finite Mathematics`,
    expectedResults: {
      requirementName: "Technology, Mathematics, and Sciences",
      shouldHave: ["Lab Science", "Lab Science", "OR_GROUP"],
      orGroupShouldContain: ["AND_GROUP", "MATH 1711"],
      andGroupShouldContain: ["MATH 1551", "MATH 1553"],
      flexibleCount: 2
    }
  },
  
  {
    name: "SELECTION Group Boundary Test - Finance Concentration",
    input: `Business Administration  
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
Free Electives 1    10`,
    expectedResults: {
      requirementName: "Finance Concentration", 
      shouldHave: ["MGT 3076", "MGT 3079", "MGT 4070", "SELECT_GROUP"],
      selectionShouldHave: ["MGT 3075", "MGT 3082", "MGT 3084", "MGT 4026", "MGT 4066", "MGT 4067", "MGT 4068", "MGT 4072", "MGT 4073", "MGT 4074"],
      selectionCount: 3,
      freeElectivesSeparate: true
    }
  },

  {
    name: "Free Electives Test",
    input: `Business Administration
Test Category
Free Electives 1    10`,
    expectedResults: {
      requirementName: "Test Category",
      shouldHave: ["FLEXIBLE"],
      flexibleTitle: "Free Electives",
      flexibleFootnotes: [1]
    }
  }
];

// 🔍 Test Result Validator
function validateTestResult(testCase, result) {
  const errors = [];
  const warnings = [];
  
  console.log(`\n🔬 Validating: ${testCase.name}`);
  console.log('─'.repeat(60));
  
  // Find the target requirement
  const targetReq = result.requirements.find(req => 
    req.name.toLowerCase().includes(testCase.expectedResults.requirementName.toLowerCase().split(' ')[0])
  );
  
  if (!targetReq) {
    errors.push(`❌ Could not find requirement "${testCase.expectedResults.requirementName}"`);
    return { errors, warnings };
  }
  
  console.log(`✅ Found requirement: "${targetReq.name}" with ${targetReq.courses.length} courses`);
  
  // Validate expected courses/groups
  if (testCase.expectedResults.shouldHave) {
    testCase.expectedResults.shouldHave.forEach((expectedItem, index) => {
      if (index < targetReq.courses.length) {
        const actualCourse = targetReq.courses[index];
        console.log(`  📋 Course ${index + 1}: ${actualCourse.code} (${actualCourse.courseType})`);
        
        if (expectedItem === "Lab Science" && actualCourse.courseType !== 'flexible') {
          errors.push(`❌ Course ${index + 1} should be flexible (Lab Science), got ${actualCourse.courseType}`);
        } else if (expectedItem === "OR_GROUP" && actualCourse.courseType !== 'or_group') {
          errors.push(`❌ Course ${index + 1} should be OR_GROUP, got ${actualCourse.courseType}`);
        } else if (expectedItem === "SELECT_GROUP" && actualCourse.courseType !== 'selection') {
          errors.push(`❌ Course ${index + 1} should be SELECT_GROUP, got ${actualCourse.courseType}`);
        } else if (expectedItem.startsWith("MGT") && actualCourse.code !== expectedItem) {
          errors.push(`❌ Course ${index + 1} should be ${expectedItem}, got ${actualCourse.code}`);
        }
      } else {
        errors.push(`❌ Missing expected course/group: ${expectedItem}`);
      }
    });
  }
  
  // Validate OR group nesting
  if (testCase.expectedResults.orGroupShouldContain) {
    const orGroup = targetReq.courses.find(c => c.courseType === 'or_group');
    if (!orGroup) {
      errors.push(`❌ No OR group found`);
    } else {
      console.log(`  🔄 OR Group found with ${orGroup.groupCourses?.length || 0} options`);
      
      if (testCase.expectedResults.andGroupShouldContain) {
        const andGroupInOr = orGroup.groupCourses?.find(gc => gc.courseType === 'and_group');
        if (!andGroupInOr) {
          errors.push(`❌ No AND group found within OR group`);
        } else {
          console.log(`  🔗 AND Group in OR found with ${andGroupInOr.groupCourses?.length || 0} courses`);
          
          testCase.expectedResults.andGroupShouldContain.forEach(expectedCode => {
            const found = andGroupInOr.groupCourses?.some(gc => gc.code === expectedCode);
            if (!found) {
              errors.push(`❌ AND group missing expected course: ${expectedCode}`);
            } else {
              console.log(`    ✅ Found ${expectedCode} in AND group`);
            }
          });
        }
      }
    }
  }
  
  // Validate SELECTION group
  if (testCase.expectedResults.selectionShouldHave) {
    const selectionGroup = targetReq.courses.find(c => c.courseType === 'selection');
    if (!selectionGroup) {
      errors.push(`❌ No SELECTION group found`);
    } else {
      console.log(`  🎯 SELECTION Group found: select ${selectionGroup.selectionCount} of ${selectionGroup.selectionOptions?.length || 0} options`);
      
      if (selectionGroup.selectionCount !== testCase.expectedResults.selectionCount) {
        errors.push(`❌ Selection count should be ${testCase.expectedResults.selectionCount}, got ${selectionGroup.selectionCount}`);
      }
      
      testCase.expectedResults.selectionShouldHave.forEach(expectedCode => {
        const found = selectionGroup.selectionOptions?.some(so => so.code === expectedCode);
        if (!found) {
          errors.push(`❌ SELECTION group missing expected option: ${expectedCode}`);
        } else {
          console.log(`    ✅ Found ${expectedCode} in selection options`);
        }
      });
    }
  }
  
  // Validate Free Electives separately
  if (testCase.expectedResults.freeElectivesSeparate) {
    const freeElectivesReq = result.requirements.find(req => 
      req.name.toLowerCase().includes('free electives') || 
      req.courses.some(c => c.title && c.title.toLowerCase().includes('free electives'))
    );
    
    if (!freeElectivesReq) {
      errors.push(`❌ Free Electives not found as separate requirement or within any requirement`);
    } else {
      console.log(`  🆓 Free Electives found in requirement: "${freeElectivesReq.name}"`);
    }
  }
  
  // Validate flexible requirements
  if (testCase.expectedResults.flexibleCount) {
    const flexibleCourses = targetReq.courses.filter(c => c.courseType === 'flexible');
    if (flexibleCourses.length !== testCase.expectedResults.flexibleCount) {
      errors.push(`❌ Expected ${testCase.expectedResults.flexibleCount} flexible courses, got ${flexibleCourses.length}`);
    } else {
      console.log(`  🌿 Found ${flexibleCourses.length} flexible courses as expected`);
    }
  }
  
  return { errors, warnings };
}

// 🚀 Main Test Runner
async function runCriticalTests() {
  console.log('🔥 === CRITICAL PARSER FIXES VALIDATION ===\n');
  
  let totalPassed = 0;
  let totalFailed = 0;
  const failedTests = [];
  
  // Run each test case 3 times as requested
  for (let round = 1; round <= 3; round++) {
    console.log(`\n🔄 === VALIDATION ROUND ${round}/3 ===`);
    
    for (const testCase of testCases) {
      console.log(`\n📋 Test: ${testCase.name} (Round ${round})`);
      console.log('═'.repeat(80));
      
      try {
        // Parse the input
        const result = parseProgram(testCase.input);
        
        // Validate results
        const validation = validateTestResult(testCase, result);
        
        if (validation.errors.length === 0) {
          console.log(`\n✅ ${testCase.name} PASSED (Round ${round})`);
          totalPassed++;
        } else {
          console.log(`\n❌ ${testCase.name} FAILED (Round ${round})`);
          console.log('Errors:');
          validation.errors.forEach(err => console.log(`  ${err}`));
          totalFailed++;
          failedTests.push({ test: testCase.name, round, errors: validation.errors });
        }
        
        if (validation.warnings.length > 0) {
          console.log('Warnings:');
          validation.warnings.forEach(warn => console.log(`  ⚠️  ${warn}`));
        }
        
      } catch (error) {
        console.log(`\n💥 ${testCase.name} CRASHED (Round ${round})`);
        console.log(`Error: ${error.message}`);
        totalFailed++;
        failedTests.push({ test: testCase.name, round, errors: [error.message] });
      }
    }
  }
  
  // Final Summary
  console.log('\n🏁 === FINAL TEST RESULTS ===');
  console.log(`✅ Passed: ${totalPassed}/${totalPassed + totalFailed}`);
  console.log(`❌ Failed: ${totalFailed}/${totalPassed + totalFailed}`);
  
  if (totalFailed > 0) {
    console.log('\n💥 Failed Test Details:');
    failedTests.forEach(({ test, round, errors }) => {
      console.log(`  📋 ${test} (Round ${round}):`);
      errors.forEach(error => console.log(`    - ${error}`));
    });
    
    console.log('\n🔧 CRITICAL FIXES NEEDED - Some tests failed!');
    return false;
  } else {
    console.log('\n🎉 ALL CRITICAL FIXES VALIDATED - Parser working correctly!');
    return true;
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const success = await runCriticalTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  }
}

export { runCriticalTests };