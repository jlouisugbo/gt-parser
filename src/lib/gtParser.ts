// lib/gtParser.ts - TypeScript parser without credits

export interface Course {
  code: string;
  title: string;
  courseType: 'regular' | 'or_option' | 'flexible' | 'or_group' | 'and_group' | 'selection';
  footnoteRefs: number[];
  groupId?: string;
  groupCourses?: Course[];
  selectionCount?: number;
  selectionOptions?: Course[];
  isOption?: boolean;
  isFlexible?: boolean;
  isSelection?: boolean;
  isSelectionOption?: boolean;
}

export interface Requirement {
  name: string;
  courses: Course[];
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
        console.log(`  ✓ Adding MAJOR REQUIREMENTS: ${categoryResult.category.name} (${categoryResult.category.courses.length} courses)`);
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

  // POST-PROCESSING: Consolidate AND groups to act as single units
  consolidateANDGroups(requirements);  // ADD THIS LINE
  
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

// ENHANCED: Parse category with logic group support and table format
export function parseCategory(lines: string[], startIndex: number, isTableFormat: boolean = false, footnotes: Footnote[] = []): CategoryResult {
  const categoryName = cleanCategoryName(lines[startIndex]);
  const courses: Course[] = [];
  let i = startIndex + 1;
  let isInSelectGroup = false;
  let selectGroupCount = 0;
   
  console.log(`\nParsing category: "${categoryName}" (Table format: ${isTableFormat})`);
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Stop at next category or footnotes
    if (!line || isCategoryHeader(line) || isFootnoteStart(line)) {
      break;
    }
    
    console.log(`  Line ${i}: "${line}"`);
    
    // Handle "Select X of the following:" patterns - CREATE SELECTION GROUP
    const selectMatch = line.match(/^Select\s+(one|two|three|\d+)\s+(?:of\s+)?(?:the\s+following|electives)(?:,\s+at\s+least\s+\d+\s+of\s+which\s+are\s+[\w-]+)?[.:]?\s*(\d+)?/i);
    if (selectMatch) {
      isInSelectGroup = true;
      selectGroupCount = selectMatch[1] === 'one' ? 1 : 
                       selectMatch[1] === 'two' ? 2 : 
                       selectMatch[1] === 'three' ? 3 : 
                       parseInt(selectMatch[1]);
      
      // Create selection group
      const selectionGroup: Course = {
        code: 'SELECT_GROUP',
        title: `Select ${selectGroupCount} of the following`,
        courseType: 'selection',
        groupId: `select_${Date.now()}`,
        selectionCount: selectGroupCount,
        selectionOptions: [],
        footnoteRefs: []
      };
      
      console.log(`  *** CREATING SELECTION GROUP: ${selectGroupCount} courses ***`);
      
      // Parse selection options
      i++;
      while (i < lines.length) {
        const optionLine = lines[i].trim();
        
        // Stop at next category or empty line
        if (!optionLine || isCategoryHeader(optionLine) || isFootnoteStart(optionLine)) {
          break;
        }
        
        console.log(`    Selection option line: "${optionLine}"`);
        
        // Check for AND groups within selection (like "BIOS 1107 & 1107L")
        const andPatternResult = detectANDPattern(optionLine, lines, i);
        if (andPatternResult.isANDPattern) {
          console.log(`    *** AND PATTERN IN SELECTION ***`);
          const andGroup: Course = {
            code: 'AND_GROUP',
            title: 'AND Group',
            courseType: 'and_group',
            groupId: `and_${Date.now()}`,
            groupCourses: andPatternResult.courses,
            footnoteRefs: []
          };
          selectionGroup.selectionOptions!.push(andGroup);
          i = andPatternResult.nextIndex;
          continue;
        }
        
        // Parse regular course option
        const optionCourse = parseStandardCourse(optionLine) || parseComplexCourse(optionLine);
        if (optionCourse) {
          selectionGroup.selectionOptions!.push(optionCourse);
          console.log(`    Added option: ${optionCourse.code} - ${optionCourse.title}`);
        }
        
        i++;
      }
      
      courses.push(selectionGroup);
      continue;
    }
    
    // ENHANCED: Detect OR patterns and create logic groups
    const orPatternResult = detectORPattern(line, lines, i);
    if (orPatternResult.isORPattern) {
      console.log(`  *** OR PATTERN DETECTED ***`);
      const orGroup = createORGroup(orPatternResult.courses);
      courses.push(orGroup);
      i = orPatternResult.nextIndex;
      continue;
    }

    // FALLBACK: Check for missed AND patterns in the line itself
    const missedAndMatch = line.match(/^([A-Z]{2,4}\s+\d{4}[A-Z]?)\s*&\s*([A-Z]{2,4}\s+\d{4}[A-Z]?)\s*(.*)$/);
    if (missedAndMatch) {
      const [, code1, code2, titlePart] = missedAndMatch;
      
      const title = titlePart
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\d+$/, '')
        .trim();
        
      console.log(`  *** FALLBACK AND PATTERN CAUGHT: ${code1} & ${code2} - ${title} ***`);
      
      const andGroup: Course = {
        code: 'AND_GROUP',
        title: title,
        courseType: 'and_group',
        groupId: `and_${Date.now()}_fallback`,
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
      
      courses.push(andGroup);
      i++;
      continue;
    }

    const shouldCheckForFollowingOR = parseStandardCourse(line) || parseComplexCourse(line);
      if (shouldCheckForFollowingOR && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        
        // If next line starts with "or", this course should be part of an OR group
        if (nextLine.toLowerCase().startsWith('or ')) {
          console.log(`  *** COURSE WITH FOLLOWING OR OPTIONS DETECTED ***`);
          
          // Collect all courses in this OR group
          const orGroupCourses: Course[] = [shouldCheckForFollowingOR]; // Start with current course
          let nextIndex = i + 1;
          
          // Collect all "or" options that follow
          while (nextIndex < lines.length) {
            const orLine = lines[nextIndex].trim();
            
            if (orLine.toLowerCase().startsWith('or ')) {
              const orCourse = parseStandardCourse(orLine) || parseComplexCourse(orLine);
              if (orCourse) {
                // Remove the OR flag since it's now part of a group
                orCourse.courseType = 'regular';
                orCourse.isOption = false;
                orGroupCourses.push(orCourse);
                console.log(`    Added OR option: ${orCourse.code} - ${orCourse.title}`);
              }
              nextIndex++;
            } else if (!orLine || isCategoryHeader(orLine) || isFootnoteStart(orLine)) {
              // End of OR group
              break;
            } else {
              // Check if this is another course (not part of OR group)
              const possibleCourse = parseStandardCourse(orLine) || parseComplexCourse(orLine);
              if (possibleCourse && !orLine.toLowerCase().startsWith('or ')) {
                // This is a new course, not part of OR group
                break;
              }
              nextIndex++;
            }
          }
          
          // Only create OR group if we have multiple courses
          if (orGroupCourses.length > 1) {
            const orGroup = createORGroup(orGroupCourses);
            courses.push(orGroup);
            console.log(`  ✓ Created OR group with ${orGroupCourses.length} courses`);
            i = nextIndex;
            continue;
          } else {
            // Fallback: treat as regular course
            courses.push(shouldCheckForFollowingOR);
            i++;
            continue;
          }
        }
      }
    
    // ENHANCED: Detect AND patterns and create logic groups  
    const andPatternResult = detectANDPattern(line, lines, i);
    if (andPatternResult.isANDPattern) {
      console.log(`  *** AND PATTERN DETECTED ***`);
      const andGroup = createANDGroup(andPatternResult.courses);
      courses.push(andGroup);
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
        console.log(`  Table course: ${courseResult.course.code} - ${courseResult.course.title} [${courseResult.course.courseType}]`);
        i = courseResult.nextIndex;
        continue;
      }
    }
    
