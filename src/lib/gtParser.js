// lib/gtParser.js - COMPREHENSIVE PARSER WITH FRONTEND LOGIC SUPPORT
// Enhanced with: OR/AND groups, Logic detection, Course types, Frontend compatibility

export function parseProgram(text) {
  const lines = text.split('\n').filter(line => line.trim());
  
  // Extract program info - ENHANCED for minors
  const firstLine = lines[0] || '';
  let programName = firstLine
    .replace(/\*+/g, '')
    .replace(/Bachelor of Science in /i, '')
    .replace(/Master of Science in /i, '')
    .replace(/Minor in /i, '')
    .replace(/BS in /i, '')
    .replace(/MS in /i, '')
    .trim();
  
  // Determine degree type - ENHANCED for minors
  let degreeType = 'BS';
  if (firstLine.toLowerCase().includes('master')) degreeType = 'MS';
  if (firstLine.toLowerCase().includes('phd')) degreeType = 'PhD';
  if (firstLine.toLowerCase().includes('minor')) degreeType = 'Minor';
  
  // Find total credits
  const totalMatch = text.match(/Total Credit Hours\s*(\d+)/i);
  let totalCredits = totalMatch ? parseInt(totalMatch[1]) : 0;
  
  // Extract footnotes
  const footnotes = extractFootnotes(text);
  
  // DETECT TABLE FORMAT - This is the key fix for credit parsing
  const isTableFormat = detectTableFormat(text);
  console.log(`Table format detected: ${isTableFormat}`);
  
  // PRE-SCAN for Major Requirements section
  const hasMajorRequirementsSection = text.includes('Major Requirements');
  console.log(`Pre-scan: Major Requirements section exists: ${hasMajorRequirementsSection}`);
  
  // COMPREHENSIVE PARSING APPROACH
  const requirements = [];
  let i = 1;
  
  console.log('=== STARTING COMPREHENSIVE PARSING ===');
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Skip navigation/header sections and empty lines
    if (!line || isNavigationHeader(line) || isFootnoteStart(line)) {
      i++;
      continue;
    }
    
    console.log(`\nLine ${i}: "${line}"`);
    
    // SPECIAL CHECK: Force Major Requirements detection
    if (/^Major Requirements?$/i.test(line.replace(/\*+/g, '').trim())) {
      console.log(`  *** FORCE DETECTING MAJOR REQUIREMENTS ***`);
      const categoryResult = parseCategory(lines, i, isTableFormat, footnotes);
      if (categoryResult.category) {
        console.log(`  ✓ Adding MAJOR REQUIREMENTS: ${categoryResult.category.name} (${categoryResult.category.courses.length} courses, ${categoryResult.category.credits} credits)`);
        requirements.push(categoryResult.category);
      }
      i = categoryResult.nextIndex;
      continue;
    }
    
    // Check if this is a category header
    if (isCategoryHeader(line)) {
      console.log(`  ✓ CATEGORY HEADER DETECTED: ${line}`);
      const categoryResult = parseCategory(lines, i, isTableFormat, footnotes);
      if (categoryResult.category) {
        if (categoryResult.category.courses.length > 0) {
          console.log(`  ✓ Adding category: ${categoryResult.category.name} (${categoryResult.category.courses.length} courses, ${categoryResult.category.credits} credits)`);
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
        console.log(`  ✓ Adding flexible category: ${flexCategory.name} (${flexCategory.credits} credits)`);
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
  
  // Filter out empty categories
  const filteredRequirements = filterEmptyCategories(requirements);
  
  // Calculate total credits if not found
  if (totalCredits === 0) {
    totalCredits = filteredRequirements.reduce((sum, req) => sum + req.credits, 0);
  }
  
  console.log(`\n=== FINAL RESULT ===`);
  console.log(`Program: ${programName}`);
  console.log(`Type: ${degreeType}`);
  console.log(`Categories: ${filteredRequirements.length}`);
  console.log(`Total Credits: ${totalCredits}`);
  filteredRequirements.forEach(req => {
    console.log(`  - ${req.name}: ${req.credits} credits (${req.courses.length} items)`);
  });
  
  return {
    name: programName,
    degreeType,
    totalCredits,
    requirements: filteredRequirements,
    footnotes,
    college: extractCollege(programName)
  };
}

// NEW FUNCTION: Detect if the catalog is in table format
function detectTableFormat(text) {
  const indicators = [
    /Code\s+Title\s+Credit Hours/i,
    /Course List/i,
    /Code\s*Title\s*Credit Hours/i,
    /CodeTitleCredit Hours/i
  ];
  
  return indicators.some(pattern => pattern.test(text));
}

// ENHANCED: Parse category with logic group support and table format
export function parseCategory(lines, startIndex, isTableFormat = false, footnotes = []) {
  const categoryName = cleanCategoryName(lines[startIndex]);
  const courses = [];
  let i = startIndex + 1;
  let isInSelectGroup = false;
  let selectGroupCredits = 0;
  let selectGroupCount = 0;
  let foundAnyContent = false;
  let currentLogicContext = null; // Track current logic context (OR/AND)
  
  console.log(`\nParsing category: "${categoryName}" (Table format: ${isTableFormat})`);
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Stop at next category or footnotes
    if (!line || isCategoryHeader(line) || isFootnoteStart(line)) {
      break;
    }
    
    console.log(`  Line ${i}: "${line}"`);
    
    // Handle "Select X of the following:" patterns
    const selectMatch = line.match(/^Select\s+(one|two|three|\d+)\s+(?:credit hours?\s+)?of\s+(?:the\s+following|electives)(?:,\s+at\s+least\s+\d+\s+of\s+which\s+are\s+[\w-]+)?[.:]?\s*(\d+)?/i);
    if (selectMatch) {
      isInSelectGroup = true;
      selectGroupCount = selectMatch[1] === 'one' ? 1 : 
                       selectMatch[1] === 'two' ? 2 : 
                       selectMatch[1] === 'three' ? 3 : 
                       parseInt(selectMatch[1]);
      selectGroupCredits = selectMatch[2] ? parseInt(selectMatch[2]) : 0;
      
      // Extract credits from the line if embedded
      const creditMatch = line.match(/(\d+)\s*$/);
      if (creditMatch && !selectGroupCredits) {
        selectGroupCredits = parseInt(creditMatch[1]);
      }
      
      foundAnyContent = true;
      
      courses.push({
        code: 'SELECT',
        title: `Select ${selectGroupCount} of the following`,
        credits: selectGroupCredits,
        courseType: 'selection',
        isSelection: true,
        selectionCount: selectGroupCount,
        footnoteRefs: []
      });
      
      console.log(`  Selection group: ${selectGroupCount} courses, ${selectGroupCredits} credits`);
      i++;
      continue;
    }
    
    // ENHANCED: Detect OR patterns and create logic groups
    const orPatternResult = detectORPattern(line, lines, i);
    if (orPatternResult.isORPattern) {
      console.log(`  *** OR PATTERN DETECTED ***`);
      const orGroup = createORGroup(orPatternResult.courses);
      courses.push(orGroup);
      foundAnyContent = true;
      i = orPatternResult.nextIndex;
      continue;
    }
    
    // ENHANCED: Detect AND patterns and create logic groups  
    const andPatternResult = detectANDPattern(line, lines, i);
    if (andPatternResult.isANDPattern) {
      console.log(`  *** AND PATTERN DETECTED ***`);
      const andGroup = createANDGroup(andPatternResult.courses);
      courses.push(andGroup);
      foundAnyContent = true;
      i = andPatternResult.nextIndex;
      continue;
    }
    
    // TABLE FORMAT PARSING - Enhanced with course types
    if (isTableFormat) {
      const courseResult = parseTableFormatCourse(line, lines, i);
      if (courseResult.course) {
        // Enhance course with type detection
        enhanceCourseWithType(courseResult.course, line, isInSelectGroup);
        courses.push(courseResult.course);
        foundAnyContent = true;
        console.log(`  Table course: ${courseResult.course.code} - ${courseResult.course.title} (${courseResult.course.credits}cr) [${courseResult.course.courseType}]`);
        i = courseResult.nextIndex;
        continue;
      }
    }
    
    // Parse standard courses (non-table format) - Enhanced with types
    const standardCourseResult = parseStandardCourse(line);
    if (standardCourseResult) {
      enhanceCourseWithType(standardCourseResult, line, isInSelectGroup);
      courses.push(standardCourseResult);
      foundAnyContent = true;
      i++;
      continue;
    }
    
    // Parse complex courses - Enhanced with types
    const complexCourseResult = parseComplexCourse(line);
    if (complexCourseResult) {
      enhanceCourseWithType(complexCourseResult, line, isInSelectGroup);
      courses.push(complexCourseResult);
      foundAnyContent = true;
      i++;
      continue;
    }
    
    // Handle flexible requirements - Enhanced with types
    if (isFlexibleRequirement(line)) {
      const flexible = parseFlexibleRequirement(line);
      if (flexible) {
        enhanceCourseWithType(flexible, line, isInSelectGroup);
        courses.push(flexible);
        foundAnyContent = true;
      }
      i++;
      continue;
    }
    
    i++;
  }
  
  const categoryCredits = calculateCategoryCredits(courses);
  
  console.log(`  Category "${categoryName}" completed: ${courses.length} courses, ${categoryCredits} credits`);
  
  return {
    category: {
      name: categoryName,
      courses: courses,
      credits: categoryCredits
    },
    nextIndex: i
  };
}

// NEW FUNCTION: Detect OR patterns like "BIOS 1601 OR (BIOS 1603 & BIOS 1603L)"
function detectORPattern(line, lines, currentIndex) {
  const result = { isORPattern: false, courses: [], nextIndex: currentIndex + 1 };
  
  // Pattern 1: "CourseA OR CourseB" on same line
  const simpleORMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?(?:\s+[^O]+)?)\s+OR\s+([A-Z]{2,4}\s+\d{4}[A-Z]?(?:\s+.+)?)$/i);
  if (simpleORMatch) {
    const [, course1Text, course2Text] = simpleORMatch;
    result.isORPattern = true;
    result.courses = [
      parseCourseFromText(course1Text),
      parseCourseFromText(course2Text)
    ];
    return result;
  }
  
  // Pattern 2: "CourseA or" followed by courses on next lines
  if (line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?(?:\s+.+)?)\s+or\s*$/i)) {
    result.isORPattern = true;
    result.courses.push(parseCourseFromText(line.replace(/\s+or\s*$/i, '')));
    
    let nextIndex = currentIndex + 1;
    while (nextIndex < lines.length) {
      const nextLine = lines[nextIndex].trim();
      if (!nextLine || isCategoryHeader(nextLine) || isFootnoteStart(nextLine)) {
        break;
      }
      
      if (nextLine.startsWith('or ')) {
        result.courses.push(parseCourseFromText(nextLine.replace(/^or\s+/, '')));
        nextIndex++;
      } else if (nextLine.match(/^[A-Z]{2,4}\s+\d{4}/)) {
        // Another regular course, stop OR group
        break;
      } else {
        nextIndex++;
      }
    }
    
    result.nextIndex = nextIndex;
    return result;
  }
  
  // Pattern 3: Complex OR with parentheses "BIOS 1601 OR (BIOS 1603 & BIOS 1603L)"
  const complexORMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?(?:\s+[^(]+)?)\s+OR\s+\((.+)\)$/i);
  if (complexORMatch) {
    const [, firstCourse, groupContent] = complexORMatch;
    result.isORPattern = true;
    result.courses.push(parseCourseFromText(firstCourse));
    
    // Parse the group content (might be AND group)
    if (groupContent.includes(' & ')) {
      const andCourses = groupContent.split(' & ').map(course => parseCourseFromText(course.trim()));
      result.courses.push({
        code: 'AND_GROUP',
        title: 'AND Group',
        courseType: 'and_group',
        groupId: `and_${Date.now()}`,
        groupCourses: andCourses,
        credits: andCourses.reduce((sum, c) => sum + c.credits, 0),
        footnoteRefs: []
      });
    } else {
      result.courses.push(parseCourseFromText(groupContent));
    }
    
    return result;
  }
  
  return result;
}

