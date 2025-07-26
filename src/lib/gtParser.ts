// lib/gtParser.ts - TypeScript parser without credits

export interface Course {
  code: string;
  title: string;
  courseType: 'regular' | 'or_option' | 'flexible' | 'or_group' | 'and_group' | 'selection';
  footnoteRefs: number[];
  groupId?: string;
  groupCourses?: Course[];
  selectionCount?: number;
  selectionHours?: number;
  selectionType?: 'courses' | 'hours';
  selectionOptions?: Course[];
  creditHours?: number;
  isOption?: boolean;
  isFlexible?: boolean;
  isSelection?: boolean;
  isSelectionOption?: boolean;
}

export interface Requirement {
  name: string;
  courses: Course[];
  footnotes?: Footnote[];
}

export interface Footnote {
  number: number;
  text: string;
}

export interface ProgramData {
  name: string;
  degreeType: string;
  concentration?: string;
  thread?: string;
  requirements: Requirement[];
  footnotes?: Footnote[];
  college?: string;
  totalCredits?: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// NEW FUNCTION: Detect consecutive duplicate course titles (like "Lab Science")
function detectDuplicateCoursePattern(courses: Course[]): Course[] {
  const enhancedCourses: Course[] = [];
  let i = 0;
  
  while (i < courses.length) {
    const currentCourse = courses[i];
    
    // Check if this is a flexible course with potential duplicates
    if (currentCourse.courseType === 'flexible' || 
        currentCourse.title.toLowerCase().includes('lab science') ||
        currentCourse.title.toLowerCase().includes('elective')) {
      
      // Look for consecutive courses with same title
      const duplicates: Course[] = [currentCourse];
      let j = i + 1;
      
      while (j < courses.length && 
             courses[j].title.toLowerCase() === currentCourse.title.toLowerCase()) {
        duplicates.push(courses[j]);
        j++;
      }
      
      if (duplicates.length > 1) {
        // Create AND group for duplicates
        const andGroup: Course = {
          code: 'AND_GROUP',
          title: `${currentCourse.title} (${duplicates.length} courses)`,
          courseType: 'and_group',
          groupId: `and_${Date.now()}_duplicates`,
          groupCourses: duplicates,
          footnoteRefs: []
        };
        enhancedCourses.push(andGroup);
        console.log(`✓ Created AND group for ${duplicates.length} duplicate "${currentCourse.title}" courses`);
        i = j; // Skip all the duplicates
      } else {
        enhancedCourses.push(currentCourse);
        i++;
      }
    } else {
      enhancedCourses.push(currentCourse);
      i++;
    }
  }
  
  return enhancedCourses;
}

function consolidateANDGroups(requirements: Requirement[]): void {
  console.log('\n=== CONSOLIDATING AND GROUPS ===');
  
  requirements.forEach(requirement => {
    // Only detect duplicate patterns (AND combinations handled in parsing)
    requirement.courses = detectDuplicateCoursePattern(requirement.courses);
    
    console.log(`✓ Processed requirement "${requirement.name}": ${requirement.courses.length} items`);
  });
}

export function parseProgram(text: string): ProgramData {
  console.log('\n🚀🚀🚀 === STARTING NEW PARSE SESSION ===');
  console.log('📝 Input text length:', text.length);
  console.log('📝 First 200 chars:', text.substring(0, 200));
  const lines = text.split('\n').filter(line => line.trim());
  
  // Extract program info - ENHANCED for concentrations
  const firstLine = lines[0] || '';
  let programName = firstLine
    .replace(/\*+/g, '')
    .replace(/Bachelor of Science in /i, '')
    .replace(/Master of Science in /i, '')
    .replace(/Minor in /i, '')
    .replace(/BS in /i, '')
    .replace(/MS in /i, '')
    .trim();
  
  // NEW: Extract concentration from program name
  let concentration: string | undefined;
  let thread: string | undefined;
  
  // Pattern: "Computer Science - Intelligence"
  const concentrationMatch = programName.match(/^(.+?)\s*-\s*(.+)$/);
  if (concentrationMatch) {
    programName = concentrationMatch[1].trim();
    concentration = concentrationMatch[2].trim();
  }
  
  // Pattern: "Computer Science, Intelligence Thread"
  const threadMatch = programName.match(/^(.+?),\s*(.+?)\s+Thread$/i);
  if (threadMatch) {
    programName = threadMatch[1].trim();
    thread = threadMatch[2].trim();
  }
  
  // Determine degree type - ENHANCED for minors
  let degreeType = 'BS';
  if (firstLine.toLowerCase().includes('master')) degreeType = 'MS';
  if (firstLine.toLowerCase().includes('phd')) degreeType = 'PhD';
  if (firstLine.toLowerCase().includes('minor')) degreeType = 'Minor';
  
  // Extract footnotes
  const footnotes = extractFootnotes(text);
  
  // DETECT TABLE FORMAT - This is the key fix for parsing
  const isTableFormat = detectTableFormat(text);
  console.log(`Table format detected: ${isTableFormat}`);
  
  // PRE-SCAN for Major Requirements section
  const hasMajorRequirementsSection = text.includes('Major Requirements');
  console.log(`Pre-scan: Major Requirements section exists: ${hasMajorRequirementsSection}`);
  
  // COMPREHENSIVE PARSING APPROACH
  const requirements: Requirement[] = [];
  let i = 1;
  
  console.log('\n🔍 === STARTING COMPREHENSIVE PARSING ===');
  console.log(`📊 Total lines to process: ${lines.length}`);
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Skip navigation/header sections and empty lines
    if (!line || isNavigationHeader(line) || isFootnoteStart(line)) {
      console.log(`⏭️  Skipping line ${i}: "${line}" (empty/navigation/footnote)`);
      i++;
      continue;
    }
    
    console.log(`\n🔍 Line ${i}: "${line}"`);
    
    // Add peek-ahead logging for multi-line patterns
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      console.log(`👀 Next line ${i + 1}: "${nextLine}"`);
      
      if (i + 2 < lines.length) {
        const thirdLine = lines[i + 2].trim();
        console.log(`👀 Third line ${i + 2}: "${thirdLine}"`);
      }
    }
    
    // SPECIAL CHECK: Force Major Requirements detection
    if (/^Major Requirements?$/i.test(line.replace(/\*+/g, '').trim())) {
      console.log(`  *** FORCE DETECTING MAJOR REQUIREMENTS ***`);
      const categoryResult = parseCategory(lines, i, isTableFormat);
      if (categoryResult.category) {
        console.log(`  ✓ Adding MAJOR REQUIREMENTS: ${categoryResult.category.name} (${categoryResult.category.courses.length} courses)`);
        requirements.push(categoryResult.category);
      }
      i = categoryResult.nextIndex;
      continue;
    }
    
    // Check if this is a category header
    if (isCategoryHeader(line)) {
      console.log(`  ✓ CATEGORY HEADER DETECTED: ${line}`);
      const categoryResult = parseCategory(lines, i, isTableFormat);
      if (categoryResult.category) {
        if (categoryResult.category.courses.length > 0) {
          console.log(`  ✓ Adding category: ${categoryResult.category.name} (${categoryResult.category.courses.length} courses)`);
          requirements.push(categoryResult.category);
        } else {
          console.log(`  ✗ Skipping empty category: ${categoryResult.category.name}`);
        }
      }
      i = categoryResult.nextIndex;
      continue;
    }
    
    // Check for flexible requirements that should create their own categories
    if (isFlexibleRequirement(line)) {
      console.log(`  ✓ FLEXIBLE REQUIREMENT DETECTED: ${line}`);
      const flexCategory = createFlexibleCategory(line);
      if (flexCategory) {
        console.log(`  ✓ Adding flexible category: ${flexCategory.name}`);
        requirements.push(flexCategory);
      }
      i++;
      continue;
    }
    
    i++;
  }
  
  // POST-PROCESSING: Handle missing Major Requirements for degree programs
  if (degreeType !== 'Minor') {
    handleMissingMajorRequirements(requirements, text, hasMajorRequirementsSection);
  }
  
  // POST-PROCESSING: Add other missing required categories
  addMissingRequiredCategories(requirements, text, degreeType);
  
  // POST-PROCESSING: Detect and create OR/AND logic groups
  enhanceWithLogicGroups(requirements);
  
  // POST-PROCESSING: Detect and create Selection groups
  enhanceWithSelectionGroups(requirements);
  
  // POST-PROCESSING: Convert FLEXIBLE selection courses to proper selection groups
  convertFlexibleSelectionsToGroups(requirements, text);

  // POST-PROCESSING: Fix missing OR groups after AND groups (only for specific patterns)
  fixMissingORGroupsForANDPatterns(requirements, text);

  // POST-PROCESSING: Process nested group structures
  requirements.forEach(requirement => {
    requirement.courses = processNestedGroups(requirement.courses);
  });
  
  // POST-PROCESSING: Consolidate AND groups to act as single units
  consolidateANDGroups(requirements);
  
  // POST-PROCESSING: Validate all group structures
  const validationResult = validateGroupStructures(requirements);
  if (!validationResult.isValid) {
    console.log('\n⚠️ Parser validation found issues:');
    validationResult.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  // Filter out empty categories
  const filteredRequirements = filterEmptyCategories(requirements);
  
  console.log(`\n=== FINAL RESULT ===`);
  console.log(`Program: ${programName}`);
  console.log(`Type: ${degreeType}`);
  console.log(`Categories: ${filteredRequirements.length}`);
  filteredRequirements.forEach(req => {
    console.log(`  - ${req.name}: (${req.courses.length} items)`);
  });
  
  const totalCredits = extractTotalCredits(text);
  return {
    name: programName,
    degreeType,
    concentration,
    thread,
    requirements: filteredRequirements,
    footnotes: footnotes || [],
    college: extractCollege(programName),
    totalCredits
  };
}

// NEW FUNCTION: Detect if the catalog is in table format
function detectTableFormat(text: string): boolean {
  const indicators = [
    /Code\s+Title/i,
    /Course List/i,
    /Code\s*Title/i,
    /CodeTitle/i
  ];
  
  return indicators.some(pattern => pattern.test(text));
}

interface CategoryResult {
  category: Requirement | null;
  nextIndex: number;
}

// Add this function to extract total credits from the text
function extractTotalCredits(text: string): number {
  console.log('Extracting total credits from text...');
  
  // Look for "Total Credit Hours" pattern
  const totalCreditsMatch = text.match(/Total\s+Credit\s+Hours\s*(\d+)/i);
  if (totalCreditsMatch) {
    const credits = parseInt(totalCreditsMatch[1]);
    console.log(`Found total credits: ${credits}`);
    return credits;
  }
  
  // Alternative patterns
  const altPatterns = [
    /Total\s+Credits?\s*:?\s*(\d+)/i,
    /Total\s+Hours?\s*:?\s*(\d+)/i,
    /(\d+)\s+Total\s+Credit\s+Hours/i,
    /Total:\s*(\d+)\s+credits?/i
  ];
  
  for (const pattern of altPatterns) {
    const match = text.match(pattern);
    if (match) {
      const credits = parseInt(match[1]);
      console.log(`Found total credits (alt pattern): ${credits}`);
      return credits;
    }
  }
  
  console.log('No total credits found in text');
  return 0;
}

// ENHANCED FUNCTION: Comprehensive nesting support for complex group structures
function processNestedGroups(courses: Course[]): Course[] {
  console.log('\n🔄 === PROCESSING NESTED GROUPS ===');
  
  return courses.map((course, index) => {
    console.log(`\n📝 Processing course ${index + 1}: ${course.code} - ${course.title}`);
    
    // Process AND groups with potential nested content
    if (course.courseType === 'and_group' && course.groupCourses) {
      console.log(`  🔗 Processing AND group with ${course.groupCourses.length} members`);
      
      const processedGroupCourses = course.groupCourses.map(groupCourse => {
        // Check if any group member should itself be a nested group
        if (groupCourse.title && groupCourse.title.includes(' OR ')) {
          console.log(`    🔀 Converting AND group member to nested OR group: ${groupCourse.title}`);
          
          // Split on OR and create nested OR group
          const orParts = groupCourse.title.split(' OR ').map(part => part.trim());
          if (orParts.length >= 2) {
            const nestedORCourses = orParts.map(part => ({
              code: extractCourseCodeFromText(part) || 'UNKNOWN',
              title: part,
              courseType: 'regular' as const,
              footnoteRefs: groupCourse.footnoteRefs || []
            }));
            
            return createORGroup(nestedORCourses, 'Nested OR in AND');
          }
        }
        
        return groupCourse;
      });
      
      return {
        ...course,
        groupCourses: processedGroupCourses
      };
    }
    
    // Process OR groups with potential nested content
    if (course.courseType === 'or_group' && course.groupCourses) {
      console.log(`  🔀 Processing OR group with ${course.groupCourses.length} options`);
      
      const processedGroupCourses = course.groupCourses.map(groupCourse => {
        // Check if any OR option should itself be a nested AND group
        if (groupCourse.title && groupCourse.title.includes(' & ')) {
          console.log(`    🔗 Converting OR group option to nested AND group: ${groupCourse.title}`);
          
          // Split on & and create nested AND group
          const andParts = groupCourse.title.split(' & ').map(part => part.trim());
          if (andParts.length >= 2) {
            const nestedANDCourses = andParts.map(part => ({
              code: extractCourseCodeFromText(part) || groupCourse.code,
              title: part,
              courseType: 'regular' as const,
              footnoteRefs: groupCourse.footnoteRefs || []
            }));
            
            return createANDGroup(nestedANDCourses, 'Nested AND in OR');
          }
        }
        
        return groupCourse;
      });
      
      return {
        ...course,
        groupCourses: processedGroupCourses
      };
    }
    
    // Process SELECTION groups with potential nested content
    if (course.courseType === 'selection' && course.selectionOptions) {
      console.log(`  🎯 Processing SELECTION group with ${course.selectionOptions.length} options`);
      
      const processedSelectionOptions = course.selectionOptions.map(option => {
        // Recursively process nested groups within selection options
        if (option.courseType === 'and_group' || option.courseType === 'or_group') {
          console.log(`    🔄 Recursively processing nested ${option.courseType} in selection`);
          return processNestedGroups([option])[0];
        }
        
        // Check for implicit nesting in option titles
        if (option.title && (option.title.includes(' & ') || option.title.includes(' OR '))) {
          console.log(`    🔍 Implicit nesting detected in selection option: ${option.title}`);
          
          if (option.title.includes(' & ')) {
            const andParts = option.title.split(' & ').map(part => part.trim());
            if (andParts.length >= 2) {
              const nestedCourses = andParts.map(part => ({
                code: extractCourseCodeFromText(part) || option.code,
                title: part,
                courseType: 'regular' as const,
                footnoteRefs: option.footnoteRefs || []
              }));
              return createANDGroup(nestedCourses, 'Nested AND in Selection');
            }
          }
          
          if (option.title.includes(' OR ')) {
            const orParts = option.title.split(' OR ').map(part => part.trim());
            if (orParts.length >= 2) {
              const nestedCourses = orParts.map(part => ({
                code: extractCourseCodeFromText(part) || option.code,
                title: part,
                courseType: 'regular' as const,
                footnoteRefs: option.footnoteRefs || []
              }));
              return createORGroup(nestedCourses, 'Nested OR in Selection');
            }
          }
        }
        
        return option;
      });
      
      return {
        ...course,
        selectionOptions: processedSelectionOptions
      };
    }
    
    return course;
  });
}

// Helper function to extract course code from text
function extractCourseCodeFromText(text: string): string | null {
  const match = text.match(/([A-Z]{2,4}\s+\d{4}[A-Z]?)/);
  return match ? match[1] : null;
}

