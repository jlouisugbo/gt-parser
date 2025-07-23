// test-selection-debug.mjs - Test selection parsing with debug output
import { parseProgram } from './src/lib/gtParser.js';

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

console.log('🔬 RUNNING PARSER WITH DEBUG OUTPUT FOR SELECTION GROUP');
console.log('═'.repeat(70));

try {
  const result = parseProgram(testInput);
  
  console.log('\n✅ PARSING COMPLETED');
  console.log('─'.repeat(40));
  console.log(`Program: ${result.program}`);
  console.log(`Requirements found: ${result.requirements.length}\n`);
  
  result.requirements.forEach((req, i) => {
    console.log(`${i + 1}. "${req.name}" (${req.courses.length} courses)`);
    req.courses.forEach((course, j) => {
      if (course.courseType === 'selection') {
        console.log(`   ${j + 1}. ${course.code} - ${course.title} (${course.selectionOptions?.length || 0} options, select ${course.selectionCount})`);
        course.selectionOptions?.forEach((opt, k) => {
          console.log(`      ${k + 1}. ${opt.code} - ${opt.title}`);
        });
      } else {
        console.log(`   ${j + 1}. ${course.code} - ${course.title || 'No title'} (${course.courseType})`);
      }
    });
    console.log('');
  });
  
  // Validate the specific issues mentioned by the user
  console.log('🔍 VALIDATION CHECKS:');
  console.log('─'.repeat(30));
  
  // Check 1: Should NOT have "Security Valuation" as separate requirement
  const securityValuationReq = result.requirements.find(req => 
    req.name.toLowerCase().includes('security valuation')
  );
  
  if (securityValuationReq) {
    console.log('❌ ISSUE: "Security Valuation" found as separate requirement');
  } else {
    console.log('✅ GOOD: No separate "Security Valuation" requirement found');
  }
  
  // Check 2: Finance Concentration should have a selection group
  const financeReq = result.requirements.find(req => 
    req.name.toLowerCase().includes('finance concentration')
  );
  
  if (financeReq) {
    const selectionGroup = financeReq.courses.find(c => c.courseType === 'selection');
    if (selectionGroup) {
      console.log(`✅ GOOD: Finance Concentration has selection group with ${selectionGroup.selectionOptions?.length || 0} options`);
      
      // Check if Security Valuation is IN the selection group
      const hasSecurityValuation = selectionGroup.selectionOptions?.some(opt => 
        opt.title && opt.title.toLowerCase().includes('security valuation')
      );
      
      if (hasSecurityValuation) {
        console.log('✅ GOOD: "Security Valuation" found as option within selection group');
      } else {
        console.log('❌ ISSUE: "Security Valuation" NOT found within selection group options');
      }
      
    } else {
      console.log('❌ ISSUE: Finance Concentration has no selection group');
    }
  } else {
    console.log('❌ ISSUE: No Finance Concentration requirement found');
  }
  
  // Check 3: Free Electives should be separate
  const freeElectivesReq = result.requirements.find(req => 
    req.name.toLowerCase().includes('free electives') || 
    req.courses.some(c => c.title && c.title.toLowerCase().includes('free electives'))
  );
  
  if (freeElectivesReq) {
    console.log('✅ GOOD: Free Electives found as separate requirement');
  } else {
    console.log('❌ ISSUE: Free Electives not found');
  }
  
} catch (error) {
  console.error('❌ Parsing failed:', error);
  console.error(error.stack);
}