// NEW FUNCTION: Detect AND patterns like "BIOS 1603 & BIOS 1603L"
function detectANDPattern(line, lines, currentIndex) {
  const result = { isANDPattern: false, courses: [], nextIndex: currentIndex + 1 };
  
  // Pattern 1: "CourseA & CourseB" on same line
  const simpleANDMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?(?:\s+[^&]+)?)\s+&\s+([A-Z]{2,4}\s+\d{4}[A-Z]?(?:\s+.+)?)$/);
  if (simpleANDMatch) {
    const [, course1Text, course2Text] = simpleANDMatch;
    result.isANDPattern = true;
    result.courses = [
      parseCourseFromText(course1Text),
      parseCourseFromText(course2Text)
    ];
    return result;
  }
  
  // Pattern 2: Multiple courses separated by &
  const multiANDMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?(?:\s*&\s*[A-Z]{2,4}\s+\d{4}[A-Z]?)+)(?:\s+(.+))?$/);
  if (multiANDMatch) {
    const [, courseCodes, title] = multiANDMatch;
    const codes = courseCodes.split(/\s*&\s*/);
    result.isANDPattern = true;
    result.courses = codes.map(code => ({
      code: code.trim(),
      title: title || '',
      credits: 0,
      courseType: 'regular',
      footnoteRefs: []
    }));
    return result;
  }
  
  return result;
}