// ENHANCED FUNCTION: Comprehensive validation with detailed error reporting
function validateGroupStructures(requirements: Requirement[]): ValidationResult {
  console.log('\n🔍 === VALIDATING GROUP STRUCTURES ===');
  const errors: string[] = [];
  const warnings: string[] = [];
  
  requirements.forEach((requirement, reqIndex) => {
    console.log(`\n📋 Validating requirement: "${requirement.name}"`);
    
    requirement.courses.forEach((course, courseIndex) => {
      const courseRef = `Requirement "${requirement.name}" -> Course ${courseIndex + 1}`;
      
      // Validate AND groups
      if (course.courseType === 'and_group') {
        console.log(`  🔗 Validating AND group: ${course.code}`);
        
        if (!course.groupCourses || course.groupCourses.length < 2) {
          errors.push(`${courseRef}: AND group must have at least 2 courses, found ${course.groupCourses?.length || 0}`);
        }
        
        if (course.groupCourses) {
          const invalidMembers = course.groupCourses.filter(member => !member.code || member.code.trim() === '');
          if (invalidMembers.length > 0) {
            errors.push(`${courseRef}: AND group contains ${invalidMembers.length} members with invalid codes`);
          }
          
          // Check for duplicate members
          const codes = course.groupCourses.map(m => m.code);
          const duplicates = codes.filter((code, index) => codes.indexOf(code) !== index);
          if (duplicates.length > 0) {
            warnings.push(`${courseRef}: AND group contains duplicate courses: ${[...new Set(duplicates)].join(', ')}`);
          }
        }
      }
      
      // Validate OR groups
      if (course.courseType === 'or_group') {
        console.log(`  🔀 Validating OR group: ${course.code}`);
        
        if (!course.groupCourses || course.groupCourses.length < 2) {
          errors.push(`${courseRef}: OR group must have at least 2 options, found ${course.groupCourses?.length || 0}`);
        }
        
        if (course.groupCourses) {
          const invalidOptions = course.groupCourses.filter(option => !option.code || option.code.trim() === '');
          if (invalidOptions.length > 0) {
            errors.push(`${courseRef}: OR group contains ${invalidOptions.length} options with invalid codes`);
          }
        }
      }
      
      // Validate SELECTION groups
      if (course.courseType === 'selection') {
        console.log(`  🎯 Validating SELECTION group: ${course.code}`);
        
        if (!course.selectionOptions || course.selectionOptions.length === 0) {
          errors.push(`${courseRef}: SELECTION group must have at least 1 option, found ${course.selectionOptions?.length || 0}`);
        }
        
        if (!course.selectionCount || course.selectionCount < 1) {
          errors.push(`${courseRef}: SELECTION group must have valid selectionCount, found ${course.selectionCount}`);
        }
        
        if (course.selectionOptions && course.selectionCount && course.selectionCount > course.selectionOptions.length) {
          warnings.push(`${courseRef}: SELECTION group requires ${course.selectionCount} selections but only has ${course.selectionOptions.length} options`);
        }
        
        if (course.selectionOptions) {
          const invalidOptions = course.selectionOptions.filter(option => !option.code || option.code.trim() === '');
          if (invalidOptions.length > 0) {
            errors.push(`${courseRef}: SELECTION group contains ${invalidOptions.length} options with invalid codes`);
          }
        }
      }
      
      // Validate nested groups recursively
      validateNestedGroups(course, courseRef, errors, warnings, 1);
    });
  });
  
  // Log results
  if (errors.length > 0) {
    console.log(`\n❌ Validation errors found:`);
    errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️ Validation warnings:`);
    warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log(`\n✅ All group structures are valid!`);
  }
  
  return {
    isValid: errors.length === 0,
    errors: [...errors, ...warnings.map(w => `WARNING: ${w}`)]
  };
}

// Helper function for recursive nested group validation
function validateNestedGroups(course: Course, parentRef: string, errors: string[], warnings: string[], depth: number): void {
  if (depth > 5) {
    errors.push(`${parentRef}: Nesting depth exceeds maximum allowed (5 levels)`);
    return;
  }
  
  // Validate nested groups in AND groups
  if (course.courseType === 'and_group' && course.groupCourses) {
    course.groupCourses.forEach((member, index) => {
      if (member.courseType === 'and_group' || member.courseType === 'or_group' || member.courseType === 'selection') {
        const nestedRef = `${parentRef} -> AND Member ${index + 1}`;
        validateNestedGroups(member, nestedRef, errors, warnings, depth + 1);
      }
    });
  }
  
  // Validate nested groups in OR groups
  if (course.courseType === 'or_group' && course.groupCourses) {
    course.groupCourses.forEach((option, index) => {
      if (option.courseType === 'and_group' || option.courseType === 'or_group' || option.courseType === 'selection') {
        const nestedRef = `${parentRef} -> OR Option ${index + 1}`;
        validateNestedGroups(option, nestedRef, errors, warnings, depth + 1);
      }
    });
  }
  
  // Validate nested groups in SELECTION groups
  if (course.courseType === 'selection' && course.selectionOptions) {
    course.selectionOptions.forEach((option, index) => {
      if (option.courseType === 'and_group' || option.courseType === 'or_group' || option.courseType === 'selection') {
        const nestedRef = `${parentRef} -> Selection Option ${index + 1}`;
        validateNestedGroups(option, nestedRef, errors, warnings, depth + 1);
      }
    });
  }
}

// ENHANCED: Parse category with logic group support and table format
export function parseCategory(lines: string[], startIndex: number, isTableFormat: boolean = false): CategoryResult {
  const categoryName = cleanCategoryName(lines[startIndex]);
  const courses: Course[] = [];
  let i = startIndex + 1;
  const isInSelectGroup = false;
  let selectGroupCount = 0;
   
  console.log(`\nParsing category: "${categoryName}" (Table format: ${isTableFormat})`);
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    console.log(`\n🔄 MAIN PARSING LOOP - Line ${i}: "${line}"`);
    console.log(`  📊 Current state: ${courses.length} courses processed so far`);
    
    // Stop at next category or footnotes
    if (!line || isCategoryHeader(line) || isFootnoteStart(line)) {
      console.log(`  ⏹️ STOPPING MAIN PARSING: empty line, category header, or footnote detected`);
      console.log(`    - Empty line: ${!line}`);
      console.log(`    - Category header: ${isCategoryHeader(line)}`);  
      console.log(`    - Footnote start: ${isFootnoteStart(line)}`);
      break;
    }
    
    console.log(`  ✅ Line passed initial checks, proceeding with parsing`);
    
    // ENHANCED: Handle "Select X of the following:" patterns with comprehensive nesting support
    // Multiple regex patterns for robust hour-based selection detection
    const selectMatch = line.match(/^(.+?)?(?:^|\s+)Select\s+(one|two|three|four|five|\d+)\s+(?:of\s+)?(?:the\s+following|electives?|courses?|options?)(?:[.:]|\s*$)/i);
    
    // Triple validation for hour-based selections - try multiple patterns
    let hourSelectMatch = null;
    const hourPatterns = [
      // Pattern 1: Full anchored pattern
      /^(.+?)?(?:^|\s+)Select\s+(\d+)\s+(hours?|credits?)\s+(?:from|of)\s+(?:the\s+following|electives?|courses?)(?:[.:]|\s*$)/i,
      // Pattern 2: Simplified without complex anchoring
      /Select\s+(\d+)\s+(hours?|credits?)\s+(?:from|of)\s+(?:the\s+following|electives?|courses?)/i,
      // Pattern 3: Most flexible - just detect "Select X hours"
      /Select\s+(\d+)\s+(hours?|credits?)/i
    ];
    
    // Try each pattern until one matches
    for (let i = 0; i < hourPatterns.length; i++) {
      const match = line.match(hourPatterns[i]);
      if (match) {
        hourSelectMatch = match;
        console.log(`  🎯 Hour selection detected with pattern ${i + 1}: "${line}"`);
        break;
      }
    }
    
    // Additional validation: check if line contains hour-related keywords
    const hasHourKeywords = /\b(hours?|credits?|hrs?)\b/i.test(line);
    const hasSelectKeyword = /\bselect\b/i.test(line);
    const hasFollowingKeyword = /\b(following|electives?|courses?)\b/i.test(line);
    
    if (hasHourKeywords && hasSelectKeyword && hasFollowingKeyword && !hourSelectMatch) {
      console.log(`  ⚠️ Potential hour selection missed: "${line}" - manual fallback parsing`);
      // Fallback: extract numbers and hour keywords manually
      const numberMatch = line.match(/(\d+)/);
      const hourMatch = line.match(/\b(hours?|credits?)\b/i);
      if (numberMatch && hourMatch) {
        hourSelectMatch = [line, '', numberMatch[1], hourMatch[1]];
        console.log(`  ✅ Fallback hour selection parsing successful: ${numberMatch[1]} ${hourMatch[1]}`);
      }
    }
    
    if (selectMatch || hourSelectMatch) {
      let potentialTitle = '';
      let selectionType: 'courses' | 'hours' = 'courses';
      let selectionValue = 1;
      
      if (hourSelectMatch) {
        // Handle different regex capture group patterns
        if (hourSelectMatch.length >= 4) {
          // Full pattern match with title capture
          potentialTitle = hourSelectMatch[1] ? hourSelectMatch[1].trim() : '';
          selectionValue = parseInt(hourSelectMatch[2]);
        } else if (hourSelectMatch.length >= 3) {
          // Simplified pattern match without title
          potentialTitle = '';
          selectionValue = parseInt(hourSelectMatch[1]);
        }
        selectionType = 'hours';
        console.log(`  🎯 *** CREATING ENHANCED HOUR-BASED SELECTION GROUP: ${selectionValue} hours ***`);
        console.log(`  📝 Extracted title: "${potentialTitle}"`);
        console.log(`  🔍 Match details:`, hourSelectMatch);
      } else if (selectMatch) {
        potentialTitle = selectMatch[1] ? selectMatch[1].trim() : '';
        const selectionCountText = selectMatch[2].toLowerCase();
        const wordToNumber = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5 };
        selectionValue = wordToNumber[selectionCountText as keyof typeof wordToNumber] || parseInt(selectMatch[2]);
        selectionType = 'courses';
        console.log(`  🎯 *** CREATING ENHANCED COURSE-BASED SELECTION GROUP: ${selectionValue} courses ***`);
      }
      
      selectGroupCount = selectionValue;
      
      console.log(`  🎯 *** CREATING ENHANCED SELECTION GROUP: ${selectGroupCount} courses ***`);
      console.log(`  📝 Potential title captured: "${potentialTitle}"`);
      
      // 🔬 DEBUG: Show exactly what lines are available for parsing
      console.log(`  📋 Available lines for selection parsing (starting from line ${i + 1}):`);
      for (let debugLineIndex = i + 1; debugLineIndex < Math.min(i + 15, lines.length); debugLineIndex++) {
        const debugLine = lines[debugLineIndex] || '';
        console.log(`    ${debugLineIndex}: "${debugLine.trim()}" (raw: "${debugLine}")`);
      }
      
      // Create enhanced selection group with validation
      // Use custom title if available, otherwise default to the selection pattern
      const defaultTitle = selectionType === 'hours' 
        ? `Select ${selectGroupCount} hours from the following`
        : `Select ${selectGroupCount} of the following`;
      const groupTitle = potentialTitle && potentialTitle.length > 0 && !potentialTitle.toLowerCase().includes('select') 
        ? potentialTitle 
        : defaultTitle;
        
      const selectionGroup: Course = {
        code: 'SELECT_GROUP',
        title: groupTitle,
        courseType: 'selection',
        groupId: `select_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        selectionCount: selectionType === 'courses' ? selectGroupCount : undefined,
        selectionHours: selectionType === 'hours' ? selectGroupCount : undefined,
        selectionType: selectionType,
        selectionOptions: [],
        footnoteRefs: []
      };
      
      console.log(`  🏷️ Final selection group title: "${groupTitle}"`);
      
      // Parse selection options with enhanced nesting support
      console.log(`  🚀 STARTING SELECTION GROUP PARSING - Looking for ${selectGroupCount} options`);
      i++;
      let optionCount = 0;
      let consecutiveEmptyLines = 0;
      
      while (i < lines.length && consecutiveEmptyLines < 2) {
        const optionLine = lines[i].trim();
        console.log(`  🔄 SELECTION LOOP ITERATION: line ${i}, consecutiveEmptyLines=${consecutiveEmptyLines}`);
        console.log(`  🔍 SELECTION PARSING - Line ${i}: "${optionLine}" (optionCount: ${optionCount}, consecutiveEmpty: ${consecutiveEmptyLines})`);
        
        // Track empty lines to determine end of selection
        if (!optionLine) {
          consecutiveEmptyLines++;
          console.log(`    📭 Empty line detected, consecutiveEmptyLines now: ${consecutiveEmptyLines}`);
          i++;
          continue;
        }
        consecutiveEmptyLines = 0;
        console.log(`    📄 Non-empty line detected, reset consecutiveEmptyLines to 0`);
        
        // Stop at next category or footnotes
        console.log(`    🔍 Checking if line is category header: ${isCategoryHeader(optionLine)}`);
        console.log(`    🔍 Checking if line is footnote start: ${isFootnoteStart(optionLine)}`);
        if (isCategoryHeader(optionLine) || isFootnoteStart(optionLine)) {
          console.log(`    ⏹️ STOPPING SELECTION PARSING: category/footnote detected - "${optionLine}"`);
          break;
        }
        
        // ENHANCED: Stop if we hit a credit-bearing line (indicates end of selection)
        // Look for patterns like "Free Electives 1    10" or "Total Credit Hours    122"
        console.log(`    🔍 Checking if line is credit-bearing: ${isCreditBearingLine(optionLine)}`);
        if (isCreditBearingLine(optionLine)) {
          console.log(`    ⏹️ STOPPING SELECTION PARSING: credit line detected - "${optionLine}"`);
          break;
        }
        
        console.log(`    📝 Processing selection option line ${optionCount + 1}: "${optionLine}"`);
        
        // Priority 1: Check for nested OR patterns within selection
        console.log(`    🔍 Checking for OR pattern in selection option...`);
        const orPatternResult = detectORPattern(optionLine, lines, i);
        if (orPatternResult.isORPattern) {
          console.log(`    🔥 *** OR PATTERN IN SELECTION *** - Found ${orPatternResult.courses.length} courses`);
          const nestedORGroup = createORGroup(orPatternResult.courses, 'Nested OR Group');
          selectionGroup.selectionOptions!.push(nestedORGroup);
          console.log(`    ➕ Added OR group to selection, jumping to index ${orPatternResult.nextIndex}`);
          i = orPatternResult.nextIndex;
          optionCount++;
          continue;
        }
        console.log(`    ✅ No OR pattern detected`);
        
        // Priority 2: Check for nested AND patterns within selection
        console.log(`    🔍 Checking for AND pattern in selection option...`);
        const andPatternResult = detectANDPattern(optionLine, lines, i);
        if (andPatternResult.isANDPattern) {
          console.log(`    🔥 *** AND PATTERN IN SELECTION *** - Found ${andPatternResult.courses.length} courses`);
          const nestedANDGroup = createANDGroup(andPatternResult.courses, 'Nested AND Group');
          selectionGroup.selectionOptions!.push(nestedANDGroup);
          console.log(`    ➕ Added AND group to selection, jumping to index ${andPatternResult.nextIndex}`);
          i = andPatternResult.nextIndex;
          optionCount++;
          continue;
        }
        console.log(`    ✅ No AND pattern detected`);
        
        // Priority 3: Check for nested selection patterns (Select within Select)
        console.log(`    🔍 Checking for nested selection pattern...`);
        const nestedSelectMatch = optionLine.match(/^Select\s+(\d+|one|two|three)\s+of/i);
        if (nestedSelectMatch) {
          console.log(`    🔥 *** NESTED SELECTION DETECTED *** - Pattern: ${nestedSelectMatch[0]}`);
          // Recursively parse the nested selection
          const nestedResult = parseCategory(lines, i, false);
          if (nestedResult.category && nestedResult.category.courses.length > 0) {
            // The nested selection will be in the first course of the category
            const nestedSelection = nestedResult.category.courses[0];
            if (nestedSelection.courseType === 'selection') {
              selectionGroup.selectionOptions!.push(nestedSelection);
              console.log(`    ➕ Added nested selection to options, jumping to index ${nestedResult.nextIndex}`);
              i = nestedResult.nextIndex;
              optionCount++;
              continue;
            }
          }
          console.log(`    ⚠️ Nested selection parsing failed or returned no selection course`);
        }
        console.log(`    ✅ No nested selection pattern detected`);
        
        // ENHANCED: Parse course options (including multi-line patterns)
        console.log(`    🔍 Checking for multi-line course pattern...`);
        
        // First check if this is just a course code (might have title on next line)
        const courseCodeMatch = optionLine.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)$/);
        if (courseCodeMatch && i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          console.log(`    🎯 Course code only detected: "${courseCodeMatch[1]}" - Next line: "${nextLine}"`);
          
          // Check if next line looks like a course title (not a course code or category)
          const isNextLineCoursCode = !!nextLine.match(/^[A-Z]{2,4}\s+\d{4}/);
          const isNextLineCategory = isCategoryHeader(nextLine);
          const isNextLineCreditBearing = isCreditBearingLine(nextLine);
          
          console.log(`    🔍 Next line analysis: courseCode=${isNextLineCoursCode}, category=${isNextLineCategory}, creditBearing=${isNextLineCreditBearing}, length=${nextLine.length}`);
          
          if (!isNextLineCoursCode && !isNextLineCategory && !isNextLineCreditBearing && nextLine.length > 0) {
            console.log(`    🎲 Multi-line course confirmed: ${courseCodeMatch[1]} + "${nextLine}"`);
            
            const multiLineCourse: Course = {
              code: courseCodeMatch[1],
              title: nextLine,
              courseType: 'regular',
              footnoteRefs: [],
              isSelectionOption: true
            };
            
            selectionGroup.selectionOptions!.push(multiLineCourse);
            console.log(`    ➕ Added multi-line option ${optionCount + 1}: ${multiLineCourse.code} - ${multiLineCourse.title}`);
            console.log(`    📍 Advancing from line ${i} to ${i + 2} (skipping course code and title lines)`);
            optionCount++;
            i++; // Skip the title line since we processed it
            i++; // Move to next iteration
            continue;
          } else {
            console.log(`    ❌ Next line not suitable for multi-line course - treating as single line`);
          }
        } else {
          console.log(`    ✅ Not a course-code-only line or no next line available`);
        }
        
        // Try to parse as regular course option
        console.log(`    🔍 Attempting to parse as standard/complex/flexible course...`);
        const optionCourse = parseStandardCourse(optionLine) || 
                           parseComplexCourse(optionLine) || 
                           parseFlexibleRequirement(optionLine);
        
        if (optionCourse) {
          // Mark as selection option for proper rendering
          optionCourse.isSelectionOption = true;
          selectionGroup.selectionOptions!.push(optionCourse);
          console.log(`    ➕ SUCCESSFULLY ADDED option ${optionCount + 1}: ${optionCourse.code} - ${optionCourse.title} (type: ${optionCourse.courseType})`);
          optionCount++;
        } else {
          console.log(`    ⚠️ FAILED TO PARSE selection option: "${optionLine}" - This line will be ignored in selection`);
        }
        
        console.log(`    📍 Advancing from line ${i} to ${i + 1}`);
        i++;
      }
      
      console.log(`  🏁 SELECTION GROUP PARSING COMPLETED - Final state:`);
      console.log(`    - Final line index: ${i}`);
      console.log(`    - Options found: ${selectionGroup.selectionOptions!.length}`);
      console.log(`    - Expected options: ${selectGroupCount}`);
      console.log(`    - Consecutive empty lines: ${consecutiveEmptyLines}`);
      console.log(`    - Loop exit reason: ${i >= lines.length ? 'End of lines' : consecutiveEmptyLines >= 2 ? 'Too many empty lines' : 'Unknown'}`);
      if (i < lines.length) {
        console.log(`    - Next unprocessed line: "${lines[i].trim()}"`);
      } else {
        console.log(`    - Reached end of lines array`);
      }
      
      // 🔬 DEBUG: List all the selection options that were found
      console.log(`  📦 Selection options collected:`);
      selectionGroup.selectionOptions!.forEach((opt, idx) => {
        console.log(`    ${idx + 1}. ${opt.code} - ${opt.title} (${opt.courseType})`);
      });
      
      // Validation: Ensure we have at least one option
      if (selectionGroup.selectionOptions!.length === 0) {
        console.log(`    ⚠️ Selection group has no options, treating as flexible requirement`);
        const flexibleCourse: Course = {
          code: 'FLEXIBLE',
          title: groupTitle, // Use the same title logic as the selection group
          courseType: 'flexible' as const,
          footnoteRefs: [],
          isFlexible: true
        };
        courses.push(flexibleCourse);
        console.log(`    ➕ Added flexible course to main courses array: ${flexibleCourse.code} - ${flexibleCourse.title}`);
      } else {
        console.log(`    ✅ Selection group completed with ${selectionGroup.selectionOptions!.length} options`);
        courses.push(selectionGroup);
        console.log(`    ➕ Added selection group to main courses array: ${selectionGroup.code} - ${selectionGroup.title}`);
        console.log(`    📋 Selection options summary:`);
        selectionGroup.selectionOptions!.forEach((option, idx) => {
          console.log(`      ${idx + 1}. ${option.code} - ${option.title}`);
        });
      }
      
      console.log(`  🎯 SELECTION PROCESSING COMPLETE - Continuing parsing from line ${i}`);
      console.log(`  📊 Current courses array has ${courses.length} items`);
      continue;
    }
    
    // ENHANCED: First check for AND patterns, then check if they should be nested in OR
    const andPatternResult = detectANDPattern(line, lines, i);
    if (andPatternResult.isANDPattern) {
      console.log(`  🔗 *** AND PATTERN DETECTED ***`);
      
      // Create the AND group
      const andGroup = createANDGroup(andPatternResult.courses);
      
      // Now check if this AND group should be part of an OR group
      let nextIndex = andPatternResult.nextIndex;
      if (nextIndex < lines.length) {
        const nextLine = lines[nextIndex].trim();
        
        if (nextLine.toLowerCase().startsWith('or ')) {
          console.log(`  🔄 *** AND GROUP SHOULD BE IN OR GROUP ***`);
          
          // Start OR group with the AND group as first option
          const orGroupCourses: Course[] = [andGroup];
          
          // Collect all OR options
          while (nextIndex < lines.length) {
            const orLine = lines[nextIndex].trim();
            
            if (orLine.toLowerCase().startsWith('or ')) {
              // Check if OR option is also an AND pattern
              const orOptionAndResult = detectANDPattern(orLine.replace(/^or\s+/i, ''), lines, nextIndex);
              if (orOptionAndResult.isANDPattern) {
                console.log(`  🔗 Nested AND in OR option`);
                const nestedAnd = createANDGroup(orOptionAndResult.courses, 'Nested AND in OR');
                orGroupCourses.push(nestedAnd);
              } else {
                const orCourse = parseStandardCourse(orLine) || parseComplexCourse(orLine);
                if (orCourse) {
                  orCourse.courseType = 'regular';
                  orCourse.isOption = false;
                  orGroupCourses.push(orCourse);
                }
              }
              nextIndex++;
            } else if (!orLine || isCategoryHeader(orLine) || isFootnoteStart(orLine)) {
              break;
            } else {
              // Check if this looks like another regular course
              const possibleCourse = parseStandardCourse(orLine) || parseComplexCourse(orLine);
              if (possibleCourse && !orLine.toLowerCase().startsWith('or ')) {
                break;
              }
              nextIndex++;
            }
          }
          
          // Create OR group with AND as first option
          const orGroup = createORGroup(orGroupCourses, 'OR with nested AND');
          courses.push(orGroup);
          i = nextIndex;
          continue;
        }
      }
      
      // No OR following, just add the AND group
      courses.push(andGroup);
      i = andPatternResult.nextIndex;
      continue;
    }
    
    // ENHANCED: Detect OR patterns that don't start with AND groups
    const orPatternResult = detectORPattern(line, lines, i);
    if (orPatternResult.isORPattern) {
      console.log(`  🔄 *** OR PATTERN DETECTED ***`);
      const orGroup = createORGroup(orPatternResult.courses);
      courses.push(orGroup);
      i = orPatternResult.nextIndex;
      continue;
    }

    // ENHANCED: Check for multi-line AND patterns (MATH 1551 followed by & MATH 1553)
    // First check if this line is just a course code (no title)
    const courseCodeOnlyMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)\s*$/);
    if (courseCodeOnlyMatch && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      console.log(`💡 Found course code only: "${courseCodeOnlyMatch[1]}" - checking next line: "${nextLine}"`);
      
      // Check if next line starts with & (multi-line AND pattern)
      if (nextLine.startsWith('&')) {
        console.log(`  🔗 *** MULTI-LINE AND PATTERN DETECTED ***`);
        console.log(`    First course code: ${courseCodeOnlyMatch[1]}`);
        console.log(`    Second line: "${nextLine}"`);
        
        // Parse the second course from the & line
        const andMatch = nextLine.match(/^&\s+([A-Z]{2,4}\s+\d{4}[A-Z]?)\s*(.*)$/);
        if (andMatch) {
          const [, secondCourseCode, titlePart] = andMatch;
          const { title, footnoteRefs } = parseCourseTitleAndCredits(titlePart);
          
          // Check if title continues on additional lines
          let fullTitle = title;
          let titleLineIndex = i + 2;
          
          console.log(`    📄 Checking for title continuation starting at line ${titleLineIndex}`);
          
          // Look for continuation lines that don't look like course codes or categories
          while (titleLineIndex < lines.length) {
            const possibleTitleLine = lines[titleLineIndex].trim();
            console.log(`      🔍 Examining line ${titleLineIndex}: "${possibleTitleLine}"`);
            
            // Stop if we hit another course code, category, or OR
            if (possibleTitleLine.match(/^[A-Z]{2,4}\s+\d{4}/)) {
              console.log(`        ⏹️ Stopping at course code: "${possibleTitleLine}"`);
              break;
            }
            if (possibleTitleLine.toLowerCase().startsWith('or ')) {
              console.log(`        ⏹️ Stopping at OR clause: "${possibleTitleLine}"`);
              break;
            }
            if (isCategoryHeader(possibleTitleLine)) {
              console.log(`        ⏹️ Stopping at category header: "${possibleTitleLine}"`);
              break;
            }
            if (isCreditBearingLine(possibleTitleLine)) {
              console.log(`        ⏹️ Stopping at credit-bearing line: "${possibleTitleLine}"`);
              break;
            }
            
            // If it looks like a title continuation, add it
            if (possibleTitleLine.length > 0 && 
                !possibleTitleLine.match(/^\d+$/) &&
                possibleTitleLine.match(/^[a-zA-Z]/)) {
              fullTitle += ` ${possibleTitleLine}`;
              console.log(`        ➕ Added title continuation: "${possibleTitleLine}"`);
              titleLineIndex++;
            } else {
              console.log(`        ⏭️ Skipping non-title line: "${possibleTitleLine}"`);
              break;
            }
          }
          
          console.log(`    📝 Final title: "${fullTitle}"`);
          console.log(`    📍 Title parsing ended at line ${titleLineIndex}`);
          
          const firstCourse: Course = {
            code: courseCodeOnlyMatch[1],
            title: fullTitle,
            courseType: 'regular',
            footnoteRefs: []
          };
          
          const secondCourse: Course = {
            code: secondCourseCode.trim(),
            title: fullTitle,
            courseType: 'regular',
            footnoteRefs: footnoteRefs
          };
          
          console.log(`    First course: ${firstCourse.code} - ${firstCourse.title}`);
          console.log(`    Second course: ${secondCourse.code} - ${secondCourse.title}`);
          
          // Create AND group
          const multiLineAndGroup = createANDGroup([firstCourse, secondCourse], `${firstCourse.code} & ${secondCourse.code}`);
          
          // Check if there's an OR following this AND group
          let nextIndex = titleLineIndex; // Start from where title parsing ended
          console.log(`    🔍 Checking for OR after multi-line AND group, starting at line ${nextIndex}`);
          
          if (nextIndex < lines.length) {
            const followingLine = lines[nextIndex].trim();
            console.log(`    📄 Next line after AND group: "${followingLine}"`);
            
            if (followingLine.toLowerCase().startsWith('or ')) {
              console.log(`  🔄 *** OR FOLLOWS MULTI-LINE AND GROUP ***`);
              
              // Start OR group with the AND group as first option
              const orGroupCourses: Course[] = [multiLineAndGroup];
              
              // Collect all OR options
              while (nextIndex < lines.length) {
                const orLine = lines[nextIndex].trim();
                
                if (orLine.toLowerCase().startsWith('or ')) {
                  console.log(`    🔍 Processing OR line: "${orLine}"`);
                  
                  // Remove "or " prefix and parse the course
                  const orOptionText = orLine.replace(/^or\s+/i, '');
                  console.log(`    📝 Parsing OR option text: "${orOptionText}"`);
                  
                  const orCourse = parseStandardCourse(orOptionText) || parseComplexCourse(orOptionText);
                  if (orCourse) {
                    orCourse.courseType = 'regular';
                    orCourse.isOption = false;
                    orGroupCourses.push(orCourse);
                    console.log(`    ➕ Added OR option: ${orCourse.code} - ${orCourse.title}`);
                  } else {
                    console.log(`    ❌ Could not parse OR option: "${orOptionText}"`);
                  }
                  nextIndex++;
                } else if (!orLine || isCategoryHeader(orLine) || isFootnoteStart(orLine)) {
                  break;
                } else {
                  const possibleCourse = parseStandardCourse(orLine) || parseComplexCourse(orLine);
                  if (possibleCourse && !orLine.toLowerCase().startsWith('or ')) {
                    break;
                  }
                  nextIndex++;
                }
              }
              
              // Create OR group with multi-line AND as first option
              const orGroup = createORGroup(orGroupCourses, 'OR with multi-line AND');
              courses.push(orGroup);
              i = nextIndex;
              continue;
            }
          }
          
          // No OR following, just add the AND group
          courses.push(multiLineAndGroup);
          i = nextIndex; // Skip both lines we just processed
          continue;
        }
      }
      }
    
    // TABLE FORMAT PARSING - Enhanced with course types
    if (isTableFormat) {
      const courseResult = parseTableFormatCourse(line, lines, i);
      if (courseResult.course) {
        // Enhance course with type detection
        enhanceCourseWithType(courseResult.course, line, isInSelectGroup);
        courses.push(courseResult.course);
        console.log(`  Table course: ${courseResult.course.code} - ${courseResult.course.title} [${courseResult.course.courseType}]`);
        i = courseResult.nextIndex;
        continue;
      }
    }
    
    // Parse standard courses (non-table format) - Enhanced with types
    console.log(`  🔍 Trying to parse as standard course...`);
    const standardCourseResult = parseStandardCourse(line);
    if (standardCourseResult) {
      enhanceCourseWithType(standardCourseResult, line, isInSelectGroup);
      courses.push(standardCourseResult);
      console.log(`  ➕ PARSED AS STANDARD COURSE: ${standardCourseResult.code} - ${standardCourseResult.title} (${standardCourseResult.courseType})`);
      console.log(`  📍 Advancing from line ${i} to ${i + 1}`);
      i++;
      continue;
    }
    console.log(`  ❌ Not a standard course`);
    
    // Parse complex courses - Enhanced with types
    console.log(`  🔍 Trying to parse as complex course...`);
    const complexCourseResult = parseComplexCourse(line);
    if (complexCourseResult) {
      enhanceCourseWithType(complexCourseResult, line, isInSelectGroup);
      courses.push(complexCourseResult);
      console.log(`  ➕ PARSED AS COMPLEX COURSE: ${complexCourseResult.code} - ${complexCourseResult.title} (${complexCourseResult.courseType})`);
      console.log(`  📍 Advancing from line ${i} to ${i + 1}`);
      i++;
      continue;
    }
    console.log(`  ❌ Not a complex course`);
    
    // Handle flexible requirements - Enhanced with types (but not if in selection)
    console.log(`  🔍 Checking if flexible requirement (isInSelectGroup: ${isInSelectGroup})...`);
    if (isFlexibleRequirement(line) && !isInSelectGroup) {
      console.log(`  🔍 Trying to parse as flexible requirement...`);
      const flexible = parseFlexibleRequirement(line);
      if (flexible) {
        enhanceCourseWithType(flexible, line, isInSelectGroup);
        courses.push(flexible);
        console.log(`  ➕ PARSED AS FLEXIBLE REQUIREMENT: ${flexible.code} - ${flexible.title} (${flexible.courseType})`);
        console.log(`  📍 Advancing from line ${i} to ${i + 1}`);
      }
      i++;
      continue;
    }
    console.log(`  ❌ Not a flexible requirement or currently in select group`);
    
    // Check if this might be a standalone course title (orphaned from selection parsing)
    if (line.match(/^[A-Za-z\s]+$/)) {
      console.log(`  ⚠️ POTENTIAL ORPHANED TITLE: "${line}" - This might be a course title that got separated from its code during selection parsing`);
    }
    
    // Handle credit-bearing lines that should end parsing
    if (isCreditBearingLine(line)) {
      console.log(`  ⏹️ ENDING CATEGORY PARSING due to credit line: "${line}"`);
      break; // This ends the category parsing
    }
    
    console.log(`  ⚠️ Line not parsed by any pattern - advancing to next line`);
    i++;
  }
  
  console.log(`\n🏁 CATEGORY PARSING COMPLETED: "${categoryName}"`);
  console.log(`  📊 Final results: ${courses.length} courses found`);
  console.log(`  📍 Final line index: ${i}`);
  console.log(`  📋 Courses summary:`);
  courses.forEach((course, idx) => {
    if (course.courseType === 'selection') {
      console.log(`    ${idx + 1}. ${course.code} - ${course.title} (${course.selectionOptions?.length || 0} options)`);
    } else {
      console.log(`    ${idx + 1}. ${course.code} - ${course.title} (${course.courseType})`);
    }
  });
  
  if (i < lines.length) {
    console.log(`  🔜 Next unprocessed line will be: "${lines[i].trim()}"`);
  }
  
  return {
    category: {
      name: categoryName,
      courses: courses
    },
    nextIndex: i
  };
}

