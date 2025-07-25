/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronUp, ChevronDown, BookOpen, X, ArrowRight, Move } from 'lucide-react';

interface Footnote {
  number: number;
  text: string;
}

interface CourseRef {
  type: 'course' | 'groupCourse' | 'selectionOption' | 'selectionGroupCourse' | 'nestedGroupCourse';
  courseIndex: number;
  groupIndex?: number;
  optionIndex?: number;
  groupCourseIndex?: number;
  nestedCourseIndex?: number;
}

interface Course {
  code: string;
  title: string;
  courseType: 'regular' | 'or_option' | 'flexible' | 'or_group' | 'and_group' | 'selection';
  footnoteRefs: number[]; // Changed from string[] to number[]
  groupId?: string;
  groupCourses?: Course[];
  selectionCount?: number;
  selectionOptions?: Course[];
}

export interface Requirement {
  name: string;
  courses: Course[];
  footnotes?: Footnote[];
}

interface RequirementEditorProps {
  requirement: Requirement;
  requirementName: string;
  onUpdate: (field: string, value: any) => void;
  onRemove: () => void;
  onAddCategory?: (category: Requirement) => void;
  allRequirements?: Requirement[]; // For course movement between requirements
  onMoveCourseBetweenRequirements?: (courseData: Course, fromReqIndex: number, toReqIndex: number, fromCourseIndex: number) => void;
  requirementIndex?: number; // Current requirement index
}

