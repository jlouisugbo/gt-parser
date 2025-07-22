/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronUp, ChevronDown, BookOpen, X } from 'lucide-react';

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
}

export const RequirementEditor: React.FC<RequirementEditorProps> = ({ 
  requirement, 
  requirementName,
  onUpdate, 
  onRemove,
}) => {
  const [showFootnotes, setShowFootnotes] = useState(false);


  const FootnoteRefs: React.FC<{ 
  footnoteRefs: number[], 
  courseRef: CourseRef,
  requirementFootnotes?: Footnote[]  // ADD this prop
}> = ({ footnoteRefs, courseRef, requirementFootnotes = [] }) => {  // ADD default empty array
  
  return (
    <div className="flex items-center gap-1 w-30">
      {requirementFootnotes.sort((a, b) => a.number - b.number).map((footnote) => (
        <Button
          key={footnote.number}
          onClick={() => toggleFootnoteRef(courseRef, footnote.number)}
          variant={footnoteRefs.includes(footnote.number) ? "default" : "outline"}
          size="sm"
          className="h-4 w-4 p-0 text-xs"
        >
          {footnote.number}
        </Button>
      ))}
    </div>
  );
};

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

  const updateCourse = (courseIndex: number, field: string, value: any) => {
    const updatedCourses = [...requirement.courses];
    updatedCourses[courseIndex] = {
      ...updatedCourses[courseIndex],
      [field]: value
    };
    onUpdate('courses', updatedCourses);
  };

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

  const updateGroupCourse = (groupIndex: number, courseIndex: number, field: string, value: any) => {
    const updatedCourses = [...requirement.courses];
    (updatedCourses[groupIndex].groupCourses![courseIndex] as any)[field] = value;
    onUpdate('courses', updatedCourses);
  };

  const removeGroupCourse = (groupIndex: number, courseIndex: number) => {
    const updatedCourses = [...requirement.courses];
    updatedCourses[groupIndex].groupCourses!.splice(courseIndex, 1);
    onUpdate('courses', updatedCourses);
  };

  // Selection option management functions
  const addSelectionOption = (courseIndex: number, optionType: 'regular' | 'and_group') => {
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
    }
    
    onUpdate('courses', updatedCourses);
  };

  const updateSelectionOption = (courseIndex: number, optionIndex: number, field: string, value: any) => {
    const updatedCourses = [...requirement.courses];
    (updatedCourses[courseIndex].selectionOptions![optionIndex] as any)[field] = value;
    onUpdate('courses', updatedCourses);
  };

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

  const updateSelectionOptionGroupCourse = (courseIndex: number, optionIndex: number, groupCourseIndex: number, field: string, value: any) => {
    const updatedCourses = [...requirement.courses];
    (updatedCourses[courseIndex].selectionOptions![optionIndex].groupCourses![groupCourseIndex] as any)[field] = value;
    onUpdate('courses', updatedCourses);
  };

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
  const CourseActions: React.FC<{ courseIndex: number }> = ({ courseIndex }) => (
    <div className="flex gap-1">
      <Button onClick={() => moveCourse(courseIndex, 'up')} disabled={courseIndex === 0} variant="ghost" size="sm" className="h-6 w-6 p-0">
        <ChevronUp className="h-3 w-3" />
      </Button>
      <Button onClick={() => moveCourse(courseIndex, 'down')} disabled={courseIndex === requirement.courses.length - 1} variant="ghost" size="sm" className="h-6 w-6 p-0">
        <ChevronDown className="h-3 w-3" />
      </Button>
      <Button onClick={() => removeCourse(courseIndex)} variant="ghost" size="sm" className="h-6 w-6 p-0">
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );

  // Selection option component
  const SelectionOptionCard: React.FC<{ option: Course; optionIndex: number; courseIndex: number }> = ({ option, optionIndex, courseIndex }) => {
    if (option.courseType === 'and_group') {
      return (
        <div className="p-2 rounded border border-green-200 bg-green-25">
          <div className="flex items-center justify-between mb-1">
            <Badge className="bg-green-500 text-white text-xs">AND Group</Badge>
            <Button onClick={() => removeSelectionOption(courseIndex, optionIndex)} variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1">
            {option.groupCourses?.map((groupCourse, groupCourseIndex) => (
              <div key={groupCourseIndex} className="flex items-center gap-1">
                <Input
                  value={groupCourse.code}
                  onChange={(e) => updateSelectionOptionGroupCourse(courseIndex, optionIndex, groupCourseIndex, 'code', e.target.value)}
                  placeholder="BIOS 1107"
                  className="h-6 text-xs w-20"
                />
                <Input
                  value={groupCourse.title}
                  onChange={(e) => updateSelectionOptionGroupCourse(courseIndex, optionIndex, groupCourseIndex, 'title', e.target.value)}
                  placeholder="Title"
                  className="h-6 text-xs flex-1"
                />
                <FootnoteRefs 
                  footnoteRefs={groupCourse.footnoteRefs} 
                  courseRef={{ type: 'selectionGroupCourse', courseIndex, optionIndex, groupCourseIndex }} 
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
        <div className="flex items-center gap-2 p-2 rounded border">
          <Input
            value={option.code}
            onChange={(e) => updateSelectionOption(courseIndex, optionIndex, 'code', e.target.value)}
            placeholder="EAS 2600"
            className="h-6 text-xs w-20"
          />
          <Input
            value={option.title}
            onChange={(e) => updateSelectionOption(courseIndex, optionIndex, 'title', e.target.value)}
            placeholder="Course title"
            className="h-6 text-xs flex-1"
          />
          <FootnoteRefs 
            footnoteRefs={option.footnoteRefs} 
            courseRef={{ type: 'selectionOption', courseIndex, optionIndex }} 
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
    <div className={`p-2 rounded border-2 border-dashed ${
      nestedGroup.courseType === 'or_group' ? 'border-orange-400 bg-orange-100' : 'border-green-400 bg-green-100'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <Badge className={`text-xs ${
          nestedGroup.courseType === 'or_group' ? 'bg-orange-600 text-white' : 'bg-green-600 text-white'
        }`}>
          NESTED {nestedGroup.courseType === 'or_group' ? 'OR' : 'AND'}
        </Badge>
        <Button onClick={() => removeNestedGroup(parentGroupIndex, nestedGroupIndex)} variant="ghost" size="sm" className="h-5 w-5 p-0">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="space-y-1">
        {nestedGroup.groupCourses?.map((course, courseIndex) => (
          <div key={courseIndex} className="flex items-center gap-1 p-1 rounded bg-white border">
            <Input
              value={course.code}
              onChange={(e) => updateNestedGroupCourse(parentGroupIndex, nestedGroupIndex, courseIndex, 'code', e.target.value)}
              placeholder="BIOS 1107"
              className="h-5 text-xs w-40"
            />
            <Input
              value={course.title}
              onChange={(e) => updateNestedGroupCourse(parentGroupIndex, nestedGroupIndex, courseIndex, 'title', e.target.value)}
              placeholder="Course title"
              className="h-5 text-xs flex-1"
            />
            <FootnoteRefs 
              footnoteRefs={course.footnoteRefs} 
              courseRef={{ 
                type: 'nestedGroupCourse', 
                courseIndex: parentGroupIndex, 
                groupIndex: nestedGroupIndex,
                nestedCourseIndex: courseIndex 
              }} 
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
    
    <CardContent className="p-0 px-1">
      {course.courseType === 'or_group' || course.courseType === 'and_group' ? (
        // Logic Group - SUPER COMPACT w/ nested groups
        <>
          <div className="flex items-center justify-between mb-1">
            <Badge className={`text-xs px-2 py-0 ${
              course.courseType === 'or_group' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
            }`}>
              {course.courseType === 'or_group' ? 'OR' : 'AND'} GROUP
            </Badge>
            <div className="flex items-center gap-1">
              <Input
                value={course.title}
                onChange={(e) => updateCourse(courseIndex, 'title', e.target.value)}
                className="h-5 text-xs bg-transparent font-medium w-32"
                placeholder="Group name"
              />
            </div>
            <CourseActions courseIndex={courseIndex} />
          </div>
          
          {/* Compact group courses */}
          <div className="space-y-1">
            {course.groupCourses?.map((groupCourse, groupCourseIndex) => (
              <div key={groupCourseIndex}> 
              {groupCourse.courseType === 'or_group' || groupCourse.courseType === 'and_group' ? (
                <NestedGroupCard 
                  nestedGroup={groupCourse}
                  parentGroupIndex={courseIndex}
                  nestedGroupIndex={groupCourseIndex}
                />
              ) : (
                <div className={`flex items-center gap-1 p-1 rounded border ${
                  course.courseType === 'or_group' ? 'bg-orange-25 border-orange-200' : 'bg-green-25 border-green-200'
                }`}>
                  <Input
                    value={groupCourse.code}
                    onChange={(e) => updateGroupCourse(courseIndex, groupCourseIndex, 'code', e.target.value)}
                    placeholder="CS 1371"
                    className="h-6 text-xs w-40"
                />
                <Input
                  value={groupCourse.title}
                  onChange={(e) => updateGroupCourse(courseIndex, groupCourseIndex, 'title', e.target.value)}
                  placeholder="Course title"
                  className="h-6 text-xs flex-1"
                />
                <FootnoteRefs 
                  footnoteRefs={groupCourse.footnoteRefs} 
                  courseRef={{ type: 'groupCourse', courseIndex, groupIndex: groupCourseIndex }} 
                />
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
        // Selection Group - SUPER COMPACT
        <>
          <div className="flex items-center justify-between mb-1">
            <Badge className="bg-purple-500 text-white text-xs px-2 py-0">SELECT</Badge>
            <div className="flex items-center gap-1 text-xs">
              <span>Select</span>
              <Input
                type="number"
                value={course.selectionCount || 1}
                onChange={(e) => updateCourse(courseIndex, 'selectionCount', parseInt(e.target.value) || 1)}
                className="h-5 w-8 text-center text-xs"
              />
              <span>of:</span>
            </div>
            <CourseActions courseIndex={courseIndex} />
          </div>
          
          {/* Selection options - compact */}
          <div className="space-y-1">
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
            </div>
          </div>
        </>
      ) : (
        // Regular Course - SUPER COMPACT
        <div className="flex items-center gap-1">
          <Input
            value={course.code || ''}
            onChange={(e) => updateCourse(courseIndex, 'code', e.target.value)}
            placeholder="CS 1371"
            className="h-6 text-xs w-40"
          />
          <Input
            value={course.title}
            onChange={(e) => updateCourse(courseIndex, 'title', e.target.value)}
            placeholder="Course title"
            className="h-6 text-xs flex-1"
          />
          <Select
            value={course.courseType || 'regular'}
            onValueChange={(value) => updateCourse(courseIndex, 'courseType', value)}
          >
            <SelectTrigger className="h-6 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="or_option">OR</SelectItem>
              <SelectItem value="flexible">Flex</SelectItem>
            </SelectContent>
          </Select>
          <FootnoteRefs 
            footnoteRefs={course.footnoteRefs} 
            courseRef={{ type: 'course', courseIndex }} 
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
          <Input
            value={requirementName}
            onChange={(e) => onUpdate('name', e.target.value)}
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
                  <Input
                    value={footnote.number}
                    onChange={(e) => updateFootnote(index, 'number', e.target.value)}
                    placeholder="1"
                    className="h-6 w-8 text-xs text-center"
                  />
                  <Textarea
                    value={footnote.text}
                    onChange={(e) => updateFootnote(index, 'text', e.target.value)}
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
        <div className="space-y-1">
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