interface PatternResult {
  isORPattern: boolean;
  courses: Course[];
  nextIndex: number;
}

interface ANDPatternResult {
  isANDPattern: boolean;
  courses: Course[];
  nextIndex: number;
}

// ENHANCED FUNCTION: Detect OR patterns with comprehensive nesting support
function detectORPattern(line: string, lines: string[], currentIndex: number): PatternResult {
  const result: PatternResult = { isORPattern: false, courses: [], nextIndex: currentIndex + 1 };
  
  console.log(`  🔍 Checking OR pattern for: "${line}"`);
  
  // Pattern 1: "CourseA OR CourseB" on same line (enhanced)
  const simpleORMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?(?:\s+[^O]+)?)\s+OR\s+([A-Z]{2,4}\s+\d{4}[A-Z]?(?:\s+.*)?)$/i);
  if (simpleORMatch) {
    const [, course1Text, course2Text] = simpleORMatch;
    console.log(`    ✓ Simple OR match: "${course1Text}" OR "${course2Text}"`);
    
    const course1 = parseCourseFromText(course1Text.trim());
    const course2 = parseCourseFromText(course2Text.trim());
    
    if (course1.code && course2.code) {
      result.isORPattern = true;
      result.courses = [course1, course2];
      console.log(`    ✓ Valid OR group created with 2 courses`);
      return result;
    }
  }
  
  // Pattern 2: "CourseA OR (CourseB & CourseC)" - nested AND within OR
  const nestedANDInORMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?(?:\s+[^O(]+)?)\s+OR\s+\(([^)]+)\)(.*)$/i);
  if (nestedANDInORMatch) {
    const [, course1Text, nestedGroup] = nestedANDInORMatch;
    console.log(`    ✓ OR with nested AND: "${course1Text}" OR "(${nestedGroup})"`);
    
    const course1 = parseCourseFromText(course1Text.trim());
    
    // Parse the nested AND group
    const nestedANDResult = detectANDPattern(nestedGroup, [], 0);
    if (nestedANDResult.isANDPattern) {
      const nestedANDGroup = createANDGroup(nestedANDResult.courses, 'Nested AND Group');
      result.isORPattern = true;
      result.courses = [course1, nestedANDGroup];
      console.log(`    ✓ Valid OR group with nested AND created`);
      return result;
    }
  }
  
  // Pattern 3: "CourseA or" followed by courses on next lines (enhanced)
  const trailingOrMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?(?:\s+.+)?)\s+or\s*$/i);
  if (trailingOrMatch) {
    console.log(`    ✓ Trailing 'or' detected, collecting options...`);
    const firstCourse = parseCourseFromText(line.replace(/\s+or\s*$/i, ''));
    result.isORPattern = true;
    result.courses.push(firstCourse);
    
    let nextIndex = currentIndex + 1;
    let consecutiveOrOptions = 0;
    
    while (nextIndex < lines.length && consecutiveOrOptions < 10) { // Safety limit
      const nextLine = lines[nextIndex].trim();
      
      // Stop conditions
      if (!nextLine || isCategoryHeader(nextLine) || isFootnoteStart(nextLine)) {
        console.log(`    ⏹️ Stopping OR collection: end condition met`);
        break;
      }
      
      // Check for explicit OR option
      if (nextLine.toLowerCase().startsWith('or ')) {
        const orCourse = parseCourseFromText(nextLine.replace(/^or\s+/i, ''));
        if (orCourse.code) {
          result.courses.push(orCourse);
          consecutiveOrOptions++;
          console.log(`    ➕ Added OR option ${consecutiveOrOptions}: ${orCourse.code}`);
        }
        nextIndex++;
      } else if (nextLine.match(/^[A-Z]{2,4}\s+\d{4}/)) {
        // Check if this might be another OR option without explicit "or"
        const possibleCourse = parseCourseFromText(nextLine);
        if (possibleCourse && possibleCourse.code) {
          // Look ahead to see if this pattern continues
          const nextNextLine = lines[nextIndex + 1]?.trim();
          if (nextNextLine?.toLowerCase().startsWith('or ') || 
              nextNextLine?.match(/^[A-Z]{2,4}\s+\d{4}/) ||
              consecutiveOrOptions < 3) { // Allow up to 3 implicit OR options
            result.courses.push(possibleCourse);
            consecutiveOrOptions++;
            console.log(`    ➕ Added implicit OR option ${consecutiveOrOptions}: ${possibleCourse.code}`);
            nextIndex++;
          } else {
            console.log(`    ⏹️ Stopping OR collection: regular course detected`);
            break;
          }
        } else {
          nextIndex++;
        }
      } else {
        nextIndex++;
      }
    }
    
    result.nextIndex = nextIndex;
    console.log(`    ✅ OR group completed with ${result.courses.length} options`);
    return result;
  }
  
  console.log(`    ✗ No OR pattern detected`);
  return result;
}