export const RequirementEditor: React.FC<RequirementEditorProps> = ({ 
  requirement, 
  requirementName,
  onUpdate, 
  onRemove,
  allRequirements = [],
  onMoveCourseBetweenRequirements,
  requirementIndex = 0,
}) => {
  const [showFootnotes, setShowFootnotes] = useState(false);


  // Create a controlled input component that doesn't cause re-renders
  const StableInput: React.FC<{
    value: string | number;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    type?: string;
    min?: string;
    max?: string;
  }> = ({ value, onChange, placeholder, className, type, min, max }) => {
    const [localValue, setLocalValue] = useState(String(value));
    const inputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
      setLocalValue(String(value));
    }, [value]);
    
    const handleBlur = () => {
      if (localValue !== String(value)) {
        onChange(localValue);
      }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
      }
    };
    
    return (
      <Input
        ref={inputRef}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        type={type}
        min={min}
        max={max}
      />
    );
  };

  // Create a controlled textarea component
  const StableTextarea: React.FC<{
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    rows?: number;
  }> = ({ value, onChange, placeholder, className, rows }) => {
    const [localValue, setLocalValue] = useState(value);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    useEffect(() => {
      setLocalValue(value);
    }, [value]);
    
    const handleBlur = () => {
      if (localValue !== value) {
        onChange(localValue);
      }
    };
    
    return (
      <Textarea
        ref={textareaRef}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        rows={rows}
      />
    );
  };

  // Footnote Input Component - for typing footnote references
  const FootnoteInput: React.FC<{
    footnoteRefs: number[];
    courseRef: CourseRef;
    className?: string;
  }> = ({ footnoteRefs, courseRef, className = "w-40" }) => {
    const footnoteString = footnoteRefs.join(', ');
    
    const handleFootnoteChange = (value: string) => {
      // Parse comma-separated numbers
      const refs = value
        .split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => n > 0); // Only valid footnote numbers
      
      // Update the course's footnote references
      const updatedCourses = [...requirement.courses];
      
      switch (courseRef.type) {
        case 'course':
          updatedCourses[courseRef.courseIndex].footnoteRefs = refs;
          break;
        case 'groupCourse':
          if (updatedCourses[courseRef.courseIndex].groupCourses && courseRef.groupIndex !== undefined) {
            updatedCourses[courseRef.courseIndex].groupCourses![courseRef.groupIndex!].footnoteRefs = refs;
          }
          break;
        case 'selectionOption':
          if (updatedCourses[courseRef.courseIndex].selectionOptions && courseRef.optionIndex !== undefined) {
            updatedCourses[courseRef.courseIndex].selectionOptions![courseRef.optionIndex!].footnoteRefs = refs;
          }
          break;
        case 'selectionGroupCourse':
          if (updatedCourses[courseRef.courseIndex].selectionOptions && 
              courseRef.optionIndex !== undefined && 
              courseRef.groupCourseIndex !== undefined) {
            const option = updatedCourses[courseRef.courseIndex].selectionOptions![courseRef.optionIndex!];
            if (option.groupCourses) {
              option.groupCourses[courseRef.groupCourseIndex!].footnoteRefs = refs;
            }
          }
          break;
        case 'nestedGroupCourse':
          if (updatedCourses[courseRef.courseIndex].groupCourses &&
              courseRef.groupIndex !== undefined &&
              courseRef.nestedCourseIndex !== undefined) {
            const parentGroup = updatedCourses[courseRef.courseIndex].groupCourses![courseRef.groupIndex!];
            if (parentGroup.groupCourses) {
              parentGroup.groupCourses[courseRef.nestedCourseIndex!].footnoteRefs = refs;
            }
          }
          break;
      }
      
      onUpdate('courses', updatedCourses);
    };
    
    return (
      <StableInput
        value={footnoteString}
        onChange={handleFootnoteChange}
        placeholder="1, 2, 3"
        className={`${className} h-6 text-xs text-center w-12`}
      />
    );
  };

  // FootnoteRefs component removed - replaced with FootnoteInput for better UX

  // Footnote management functions
  const addFootnote = () => {
    const footnotes = requirement.footnotes || [];
    const nextNumber = footnotes.length > 0 
      ? Math.max(...footnotes.map(f => f.number || 0)) + 1 
      : 1;
    const newFootnote: Footnote = {
      number: nextNumber,
      text: ""
    };
    onUpdate('footnotes', [...footnotes, newFootnote]);
  };

  const updateFootnote = (footnoteIndex: number, field: 'number' | 'text', value: string) => {
    const footnotes = [...(requirement.footnotes || [])];
    if (field === 'number') {
      footnotes[footnoteIndex] = { 
        ...footnotes[footnoteIndex], 
        [field]: parseInt(value) || footnotes[footnoteIndex].number 
      };
    } else {
      footnotes[footnoteIndex] = { ...footnotes[footnoteIndex], [field]: value };
    }
    onUpdate('footnotes', footnotes);
  };

  const removeFootnote = (footnoteIndex: number) => {
    const footnotes = [...(requirement.footnotes || [])];
    if (footnoteIndex < 0 || footnoteIndex >= footnotes.length) return; 
    
    const removedFootnote = footnotes[footnoteIndex];
    footnotes.splice(footnoteIndex, 1);
    
    const updatedCourses = requirement.courses.map(course => ({
      ...course,
      footnoteRefs: course.footnoteRefs.filter(ref => ref !== removedFootnote.number),
      groupCourses: course.groupCourses?.map(groupCourse => ({
        ...groupCourse,
        footnoteRefs: groupCourse.footnoteRefs.filter(ref => ref !== removedFootnote.number)
      })),
      selectionOptions: course.selectionOptions?.map(option => ({
        ...option,
        footnoteRefs: option.footnoteRefs.filter(ref => ref !== removedFootnote.number),
        groupCourses: option.groupCourses?.map(groupCourse => ({
          ...groupCourse,
          footnoteRefs: groupCourse.footnoteRefs.filter(ref => ref !== removedFootnote.number)
        }))
      }))
    }));
    
    onUpdate('footnotes', footnotes);
    onUpdate('courses', updatedCourses);
  };

  const toggleFootnoteRef = (courseRef: { type: 'course' | 'groupCourse' | 'selectionOption' | 'selectionGroupCourse' | 'nestedGroupCourse', courseIndex: number, groupIndex?: number, optionIndex?: number, groupCourseIndex?: number }, footnoteNumber: number) => {
    const updatedCourses = [...requirement.courses];
    let targetCourse: Course;
    
    if (courseRef.type === 'course') {
      targetCourse = updatedCourses[courseRef.courseIndex];
    } else if (courseRef.type === 'groupCourse') {
      targetCourse = updatedCourses[courseRef.courseIndex].groupCourses![courseRef.groupIndex!];
    } else if (courseRef.type === 'selectionOption') {
      targetCourse = updatedCourses[courseRef.courseIndex].selectionOptions![courseRef.optionIndex!];
    } else { // selectionGroupCourse
      targetCourse = updatedCourses[courseRef.courseIndex].selectionOptions![courseRef.optionIndex!].groupCourses![courseRef.groupCourseIndex!];
    }
    
    const hasRef = targetCourse.footnoteRefs.includes(footnoteNumber);
    if (hasRef) {
      targetCourse.footnoteRefs = targetCourse.footnoteRefs.filter(ref => ref !== footnoteNumber);
    } else {
      targetCourse.footnoteRefs = [...targetCourse.footnoteRefs, footnoteNumber].sort((a, b) => a - b);
    }
    
    onUpdate('courses', updatedCourses);
  };

  // Course management functions (existing)
  const addCourse = () => {
    const updatedCourses = [...(requirement.courses || []), {
      code: "",
      title: "",
      courseType: "regular" as const,
      footnoteRefs: []
    }];
    onUpdate('courses', updatedCourses);
  };

  const updateCourse = useCallback((courseIndex: number, field: string, value: any) => {
    const updatedCourses = [...requirement.courses];
    updatedCourses[courseIndex] = {
      ...updatedCourses[courseIndex],
      [field]: value
    };
    onUpdate('courses', updatedCourses);
  }, [requirement.courses, onUpdate]);

  const removeCourse = (courseIndex: number) => {
    const updatedCourses = requirement.courses.filter((_, index) => index !== courseIndex);
    onUpdate('courses', updatedCourses);
  };

  const moveCourse = (courseIndex: number, direction: 'up' | 'down') => {
    const updatedCourses = [...requirement.courses];
    const newIndex = direction === 'up' ? courseIndex - 1 : courseIndex + 1;
    
    if (newIndex >= 0 && newIndex < updatedCourses.length) {
      const [movedItem] = updatedCourses.splice(courseIndex, 1);
      updatedCourses.splice(newIndex, 0, movedItem);
      onUpdate('courses', updatedCourses);
    }
  };

  const addLogicGroup = (type: 'or' | 'and') => {
    const updatedCourses = [...(requirement.courses || [])];
    const groupId = `group_${Date.now()}`;
    
    if (type === 'or') {
      updatedCourses.push({
        code: "OR_GROUP",
        title: "OR Logic Group",
        courseType: "or_group",
        groupId: groupId,
        groupCourses: [],
        footnoteRefs: []
      });
    } else if (type === 'and') {
      updatedCourses.push({
        code: "AND_GROUP", 
        title: "AND Logic Group",
        courseType: "and_group",
        groupId: groupId,
        groupCourses: [],
        footnoteRefs: []
      });
    }
    
    onUpdate('courses', updatedCourses);
  };

  const addSelectionGroup = () => {
    const updatedCourses = [...(requirement.courses || [])];
    const groupId = `select_${Date.now()}`;
    
    updatedCourses.push({
      code: "SELECT_GROUP",
      title: "Select one of the following",
      courseType: "selection",
      groupId: groupId,
      selectionCount: 1,
      selectionOptions: [],
      footnoteRefs: []
    });
    
    onUpdate('courses', updatedCourses);
  };

  const addCourseToGroup = (groupIndex: number) => {
    const updatedCourses = [...requirement.courses];
    updatedCourses[groupIndex].groupCourses = updatedCourses[groupIndex].groupCourses || [];
    updatedCourses[groupIndex].groupCourses!.push({
      code: "",
      title: "",
      courseType: "regular",
      footnoteRefs: []
    });
        
    onUpdate('courses', updatedCourses);
  };

  const updateGroupCourse = useCallback((groupIndex: number, courseIndex: number, field: string, value: any) => {
    const updatedCourses = [...requirement.courses];
    (updatedCourses[groupIndex].groupCourses![courseIndex] as any)[field] = value;
    onUpdate('courses', updatedCourses);
  }, [requirement.courses, onUpdate]);

  const removeGroupCourse = (groupIndex: number, courseIndex: number) => {
    const updatedCourses = [...requirement.courses];
    updatedCourses[groupIndex].groupCourses!.splice(courseIndex, 1);
    onUpdate('courses', updatedCourses);
  };

  // Selection option management functions
  const addSelectionOption = (courseIndex: number, optionType: 'regular' | 'and_group' | 'or_group') => {
    const updatedCourses = [...requirement.courses];
    updatedCourses[courseIndex].selectionOptions = updatedCourses[courseIndex].selectionOptions || [];
    
    if (optionType === 'regular') {
      updatedCourses[courseIndex].selectionOptions!.push({
        code: "",
        title: "",
        courseType: "regular",
        footnoteRefs: []
      });
    } else if (optionType === 'and_group') {
      updatedCourses[courseIndex].selectionOptions!.push({
        code: "AND_GROUP",
        title: "AND Group",
        courseType: "and_group",
        groupCourses: [],
        footnoteRefs: []
      });
    } else if (optionType === 'or_group') {
      updatedCourses[courseIndex].selectionOptions!.push({
        code: "OR_GROUP",
        title: "OR Group",
        courseType: "or_group",
        groupCourses: [],
        footnoteRefs: []
      });
    }
    
    onUpdate('courses', updatedCourses);
  };

  const updateSelectionOption = useCallback((courseIndex: number, optionIndex: number, field: string, value: any) => {
    const updatedCourses = [...requirement.courses];
    (updatedCourses[courseIndex].selectionOptions![optionIndex] as any)[field] = value;
    onUpdate('courses', updatedCourses);
  }, [requirement.courses, onUpdate]);

  const removeSelectionOption = (courseIndex: number, optionIndex: number) => {
    const updatedCourses = [...requirement.courses];
    updatedCourses[courseIndex].selectionOptions!.splice(optionIndex, 1);
    onUpdate('courses', updatedCourses);
  };

  const addSelectionOptionGroupCourse = (courseIndex: number, optionIndex: number) => {
    const updatedCourses = [...requirement.courses];
    const option = updatedCourses[courseIndex].selectionOptions![optionIndex];
    option.groupCourses = option.groupCourses || [];
    option.groupCourses.push({
      code: "",
      title: "",
      courseType: "regular",
      footnoteRefs: []
    });
    onUpdate('courses', updatedCourses);
  };

  const updateSelectionOptionGroupCourse = useCallback((courseIndex: number, optionIndex: number, groupCourseIndex: number, field: string, value: any) => {
    const updatedCourses = [...requirement.courses];
    (updatedCourses[courseIndex].selectionOptions![optionIndex].groupCourses![groupCourseIndex] as any)[field] = value;
    onUpdate('courses', updatedCourses);
  }, [requirement.courses, onUpdate]);

  const removeSelectionOptionGroupCourse = (courseIndex: number, optionIndex: number, groupCourseIndex: number) => {
    const updatedCourses = [...requirement.courses];
    updatedCourses[courseIndex].selectionOptions![optionIndex].groupCourses!.splice(groupCourseIndex, 1);
    onUpdate('courses', updatedCourses);
  };

  // Insert functions
  const insertCourse = (position: number) => {
    const updatedCourses = [...(requirement.courses || [])];
    updatedCourses.splice(position, 0, {
      code: "",
      title: "",
      courseType: "regular",
      footnoteRefs: []
    });
    onUpdate('courses', updatedCourses);
  };

  const insertLogicGroup = (type: 'or' | 'and', position: number) => {
    const updatedCourses = [...(requirement.courses || [])];
    const groupId = `group_${Date.now()}`;
    
    const newGroup = type === 'or' ? {
      code: "OR_GROUP",
      title: "OR Logic Group",
      courseType: "or_group" as const,
      groupId: groupId,
      groupCourses: [] as Course[],
      footnoteRefs: []
    } : {
      code: "AND_GROUP", 
      title: "AND Logic Group",
      courseType: "and_group" as const,
      groupId: groupId,
      groupCourses: [] as Course[],
      footnoteRefs: []
    };
    
    updatedCourses.splice(position, 0, newGroup);
    onUpdate('courses', updatedCourses);
  };

  const insertSelectionGroup = (position: number) => {
    const updatedCourses = [...(requirement.courses || [])];
    const groupId = `select_${Date.now()}`;
    
    updatedCourses.splice(position, 0, {
      code: "SELECT_GROUP",
      title: "Select one of the following",
      courseType: "selection",
      groupId: groupId,
      selectionCount: 1,
      selectionOptions: [],
      footnoteRefs: []
    });
    
    onUpdate('courses', updatedCourses);
  };

  // Course Movement Functions
  const moveCourseBetweenRequirements = (courseIndex: number, targetRequirementIndex: number) => {
    if (!onMoveCourseBetweenRequirements || targetRequirementIndex === requirementIndex) return;
    
    const courseToMove = requirement.courses[courseIndex];
    onMoveCourseBetweenRequirements(courseToMove, requirementIndex, targetRequirementIndex, courseIndex);
    
    // Remove from current requirement
    const updatedCourses = [...requirement.courses];
    updatedCourses.splice(courseIndex, 1);
    onUpdate('courses', updatedCourses);
  };

  const extractCourseFromGroup = (courseIndex: number, groupCourseIndex: number) => {
    const updatedCourses = [...requirement.courses];
    const groupCourse = updatedCourses[courseIndex].groupCourses![groupCourseIndex];
    
    // Remove from group
    updatedCourses[courseIndex].groupCourses!.splice(groupCourseIndex, 1);
    
    // Add as regular course after the group
    updatedCourses.splice(courseIndex + 1, 0, {
      ...groupCourse,
      courseType: 'regular'
    });
    
    onUpdate('courses', updatedCourses);
  };

  const moveCourseToGroup = (sourceCourseIndex: number, targetGroupIndex: number) => {
    const updatedCourses = [...requirement.courses];
    const courseToMove = updatedCourses[sourceCourseIndex];
    
    // Add to target group
    updatedCourses[targetGroupIndex].groupCourses = updatedCourses[targetGroupIndex].groupCourses || [];
    updatedCourses[targetGroupIndex].groupCourses!.push({
      ...courseToMove,
      courseType: 'regular'
    });
    
    // Remove original course (adjust index if necessary)
    const removeIndex = sourceCourseIndex > targetGroupIndex ? sourceCourseIndex : sourceCourseIndex;
    updatedCourses.splice(removeIndex, 1);
    
    onUpdate('courses', updatedCourses);
  };

  // Insert buttons component
  const InsertButtons: React.FC<{ position: number }> = ({ position }) => (
    <div className="flex justify-center py-0.5">
      <div className="flex gap-1 opacity-30 hover:opacity-100 transition-opacity bg-white border rounded-md shadow-sm p-0.5">
        <Button onClick={() => insertCourse(position)} size="sm" variant="ghost" className="h-5 text-xs px-1">
          <Plus className="h-3 w-3 mr-0.5" />Course
        </Button>
        <Button onClick={() => insertLogicGroup('or', position)} size="sm" variant="ghost" className="h-5 text-xs px-1">
          OR
        </Button>
        <Button onClick={() => insertLogicGroup('and', position)} size="sm" variant="ghost" className="h-5 text-xs px-1">
          AND
        </Button>
        <Button onClick={() => insertSelectionGroup(position)} size="sm" variant="ghost" className="h-5 text-xs px-1">
          SELECT
        </Button>
      </div>
    </div>
  );

  // Reusable action buttons
  const CourseActions: React.FC<{ courseIndex: number, showMoveOptions?: boolean }> = ({ courseIndex, showMoveOptions = true }) => (
    <div className="flex gap-1">
      <Button onClick={() => moveCourse(courseIndex, 'up')} disabled={courseIndex === 0} variant="ghost" size="sm" className="h-6 w-6 p-0">
        <ChevronUp className="h-3 w-3" />
      </Button>
      <Button onClick={() => moveCourse(courseIndex, 'down')} disabled={courseIndex === requirement.courses.length - 1} variant="ghost" size="sm" className="h-6 w-6 p-0">
        <ChevronDown className="h-3 w-3" />
      </Button>
      
      {/* Movement options dropdown */}
      {showMoveOptions && allRequirements.length > 1 && (
        <Select onValueChange={(value) => {
          if (value.startsWith('req_')) {
            const targetReqIndex = parseInt(value.replace('req_', ''));
            moveCourseBetweenRequirements(courseIndex, targetReqIndex);
          } else if (value.startsWith('group_')) {
            const targetGroupIndex = parseInt(value.replace('group_', ''));
            moveCourseToGroup(courseIndex, targetGroupIndex);
          }
        }}>
          <SelectTrigger className="h-6 w-6 p-0">
            <Move className="h-3 w-3" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" disabled>Move to...</SelectItem>
            {allRequirements.map((req, idx) => (
              idx !== requirementIndex && (
                <SelectItem key={idx} value={`req_${idx}`}>
                  📁 {req.name}
                </SelectItem>
              )
            ))}
            {requirement.courses.map((course, idx) => (
              course.courseType === 'or_group' || course.courseType === 'and_group' ? (
                <SelectItem key={`group_${idx}`} value={`group_${idx}`}>
                  🔗 {course.title}
                </SelectItem>
              ) : null
            ))}
          </SelectContent>
        </Select>
      )}
      
      <Button onClick={() => removeCourse(courseIndex)} variant="ghost" size="sm" className="h-6 w-6 p-0">
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );

  // Selection option component
  const SelectionOptionCard: React.FC<{ option: Course; optionIndex: number; courseIndex: number }> = ({ option, optionIndex, courseIndex }) => {
    if (option.courseType === 'and_group' || option.courseType === 'or_group') {
      return (
        <div className={`p-1 rounded border ${
          option.courseType === 'and_group' ? 'border-green-200 bg-green-25' : 'border-orange-200 bg-orange-25'
        }`}>
          <div className="flex items-center justify-between mb-0.5">
            <StableInput
              value={option.title}
              onChange={(value) => updateSelectionOption(courseIndex, optionIndex, 'title', value)}
              placeholder={option.courseType === 'and_group' ? "AND Group Title" : "OR Group Title"}
              className="h-5 text-xs bg-transparent font-medium flex-1 mr-2"
            />
            <Button onClick={() => removeSelectionOption(courseIndex, optionIndex)} variant="ghost" size="sm" className="h-5 w-5 p-0">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-0.5">
            {option.groupCourses?.map((groupCourse, groupCourseIndex) => (
              <div key={groupCourseIndex} className="flex items-center gap-2">
                {/* Left side: Code and Title (evenly sized) */}
                <div className="flex gap-2 flex-1">
                  <StableInput
                    value={groupCourse.code}
                    onChange={(value) => updateSelectionOptionGroupCourse(courseIndex, optionIndex, groupCourseIndex, 'code', value)}
                    placeholder="BIOS 1107"
                    className="h-6 text-xs flex-1"
                  />
                  <StableInput
                    value={groupCourse.title}
                    onChange={(value) => updateSelectionOptionGroupCourse(courseIndex, optionIndex, groupCourseIndex, 'title', value)}
                    placeholder="Title"
                    className="h-6 text-xs flex-1"
                  />
                </div>
                
                {/* Right side: Fixed-width controls */}
                <FootnoteInput
                  footnoteRefs={groupCourse.footnoteRefs}
                  courseRef={{ type: 'selectionGroupCourse', courseIndex, optionIndex, groupCourseIndex }}
                  className="w-40"
                />
                
                <Button onClick={() => removeSelectionOptionGroupCourse(courseIndex, optionIndex, groupCourseIndex)} variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button onClick={() => addSelectionOptionGroupCourse(courseIndex, optionIndex)} size="sm" variant="outline" className="w-full h-6 text-xs">
              <Plus className="h-3 w-3 mr-1" />Add Course
            </Button>
          </div>
        </div>
      );
    } else {
      // Regular selection option
      return (
        <div className="flex items-center gap-2 p-1 rounded border">
          {/* Left side: Code and Title (evenly sized) */}
          <div className="flex gap-2 flex-1">
            <StableInput
              value={option.code}
              onChange={(value) => updateSelectionOption(courseIndex, optionIndex, 'code', value)}
              placeholder="EAS 2600"
              className="h-6 text-xs flex-1"
            />
            <StableInput
              value={option.title}
              onChange={(value) => updateSelectionOption(courseIndex, optionIndex, 'title', value)}
              placeholder="Course title"
              className="h-6 text-xs flex-1"
            />
          </div>
          
          {/* Right side: Fixed-width controls */}
          <FootnoteInput
            footnoteRefs={option.footnoteRefs}
            courseRef={{ type: 'selectionOption', courseIndex, optionIndex }}
            className="w-40"
          />
          
          <Button onClick={() => removeSelectionOption(courseIndex, optionIndex)} variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      );
    }
  };

  const addNestedGroup = (parentGroupIndex: number, nestedType: 'or' | 'and') => {
    const updatedCourses = [...requirement.courses];
    const parentGroup = updatedCourses[parentGroupIndex];
    
    if (!parentGroup.groupCourses) parentGroup.groupCourses = [];
    
    const nestedGroup: Course = {
      code: nestedType === 'or' ? "OR_GROUP" : "AND_GROUP",
      title: `${nestedType.toUpperCase()} Group`,
      courseType: nestedType === 'or' ? "or_group" : "and_group",
      groupId: `nested_${nestedType}_${Date.now()}`,
      groupCourses: [],
      footnoteRefs: []
    };
    
    parentGroup.groupCourses.push(nestedGroup);
    onUpdate('courses', updatedCourses);
  };

  // NEW: Add course to nested group
  const addCourseToNestedGroup = (parentGroupIndex: number, nestedGroupIndex: number) => {
    const updatedCourses = [...requirement.courses];
    const nestedGroup = updatedCourses[parentGroupIndex].groupCourses![nestedGroupIndex];
    
    if (!nestedGroup.groupCourses) nestedGroup.groupCourses = [];
    
    nestedGroup.groupCourses.push({
      code: "",
      title: "",
      courseType: "regular",
      footnoteRefs: []
    });
    
    onUpdate('courses', updatedCourses);
  };

  // NEW: Update nested group course
  const updateNestedGroupCourse = (parentGroupIndex: number, nestedGroupIndex: number, courseIndex: number, field: string, value: any) => {
    const updatedCourses = [...requirement.courses];
    (updatedCourses[parentGroupIndex].groupCourses![nestedGroupIndex].groupCourses![courseIndex] as any)[field] = value;
    onUpdate('courses', updatedCourses);
  };

  // NEW: Remove nested group course
  const removeNestedGroupCourse = (parentGroupIndex: number, nestedGroupIndex: number, courseIndex: number) => {
    const updatedCourses = [...requirement.courses];
    updatedCourses[parentGroupIndex].groupCourses![nestedGroupIndex].groupCourses!.splice(courseIndex, 1);
    onUpdate('courses', updatedCourses);
  };

  // NEW: Remove entire nested group
  const removeNestedGroup = (parentGroupIndex: number, nestedGroupIndex: number) => {
    const updatedCourses = [...requirement.courses];
    updatedCourses[parentGroupIndex].groupCourses!.splice(nestedGroupIndex, 1);
    onUpdate('courses', updatedCourses);
  };

  // NEW: Nested Group Component
  const NestedGroupCard: React.FC<{ 
    nestedGroup: Course; 
    parentGroupIndex: number; 
    nestedGroupIndex: number; 
  }> = ({ nestedGroup, parentGroupIndex, nestedGroupIndex }) => (
    <div className={`p-1 rounded border border-dashed ${
      nestedGroup.courseType === 'or_group' ? 'border-orange-400 bg-orange-100' : 'border-green-400 bg-green-100'
    }`}>
      <div className="flex items-center justify-end mb-0.5">
        <Button onClick={() => removeNestedGroup(parentGroupIndex, nestedGroupIndex)} variant="ghost" size="sm" className="h-5 w-5 p-0">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="space-y-0.5">
        {nestedGroup.groupCourses?.map((course, courseIndex) => (
          <div key={courseIndex} className="flex items-center gap-2 p-1 rounded bg-white border">
            {/* Left side: Code and Title (evenly sized) */}
            <div className="flex gap-2 flex-1">
              <StableInput
                value={course.code}
                onChange={(value) => updateNestedGroupCourse(parentGroupIndex, nestedGroupIndex, courseIndex, 'code', value)}
                placeholder="BIOS 1107"
                className="h-5 text-xs flex-1"
              />
              <StableInput
                value={course.title}
                onChange={(value) => updateNestedGroupCourse(parentGroupIndex, nestedGroupIndex, courseIndex, 'title', value)}
                placeholder="Course title"
                className="h-5 text-xs flex-1"
              />
            </div>
            
            {/* Right side: Fixed-width controls */}
            <FootnoteInput
              footnoteRefs={course.footnoteRefs}
              courseRef={{ 
                type: 'nestedGroupCourse', 
                courseIndex: parentGroupIndex, 
                groupIndex: nestedGroupIndex,
                nestedCourseIndex: courseIndex 
              }}
              className="w-40"
            />
            
            <Button onClick={() => removeNestedGroupCourse(parentGroupIndex, nestedGroupIndex, courseIndex)} variant="ghost" size="sm" className="h-5 w-5 p-0">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        
        <div className="flex gap-1">
          <Button onClick={() => addCourseToNestedGroup(parentGroupIndex, nestedGroupIndex)} size="sm" variant="outline" className="flex-1 h-5 text-xs">
            <Plus className="h-3 w-3 mr-1" />Course
          </Button>
        </div>
      </div>
    </div>
  );

  // Compact course card component
  const CourseCard: React.FC<{ course: Course; courseIndex: number }> = ({ course, courseIndex }) => (
  <Card className={`p-0 bg-gray-200 relative transition-all duration-200 gap-1 ${
    course.courseType === 'or_group' ? 'border-orange-300 bg-orange-50' :
    course.courseType === 'and_group' ? 'border-green-300 bg-green-50' :
    course.courseType === 'selection' ? 'border-purple-300 bg-purple-50' :
    'border-gray-200 bg-white'
  }`}>
    
    <CardContent className="p-1">
      {course.courseType === 'or_group' || course.courseType === 'and_group' ? (
        // Logic Group - COMPACT without header
        <>
          <div className="flex items-center gap-2">
            <div className="flex gap-2 flex-1">
              <StableInput
                value={course.title}
                onChange={(value) => updateCourse(courseIndex, 'title', value)}
                className="h-5 text-xs bg-transparent font-medium flex-1"
                placeholder="Group name"
              />
            </div>
            
            <FootnoteInput
              footnoteRefs={course.footnoteRefs}
              courseRef={{ type: 'course', courseIndex }}
              className="w-12"
            />
            
            <CourseActions courseIndex={courseIndex} />
          </div>
          
          {/* Compact group courses */}
          <div className="space-y-0.5">
            {course.groupCourses?.map((groupCourse, groupCourseIndex) => (
              <div key={groupCourseIndex}> 
              {groupCourse.courseType === 'or_group' || groupCourse.courseType === 'and_group' ? (
                <NestedGroupCard 
                  nestedGroup={groupCourse}
                  parentGroupIndex={courseIndex}
                  nestedGroupIndex={groupCourseIndex}
                />
              ) : (
                <div className={`flex items-center gap-2 p-0.5 rounded border ${
                  course.courseType === 'or_group' ? 'bg-orange-25 border-orange-200' : 'bg-green-25 border-green-200'
                }`}>
                  {/* Left side: Code and Title (evenly sized) */}
                  <div className="flex gap-2 flex-1">
                    <StableInput
                      value={groupCourse.code}
                      onChange={(value) => updateGroupCourse(courseIndex, groupCourseIndex, 'code', value)}
                      placeholder="CS 1371"
                      className="h-6 text-xs flex-1"
                    />
                    <StableInput
                      value={groupCourse.title}
                      onChange={(value) => updateGroupCourse(courseIndex, groupCourseIndex, 'title', value)}
                      placeholder="Course title"
                      className="h-6 text-xs flex-1"
                    />
                  </div>
                  
                  {/* Right side: Fixed-width controls */}
                  <FootnoteInput
                    footnoteRefs={groupCourse.footnoteRefs}
                    courseRef={{ type: 'groupCourse', courseIndex, groupIndex: groupCourseIndex }}
                    className="w-40"
                  />
                  
                  <Button 
                    onClick={() => extractCourseFromGroup(courseIndex, groupCourseIndex)} 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    title="Extract from group"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                  <Button onClick={() => removeGroupCourse(courseIndex, groupCourseIndex)} variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
              </div>
            )}
          </div>
        ))}

          <div className="flex gap-1">
              <Button onClick={() => addCourseToGroup(courseIndex)} size="sm" variant="outline" className="flex-1 h-6 text-xs">
                <Plus className="h-3 w-3 mr-1" />Course
              </Button>
              <Button onClick={() => addNestedGroup(courseIndex, course.courseType === 'or_group' ? 'and' : 'or')} size="sm" variant="outline" className="flex-1 h-6 text-xs">
                + {course.courseType === 'or_group' ? 'AND' : 'OR'}
              </Button>
            </div>
          </div>
        </>
      ) : course.courseType === 'selection' ? (
        // Selection Group - COMPACT without header
        <>
          <div className="flex items-center gap-2 mb-1">
            <StableInput
              value={course.title}
              onChange={(value) => updateCourse(courseIndex, 'title', value)}
              className="h-5 text-xs bg-transparent font-medium flex-1"
              placeholder="Selection Group Title"
            />
            
            <FootnoteInput
              footnoteRefs={course.footnoteRefs}
              courseRef={{ type: 'course', courseIndex }}
              className="w-12"
            />
            
            <CourseActions courseIndex={courseIndex} />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs flex-1">
              <span>Select</span>
              <StableInput
                type="number"
                value={String(course.selectionCount || 1)}
                onChange={(value) => updateCourse(courseIndex, 'selectionCount', parseInt(value) || 1)}
                className="h-5 w-12 text-center text-xs font-medium"
                min="1"
                max="20"
              />
              <span>of the following:</span>
            </div>
          </div>
          
          {/* Selection options - compact */}
          <div className="space-y-0.5">
            {course.selectionOptions?.map((option, optionIndex) => (
              <SelectionOptionCard key={optionIndex} option={option} optionIndex={optionIndex} courseIndex={courseIndex} />
            ))}
            <div className="flex gap-1">
              <Button onClick={() => addSelectionOption(courseIndex, 'regular')} size="sm" variant="outline" className="flex-1 h-6 text-xs">
                <Plus className="h-3 w-3 mr-1" />Course
              </Button>
              <Button onClick={() => addSelectionOption(courseIndex, 'and_group')} size="sm" variant="outline" className="flex-1 h-6 text-xs">
                AND Group
              </Button>
              <Button onClick={() => addSelectionOption(courseIndex, 'or_group')} size="sm" variant="outline" className="flex-1 h-6 text-xs">
                OR Group
              </Button>
            </div>
          </div>
        </>
      ) : (
        // Regular Course - IMPROVED LAYOUT
        <div className="flex items-center gap-2">
          {/* Left side: Code and Title (evenly sized) */}
          <div className="flex gap-2 flex-1">
            <StableInput
              value={course.code || ''}
              onChange={(value) => updateCourse(courseIndex, 'code', value)}
              placeholder="CS 1371"
              className="h-6 text-xs flex-1"
            />
            <StableInput
              value={course.title}
              onChange={(value) => updateCourse(courseIndex, 'title', value)}
              placeholder="Course title"
              className="h-6 text-xs flex-1"
            />
          </div>
          
          {/* Right side: Fixed-width controls */}
          <Select
            value={course.courseType || 'regular'}
            onValueChange={(value) => updateCourse(courseIndex, 'courseType', value)}
          >
            <SelectTrigger className="h-6 w-25 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="or_option">OR</SelectItem>
              <SelectItem value="flexible">Flex</SelectItem>
            </SelectContent>
          </Select>
          
          <FootnoteInput
            footnoteRefs={course.footnoteRefs}
            courseRef={{ type: 'course', courseIndex }}
            className="w-40"
          />
          
          <CourseActions courseIndex={courseIndex} />
        </div>
      )}
    </CardContent>
  </Card>
  );

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-1">
        <div className="flex items-center gap-2">
          <StableInput
            value={requirementName}
            onChange={(value) => onUpdate('name', value)}
            placeholder="Requirement name"
            className="h-7 text-xs flex-1 font-medium"
          />
          <Badge variant="outline" className="text-xs px-1">
            Structure Only
          </Badge>
          <Button 
            onClick={() => setShowFootnotes(!showFootnotes)} 
            variant="outline" 
            size="sm" 
            className="h-7 px-2"
          >
            <BookOpen className="h-3 w-3 mr-1" />
            Footnotes ({requirement.footnotes?.length || 0})
          </Button>
          <Button onClick={onRemove} variant="outline" size="sm" className="h-7 px-2">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-1 space-y-2">
        {/* Footnotes Management */}
        {showFootnotes && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Footnotes</h4>
                <div className="flex gap-1">
                  <Button onClick={addFootnote} size="sm" variant="outline" className="h-6 text-xs">
                    <Plus className="h-3 w-3 mr-1" />Add Footnote
                  </Button>
                  <Button onClick={() => setShowFootnotes(false)} size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {requirement.footnotes?.map((footnote, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-white rounded border">
                  <StableInput
                    value={footnote.number}
                    onChange={(value) => updateFootnote(index, 'number', value)}
                    placeholder="1"
                    className="h-6 w-8 text-xs text-center"
                  />
                  <StableTextarea
                    value={footnote.text}
                    onChange={(value) => updateFootnote(index, 'text', value)}
                    placeholder="Footnote text..."
                    className="text-xs min-h-[24px] flex-1"
                    rows={1}
                  />
                  <Button onClick={() => removeFootnote(index)} variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {(!requirement.footnotes || requirement.footnotes.length === 0) && (
                <div className="text-xs text-gray-500 italic text-center py-2">
                  No footnotes yet. Click &quot;Add Footnote&quot; to create one.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* COMPACT ADD BUTTONS */}
        <div className="flex gap-1">
          <Button onClick={addCourse} size="sm" variant="outline" className="flex-1 h-6 text-xs">
            Course
          </Button>
          <Button onClick={() => addLogicGroup('or')} size="sm" variant="outline" className="flex-1 h-6 text-xs">
            OR
          </Button>
          <Button onClick={() => addLogicGroup('and')} size="sm" variant="outline" className="flex-1 h-6 text-xs">
            AND
          </Button>
          <Button onClick={() => addSelectionGroup()} size="sm" variant="outline" className="flex-1 h-6 text-xs">
            SELECT
          </Button>
        </div>
        
        {/* COURSES WITH INSERT BUTTONS - COMPACT */}
        <div className="space-y-0.5">
          {requirement.courses?.map((course, courseIndex) => (
            <div key={courseIndex}>
              {/* Insert buttons above each course - SMALLER */}
              {courseIndex === 0 && (
                <InsertButtons position={0} />
              )}

              <CourseCard key={`course-${courseIndex}`} course={course} courseIndex={courseIndex} />

              {/* Insert buttons below each course - SMALLER */}
              <InsertButtons position={courseIndex + 1} />
            </div>
          ))}
          
          {/* If no courses, show insert buttons */}
          {(!requirement.courses || requirement.courses.length === 0) && (
            <InsertButtons position={0} />
          )}
        </div>
      </CardContent>
    </Card>
  );
};