// NEW FUNCTION: Create OR logic group
function createORGroup(courses) {
  return {
    code: 'OR_GROUP',
    title: 'OR Group',
    courseType: 'or_group',
    groupId: `or_${Date.now()}`,
    groupCourses: courses,
    credits: Math.max(...courses.map(c => c.credits || 0)), // OR groups take max credits
    footnoteRefs: []
  };
}

// NEW FUNCTION: Create AND logic group
function createANDGroup(courses) {
  return {
    code: 'AND_GROUP',
    title: 'AND Group',
    courseType: 'and_group', 
    groupId: `and_${Date.now()}`,
    groupCourses: courses,
    credits: courses.reduce((sum, c) => sum + (c.credits || 0), 0), // AND groups sum credits
    footnoteRefs: []
  };
}

// NEW FUNCTION: Parse course from text
function parseCourseFromText(text) {
  const trimmed = text.trim();
  
  // Extract course code
  const codeMatch = trimmed.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)/);
  if (!codeMatch) {
    return {
      code: '',
      title: trimmed,
      credits: 0,
      courseType: 'regular',
      footnoteRefs: []
    };
  }
  
  const code = codeMatch[1];
  const remainingText = trimmed.substring(code.length).trim();
  const { title, credits, footnoteRefs } = parseCourseTitleAndCredits(remainingText);
  
  return {
    code,
    title,
    credits,
    courseType: 'regular',
    footnoteRefs
  };
}