// ENHANCED FUNCTION: Detect AND patterns with comprehensive validation and nesting support
function detectANDPattern(line: string, lines: string[], currentIndex: number): ANDPatternResult {
  const result: ANDPatternResult = { isANDPattern: false, courses: [], nextIndex: currentIndex + 1 };
  
  console.log(`  🔍 Checking AND pattern for: "${line}"`);
  
  // Pattern 1: "CourseA & CourseB" on same line with enhanced validation
  const simpleANDMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?(?:\s+[^&]+)?)\s+&\s+([A-Z]{2,4}\s+\d{4}[A-Z]?(?:\s+.*)?)$/);
  if (simpleANDMatch) {
    const [, course1Text, course2Text] = simpleANDMatch;
    console.log(`    ✓ Simple AND match: "${course1Text}" & "${course2Text}"`);
    
    // Validate that both courses exist
    const course1 = parseCourseFromText(course1Text.trim());
    const course2 = parseCourseFromText(course2Text.trim());
    
    if (course1.code && course2.code) {
      result.isANDPattern = true;
      result.courses = [course1, course2];
      console.log(`    ✓ Valid AND group created with 2 courses`);
      return result;
    }
  }
  
  // Pattern 2: Multiple courses separated by & (enhanced for 3+ courses)
  const multiANDMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?(?:\s*&\s*[A-Z]{2,4}\s+\d{4}[A-Z]?)+)(?:\s+(.+))?$/);
  if (multiANDMatch) {
    const [, courseCodes, title] = multiANDMatch;
    const codes = courseCodes.split(/\s*&\s*/).filter(code => code.trim());
    console.log(`    ✓ Multi AND match: ${codes.length} courses - ${codes.join(', ')}`);
    
    if (codes.length >= 2) {
      result.isANDPattern = true;
      result.courses = codes.map(code => {
        const cleanCode = code.trim();
        // Validate course code format
        if (!/^[A-Z]{2,4}\s+\d{4}[A-Z]?$/.test(cleanCode)) {
          console.log(`    ⚠️ Invalid course code format: "${cleanCode}"`);
        }
        return {
          code: cleanCode,
          title: title?.trim() || '',
          courseType: 'regular' as const,
          footnoteRefs: []
        };
      });
      console.log(`    ✓ Valid multi-AND group created with ${codes.length} courses`);
      return result;
    }
  }
  
  // Pattern 3: Adjacent courses with implied AND (for post-processing)
  // This handles cases where courses appear on consecutive lines and should be grouped
  const courseCodeMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)\s+(.+)$/);
  if (courseCodeMatch && currentIndex + 1 < lines.length) {
    const nextLine = lines[currentIndex + 1].trim();
    const nextCourseMatch = nextLine.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)\s+(.+)$/);
    
    // Check if both courses have similar titles (indicating they should be grouped)
    if (nextCourseMatch) {
      const [, code1, title1] = courseCodeMatch;
      const [, code2, title2] = nextCourseMatch;
      
      // Simple heuristic: if titles are very similar or one is a subset of the other
      const similarity = calculateTitleSimilarity(title1, title2);
      if (similarity > 0.7) {
        console.log(`    ✓ Adjacent courses with similar titles detected: ${similarity.toFixed(2)} similarity`);
        result.isANDPattern = true;
        result.courses = [
          { code: code1.trim(), title: title1.trim(), courseType: 'regular' as const, footnoteRefs: [] },
          { code: code2.trim(), title: title2.trim(), courseType: 'regular' as const, footnoteRefs: [] }
        ];
        result.nextIndex = currentIndex + 2; // Skip the next line since we consumed it
        return result;
      }
    }
  }
  
  console.log(`    ✗ No AND pattern detected`);
  return result;
}

// Helper function to calculate title similarity
function calculateTitleSimilarity(title1: string, title2: string): number {
  const clean1 = title1.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const clean2 = title2.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  
  if (clean1 === clean2) return 1.0;
  if (clean1.includes(clean2) || clean2.includes(clean1)) return 0.8;
  
  // Simple word overlap calculation
  const words1 = clean1.split(/\s+/);
  const words2 = clean2.split(/\s+/);
  const commonWords = words1.filter(word => words2.includes(word));
  
  return commonWords.length / Math.max(words1.length, words2.length);
}

// ENHANCED: Helper function to detect credit-bearing lines that end selection groups
function isCreditBearingLine(line: string): boolean {
  const trimmed = line.trim();
  
  // Pattern 1: "Free Electives 1    10" - flexible requirement with footnote and credits
  if (trimmed.match(/^[A-Za-z\s]+\s+\d+\s+\d+$/)) {
    console.log(`    📊 Credit pattern 1 detected: "${trimmed}"`);
    return true;
  }
  
  // Pattern 2: "Total Credit Hours    122" - total credits line
  if (trimmed.match(/^Total\s+Credit\s+Hours?\s+\d+$/i)) {
    console.log(`    📊 Credit pattern 2 detected: "${trimmed}"`);
    return true;
  }
  
  // Pattern 3: Lines that end with standalone numbers (credits) and aren't course codes
  if (trimmed.match(/\s+\d{1,3}$/) && !trimmed.match(/^[A-Z]{2,4}\s+\d{4}/)) {
    // Additional check: make sure it's not just a course title with a year
    if (!trimmed.includes('since') && !trimmed.includes('1877')) {
      console.log(`    📊 Credit pattern 3 detected: "${trimmed}"`);
      return true;
    }
  }
  
  // Pattern 4: Flexible requirements that aren't course codes
  if (isFlexibleRequirement(trimmed) && trimmed.match(/\d+$/)) {
    console.log(`    📊 Credit pattern 4 (flexible) detected: "${trimmed}"`);
    return true;
  }
  
  return false;
}

// ENHANCED FUNCTION: Create OR logic group with validation and metadata
function createORGroup(courses: Course[], customTitle?: string): Course {
  // Validation: Ensure we have at least 2 courses
  if (courses.length < 2) {
    console.log(`⚠️ OR group must have at least 2 courses, got ${courses.length}`);
    throw new Error(`OR group must have at least 2 courses, got ${courses.length}`);
  }
  
  // Validation: Ensure all courses are valid
  const invalidCourses = courses.filter(course => 
    !course.code || course.code.trim() === '' || course.code === 'undefined'
  );
  if (invalidCourses.length > 0) {
    console.log(`⚠️ OR group contains courses with invalid codes:`, invalidCourses);
    throw new Error(`OR group contains ${invalidCourses.length} courses with invalid codes`);
  }
  
  // Generate descriptive title based on courses
  let groupTitle = customTitle || 'OR Group';
  if (!customTitle) {
    const courseNames = courses.map(c => c.code || 'Unknown').slice(0, 3); // Limit to first 3 for readability
    if (courseNames.length === 2) {
      groupTitle = `${courseNames[0]} OR ${courseNames[1]}`;
    } else {
      groupTitle = `${courseNames.join(' OR ')}${courses.length > 3 ? '...' : ''}`;
    }
  }
  
  // Collect all footnote references from member courses
  const allFootnoteRefs = [...new Set(courses.flatMap(course => course.footnoteRefs || []))];
  
  console.log(`    ✅ Creating OR group: "${groupTitle}" with ${courses.length} options`);
  console.log(`    📝 Member courses: ${courses.map(c => c.code || 'Unknown').join(', ')}`);
  if (allFootnoteRefs.length > 0) {
    console.log(`    📚 Consolidated footnotes: [${allFootnoteRefs.join(', ')}]`);
  }
  
  return {
    code: 'OR_GROUP',
    title: groupTitle,
    courseType: 'or_group',
    groupId: `or_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    groupCourses: courses.map(course => ({
      ...course,
      // Ensure each option is marked appropriately within the group
      courseType: course.courseType === 'and_group' ? 'and_group' : 'regular' as const
    })),
    footnoteRefs: allFootnoteRefs
  };
}

// ENHANCED FUNCTION: Create AND logic group with validation and metadata
function createANDGroup(courses: Course[], customTitle?: string): Course {
  // Validation: Ensure we have exactly 2 or more courses
  if (courses.length < 2) {
    console.log(`⚠️ AND group must have at least 2 courses, got ${courses.length}`);
    throw new Error(`AND group must have at least 2 courses, got ${courses.length}`);
  }
  
  // Validation: Ensure all courses have valid codes
  const invalidCourses = courses.filter(course => !course.code || course.code.trim() === '');
  if (invalidCourses.length > 0) {
    console.log(`⚠️ AND group contains courses with invalid codes:`, invalidCourses);
    throw new Error(`AND group contains ${invalidCourses.length} courses with invalid codes`);
  }
  
  // Generate descriptive title based on courses
  let groupTitle = customTitle || 'AND Group';
  if (!customTitle && courses.length === 2) {
    groupTitle = `${courses[0].code} & ${courses[1].code}`;
  } else if (!customTitle && courses.length > 2) {
    groupTitle = `${courses.map(c => c.code).join(' & ')}`;
  }
  
  // Collect all footnote references from member courses
  const allFootnoteRefs = [...new Set(courses.flatMap(course => course.footnoteRefs || []))];
  
  console.log(`    ✅ Creating AND group: "${groupTitle}" with ${courses.length} courses`);
  console.log(`    📝 Member courses: ${courses.map(c => c.code).join(', ')}`);
  if (allFootnoteRefs.length > 0) {
    console.log(`    📚 Consolidated footnotes: [${allFootnoteRefs.join(', ')}]`);
  }
  
  return {
    code: 'AND_GROUP',
    title: groupTitle,
    courseType: 'and_group',
    groupId: `and_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    groupCourses: courses.map(course => ({
      ...course,
      // Ensure each member course is marked as regular within the group
      courseType: 'regular' as const
    })),
    footnoteRefs: allFootnoteRefs
  };
}

// NEW FUNCTION: Parse course from text
function parseCourseFromText(text: string): Course {
  const trimmed = text.trim();
  
  // Extract course code
  const codeMatch = trimmed.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)/);
  if (!codeMatch) {
    return {
      code: '',
      title: trimmed,
      courseType: 'regular',
      footnoteRefs: []
    };
  }
  
  const code = codeMatch[1];
  const remainingText = trimmed.substring(code.length).trim();
  const { title, footnoteRefs } = parseCourseTitleAndCredits(remainingText);
  
  return {
    code,
    title,
    courseType: 'regular',
    footnoteRefs
  };
}