    // Parse standard courses (non-table format) - Enhanced with types
    const standardCourseResult = parseStandardCourse(line);
    if (standardCourseResult) {
      enhanceCourseWithType(standardCourseResult, line, isInSelectGroup);
      courses.push(standardCourseResult);
      i++;
      continue;
    }
    
    // Parse complex courses - Enhanced with types
    const complexCourseResult = parseComplexCourse(line);
    if (complexCourseResult) {
      enhanceCourseWithType(complexCourseResult, line, isInSelectGroup);
      courses.push(complexCourseResult);
      i++;
      continue;
    }
    
    // Handle flexible requirements - Enhanced with types
    if (isFlexibleRequirement(line)) {
      const flexible = parseFlexibleRequirement(line);
      if (flexible) {
        enhanceCourseWithType(flexible, line, isInSelectGroup);
        courses.push(flexible);
      }
      i++;
      continue;
    }
    
    i++;
  }
  
  console.log(`  Category "${categoryName}" completed: ${courses.length} courses`);
  
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

// NEW FUNCTION: Detect OR patterns like "BIOS 1601 OR (BIOS 1603 & BIOS 1603L)"
function detectORPattern(line: string, lines: string[], currentIndex: number): PatternResult {
  const result: PatternResult = { isORPattern: false, courses: [], nextIndex: currentIndex + 1 };
  
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
  
  return result;
}