// NEW FUNCTION: Enhance course with type detection
function enhanceCourseWithType(course, originalLine, isInSelectGroup) {
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

// NEW FUNCTION: Enhance requirements with logic groups post-processing
function enhanceWithLogicGroups(requirements) {
  console.log('\n=== ENHANCING WITH LOGIC GROUPS ===');
  
  requirements.forEach(requirement => {
    const enhancedCourses = [];
    let i = 0;
    
    while (i < requirement.courses.length) {
      const course = requirement.courses[i];
      const nextCourse = requirement.courses[i + 1];
      
      // Look for patterns that should be grouped
      if (course.isOption && nextCourse && nextCourse.isOption) {
        // Multiple OR options - group them
        const orGroup = {
          code: 'OR_GROUP',
          title: 'OR Group',
          courseType: 'or_group',
          groupId: `or_${Date.now()}`,
          groupCourses: [],
          credits: 0,
          footnoteRefs: []
        };
        
        // Collect all consecutive OR options
        while (i < requirement.courses.length && requirement.courses[i].isOption) {
          const optionCourse = requirement.courses[i];
          optionCourse.courseType = 'regular'; // Reset type within group
          orGroup.groupCourses.push(optionCourse);
          orGroup.credits = Math.max(orGroup.credits, optionCourse.credits);
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

// NEW FUNCTION: Parse table format courses with enhanced type detection
function parseTableFormatCourse(line, lines, currentIndex) {
  // Pattern 1: Course code on its own line, title on next line
  const courseCodeMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)$/);
  if (courseCodeMatch && currentIndex + 1 < lines.length) {
    const courseCode = courseCodeMatch[1];
    const nextLine = lines[currentIndex + 1].trim();
    
    // Check if next line has title and credits
    const { title, credits, footnoteRefs } = parseTableTitleAndCredits(nextLine);
    
    if (title) {
      return {
        course: {
          code: courseCode,
          title: title,
          credits: credits,
          courseType: 'regular',
          isOption: false,
          footnoteRefs: footnoteRefs
        },
        nextIndex: currentIndex + 2
      };
    }
  }
  
  // Pattern 2: Course code and title on same line, credits at end
  const fullCourseMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)\s+(.+?)\s+(\d+)$/);
  if (fullCourseMatch) {
    const [, courseCode, titlePart, credits] = fullCourseMatch;
    const { title, footnoteRefs } = parseTableTitleAndCredits(titlePart);
    
    return {
      course: {
        code: courseCode,
        title: title,
        credits: parseInt(credits),
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
    const { title, credits, footnoteRefs } = parseTableTitleAndCredits(titlePart);
    
    return {
      course: {
        code: courseCode,
        title: title,
        credits: credits,
        courseType: 'or_option',
        isOption: true,
        footnoteRefs: footnoteRefs
      },
      nextIndex: currentIndex + 1
    };
  }
  
  // Pattern 4: Combined course codes (e.g., "BIOS 1107 & 1107L")
  const combinedMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?\s*&\s*\d{4}[A-Z]?)\s+(.+)$/);
  if (combinedMatch) {
    const [, courseCode, titlePart] = combinedMatch;
    const { title, credits, footnoteRefs } = parseTableTitleAndCredits(titlePart);
    
    return {
      course: {
        code: courseCode,
        title: title,
        credits: credits,
        courseType: 'and_group',
        isOption: false,
        footnoteRefs: footnoteRefs
      },
      nextIndex: currentIndex + 1
    };
  }
  
  return { course: null, nextIndex: currentIndex + 1 };
}

// ENHANCED: Parse title and credits in table format
function parseTableTitleAndCredits(titlePart) {
  let title = titlePart.trim();
  let footnoteRefs = [];
  let credits = 0;
  
  console.log(`  Parsing table title: "${titlePart}"`);
  
  // Pattern 1: Title with credits at the end
  const creditsAtEndMatch = title.match(/^(.+?)\s+(\d+)$/);
  if (creditsAtEndMatch) {
    const [, courseTitle, creditStr] = creditsAtEndMatch;
    title = courseTitle.trim();
    credits = parseInt(creditStr);
    console.log(`    Credits at end: "${title}" = ${credits}cr`);
  }
  
  // Pattern 2: Title with footnotes and credits "Title 1,2 4"
  const footnoteCreditsMatch = title.match(/^(.+?)\s+(\d+(?:,\s*\d+)*)\s+(\d+)$/);
  if (footnoteCreditsMatch) {
    const [, courseTitle, footnoteStr, creditStr] = footnoteCreditsMatch;
    title = courseTitle.trim();
    footnoteRefs = footnoteStr.split(',').map(n => parseInt(n.trim()));
    credits = parseInt(creditStr);
    console.log(`    Footnotes + credits: "${title}" footnotes=[${footnoteRefs}] credits=${credits}`);
  }
  
  // Pattern 3: Just footnotes "Title 1,2"
  const footnoteOnlyMatch = title.match(/^(.+?)\s+(\d+(?:,\s*\d+)*)$/);
  if (footnoteOnlyMatch && !creditsAtEndMatch && !footnoteCreditsMatch) {
    const [, courseTitle, footnoteStr] = footnoteOnlyMatch;
    const footnoteNums = footnoteStr.split(',').map(n => parseInt(n.trim()));
    
    // Only treat as footnotes if they're reasonable footnote numbers (1-9)
    if (footnoteNums.every(num => num >= 1 && num <= 9)) {
      title = courseTitle.trim();
      footnoteRefs = footnoteNums;
      console.log(`    Footnotes only: "${title}" footnotes=[${footnoteRefs}]`);
    }
  }
  
  // Handle year in title (like "since 1877")
  if (title.includes('1877') || title.includes('since')) {
    console.log(`    Year detected in title, preserving: "${title}"`);
  }
  
  return { title: title.trim(), credits, footnoteRefs };
}

// ENHANCED: parseCourseTitleAndCredits with comprehensive logic
export function parseCourseTitleAndCredits(titlePart) {
  let title = titlePart.trim();
  let footnoteRefs = [];
  let credits = 0;
  
  console.log(`Parsing title part: "${titlePart}"`);
  
  // Special handling for "or MATH" patterns
  if (title.toLowerCase().startsWith('or ') && title.includes('MATH')) {
    console.log(`  OR MATH pattern detected, keeping full title: "${title}"`);
    return { title: title.trim(), footnoteRefs: [], credits: 0 };
  }
  
  // Handle year patterns like "since 1877"
  const yearInTitleMatch = title.match(/^(.+?)\s+(since\s+)(\d{4})$/i);
  if (yearInTitleMatch) {
    title = `${yearInTitleMatch[1]} ${yearInTitleMatch[2]}${yearInTitleMatch[3]}`;
    console.log(`Found year in title, keeping as: "${title}"`);
    return { title: title.trim(), footnoteRefs: [], credits: 0 };
  }
  
  // Look for explicit credit pattern: "Title [footnotes] credits"
  const fullPattern = title.match(/^(.+?)\s+(\d+(?:,\s*\d+)*)\s+(\d+)$/);
  if (fullPattern) {
    const [, courseTitle, footnoteStr, creditStr] = fullPattern;
    title = courseTitle;
    footnoteRefs = footnoteStr.split(',').map(n => parseInt(n.trim()));
    credits = parseInt(creditStr);
    console.log(`Full pattern: title="${title}", footnotes=[${footnoteRefs}], credits=${credits}`);
    return { title: title.trim(), footnoteRefs, credits };
  }
  
  // Look for credits at the very end (single number)
  const creditsMatch = title.match(/^(.+?)\s+(\d+)$/);
  if (creditsMatch) {
    const [, titleWithoutCredits, lastNumber] = creditsMatch;
    const num = parseInt(lastNumber);
    
    // If it's a reasonable credit amount (1-9), treat as credits
    if (num >= 1 && num <= 9) {
      credits = num;
      title = titleWithoutCredits;
      console.log(`Simple credits pattern: title="${title}", credits=${credits}`);
    } else {
      // Large number, might be year or part of title
      title = titlePart.trim();
      console.log(`Large number ${num}, keeping in title: "${title}"`);
    }
  }
  
  // Look for footnote references in the remaining title
  const footnoteMatch = title.match(/^(.+?)\s+(\d+(?:,\s*\d+)*)$/);
  if (footnoteMatch) {
    const [, titleWithoutFootnotes, footnoteStr] = footnoteMatch;
    const footnoteNums = footnoteStr.split(',').map(n => parseInt(n.trim()));
    
    // Only treat as footnotes if they're single digits (1-9)
    if (footnoteNums.every(num => num >= 1 && num <= 9)) {
      footnoteRefs = footnoteNums;
      title = titleWithoutFootnotes;
      console.log(`Found footnotes: title="${title}", footnotes=[${footnoteRefs}]`);
    }
  }
  
  return { title: title.trim(), footnoteRefs, credits };
}

// ENHANCED: Handle missing Major Requirements
function handleMissingMajorRequirements(requirements, text, hasMajorRequirementsSection) {
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
      const majorReqCourses = [];
      const remainingCourses = [];
      
      // Identify courses that belong in Major Requirements
      fieldOfStudy.courses.forEach(course => {
        if (shouldBeInMajorRequirements(course)) {
          majorReqCourses.push(course);
        } else {
          remainingCourses.push(course);
        }
      });
      
      if (majorReqCourses.length > 0) {
        const majorReqCredits = calculateCategoryCredits(majorReqCourses);
        requirements.splice(fieldOfStudyIndex + 1, 0, {
          name: 'Major Requirements',
          courses: majorReqCourses,
          credits: majorReqCredits
        });
        
        fieldOfStudy.courses = remainingCourses;
        fieldOfStudy.credits = calculateCategoryCredits(remainingCourses);
        
        console.log(`✓ Created Major Requirements with ${majorReqCourses.length} courses (${majorReqCredits} credits)`);
      }
    }
  }
}

// HELPER: Determine if course should be in Major Requirements
function shouldBeInMajorRequirements(course) {
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

// ENHANCED: Add missing categories with degree type support
function addMissingRequiredCategories(requirements, text, degreeType) {
  console.log('\n=== CHECKING FOR MISSING CATEGORIES ===');
  
  const existingCategories = requirements.map(req => req.name.toLowerCase());
  
  // Different required categories for different degree types
  let requiredCategories = [];
  
  if (degreeType === 'Minor') {
    requiredCategories = [
      {
        name: 'Required Courses',
        pattern: 'Required Courses',
        credits: 0,
        check: text.includes('Required Courses')
      },
      {
        name: 'CS Electives',
        pattern: 'CS Electives',
        credits: 0,
        check: text.includes('CS Electives') || text.includes('Electives')
      }
    ];
  } else {
    // Full degree programs
    requiredCategories = [
      {
        name: 'Arts, Humanities, and Ethics',
        pattern: 'Any HUM',
        credits: 6,
        check: text.includes('Any HUM')
      },
      {
        name: 'Social Sciences', 
        pattern: 'Any SS',
        credits: 9,
        check: text.includes('Any SS')
      },
      {
        name: 'Major Requirements',
        pattern: 'Major Requirements',
        credits: 0,
        check: text.includes('Major Requirements') || text.includes('Economics Requirement')
      },
      {
        name: 'Free Electives',
        pattern: 'Free Electives',
        credits: 6,
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
      requirements.push(createMissingCategory(category, text));
    }
  }
}

// HELPER: Create missing category with proper course types
function createMissingCategory(categoryInfo, text) {
  let courses = [];
  
  if (categoryInfo.pattern === 'Any HUM') {
    courses = [{
      code: 'FLEXIBLE',
      title: 'Any HUM',
      credits: 6,
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    }];
  } else if (categoryInfo.pattern === 'Any SS') {
    courses = [{
      code: 'FLEXIBLE',
      title: 'Any SS',
      credits: 9,
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    }];
  } else if (categoryInfo.pattern === 'Free Electives') {
    courses = [{
      code: 'FLEXIBLE',
      title: 'Free Electives',
      credits: 6,
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    }];
  } else if (categoryInfo.pattern === 'CS Electives') {
    courses = [{
      code: 'FLEXIBLE',
      title: 'CS Electives',
      credits: 0,
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    }];
  }
  
  return {
    name: categoryInfo.name,
    courses: courses,
    credits: courses.reduce((sum, course) => sum + course.credits, 0)
  };
}

// ENHANCED: Filter empty categories
function filterEmptyCategories(requirements) {
  return requirements.filter(req => {
    const hasActualCourses = req.courses.some(course => 
      course.code !== 'EMPTY' && 
      course.title !== '' &&
      (course.code !== 'FLEXIBLE' || course.credits > 0)
    );
    
    if (!hasActualCourses) {
      console.log(`✗ Filtering out empty requirement: ${req.name}`);
      return false;
    }
    
    return true;
  });
}

// ENHANCED: Category header detection with comprehensive patterns
export function isCategoryHeader(line) {
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
  
  // Skip numbers and credits
  if (/^\d+$/.test(clean) || /^\d+\s*credits?\s*$/i.test(clean)) {
    console.log(`      ✗ Number/credits`);
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

// ENHANCED: Calculate category credits with logic group support
export function calculateCategoryCredits(courses) {
  if (!courses.length) return 0;
  
  let totalCredits = 0;
  let hasSelectionRequirement = false;
  let selectionCredits = 0;
  let hasOptionsWithoutBase = false;
  let firstOptionCredits = 0;
  
  console.log(`Calculating credits for ${courses.length} courses`);
  
  for (const course of courses) {
    console.log(`  Course: ${course.code} - ${course.title} (${course.credits}cr) type:${course.courseType || 'regular'} isOption:${course.isOption} isSelection:${course.isSelection}`);
    
    if (course.isSelection || course.courseType === 'selection') {
      hasSelectionRequirement = true;
      selectionCredits = course.credits;
      console.log(`    Selection requirement: ${selectionCredits} credits`);
    } else if (course.isSelectionOption) {
      // These are options within a selection - don't count towards total
      console.log(`    Selection option - not counting`);
      continue;
    } else if (course.courseType === 'or_group') {
      // OR groups - take the max credits (student chooses one)
      totalCredits += course.credits;
      console.log(`    OR Group: added ${course.credits} credits (max of options)`);
    } else if (course.courseType === 'and_group') {
      // AND groups - sum all credits (student takes all)
      totalCredits += course.credits;
      console.log(`    AND Group: added ${course.credits} credits (sum of all)`);
    } else if (course.isFlexible || course.courseType === 'flexible') {
      // Flexible requirements always count
      totalCredits += course.credits;
      console.log(`    Flexible: added ${course.credits} credits`);
    } else if (!course.isOption && course.courseType !== 'or_option') {
      // Regular required courses
      totalCredits += course.credits;
      console.log(`    Required: added ${course.credits} credits`);
    } else {
      // This is an OR option (legacy handling)
      if (!hasOptionsWithoutBase && firstOptionCredits === 0) {
        firstOptionCredits = course.credits;
        hasOptionsWithoutBase = true;
        console.log(`    First OR option: ${course.credits} credits`);
      }
    }
  }
  
  // Add selection requirement credits
  if (hasSelectionRequirement) {
    totalCredits += selectionCredits;
    console.log(`  Added selection credits: ${selectionCredits}`);
  }
  
  // If we only have options and no base courses, count the first option
  if (totalCredits === 0 && hasOptionsWithoutBase) {
    totalCredits = firstOptionCredits;
    console.log(`  Only options found, using first option: ${firstOptionCredits}`);
  }
  
  console.log(`  Total category credits: ${totalCredits}`);
  return totalCredits;
}

// ENHANCED: Flexible requirement detection for all cases
export function isFlexibleRequirement(line) {
  const trimmed = line.trim();
  
  console.log(`    Checking if flexible requirement: "${trimmed}"`);
  
  const patterns = [
    /^Any [A-Z]+\d*$/,                       // "Any HUM6", "Any SS9"
    /^Any [A-Z]+\s+\d*$/,                    // "Any HUM 6", "Any SS 9"
    /^Any [A-Z]+\s+\d+[X]+\s*\d*$/,          // "Any HUM 37XX"
    /^Free Electives\s*\d*$/,                // "Free Electives 6"
    /^Free Electives\s+\d+$/,                // "Free Electives 69"
    /^Approved Electives\s*\d*$/,            // "Approved Electives 6"
    /^Lab Science\s*\d*$/,                   // "Lab Science 4"
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
export function parseFlexibleRequirement(line) {
  const trimmed = line.trim();
  
  console.log(`Parsing flexible requirement: "${trimmed}"`);
  
  // Handle "CS Electives" specifically for minors
  const csElectivesMatch = trimmed.match(/^CS Electives$/i);
  if (csElectivesMatch) {
    console.log(`  CS Electives pattern detected`);
    return {
      code: 'FLEXIBLE',
      title: 'CS Electives',
      credits: 0,
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    };
  }
  
  // Handle selection with description "Select 9 credit hours of electives, at least 6 of which are upper-division. 39"
  const selectWithDescMatch = trimmed.match(/^Select\s+(\d+)\s+credit hours?\s+of\s+(.+?)\.\s*(\d+)$/i);
  if (selectWithDescMatch) {
    const [, creditHours, description, footnoteOrCredits] = selectWithDescMatch;
    console.log(`  Selection with description: ${creditHours} credits of ${description}`);
    
    return {
      code: 'SELECT',
      title: `Select ${creditHours} credit hours of ${description}`,
      credits: parseInt(creditHours),
      courseType: 'selection',
      isFlexible: true,
      isSelection: true,
      isOption: false,
      footnoteRefs: footnoteOrCredits ? [parseInt(footnoteOrCredits)] : []
    };
  }
  
  // Handle Lab Science patterns
  const labSciencePattern = trimmed.match(/^Lab Science(\d+)Lab Science(\d+)/);
  if (labSciencePattern) {
    const [, credits1, credits2] = labSciencePattern;
    const totalCredits = parseInt(credits1) + parseInt(credits2);
    console.log(`  Lab Science pattern: ${credits1} + ${credits2} = ${totalCredits} credits`);
    
    return {
      code: 'FLEXIBLE',
      title: 'Lab Science',
      credits: totalCredits,
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    };
  }
  
  // Handle "AE Options 46" - extract credits properly
  const optionsWithCreditsMatch = trimmed.match(/^([A-Z]+(?:\s+[A-Z]+)?)\s+Options?\s+(\d+)$/i);
  if (optionsWithCreditsMatch) {
    const [, optionType, credits] = optionsWithCreditsMatch;
    console.log(`  Options with credits: ${optionType} Options = ${credits} credits`);
    
    return {
      code: 'FLEXIBLE',
      title: `${optionType} Options`,
      credits: parseInt(credits),
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    };
  }
  
  // Handle "Math Option 53" - credits and footnote combined
  const optionWithCombinedMatch = trimmed.match(/^([A-Z]+(?:\s+[A-Z]+)?)\s+Options?\s+(\d{2,})$/i);
  if (optionWithCombinedMatch) {
    const [, optionType, combinedNum] = optionWithCombinedMatch;
    const numStr = combinedNum.toString();
    
    if (numStr.length === 2) {
      const footnote = parseInt(numStr[0]);
      const credits = parseInt(numStr[1]);
      
      console.log(`  Option with combined: ${optionType} Option = footnote ${footnote}, credits ${credits}`);
      
      return {
        code: 'FLEXIBLE',
        title: `${optionType} Option`,
        credits: credits,
        courseType: 'flexible',
        isFlexible: true,
        isOption: false,
        footnoteRefs: [footnote]
      };
    }
  }
  
  // Handle "Any HUM6" or "Any SS9" - department + credits combined
  const anyDeptCombinedMatch = trimmed.match(/^Any\s+([A-Z]+)(\d+)$/i);
  if (anyDeptCombinedMatch) {
    const [, dept, credits] = anyDeptCombinedMatch;
    console.log(`  Any dept combined: Any ${dept} = ${credits} credits`);
    
    return {
      code: 'FLEXIBLE',
      title: `Any ${dept}`,
      credits: parseInt(credits),
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    };
  }
  
  // Handle standard "Any HUM" with credits separate
  const anyDeptMatch = trimmed.match(/^Any\s+([A-Z]+)\s*(\d+)?$/i);
  if (anyDeptMatch) {
    const [, dept, credits] = anyDeptMatch;
    console.log(`  Any dept: Any ${dept} = ${credits || 0} credits`);
    
    return {
      code: 'FLEXIBLE',
      title: `Any ${dept}`,
      credits: credits ? parseInt(credits) : 0,
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    };
  }
  
  // Handle requirement lines with footnotes like "Economics Requirement 8"
  const requirementMatch = trimmed.match(/^(.+?Requirement)\s+(\d+)$/i);
  if (requirementMatch) {
    const [, reqTitle, num] = requirementMatch;
    console.log(`  Requirement: ${reqTitle} = footnote ${num}`);
    
    return {
      code: 'FLEXIBLE',
      title: reqTitle,
      credits: 0,
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: [parseInt(num)]
    };
  }
  
  // Handle electives with credits
  const electivesMatch = trimmed.match(/^(.+?Electives?)\s+(\d+)$/i);
  if (electivesMatch) {
    const [, electiveType, credits] = electivesMatch;
    console.log(`  Electives: ${electiveType} = ${credits} credits`);
    
    return {
      code: 'FLEXIBLE',
      title: electiveType,
      credits: parseInt(credits),
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    };
  }
  
  // Handle standalone numbers
  if (/^\d+$/.test(trimmed)) {
    const credits = parseInt(trimmed);
    console.log(`  Standalone credits: ${credits}`);
    
    return {
      code: 'FLEXIBLE',
      title: `${credits} credit hours`,
      credits: credits,
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
    };
  }
  
  console.log(`  No pattern matched for: "${trimmed}"`);
  return null;
}

// ENHANCED: Create flexible category
function createFlexibleCategory(line) {
  const trimmed = line.trim();
  
  const categoryMappings = {
    'Any HUM': 'Arts, Humanities, and Ethics',
    'Any SS': 'Social Sciences', 
    'AE Options': 'AE Options',
    'Math Option': 'Math Options',
    'Free Electives': 'Free Electives',
    'Approved Electives': 'Approved Electives',
    'CS Electives': 'CS Electives'
  };
  
  let categoryName = null;
  for (const [pattern, name] of Object.entries(categoryMappings)) {
    if (trimmed.includes(pattern)) {
      categoryName = name;
      break;
    }
  }
  
  if (!categoryName) {
    console.log(`  ✗ No category mapping for: ${trimmed}`);
    return null;
  }
  
  const flexible = parseFlexibleRequirement(trimmed);
  if (!flexible) {
    console.log(`  ✗ Could not parse flexible requirement: ${trimmed}`);
    return null;
  }
  
  return {
    name: categoryName,
    courses: [flexible],
    credits: flexible.credits
  };
}

// Keep all existing functions that weren't changed
export function parseStandardCourse(line) {
  const isOrOption = line.startsWith('or ');
  const cleanLine = line.replace(/^or\s+/, '');
  
  console.log(`Parsing standard course: "${line}" (OR option: ${isOrOption})`);
  
  // Enhanced pattern to handle footnotes and credits properly
  const courseMatch = cleanLine.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)\s+(.+)$/);
  if (courseMatch) {
    const [, code, titlePart] = courseMatch;
    const { title, footnoteRefs, credits } = parseCourseTitleAndCredits(titlePart);
    
    console.log(`  Parsed: ${code} - ${title} (${credits}cr) footnotes:[${footnoteRefs}]`);
    
    return {
      code: code,
      title: title,
      credits: credits,
      courseType: isOrOption ? 'or_option' : 'regular',
      isOption: isOrOption,
      footnoteRefs: footnoteRefs
    };
  }
  
  return null;
}

export function parseComplexCourse(line) {
  // Handle course code with title on same line - but be more careful with & combinations
  const combinedMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?(?:\s*&\s*[A-Z]{2,4}\s+\d{4}[A-Z]?)*)\s+(.+)$/);
  if (combinedMatch) {
    const [, courseCode, titlePart] = combinedMatch;
    console.log(`  Complex course with title: "${courseCode}" + "${titlePart}"`);
    
    const { title, footnoteRefs } = parseCourseTitleAndCredits(titlePart);
    
    // Detect if this is an AND combination
    const isAndCombination = courseCode.includes('&');
    
    return {
      code: courseCode,
      title: title,
      credits: 0, // Will be determined by context
      courseType: isAndCombination ? 'and_group' : 'regular',
      isOption: false,
      footnoteRefs: footnoteRefs
    };
  }
  
  return null;
}

export function isNavigationHeader(line) {
  const clean = line.replace(/\*+/g, '').trim().toLowerCase();
  const navigationHeaders = [
    'overview', 'requirements', 'designators and options', 
    'course list', 'code title credit hours', 'codetitlecredit hours',
    'program of study', 'prerequisite'
  ];
  return navigationHeaders.some(header => clean === header || clean.includes(header));
}

export function isFootnoteStart(line) {
  const clean = line.trim();
  return /^\*?\*?\d+\*?\*?$/.test(clean) || 
         clean.includes('pass-fail') ||
         clean.includes('grade of') ||
         clean.includes('better is required') ||
         clean.includes('not allowed') ||
         clean.includes('must complete') ||
         clean.includes('minimum grade') ||
         clean.includes('Total Credit Hours');
}

export function extractFootnotes(text) {
  const footnotes = [];
  const lines = text.split('\n');
  let inFootnotes = false;
  let currentFootnote = null;
  
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
        !trimmed.includes('Total Credit Hours') &&
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

export function cleanCategoryName(line) {
  return line.replace(/\*+/g, '').trim();
}

export function extractCollege(programName) {
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