// NEW FUNCTION: Enhance course with type detection
function enhanceCourseWithType(course: Course, originalLine: string, isInSelectGroup: boolean): Course {
  // Set base course type
  if (!course.courseType) {
    if (course.isFlexible) {
      course.courseType = 'flexible';
    } else if (course.isSelection) {
      course.courseType = 'selection';
    } else if (originalLine.startsWith('or ') || course.isOption) {
      course.courseType = 'or_option';
    } else {
      course.courseType = 'regular';
    }
  }
  
  // Set selection context
  if (isInSelectGroup) {
    course.isSelectionOption = true;
  }
  
  // Preserve existing flags for backward compatibility
  course.isOption = course.isOption || originalLine.startsWith('or ');
  
  return course;
}

// ====================================
// POST-PROCESSING: Convert FLEXIBLE Selection Courses to Selection Groups
// ====================================

function convertFlexibleSelectionsToGroups(requirements: Requirement[], originalText: string): void {
  console.log('\n🔄 === CONVERTING FLEXIBLE SELECTIONS TO GROUPS ===');
  
  const lines = originalText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // ENHANCED APPROACH: Collect courses that might be selection options from OTHER requirements
  const potentialSelectionOptions: Course[] = [];
  const requirementsToRemove: number[] = [];
  
  console.log('\n🔍 First pass: Identifying potential selection options from other requirements');
  requirements.forEach((requirement, reqIndex) => {
    console.log(`  📁 Examining requirement: "${requirement.name}"`);
    
    // Check if this requirement might be selection options that got parsed as separate requirements
    if (requirement.courses.length === 1 && 
        requirement.courses[0].courseType === 'flexible' &&
        requirement.courses[0].title &&
        !requirement.courses[0].title.match(/^(Free Electives|Lab Science|Total Credit|Select)/i)) {
      
      const course = requirement.courses[0];
      console.log(`    🎯 Found potential selection option requirement: "${requirement.name}" with course: ${course.code} - ${course.title}`);
      
      // Convert to selection option
      const selectionOption: Course = {
        ...course,
        isSelectionOption: true,
        courseType: 'regular'
      };
      
      potentialSelectionOptions.push(selectionOption);
      requirementsToRemove.push(reqIndex);
    }
  });
  
  console.log(`\n📦 Found ${potentialSelectionOptions.length} potential selection options from other requirements`);
  potentialSelectionOptions.forEach((opt, idx) => {
    console.log(`    ${idx + 1}. ${opt.code} - ${opt.title}`);
  });
  
  requirements.forEach((requirement, reqIndex) => {
    console.log(`\n📁 Processing requirement: "${requirement.name}"`);
    
    const newCourses: Course[] = [];
    let i = 0;
    
    while (i < requirement.courses.length) {
      const course = requirement.courses[i];
      
      // Check if this is a FLEXIBLE course with a selection title (courses or hours)
      const isFlexibleSelection = course.courseType === 'flexible' && 
                                 course.title && 
                                 (course.title.match(/^Select\s+(\d+|one|two|three|four|five)\s+(?:of\s+)?(?:the\s+following|electives?|courses?|options?)/i) ||
                                  course.title.match(/Select\s+(\d+)\s+(hours?|credits?)/i));
      
      if (isFlexibleSelection) {
        console.log(`  🎯 Found FLEXIBLE selection course: "${course.title}"`);
        
        // ENHANCED: Extract the selection count or hours with triple validation
        const selectMatch = course.title!.match(/^Select\s+(one|two|three|four|five|\d+)\s+/i);
        
        // Triple validation for hour-based selections in table format
        let hourSelectMatch = null;
        const hourPatterns = [
          // Pattern 1: Full pattern
          /^Select\s+(\d+)\s+(hours?|credits?)\s+(?:from|of)\s+(?:the\s+following|electives?|courses?)/i,
          // Pattern 2: Simplified
          /Select\s+(\d+)\s+(hours?|credits?)/i,
          // Pattern 3: Very flexible
          /(\d+)\s+(hours?|credits?)/i
        ];
        
        // Try each pattern
        for (let i = 0; i < hourPatterns.length; i++) {
          const match = course.title!.match(hourPatterns[i]);
          if (match) {
            hourSelectMatch = match;
            console.log(`    🎯 Table format hour selection detected with pattern ${i + 1}: "${course.title}"`);
            break;
          }
        }
        
        let selectionValue = 1;
        let selectionType: 'courses' | 'hours' = 'courses';
        
        if (hourSelectMatch) {
          selectionValue = parseInt(hourSelectMatch[1]);
          selectionType = 'hours';
          console.log(`    ✅ Table format hour-based selection: ${selectionValue} hours`);
        } else if (selectMatch) {
          const selectionCountText = selectMatch[1].toLowerCase();
          const wordToNumber = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5 };
          selectionValue = wordToNumber[selectionCountText as keyof typeof wordToNumber] || parseInt(selectMatch[1]) || 1;
          selectionType = 'courses';
          console.log(`    ✅ Table format course-based selection: ${selectionValue} courses`);
        }
        
        console.log(`    📊 Selection ${selectionType}: ${selectionValue}`);
        
        // Create the selection group
        const selectionGroup: Course = {
          code: 'SELECT_GROUP',
          title: course.title,
          courseType: 'selection',
          groupId: `select_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          selectionCount: selectionType === 'courses' ? selectionValue : undefined,
          selectionHours: selectionType === 'hours' ? selectionValue : undefined,
          selectionType: selectionType,
          selectionOptions: [],
          footnoteRefs: course.footnoteRefs || []
        };
        
        // STRATEGY 1: Look for courses in the same requirement
        const optionCourses: Course[] = [];
        let j = i + 1;
        
        console.log(`    📋 Strategy 1: Looking for selection options in same requirement starting from course ${j + 1}:`);
        
        while (j < requirement.courses.length) {
          const potentialOption = requirement.courses[j];
          console.log(`      🔍 Checking course ${j + 1}: ${potentialOption.code} - ${potentialOption.title} (${potentialOption.courseType})`);
          
          // Stop if we hit another selection or a credit-bearing flexible requirement
          if (potentialOption.courseType === 'selection' || 
              (potentialOption.courseType === 'flexible' && 
               potentialOption.title && 
               potentialOption.title.match(/^(Free Electives|Lab Science|Total Credit)/i))) {
            console.log(`        ⏹️ Stopping at credit-bearing/other selection: ${potentialOption.title}`);
            break;
          }
          
          // Add regular courses to selection options
          if (potentialOption.courseType === 'regular' || potentialOption.courseType === 'flexible') {
            const selectionOption: Course = {
              ...potentialOption,
              isSelectionOption: true
            };
            optionCourses.push(selectionOption);
            console.log(`        ➕ Added option: ${selectionOption.code} - ${selectionOption.title}`);
          }
          
          j++;
        }
        
        // STRATEGY 2: Use potential selection options from other requirements
        if (optionCourses.length === 0 && potentialSelectionOptions.length > 0) {
          console.log(`    📋 Strategy 2: Using ${potentialSelectionOptions.length} options from other requirements`);
          selectionGroup.selectionOptions = [...potentialSelectionOptions];
          console.log(`    ✅ Created selection group with ${potentialSelectionOptions.length} options from other requirements`);
          newCourses.push(selectionGroup);
          i++;
        } else if (optionCourses.length > 0) {
          selectionGroup.selectionOptions = optionCourses;
          console.log(`    ✅ Created selection group with ${optionCourses.length} options from same requirement`);
          newCourses.push(selectionGroup);
          i = j; // Skip all the courses we just converted to options
        } else {
          console.log(`    📋 Strategy 3: Attempting to extract from original text...`);
          
          // STRATEGY 3: Try to find options in the original text
          const textOptions = findSelectionOptionsInText(lines, course.title!);
          if (textOptions.length > 0) {
            selectionGroup.selectionOptions = textOptions;
            console.log(`    ✅ Created selection group with ${textOptions.length} options from original text`);
            newCourses.push(selectionGroup);
          } else {
            console.log(`    ❌ No options found anywhere, keeping as flexible course`);
            newCourses.push(course);
          }
          i++;
        }
      } else {
        // Regular course, just add it
        newCourses.push(course);
        i++;
      }
    }
    
    // Update the requirement with the new courses
    requirement.courses = newCourses;
    console.log(`  ✅ Requirement "${requirement.name}" processed: ${newCourses.length} items`);
  });
  
  // Remove the requirements that were converted to selection options
  console.log(`\n🗑️ Removing ${requirementsToRemove.length} requirements that became selection options`);
  requirementsToRemove.reverse().forEach(indexToRemove => {
    const removedReq = requirements[indexToRemove];
    console.log(`  ❌ Removing requirement: "${removedReq.name}"`);
    requirements.splice(indexToRemove, 1);
  });
  
  console.log('\n✅ FLEXIBLE selection conversion completed');
}

// ====================================
// POST-PROCESSING: Fix Missing OR Groups After AND Groups
// ====================================

function fixMissingORGroupsForANDPatterns(requirements: Requirement[], originalText: string): void {
  console.log('\n🔧 === FIXING MISSING OR GROUPS WITH DEDUPLICATION ===');
  
  const lines = originalText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  requirements.forEach((requirement, reqIndex) => {
    console.log(`\n📁 Processing requirement: "${requirement.name}"`);
    
    // Step 1: Remove any orphaned OR groups with generic titles first
    requirement.courses = requirement.courses.filter(course => {
      if (course.courseType === 'or_group' && 
          (course.title === 'OR Group' || !course.title || course.title.trim() === '')) {
        console.log(`    🗑️ Removing orphaned OR group: "${course.title}"`);
        return false;
      }
      return true;
    });
    
    // Step 2: Build a comprehensive map of existing OR groups
    const existingORGroups = new Map<string, Course>();
    requirement.courses.forEach(course => {
      if (course.courseType === 'or_group' && course.groupCourses) {
        const sortedCodes = course.groupCourses.map(c => c.code).sort().join('|');
        existingORGroups.set(sortedCodes, course);
        console.log(`    📋 Existing OR group: ${sortedCodes}`);
      }
    });
    
    // Step 3: Process courses that might need OR companions
    const processedCourses = new Set<string>();
    
    requirement.courses.forEach((course, courseIndex) => {
      if (course.courseType === 'regular' && 
          course.code && 
          course.code.match(/^[A-Z]{2,4}\s+\d{4}/) && 
          !processedCourses.has(course.code)) {
        
        console.log(`  🔍 Checking regular course for OR pattern: "${course.code} - ${course.title}"`);
        
        // Find this course in original text and collect OR options
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(course.code)) {
            console.log(`    📍 Found course at line ${i}: "${lines[i]}"`);
            
            const orOptions: Course[] = [];
            let checkIndex = i + 1;
            
            // Collect all consecutive OR options
            while (checkIndex < lines.length) {
              const line = lines[checkIndex].trim();
              
              if (line.toLowerCase().startsWith('or ')) {
                console.log(`      🎯 Found OR pattern: "${line}"`);
                
                const orOptionText = line.replace(/^or\s+/i, '');
                const orCourseMatch = orOptionText.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)\s*(.*)$/);
                
                if (orCourseMatch) {
                  const orCourse: Course = {
                    code: orCourseMatch[1],
                    title: orCourseMatch[2] || orCourseMatch[1],
                    courseType: 'regular',
                    footnoteRefs: []
                  };
                  
                  orOptions.push(orCourse);
                  processedCourses.add(orCourse.code);
                  console.log(`      ✅ Added OR option: ${orCourse.code} - ${orCourse.title}`);
                  checkIndex++;
                  continue;
                }
              } else if (line.match(/^[A-Z]{2,4}\s+\d{4}/) || 
                        line.match(/^[A-Z][a-z]+\s+(Requirements?|Concentration)/i) ||
                        line.match(/^\*\*/) ||
                        line.match(/^[A-Za-z\s]+\s+\d+\s+\d+$/)) {
                console.log(`      ⏹️ Stopping OR search at: "${line}"`);
                break;
              }
              
              checkIndex++;
            }
            
            // If we found OR options, check if this group already exists
            if (orOptions.length > 0) {
              const allCourses = [course, ...orOptions];
              const sortedCodes = allCourses.map(c => c.code).sort().join('|');
              
              if (!existingORGroups.has(sortedCodes)) {
                const orGroup: Course = {
                  code: 'OR_GROUP',
                  title: `${course.code} or ${orOptions.map(opt => opt.code).join(' or ')}`,
                  courseType: 'or_group',
                  groupId: `or_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  groupCourses: allCourses,
                  footnoteRefs: []
                };
                
                console.log(`      🔄 Created new OR group: "${orGroup.title}"`);
                
                // Replace the regular course with the OR group
                requirement.courses[courseIndex] = orGroup;
                existingORGroups.set(sortedCodes, orGroup);
                
                // Mark all courses as processed
                allCourses.forEach(c => processedCourses.add(c.code));
                
                // Remove any duplicate individual courses
                const courseCodesToRemove = orOptions.map(opt => opt.code);
                requirement.courses = requirement.courses.filter((otherCourse, otherIndex) => 
                  otherIndex === courseIndex || // Keep the new OR group
                  !courseCodesToRemove.includes(otherCourse.code) // Remove individual OR options
                );
              } else {
                console.log(`      ⏭️ OR group already exists for: ${sortedCodes}`);
                processedCourses.add(course.code);
              }
            } else {
              processedCourses.add(course.code);
            }
            
            break; // Found the course, move to next
          }
        }
      }
      
      // Handle MATH AND groups that might need OR companions
      else if (course.courseType === 'and_group' && 
               course.title && 
               course.title.includes('&') &&
               course.title.includes('MATH')) {
        console.log(`  🔗 Found MATH AND group that needs OR check: "${course.title}"`);
        
        const firstCourse = course.groupCourses?.[0];
        const secondCourse = course.groupCourses?.[1];
        
        if (firstCourse && secondCourse) {
          console.log(`    🔍 Looking for OR after: ${firstCourse.code} & ${secondCourse.code}`);
          
          // Find the AND pattern in original text
          let foundAndLine = -1;
          for (let i = 0; i < lines.length - 1; i++) {
            if (lines[i].includes(firstCourse.code) && lines[i + 1].startsWith('&') && lines[i + 1].includes(secondCourse.code)) {
              foundAndLine = i;
              console.log(`    📍 Found AND pattern at lines ${i}-${i + 1}`);
              break;
            }
          }
          
          if (foundAndLine !== -1) {
            let checkIndex = foundAndLine + 2;
            
            while (checkIndex < lines.length) {
              const line = lines[checkIndex].trim();
              console.log(`      🔍 Checking line ${checkIndex}: "${line}"`);
              
              if (line.toLowerCase().startsWith('or ')) {
                console.log(`      🎯 Found OR pattern: "${line}"`);
                
                const orOptionText = line.replace(/^or\s+/i, '');
                const orCourseMatch = orOptionText.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)\s*(.*)$/);
                
                if (orCourseMatch) {
                  const orCourse: Course = {
                    code: orCourseMatch[1],
                    title: orCourseMatch[2] || orCourseMatch[1],
                    courseType: 'regular',
                    footnoteRefs: []
                  };
                  
                  console.log(`      ✅ Parsed OR option: ${orCourse.code} - ${orCourse.title}`);
                  
                  // Check if this MATH OR group already exists
                  const mathGroupCodes = [course.title, orCourse.code].sort().join('|');
                  
                  if (!existingORGroups.has(mathGroupCodes)) {
                    const orGroup: Course = {
                      code: 'OR_GROUP',
                      title: `${course.title} OR ${orCourse.code}`,
                      courseType: 'or_group',
                      groupId: `or_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                      groupCourses: [course, orCourse],
                      footnoteRefs: []
                    };
                    
                    console.log(`      🔄 Created MATH OR group: "${orGroup.title}"`);
                    requirement.courses[courseIndex] = orGroup;
                    existingORGroups.set(mathGroupCodes, orGroup);
                  } else {
                    console.log(`      ⏭️ MATH OR group already exists`);
                  }
                  
                  return;
                }
              } else if (line.match(/^[A-Z]{2,4}\s+\d{4}/) || 
                        line.match(/^[A-Z][a-z]+\s+(Requirements?|Concentration)/i) ||
                        line.match(/^[A-Za-z\s]+\s+\d+\s+\d+$/)) {
                console.log(`      ⏹️ Stopping search at: "${line}"`);
                break;
              }
              
              checkIndex++;
            }
          }
        }
      }
    });
  });
  
  console.log('\n✅ OR groups fix with deduplication completed');
}

// Helper function to find selection options in original text
function findSelectionOptionsInText(lines: string[], selectionTitle: string): Course[] {
  console.log(`    🔍 Searching original text for options matching: "${selectionTitle}"`);
  console.log(`    📋 Available lines in original text (showing first 30):`);
  for (let debugIdx = 0; debugIdx < Math.min(30, lines.length); debugIdx++) {
    console.log(`      ${debugIdx}: "${lines[debugIdx]}"`);
  }
  
  const options: Course[] = [];
  let foundSelectionLine = false;
  let i = 0;
  
  // Find the selection line in the original text
  while (i < lines.length) {
    const line = lines[i].toLowerCase();
    
    // More flexible matching - look for "select" followed by a number or word, then "of"
    if (line.includes('select') && 
        (line.includes('of the following') || line.includes('of following') || line.includes('electives'))) {
      foundSelectionLine = true;
      i++; // Move to the next line after selection
      console.log(`      📍 Found selection line at ${i - 1}: "${lines[i - 1]}", starting option search at line ${i}`);
      break;
    }
    i++;
  }
  
  if (!foundSelectionLine) {
    console.log(`      ❌ Could not find selection line in original text`);
    return options;
  }
  
  // Collect options until we hit a credit-bearing line or category
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (!line) {
      i++;
      continue;
    }
    
    // Stop at credit-bearing lines or new categories
    if (line.match(/^[A-Za-z\s]+\s+\d+\s+\d+$/) || // Credit bearing like "Free Electives 1    10"
        line.match(/^[A-Z][a-z]+\s+(Requirements?|Concentration)/i) || // New category
        line.match(/^Total\s+Credit\s+Hours?\s+\d+$/i)) { // Total credits
      console.log(`      ⏹️ Stopping option search at credit/category line: "${line}"`);
      break;
    }
    
    // Try to parse multi-line course patterns
    const courseCodeMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)$/);
    if (courseCodeMatch && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      
      // Check if next line is a title (not another course code or credit line)
      if (!nextLine.match(/^[A-Z]{2,4}\s+\d{4}/) && 
          !nextLine.match(/^[A-Za-z\s]+\s+\d+\s+\d+$/) &&
          nextLine.length > 0) {
        
        const option: Course = {
          code: courseCodeMatch[1],
          title: nextLine,
          courseType: 'regular',
          footnoteRefs: [],
          isSelectionOption: true
        };
        
        options.push(option);
        console.log(`      ➕ Found multi-line option: ${option.code} - ${option.title}`);
        i += 2; // Skip both lines
        continue;
      }
    }
    
    // Try to parse single-line course
    const singleCourseMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)\s+(.+)$/);
    if (singleCourseMatch) {
      const [, code, title] = singleCourseMatch;
      const option: Course = {
        code,
        title,
        courseType: 'regular',
        footnoteRefs: [],
        isSelectionOption: true
      };
      
      options.push(option);
      console.log(`      ➕ Found single-line option: ${option.code} - ${option.title}`);
    }
    
    i++;
  }
  
  console.log(`    📦 Found ${options.length} options in original text`);
  return options;
}

// NEW FUNCTION: Enhance requirements with logic groups post-processing
function enhanceWithLogicGroups(requirements: Requirement[]): void {
  console.log('\n=== ENHANCING WITH LOGIC GROUPS ===');
  
  requirements.forEach(requirement => {
    const enhancedCourses: Course[] = [];
    let i = 0;
    
    while (i < requirement.courses.length) {
      const course = requirement.courses[i];
      const nextCourse = requirement.courses[i + 1];
      
      // Look for patterns that should be grouped
      if (course.isOption && nextCourse && nextCourse.isOption) {
        // Multiple OR options - group them
        const orGroup: Course = {
          code: 'OR_GROUP',
          title: 'OR Group',
          courseType: 'or_group',
          groupId: `or_${Date.now()}`,
          groupCourses: [],
          footnoteRefs: []
        };
        
        // Collect all consecutive OR options
        while (i < requirement.courses.length && requirement.courses[i].isOption) {
          const optionCourse = requirement.courses[i];
          optionCourse.courseType = 'regular'; // Reset type within group
          orGroup.groupCourses!.push(optionCourse);
          i++;
        }
        
        enhancedCourses.push(orGroup);
      } else {
        enhancedCourses.push(course);
        i++;
      }
    }
    
    requirement.courses = enhancedCourses;
  });
}

// ENHANCED FUNCTION: Post-processing for missed selection groups with comprehensive validation
function enhanceWithSelectionGroups(requirements: Requirement[]): void {
  console.log('\n=== ENHANCING WITH SELECTION GROUPS (POST-PROCESSING) ===');
  
  requirements.forEach((requirement, reqIndex) => {
    console.log(`\n📁 Processing requirement: "${requirement.name}"`);
    const enhancedCourses: Course[] = [];
    let i = 0;
    
    while (i < requirement.courses.length) {
      const course = requirement.courses[i];
      
      // Pattern 1: Look for "Select X of the following" patterns that weren't caught during parsing
      // Enhanced detection for both course and hour-based selections
      const hasSelectKeyword = course.title && course.title.toLowerCase().includes('select');
      const hasFollowingKeyword = course.title && (course.title.toLowerCase().includes('following') || 
                                                   course.title.toLowerCase().includes('electives') ||
                                                   course.title.toLowerCase().includes('courses'));
      const hasHourKeyword = course.title && /\b(hours?|credits?|hrs?)\b/i.test(course.title);
      
      if (hasSelectKeyword && (hasFollowingKeyword || hasHourKeyword)) {
        console.log(`  🎯 Found missed selection pattern: "${course.title}"`);
        
        // ENHANCED: Extract selection count or hours from title with triple validation
        const countMatch = course.title.match(/select\s+(\d+|one|two|three|four|five)/i);
        
        // Triple validation for hour-based selections in post-processing
        let hourMatch = null;
        const hourPatterns = [
          /select\s+(\d+)\s+(hours?|credits?)\s+(?:from|of)\s+/i,
          /select\s+(\d+)\s+(hours?|credits?)/i,
          /(\d+)\s+(hours?|credits?)/i
        ];
        
        for (let i = 0; i < hourPatterns.length; i++) {
          const match = course.title.match(hourPatterns[i]);
          if (match) {
            hourMatch = match;
            console.log(`    🎯 Post-process hour selection detected with pattern ${i + 1}: "${course.title}"`);
            break;
          }
        }
        
        let selectionValue = 1;
        let selectionType: 'courses' | 'hours' = 'courses';
        
        if (hourMatch) {
          selectionValue = parseInt(hourMatch[1]);
          selectionType = 'hours';
          console.log(`    ✅ Post-process hour-based selection: ${selectionValue} hours`);
        } else if (countMatch) {
          const countText = countMatch[1].toLowerCase();
          const wordToNumber = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5 };
          selectionValue = wordToNumber[countText as keyof typeof wordToNumber] || parseInt(countMatch[1]) || 1;
          selectionType = 'courses';
          console.log(`    ✅ Post-process course-based selection: ${selectionValue} courses`);
        }
        
        // Convert to selection group
        const selectionGroup: Course = {
          code: 'SELECT_GROUP',
          title: course.title,
          courseType: 'selection',
          groupId: `select_post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          selectionCount: selectionType === 'courses' ? selectionValue : undefined,
          selectionHours: selectionType === 'hours' ? selectionValue : undefined,
          selectionType: selectionType,
          selectionOptions: [],
          footnoteRefs: course.footnoteRefs || []
        };
        
        // Look for following courses that should be options
        let j = i + 1;
        let collectedOptions = 0;
        while (j < requirement.courses.length && collectedOptions < 20) { // Safety limit
          const candidateOption = requirement.courses[j];
          
          // Stop if we hit another major course or category-like item
          if (candidateOption.courseType === 'selection' || 
              candidateOption.title?.toLowerCase().includes('requirements') ||
              candidateOption.title?.toLowerCase().includes('total')) {
            break;
          }
          
          // Include if it's marked as an option or is a regular course
          if (candidateOption.isOption || 
              candidateOption.courseType === 'or_option' ||
              candidateOption.courseType === 'regular' ||
              candidateOption.courseType === 'flexible' ||
              candidateOption.courseType === 'and_group' ||
              candidateOption.courseType === 'or_group') {
            
            candidateOption.isSelectionOption = true;
            selectionGroup.selectionOptions!.push(candidateOption);
            collectedOptions++;
            console.log(`    ➕ Added post-process option ${collectedOptions}: ${candidateOption.code}`);
          } else {
            break; // Stop at first non-option course
          }
          
          j++;
        }
        
        // Only create selection group if we found options
        if (selectionGroup.selectionOptions!.length > 0) {
          console.log(`  ✅ Created post-process selection group with ${selectionGroup.selectionOptions!.length} options`);
          enhancedCourses.push(selectionGroup);
          i = j; // Skip all the options we consumed
        } else {
          console.log(`  ⚠️ No options found for selection group, keeping as regular course`);
          enhancedCourses.push(course);
          i++;
        }
      } 
      // Pattern 2: Look for implicit selection groups (consecutive OR options)
      else if (course.isOption && requirement.courses[i + 1]?.isOption) {
        console.log(`  🔍 Found consecutive OR options, checking for implicit selection...`);
        
        const orOptions: Course[] = [];
        let k = i;
        
        // Collect all consecutive OR options
        while (k < requirement.courses.length && requirement.courses[k].isOption) {
          orOptions.push(requirement.courses[k]);
          k++;
        }
        
        // If we have 3+ options, consider making it a selection group
        if (orOptions.length >= 3) {
          console.log(`  🎯 Creating implicit selection group from ${orOptions.length} OR options`);
          
          const implicitSelectionGroup: Course = {
            code: 'SELECT_GROUP',
            title: `Select 1 of the following`,
            courseType: 'selection',
            groupId: `select_implicit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            selectionCount: 1,
            selectionOptions: orOptions.map(option => ({ ...option, isSelectionOption: true })),
            footnoteRefs: [...new Set(orOptions.flatMap(o => o.footnoteRefs || []))]
          };
          
          enhancedCourses.push(implicitSelectionGroup);
          i = k; // Skip all the options we consumed
        } else {
          // Keep as regular OR group
          const orGroup = createORGroup(orOptions, 'OR Group');
          enhancedCourses.push(orGroup);
          i = k;
        }
      } else {
        enhancedCourses.push(course);
        i++;
      }
    }
    
    requirement.courses = enhancedCourses;
    console.log(`  ✅ Requirement "${requirement.name}" processed: ${enhancedCourses.length} items`);
  });
  
  console.log('\n✅ Selection group enhancement completed');
}

interface CourseResult {
  course: Course | null;
  nextIndex: number;
}

// Table format parsing functions
function parseTableFormatCourse(line: string, lines: string[], currentIndex: number): CourseResult {
  // Pattern 1: Course code on its own line, title on next line
  const courseCodeMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)$/);
  if (courseCodeMatch && currentIndex + 1 < lines.length) {
    const courseCode = courseCodeMatch[1];
    const nextLine = lines[currentIndex + 1].trim();
    
    // Check if next line has title
    const { title, footnoteRefs } = parseTableTitleAndCredits(nextLine);
    
    if (title) {
      return {
        course: {
          code: courseCode,
          title: title,
          courseType: 'regular',
          isOption: false,
          footnoteRefs: footnoteRefs
        },
        nextIndex: currentIndex + 2
      };
    }
  }
  
  // Pattern 2: Course code and title on same line
  const fullCourseMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)\s+(.+?)$/);
  if (fullCourseMatch) {
    const [, courseCode, titlePart] = fullCourseMatch;
    const { title, footnoteRefs } = parseTableTitleAndCredits(titlePart);
    
    return {
      course: {
        code: courseCode,
        title: title,
        courseType: 'regular',
        isOption: false,
        footnoteRefs: footnoteRefs
      },
      nextIndex: currentIndex + 1
    };
  }
  
  // Pattern 3: OR option courses
  const orCourseMatch = line.match(/^or\s+([A-Z]{2,4}\s+\d{4}[A-Z]?)\s+(.+)$/);
  if (orCourseMatch) {
    const [, courseCode, titlePart] = orCourseMatch;
    const { title, footnoteRefs } = parseTableTitleAndCredits(titlePart);
    
    return {
      course: {
        code: courseCode,
        title: title,
        courseType: 'or_option',
        isOption: true,
        footnoteRefs: footnoteRefs
      },
      nextIndex: currentIndex + 1
    };
  }
  
  return { course: null, nextIndex: currentIndex + 1 };
}

interface ParsedTitle {
  title: string;
  footnoteRefs: number[];
}

function parseTableTitleAndCredits(titlePart: string): ParsedTitle {
  let title = titlePart.trim();
  let footnoteRefs: number[] = [];
  
  console.log(`  Parsing table title: "${titlePart}"`);
  
  // Handle year in title (like "since 1877")
  if (title.includes('1877') || title.includes('since')) {
    console.log(`    Year detected in title, preserving: "${title}"`);
  }
  
  // Look for footnote references in the title
  const footnoteMatch = title.match(/^(.+?)\s+(\d+(?:,\s*\d+)*)$/);
  if (footnoteMatch) {
    const [, titleWithoutFootnotes, footnoteStr] = footnoteMatch;
    const footnoteNums = footnoteStr.split(',').map(n => parseInt(n.trim()));
    
    // Only treat as footnotes if they're single digits (1-9)
    if (footnoteNums.every(num => num >= 1 && num <= 9)) {
      footnoteRefs = footnoteNums;
      title = titleWithoutFootnotes;
      console.log(`    Found footnotes: title="${title}", footnotes=[${footnoteRefs}]`);
    }
  }
  
  return { title: title.trim(), footnoteRefs };
}

// Keep all existing functions...
export function parseStandardCourse(line: string): Course | null {
  const isOrOption = line.startsWith('or ');
  const cleanLine = line.replace(/^or\s+/, '');
  
  console.log(`Parsing standard course: "${line}" (OR option: ${isOrOption})`);
  console.log(`Clean line: "${cleanLine}"`);
  
  // CHECK FOR AND PATTERN FIRST - More flexible regex
  const andPatternMatch = cleanLine.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)\s*&\s*([A-Z]{2,4}\s+\d{4}[A-Z]?)\s*(.*)$/);
  if (andPatternMatch) {
    const [, code1, code2, titlePart] = andPatternMatch;
    
    // Clean up the title part (remove tabs, extra spaces, trailing numbers)
    const title = titlePart
      .replace(/\t/g, ' ')           // Replace tabs with spaces
      .replace(/\s+/g, ' ')          // Collapse multiple spaces
      .replace(/\d+$/, '')           // Remove trailing numbers (credits)
      .trim();
    
    console.log(`  ✓ AND pattern detected: "${code1}" & "${code2}" - Title: "${title}"`);
    
    // Return as AND group immediately
    return {
      code: 'AND_GROUP',
      title: title,
      courseType: 'and_group',
      groupId: `and_${Date.now()}`,
      groupCourses: [
        {
          code: code1.trim(),
          title: title,
          courseType: 'regular',
          footnoteRefs: []
        },
        {
          code: code2.trim(), 
          title: title,
          courseType: 'regular',
          footnoteRefs: []
        }
      ],
      footnoteRefs: []
    };
  }
  
  // Enhanced pattern to handle footnotes properly (existing logic)
  const courseMatch = cleanLine.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)\s+(.+)$/);
  if (courseMatch) {
    const [, code, titlePart] = courseMatch;
    
    // Skip if this looks like it should have been an AND pattern
    if (titlePart.includes('&')) {
      console.log(`  ✗ Skipping - contains & but didn't match AND pattern: "${titlePart}"`);
      return null;
    }
    
    const { title, footnoteRefs } = parseCourseTitleAndCredits(titlePart);
    
    console.log(`  Parsed: ${code} - ${title} footnotes:[${footnoteRefs}]`);
    
    return {
      code: code,
      title: title,
      courseType: isOrOption ? 'or_option' : 'regular',
      isOption: isOrOption,
      footnoteRefs: footnoteRefs
    };
  }
  
  return null;
}

export function parseComplexCourse(line: string): Course | null {
  // CHECK FOR AND PATTERN FIRST - FIXED REGEX (no space required)
  const andPatternMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)\s*&\s*([A-Z]{2,4}\s+\d{4}[A-Z]?)(.+)$/);
  if (andPatternMatch) {
    const [, code1, code2, titlePart] = andPatternMatch;
    const title = titlePart.trim();
    console.log(`  Complex AND pattern: ${code1} & ${code2} - ${title}`);
    
    return {
      code: 'AND_GROUP',
      title: title,
      courseType: 'and_group',
      groupId: `and_${Date.now()}`,
      groupCourses: [
        {
          code: code1.trim(),
          title: title,
          courseType: 'regular',
          footnoteRefs: []
        },
        {
          code: code2.trim(),
          title: title,
          courseType: 'regular',
          footnoteRefs: []
        }
      ],
      footnoteRefs: []
    };
  }
  
  // Handle course code with title on same line - existing logic
  const combinedMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?(?:\s*&\s*[A-Z]{2,4}\s+\d{4}[A-Z]?)*)\s+(.+)$/);
  if (combinedMatch) {
    const [, courseCode, titlePart] = combinedMatch;
    console.log(`  Complex course with title: "${courseCode}" + "${titlePart}"`);
    
    const { title, footnoteRefs } = parseCourseTitleAndCredits(titlePart);
    
    return {
      code: courseCode,
      title: title,
      courseType: 'regular',
      isOption: false,
      footnoteRefs: footnoteRefs
    };
  }
  
  return null;
}