// NEW FUNCTION: Detect AND patterns like "BIOS 1603 & BIOS 1603L"
function detectANDPattern(line: string, lines: string[], currentIndex: number): ANDPatternResult {
  const result: ANDPatternResult = { isANDPattern: false, courses: [], nextIndex: currentIndex + 1 };
  
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
      courseType: 'regular' as const,
      footnoteRefs: []
    }));
    return result;
  }
  
  return result;
}

// NEW FUNCTION: Create OR logic group
function createORGroup(courses: Course[]): Course {
  return {
    code: 'OR_GROUP',
    title: 'OR Group',
    courseType: 'or_group',
    groupId: `or_${Date.now()}`,
    groupCourses: courses,
    footnoteRefs: []
  };
}

// NEW FUNCTION: Create AND logic group
function createANDGroup(courses: Course[]): Course {
  return {
    code: 'AND_GROUP',
    title: 'AND Group',
    courseType: 'and_group', 
    groupId: `and_${Date.now()}`,
    groupCourses: courses,
    footnoteRefs: []
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

// NEW FUNCTION: Enhance with selection groups post-processing
function enhanceWithSelectionGroups(requirements: Requirement[]): void {
  console.log('\n=== ENHANCING WITH SELECTION GROUPS ===');
  
  requirements.forEach(requirement => {
    const enhancedCourses: Course[] = [];
    let i = 0;
    
    while (i < requirement.courses.length) {
      const course = requirement.courses[i];
      
      // Look for "Select X of the following" patterns that weren't caught during parsing
      if (course.title && course.title.toLowerCase().includes('select') && course.title.toLowerCase().includes('following')) {
        console.log(`Found missed selection pattern: ${course.title}`);
        
        // Convert to selection group
        const selectionGroup: Course = {
          code: 'SELECT_GROUP',
          title: course.title,
          courseType: 'selection',
          groupId: `select_${Date.now()}`,
          selectionCount: 1, // Default, can be adjusted
          selectionOptions: [],
          footnoteRefs: course.footnoteRefs || []
        };
        
        // Look for following courses that should be options
        let j = i + 1;
        while (j < requirement.courses.length && requirement.courses[j].isOption) {
          selectionGroup.selectionOptions!.push(requirement.courses[j]);
          j++;
        }
        
        enhancedCourses.push(selectionGroup);
        i = j;
      } else {
        enhancedCourses.push(course);
        i++;
      }
    }
    
    requirement.courses = enhancedCourses;
  });
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
export function parseFlexibleRequirement(line: string): Course | null {
  const trimmed = line.trim();
  
  console.log(`Parsing flexible requirement: "${trimmed}"`);
  
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
  
  // Handle requirement lines with footnotes like "Economics Requirement 8"
  const requirementMatch = trimmed.match(/^(.+?Requirement)\s+(\d+)$/i);
  if (requirementMatch) {
    const [, reqTitle, num] = requirementMatch;
    console.log(`  Requirement: ${reqTitle} = footnote ${num}`);
    
    return {
      code: 'FLEXIBLE',
      title: reqTitle,
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: [parseInt(num)]
    };
  }
  
  // Handle electives
  const electivesMatch = trimmed.match(/^(.+?Electives?)\s*(\d+)?$/i);
  if (electivesMatch) {
    const [, electiveType] = electivesMatch;
    console.log(`  Electives: ${electiveType}`);
    
    return {
      code: 'FLEXIBLE',
      title: electiveType,
      courseType: 'flexible',
      isFlexible: true,
      isOption: false,
      footnoteRefs: []
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
  return line.replace(/\*+/g, '').trim();
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

function createFlexibleCategory(line: string): Requirement | null {
  const trimmed = line.trim();
  
  const categoryMappings: Record<string, string> = {
    'Any HUM': 'Arts, Humanities, and Ethics',
    'Any SS': 'Social Sciences', 
    'AE Options': 'AE Options',
    'Math Option': 'Math Options',
    'Free Electives': 'Free Electives',
    'Approved Electives': 'Approved Electives',
    'CS Electives': 'CS Electives'
  };
  
  let categoryName: string | null = null;
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
    courses: [flexible]
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

function validateParsedData(data: ProgramData): ValidationResult {
  // Validate the parsed program data
  const errors: string[] = [];
  
  if (!data.name) {
    errors.push('Program name is missing');
  }
  
  if (!data.degreeType) {
    errors.push('Degree type is missing');
  }
  
  if (!data.requirements || data.requirements.length === 0) {
    errors.push('No requirements found');
  }
  
  // Validate each requirement
  data.requirements?.forEach((req, index) => {
    if (!req.name) {
      errors.push(`Requirement ${index + 1} is missing a name`);
    }
    
    if (!req.courses || req.courses.length === 0) {
      errors.push(`Requirement "${req.name}" has no courses`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

export { validateParsedData };