// ENHANCED: parseCourseTitleAndCredits with comprehensive logic
export function parseCourseTitleAndCredits(titlePart: string): ParsedTitle {
  let title = titlePart.trim();
  let footnoteRefs: number[] = [];
  
  console.log(`Parsing title part: "${titlePart}"`);
  
  // Special handling for "or MATH" patterns
  if (title.toLowerCase().startsWith('or ') && title.includes('MATH')) {
    console.log(`  OR MATH pattern detected, keeping full title: "${title}"`);
    return { title: title.trim(), footnoteRefs: [] };
  }
  
  // Handle year patterns like "since 1877"
  const yearInTitleMatch = title.match(/^(.+?)\s+(since\s+)(\d{4})$/i);
  if (yearInTitleMatch) {
    title = `${yearInTitleMatch[1]} ${yearInTitleMatch[2]}${yearInTitleMatch[3]}`;
    console.log(`Found year in title, keeping as: "${title}"`);
    return { title: title.trim(), footnoteRefs: [] };
  }
  
  // Skip tab-separated numbers (these are credits, not footnotes)
  if (title.includes('\t')) {
    console.log(`  Tab-separated numbers detected - treating as credits, ignoring`);
    return { title: title.trim(), footnoteRefs: [] };
  }
  
  // Look for potential footnote references with improved pattern
  const footnoteMatch = title.match(/^(.+?)\s+(\d+(?:,\s*\d+)*)\s*$/);
  if (footnoteMatch) {
    const [, titleWithoutNumbers, numberStr] = footnoteMatch;
    const numbers = numberStr.split(',').map(n => parseInt(n.trim()));
    
    console.log(`  Found trailing numbers: "${numberStr}" -> [${numbers}]`);
    
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
          console.log(`  Extracted footnote: title="${title}", footnote=[${firstNum}], credit ignored: ${secondNum}`);
        } else {
          console.log(`  First number ${firstNum} too large - treating both as credits, ignoring`);
        }
      }
    } else {
      // Regular footnote pattern - all numbers should be single digits (1-9)
      if (numbers.every(num => num >= 1 && num <= 9)) {
        footnoteRefs = numbers;
        title = titleWithoutNumbers.trim();
        console.log(`  Valid footnotes: title="${title}", footnotes=[${footnoteRefs}]`);
      } else {
        console.log(`  Numbers too large [${numbers}] - treating as credits, ignoring`);
      }
    }
  }
  
  return { title: title.trim(), footnoteRefs };
}

// ENHANCED: Category header detection with comprehensive patterns
export function isCategoryHeader(line: string): boolean {
  const clean = line.replace(/\*+/g, '').trim();
  
  console.log(`    Checking if category header: "${clean}"`);
  
  // Skip navigation headers
  if (isNavigationHeader(line)) {
    console.log(`      ✗ Navigation header`);
    return false;
  }
  
  // Skip course codes
  if (/^[A-Z]{2,4}\s+\d{4}/.test(clean)) {
    console.log(`      ✗ Course code`);
    return false;
  }
  
  // Skip numbers
  if (/^\d+$/.test(clean)) {
    console.log(`      ✗ Number`);
    return false;
  }
  
  // Skip "or" and "select" lines
  if (clean.toLowerCase().startsWith('or ') || 
      clean.toLowerCase().startsWith('select ')) {
    console.log(`      ✗ Or/Select line`);
    return false;
  }
  
  // ENHANCED: Major Requirements patterns
  const majorRequirementPatterns = [
    /^Major Requirements?$/i,
    /^Required Courses$/i,
    /^CS Electives$/i,
    /^[A-Z]+ Electives$/i,
    /^[A-Z]+ Major Requirements?$/i,
    /^Concentration electives$/i,
    /^CE Technical Electives$/i,
    /^CE Breadth Electives$/i
  ];
  
  for (const pattern of majorRequirementPatterns) {
    if (pattern.test(clean)) {
      console.log(`      ✓ *** MAJOR/REQUIRED CATEGORY *** : ${clean}`);
      return true;
    }
  }
  
  // All other existing patterns
  const explicitCategoryPatterns = [
    /^College of Engineering Requirements?$/i,
    /^Core IMPACTS?$/i,
    /^Institutional Priority$/i,
    /^Wellness Requirement$/i,
    /^Mathematics and Quantitative Skills$/i,
    /^Political Science and U\.?S\.? History$/i,
    /^Arts, Humanities,? and Ethics$/i,
    /^Communicating in Writing$/i,
    /^Technology, Mathematics,? and Sciences$/i,
    /^Social Sciences?$/i,
    /^Field of Study$/i,
    /^.+Concentration$/i,
    /^.+Technical Electives$/i,
    /^Program of Study$/i,
    /^Structural Engineering, Mechanics, and Materials Concentration$/i
  ];
  
  for (const pattern of explicitCategoryPatterns) {
    if (pattern.test(clean)) {
      console.log(`      ✓ EXPLICIT CATEGORY: ${clean}`);
      return true;
    }
  }
  
  // General validation for other category headers
  const isValidCategory = /^[A-Z][A-Za-z\s&,.-]+$/.test(clean) && 
                         clean.length > 2 && 
                         !clean.match(/\d+\s*$/);
  
  if (isValidCategory) {
    console.log(`      ✓ VALID CATEGORY: ${clean}`);
    return true;
  } else {
    console.log(`      ✗ Invalid category format: ${clean}`);
    return false;
  }
}

// ENHANCED: Flexible requirement detection for all cases
export function isFlexibleRequirement(line: string): boolean {
  const trimmed = line.trim();
  
  console.log(`    Checking if flexible requirement: "${trimmed}"`);
  
  const patterns = [
    /^Any [A-Z]+\d*$/,                       // "Any HUM6", "Any SS9"
    /^Any [A-Z]+\s+\d*$/,                    // "Any HUM 6", "Any SS 9"
    /^Any [A-Z]+\s+\d+[X]+\s*\d*$/,          // "Any HUM 37XX"
    /^Free Electives\s*\d*$/,                // "Free Electives 6"
    /^Free Electives\s+\d+$/,                // "Free Electives 69"
    /^Free Electives\s+\d+\s+\d+$/,          // "Free Electives 1    10"
    /^Approved Electives\s*\d*$/,            // "Approved Electives 6"
    /^Lab Science\s*\d*$/,                   // "Lab Science 4"
    /^Lab Science\s+\d+$/,                   // "Lab Science    4"
    /^Lab Science\s+\d+\s*$/,                // "Lab Science    4" with trailing spaces
    /^Lab Science\d+Lab Science\d+/,         // "Lab Science4Lab Science4"
    /^[A-Z]+ Options?\s*\d*$/,               // "AE Options 4", "Math Option 5"
    /^[A-Z]+ Options?\s+\d+$/,               // "AE Options 46", "Math Option 53"
    /^Math Options?\s*\d*$/,                 // "Math Option 5"
    /^Science Options?\s*\d*$/,              // "Science Option"
    /^Economics Requirement\s*\d*$/,         // "Economics Requirement 8"
    /^Ethics Requirement\s*\d*$/,            // "Ethics Requirement 1"
    /^[A-Z]+ Electives\s*\d*$/,              // "CE Electives 9", "CS Electives"
    /^CE Technical Electives\s*$/,           // "CE Technical Electives"
    /^(?:Classes in|Courses in)\s+[A-Z]/,    // "Classes in ECON 2XXX"
    /^Courses from /,                        // "Courses from School..."
    /^Courses outside /,                     // "Courses outside School..."
    /^Concentration electives?\s*$/,         // "Concentration electives"
    /^Study Abroad Experience/,              // "Study Abroad Experience..."
    /^3000-, 4000-level/,                    // "3000-, 4000-level classes..."
    /^\d+$/                                  // Just a number
  ];
  
  const isFlexible = patterns.some(pattern => pattern.test(trimmed));
  
  if (isFlexible) {
    console.log(`      ✓ FLEXIBLE REQUIREMENT: ${trimmed}`);
  } else {
    console.log(`      ✗ Not flexible requirement: ${trimmed}`);
  }
  
  return isFlexible;
}

// ENHANCED: Flexible requirement parsing with comprehensive course types
export function parseFlexibleRequirement(line: string): Course | null {
  const trimmed = line.trim();
  
  console.log(`Parsing flexible requirement: "${trimmed}"`);
  
  // Handle "Lab Science" patterns with optional footnotes and credits
  const labScienceMatch = trimmed.match(/^Lab Science\s*(\d+)?\s*(\d+)?$/i);
  if (labScienceMatch) {
    const footnoteRef = labScienceMatch[1] ? [parseInt(labScienceMatch[1])] : [];
    const creditHours = labScienceMatch[2] ? parseInt(labScienceMatch[2]) : undefined;
    console.log(`  Lab Science pattern detected, footnote: ${footnoteRef}, credits: ${creditHours}`);
    return {
      code: 'FLEXIBLE',
      title: 'Lab Science',
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: footnoteRef,
      creditHours: creditHours
    };
  }

  // Handle "Free Electives" patterns with footnotes and credits
  const freeElectivesMatch = trimmed.match(/^Free Electives\s+(\d+)\s+(\d+)$/i);
  if (freeElectivesMatch) {
    const firstNum = parseInt(freeElectivesMatch[1]);
    const secondNum = parseInt(freeElectivesMatch[2]);
    
    // Logic: If first number is small (1-20), it's likely a footnote and second is credits
    // If first number is large (>20), it's likely credits and second might be something else
    let footnoteRef: number[] = [];
    let creditHours: number | undefined = undefined;
    
    if (firstNum <= 20 && secondNum >= 3) {
      // First number is footnote, second is credits
      footnoteRef = [firstNum];
      creditHours = secondNum;
    } else if (firstNum >= 3 && firstNum <= 18) {
      // First number is credits, no footnote
      creditHours = firstNum;
    }
    
    console.log(`  Free Electives pattern detected, footnote: ${footnoteRef}, credits: ${creditHours}`);
    return {
      code: 'FLEXIBLE', 
      title: 'Free Electives',
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: footnoteRef,
      creditHours: creditHours
    };
  }

  // Handle "CS Electives" specifically for minors
  const csElectivesMatch = trimmed.match(/^CS Electives$/i);
  if (csElectivesMatch) {
    console.log(`  CS Electives pattern detected`);
    return {
      code: 'FLEXIBLE',
      title: 'CS Electives',
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    };
  }
  
  // Handle selection with description
  const selectWithDescMatch = trimmed.match(/^Select\s+(\d+)\s+(?:credit hours?\s+)?of\s+(.+?)\.\s*(\d+)$/i);
  if (selectWithDescMatch) {
    const [, , description, footnoteOrCredits] = selectWithDescMatch;
    console.log(`  Selection with description: ${description}`);
    
    return {
      code: 'SELECT',
      title: `Select of ${description}`,
      courseType: 'selection',
      isFlexible: true,
      isSelection: true,
      isOption: false,
      footnoteRefs: footnoteOrCredits ? [parseInt(footnoteOrCredits)] : []
    };
  }
  
  // Handle "Any HUM6" or "Any SS9" - department + number combined
  const anyDeptCombinedMatch = trimmed.match(/^Any\s+([A-Z]+)(\d+)$/i);
  if (anyDeptCombinedMatch) {
    const [, dept] = anyDeptCombinedMatch;
    console.log(`  Any dept combined: Any ${dept}`);
    
    return {
      code: 'FLEXIBLE',
      title: `Any ${dept}`,
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    };
  }
  
  // Handle standard "Any HUM"
  const anyDeptMatch = trimmed.match(/^Any\s+([A-Z]+)\s*(\d+)?$/i);
  if (anyDeptMatch) {
    const [, dept] = anyDeptMatch;
    console.log(`  Any dept: Any ${dept}`);
    
    return {
      code: 'FLEXIBLE',
      title: `Any ${dept}`,
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    };
  }
  
  // Handle requirement lines with footnotes and optional credits like "Economics Requirement 8 4"
  const requirementMatch = trimmed.match(/^(.+?Requirement)\s+(\d+)(?:\s+(\d+))?$/i);
  if (requirementMatch) {
    const [, reqTitle, firstNum, secondNum] = requirementMatch;
    const firstNumber = parseInt(firstNum);
    const secondNumber = secondNum ? parseInt(secondNum) : undefined;
    
    let footnoteRef: number[] = [];
    let creditHours: number | undefined = undefined;
    
    if (secondNumber) {
      // Two numbers: apply footnote/credit logic
      if (firstNumber <= 20 && secondNumber >= 3) {
        footnoteRef = [firstNumber];
        creditHours = secondNumber;
      } else if (firstNumber >= 3 && firstNumber <= 18) {
        creditHours = firstNumber;
      }
    } else {
      // Single number: likely a footnote
      if (firstNumber <= 20) {
        footnoteRef = [firstNumber];
      } else if (firstNumber >= 3 && firstNumber <= 18) {
        creditHours = firstNumber;
      }
    }
    
    console.log(`  Requirement: ${reqTitle}, footnote: ${footnoteRef}, credits: ${creditHours}`);
    
    return {
      code: 'FLEXIBLE',
      title: reqTitle,
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: footnoteRef,
      creditHours: creditHours
    };
  }
  
  // Handle electives with optional footnotes and credits
  const electivesMatch = trimmed.match(/^(.+?Electives?)\s*(\d+)?\s*(\d+)?$/i);
  if (electivesMatch) {
    const [, electiveType, firstNum, secondNum] = electivesMatch;
    const firstNumber = firstNum ? parseInt(firstNum) : undefined;
    const secondNumber = secondNum ? parseInt(secondNum) : undefined;
    
    let footnoteRefs: number[] = [];
    let creditHours: number | undefined = undefined;
    
    if (firstNumber && secondNumber) {
      // Two numbers: apply footnote/credit logic
      if (firstNumber <= 20 && secondNumber >= 3) {
        footnoteRefs = [firstNumber];
        creditHours = secondNumber;
      } else if (firstNumber >= 3 && firstNumber <= 18) {
        creditHours = firstNumber;
      }
    } else if (firstNumber) {
      // Single number: likely a footnote unless it's in credit range
      if (firstNumber <= 20) {
        footnoteRefs = [firstNumber];
      } else if (firstNumber >= 3 && firstNumber <= 18) {
        creditHours = firstNumber;
      }
    }
    
    console.log(`  Electives: ${electiveType}, footnote: ${footnoteRefs}, credits: ${creditHours}`);
    
    return {
      code: 'FLEXIBLE',
      title: electiveType,
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: footnoteRefs,
      creditHours: creditHours
    };
  }
  
  // Handle general pattern: "Title footnote credits" like "Technical Electives 8 12"
  const generalCreditMatch = trimmed.match(/^([A-Za-z\s]+)\s+(\d+)\s+(\d+)$/);
  if (generalCreditMatch) {
    const [, title, firstNum, secondNum] = generalCreditMatch;
    const firstNumber = parseInt(firstNum);
    const secondNumber = parseInt(secondNum);
    
    let footnoteRefs: number[] = [];
    let creditHours: number | undefined = undefined;
    
    // Apply footnote/credit logic
    if (firstNumber <= 20 && secondNumber >= 3) {
      footnoteRefs = [firstNumber];
      creditHours = secondNumber;
    } else if (firstNumber >= 3 && firstNumber <= 18) {
      creditHours = firstNumber;
    }
    
    console.log(`  General credit pattern: ${title}, footnote: ${footnoteRefs}, credits: ${creditHours}`);
    
    return {
      code: 'FLEXIBLE',
      title: title.trim(),
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: footnoteRefs,
      creditHours: creditHours
    };
  }

  // Handle standalone numbers
  if (/^\d+$/.test(trimmed)) {
    console.log(`  Standalone number`);
    
    return {
      code: 'FLEXIBLE',
      title: `Flexible requirement`,
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    };
  }
  
  console.log(`  No pattern matched for: "${trimmed}"`);
  return null;
}

// Helper functions
export function isNavigationHeader(line: string): boolean {
  const clean = line.replace(/\*+/g, '').trim().toLowerCase();
  const navigationHeaders = [
    'overview', 'requirements', 'designators and options', 
    'course list', 'code title', 'codetitle',
    'program of study', 'prerequisite'
  ];
  return navigationHeaders.some(header => clean === header || clean.includes(header));
}

export function isFootnoteStart(line: string): boolean {
  const clean = line.trim();
  return /^\*?\*?\d+\*?\*?$/.test(clean) || 
         clean.includes('pass-fail') ||
         clean.includes('grade of') ||
         clean.includes('better is required') ||
         clean.includes('not allowed') ||
         clean.includes('must complete') ||
         clean.includes('minimum grade');
}

export function extractFootnotes(text: string): Footnote[] {
  const footnotes: Footnote[] = [];
  const lines = text.split('\n');
  let inFootnotes = false;
  let currentFootnote: Footnote | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    const footnoteMatch = trimmed.match(/^(\d+)$/) || 
                         trimmed.match(/^\*?\*?(\d+)\*?\*?$/);
    if (footnoteMatch) {
      if (currentFootnote) {
        footnotes.push(currentFootnote);
      }
      
      currentFootnote = {
        number: parseInt(footnoteMatch[1]),
        text: ''
      };
      inFootnotes = true;
      continue;
    }
    
    if (inFootnotes && currentFootnote && trimmed && 
        !trimmed.match(/^\*+$/)) {
      currentFootnote.text += (currentFootnote.text ? ' ' : '') + trimmed;
    } else if (!inFootnotes && (
      trimmed.includes('pass-fail') ||
      trimmed.includes('grade of') ||
      trimmed.includes('not allowed') ||
      trimmed.includes('must complete') ||
      trimmed.includes('Students must')
    )) {
      inFootnotes = true;
      if (!currentFootnote) {
        currentFootnote = {
          number: footnotes.length + 1,
          text: trimmed
        };
      }
    }
  }
  
  if (currentFootnote) {
    footnotes.push(currentFootnote);
  }
  
  return footnotes;
}

export function cleanCategoryName(line: string): string {
  let cleaned = line.replace(/\*+/g, '').trim();
  
  // Remove unwanted header words that shouldn't be in requirement names
  const unwantedWords = [
    /^course\s+/i,
    /^and\s+/i, 
    /^or\s+/i,
    /^select\s+/i,
    /\s+course$/i,
    /\s+and$/i,
    /\s+or$/i,
    /\s+select$/i
  ];
  
  unwantedWords.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '').trim();
  });
  
  console.log(`  📝 Cleaned category name: "${line}" -> "${cleaned}"`);
  return cleaned;
}

export function extractCollege(programName: string): string {
  const lowerName = programName.toLowerCase();
  if (lowerName.includes('computer science') || lowerName.includes('computing')) {
    return 'College of Computing';
  }
  if (lowerName.includes('engineering')) {
    return 'College of Engineering';
  }
  if (lowerName.includes('science') || lowerName.includes('mathematics')) {
    return 'College of Sciences';
  }
  return 'College of Computing';
}

// Handle missing major requirements
function handleMissingMajorRequirements(requirements: Requirement[], text: string, hasMajorRequirementsSection: boolean): void {
  const hasMajorReqCategory = requirements.some(req => 
    req.name.toLowerCase().includes('major requirements')
  );
  
  if (!hasMajorReqCategory && hasMajorRequirementsSection) {
    console.log('\n*** CREATING MISSING MAJOR REQUIREMENTS CATEGORY ***');
    
    // Look for courses that should be in Major Requirements
    const fieldOfStudyIndex = requirements.findIndex(req => 
      req.name.toLowerCase().includes('field of study')
    );
    
    if (fieldOfStudyIndex !== -1) {
      const fieldOfStudy = requirements[fieldOfStudyIndex];
      const majorReqCourses: Course[] = [];
      const remainingCourses: Course[] = [];
      
      // Identify courses that belong in Major Requirements
      fieldOfStudy.courses.forEach(course => {
        if (shouldBeInMajorRequirements(course)) {
          majorReqCourses.push(course);
        } else {
          remainingCourses.push(course);
        }
      });
      
      if (majorReqCourses.length > 0) {
        requirements.splice(fieldOfStudyIndex + 1, 0, {
          name: 'Major Requirements',
          courses: majorReqCourses
        });
        
        fieldOfStudy.courses = remainingCourses;
        
        console.log(`✓ Created Major Requirements with ${majorReqCourses.length} courses`);
      }
    }
  }
}

// ENHANCED FUNCTION: Create flexible category with selection group support
function createFlexibleCategory(line: string): Requirement | null {
  const trimmed = line.trim();
  
  console.log(`🎯 Creating flexible category from: "${trimmed}"`);
  
  const categoryMappings: Record<string, string> = {
    'Any HUM': 'Arts, Humanities, and Ethics',
    'Any SS': 'Social Sciences', 
    'AE Options': 'AE Options',
    'Math Option': 'Math Options',
    'Free Electives': 'Free Electives',
    'Approved Electives': 'Approved Electives',
    'CS Electives': 'CS Electives',
    'Select': 'Selection Requirements' // Add support for selection-based flexible categories
  };
  
  let categoryName: string | null = null;
  let isSelectionBased = false;
  
  // Check for selection patterns first
  if (trimmed.toLowerCase().includes('select') && trimmed.toLowerCase().includes('following')) {
    categoryName = 'Selection Requirements';
    isSelectionBased = true;
    console.log(`  🎯 Detected selection-based flexible category`);
  } else {
    // Check standard mappings
    for (const [pattern, name] of Object.entries(categoryMappings)) {
      if (trimmed.includes(pattern)) {
        categoryName = name;
        break;
      }
    }
  }
  
  if (!categoryName) {
    console.log(`  ⚠️ No category mapping for: ${trimmed}`);
    return null;
  }
  
  let course: Course;
  
  if (isSelectionBased) {
    // ENHANCED: Create selection group for selection-based flexible categories with triple validation
    const countMatch = trimmed.match(/select\s+(\d+|one|two|three|four|five)/i);
    
    // Triple validation for hour-based selections in flexible requirements
    let hourMatch = null;
    const hourPatterns = [
      /select\s+(\d+)\s+(hours?|credits?)\s+(?:from|of)\s+/i,
      /select\s+(\d+)\s+(hours?|credits?)/i,
      /(\d+)\s+(hours?|credits?)/i
    ];
    
    for (let i = 0; i < hourPatterns.length; i++) {
      const match = trimmed.match(hourPatterns[i]);
      if (match) {
        hourMatch = match;
        console.log(`    🎯 Flexible requirement hour selection detected with pattern ${i + 1}: "${trimmed}"`);
        break;
      }
    }
    
    let selectionValue = 1;
    let selectionType: 'courses' | 'hours' = 'courses';
    
    if (hourMatch) {
      selectionValue = parseInt(hourMatch[1]);
      selectionType = 'hours';
      console.log(`    ✅ Flexible requirement hour-based selection: ${selectionValue} hours`);
    } else if (countMatch) {
      const countText = countMatch[1].toLowerCase();
      const wordToNumber = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5 };
      selectionValue = wordToNumber[countText as keyof typeof wordToNumber] || parseInt(countMatch[1]) || 1;
      selectionType = 'courses';
      console.log(`    ✅ Flexible requirement course-based selection: ${selectionValue} courses`);
    }
    
    course = {
      code: 'SELECT_GROUP',
      title: trimmed,
      courseType: 'selection',
      groupId: `select_flexible_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      selectionCount: selectionType === 'courses' ? selectionValue : undefined,
      selectionHours: selectionType === 'hours' ? selectionValue : undefined,
      selectionType: selectionType,
      selectionOptions: [], // Will be populated later if needed
      footnoteRefs: [],
      isFlexible: true
    };
    
    console.log(`  ✅ Created selection-based flexible category with ${selectionType}: ${selectionValue}`);
  } else {
    // Create regular flexible course
    const flexible = parseFlexibleRequirement(trimmed);
    if (!flexible) {
      console.log(`  ⚠️ Could not parse flexible requirement: ${trimmed}`);
      return null;
    }
    course = flexible;
    console.log(`  ✅ Created regular flexible category`);
  }
  
  return {
    name: categoryName,
    courses: [course]
  };
}

interface CategoryInfo {
  name: string;
  pattern: string;
  check: boolean;
}

function createMissingCategory(categoryInfo: CategoryInfo): Requirement {
  let courses: Course[] = [];
  
  if (categoryInfo.pattern === 'Any HUM') {
    courses = [{
      code: 'FLEXIBLE',
      title: 'Any HUM',
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    }];
  } else if (categoryInfo.pattern === 'Any SS') {
    courses = [{
      code: 'FLEXIBLE',
      title: 'Any SS',
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    }];
  } else if (categoryInfo.pattern === 'Free Electives') {
    courses = [{
      code: 'FLEXIBLE',
      title: 'Free Electives',
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    }];
  } else if (categoryInfo.pattern === 'CS Electives') {
    courses = [{
      code: 'FLEXIBLE',
      title: 'CS Electives',
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    }];
  } else if (categoryInfo.pattern === 'Required Courses') {
    courses = [{
      code: 'FLEXIBLE',
      title: 'Required Courses',
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    }];
  } else if (categoryInfo.pattern === 'Major Requirements') {
    courses = [{
      code: 'FLEXIBLE',
      title: 'Major Requirements',
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    }];
  }
  
  return {
    name: categoryInfo.name,
    courses: courses
  };
}

function filterEmptyCategories(requirements: Requirement[]): Requirement[] {
  return requirements.filter(req => {
    const hasActualCourses = req.courses.some(course => 
      course.code !== 'EMPTY' && 
      course.title !== '' &&
      (course.code !== 'FLEXIBLE')
    );
    
    if (!hasActualCourses) {
      console.log(`✗ Filtering out empty requirement: ${req.name}`);
      return false;
    }
    
    return true;
  });
}

function shouldBeInMajorRequirements(course: Course): boolean {
  const indicators = [
    'Economics Requirement',
    'Ethics Requirement',
    'CEE ', 'AE ', 'ME ', 'CHBE ', 'MSE ',
    'Thermodynamics', 'Dynamics', 'Design', 'Control',
    'Experimental', 'Technical Communications',
    'Vehicle Performance', 'Aerodynamics',
    'Structural Analysis', 'Vibration',
    'Propulsion', 'Laboratory', 'Capstone'
  ];
  
  return indicators.some(indicator => 
    course.title.includes(indicator) || course.code.startsWith(indicator)
  );
}

function addMissingRequiredCategories(requirements: Requirement[], text: string, degreeType: string): void {
  console.log('\n=== CHECKING FOR MISSING CATEGORIES ===');
  
  const existingCategories = requirements.map(req => req.name.toLowerCase());
  
  // Different required categories for different degree types
  let requiredCategories: CategoryInfo[] = [];
  
  if (degreeType === 'Minor') {
    requiredCategories = [
      {
        name: 'Required Courses',
        pattern: 'Required Courses',
        check: text.includes('Required Courses')
      },
      {
        name: 'CS Electives',
        pattern: 'CS Electives',
        check: text.includes('CS Electives') || text.includes('Electives')
      }
    ];
  } else {
    // Full degree programs
    requiredCategories = [
      {
        name: 'Arts, Humanities, and Ethics',
        pattern: 'Any HUM',
        check: text.includes('Any HUM')
      },
      {
        name: 'Social Sciences', 
        pattern: 'Any SS',
        check: text.includes('Any SS')
      },
      {
        name: 'Major Requirements',
        pattern: 'Major Requirements',
        check: text.includes('Major Requirements') || text.includes('Economics Requirement')
      },
      {
        name: 'Free Electives',
        pattern: 'Free Electives',
        check: text.includes('Free Electives') || text.includes('Approved Electives')
      }
    ];
  }
  
  for (const category of requiredCategories) {
    const exists = existingCategories.some(existing => 
      existing.includes(category.name.toLowerCase().split(' ')[0])
    );
    
    if (!exists && category.check) {
      console.log(`✓ Adding missing category: ${category.name}`);
      requirements.push(createMissingCategory(category));
    }
  }
}

// ENHANCED FUNCTION: Comprehensive validation of parsed program data
function validateParsedData(data: ProgramData): ValidationResult {
  console.log('\n🔍 === COMPREHENSIVE PROGRAM DATA VALIDATION ===');
  const errors: string[] = [];
  
  // Basic program info validation
  if (!data.name || data.name.trim() === '') {
    errors.push('Program name is missing or empty');
  }
  
  if (!data.degreeType || data.degreeType.trim() === '') {
    errors.push('Degree type is missing or empty');
  }
  
  if (!data.requirements || data.requirements.length === 0) {
    errors.push('No requirements found in program data');
  } else {
    console.log(`📊 Validating ${data.requirements.length} requirements...`);
  }
  
  // Validate each requirement in detail
  data.requirements?.forEach((req, index) => {
    const reqRef = `Requirement ${index + 1}`;
    console.log(`\n📋 Validating ${reqRef}: "${req.name}"`);
    
    if (!req.name || req.name.trim() === '') {
      errors.push(`${reqRef} is missing a name`);
    }
    
    if (!req.courses || req.courses.length === 0) {
      errors.push(`${reqRef} "${req.name}" has no courses`);
    } else {
      console.log(`  📚 ${req.courses.length} courses to validate`);
      
      // Validate individual courses
      req.courses.forEach((course, courseIndex) => {
        const courseRef = `${reqRef} -> Course ${courseIndex + 1}`;
        
        if (!course.code || course.code.trim() === '') {
          errors.push(`${courseRef} is missing a course code`);
        }
        
        if (!course.title || course.title.trim() === '') {
          errors.push(`${courseRef} "${course.code}" is missing a title`);
        }
        
        if (!course.courseType) {
          errors.push(`${courseRef} "${course.code}" is missing courseType`);
        } else if (!['regular', 'or_option', 'flexible', 'or_group', 'and_group', 'selection'].includes(course.courseType)) {
          errors.push(`${courseRef} "${course.code}" has invalid courseType: ${course.courseType}`);
        }
        
        // Validate footnote references
        if (course.footnoteRefs && course.footnoteRefs.some(ref => typeof ref !== 'number' || ref < 1)) {
          errors.push(`${courseRef} "${course.code}" has invalid footnote references`);
        }
      });
    }
    
    // Validate requirement footnotes
    if (req.footnotes) {
      req.footnotes.forEach((footnote, fnIndex) => {
        if (!footnote.number || footnote.number < 1) {
          errors.push(`${reqRef} footnote ${fnIndex + 1} has invalid number: ${footnote.number}`);
        }
        
        if (!footnote.text || footnote.text.trim() === '') {
          errors.push(`${reqRef} footnote ${footnote.number} has empty text`);
        }
      });
    }
  });
  
  // Validate group structures if requirements exist
  if (data.requirements && data.requirements.length > 0) {
    const groupValidation = validateGroupStructures(data.requirements);
    errors.push(...groupValidation.errors);
  }
  
  // Additional program-level validations
  if (data.totalCredits && (data.totalCredits < 0 || data.totalCredits > 200)) {
    errors.push(`Total credits value seems invalid: ${data.totalCredits}`);
  }
  
  const result = {
    isValid: errors.length === 0,
    errors: errors
  };
  
  if (result.isValid) {
    console.log('\n✅ Program data validation passed!');
  } else {
    console.log(`\n❌ Program data validation failed with ${errors.length} errors`);
  }
  
  return result;
}

export { validateParsedData };