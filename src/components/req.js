import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronUp, ChevronDown, Parentheses } from 'lucide-react';

export const RequirementEditor = ({ 
  requirement, 
  onUpdate, 
  onRemove,
}) => {

  const addCourse = () => {
    const updatedCourses = [...(requirement.courses || []), {
      code: "",
      title: "",
      credits: 0,
      courseType: "regular",
      footnoteRefs: []
    }];
    onUpdate('courses', updatedCourses);
  };

  const updateCourse = (courseIndex, field, value) => {
    const updatedCourses = [...requirement.courses];
    updatedCourses[courseIndex][field] = value;
    onUpdate('courses', updatedCourses);
  };

  const removeCourse = (courseIndex) => {
    const updatedCourses = requirement.courses.filter((_, index) => index !== courseIndex);
    onUpdate('courses', updatedCourses);
  };

  const moveCourse = (courseIndex, direction) => {
    const updatedCourses = [...requirement.courses];
    const newIndex = direction === 'up' ? courseIndex - 1 : courseIndex + 1;
    
    if (newIndex >= 0 && newIndex < updatedCourses.length) {
      const [movedItem] = updatedCourses.splice(courseIndex, 1);
      updatedCourses.splice(newIndex, 0, movedItem);
      onUpdate('courses', updatedCourses);
    }
  };

  const addLogicGroup = (type) => {
    const updatedCourses = [...(requirement.courses || [])];
    const groupId = `group_${Date.now()}`;
    
    if (type === 'or') {
      updatedCourses.push({
        code: "OR_GROUP",
        title: "OR Logic Group",
        credits: 0,
        courseType: "or_group",
        groupId: groupId,
        groupCourses: [],
        footnoteRefs: []
      });
    } else if (type === 'and') {
      updatedCourses.push({
        code: "AND_GROUP", 
        title: "AND Logic Group",
        credits: 0,
        courseType: "and_group",
        groupId: groupId,
        groupCourses: [],
        footnoteRefs: []
      });
    }
    
    onUpdate('courses', updatedCourses);
  };

  const addCourseToGroup = (groupIndex) => {
    const updatedCourses = [...requirement.courses];
    updatedCourses[groupIndex].groupCourses = updatedCourses[groupIndex].groupCourses || [];
    updatedCourses[groupIndex].groupCourses.push({
      code: "",
      title: "",
      credits: 0,
      courseType: "regular",
      footnoteRefs: []
    });
    
    // Auto-update group credits
    if (updatedCourses[groupIndex].courseType === 'and_group') {
      updatedCourses[groupIndex].credits = updatedCourses[groupIndex].groupCourses.reduce((sum, c) => sum + (c.credits || 0), 0);
    } else if (updatedCourses[groupIndex].courseType === 'or_group') {
      updatedCourses[groupIndex].credits = Math.max(...updatedCourses[groupIndex].groupCourses.map(c => c.credits || 0));
    }
    
    onUpdate('courses', updatedCourses);
  };

  const updateGroupCourse = (groupIndex, courseIndex, field, value) => {
    const updatedCourses = [...requirement.courses];
    updatedCourses[groupIndex].groupCourses[courseIndex][field] = value;
    
    // Auto-update group credits when course credits change
    if (field === 'credits') {
      if (updatedCourses[groupIndex].courseType === 'and_group') {
        updatedCourses[groupIndex].credits = updatedCourses[groupIndex].groupCourses.reduce((sum, c) => sum + (c.credits || 0), 0);
      } else if (updatedCourses[groupIndex].courseType === 'or_group') {
        updatedCourses[groupIndex].credits = Math.max(...updatedCourses[groupIndex].groupCourses.map(c => c.credits || 0));
      }
    }
    
    onUpdate('courses', updatedCourses);
  };

  const removeGroupCourse = (groupIndex, courseIndex) => {
    const updatedCourses = [...requirement.courses];
    updatedCourses[groupIndex].groupCourses.splice(courseIndex, 1);
    
    // Auto-update group credits
    if (updatedCourses[groupIndex].courseType === 'and_group') {
      updatedCourses[groupIndex].credits = updatedCourses[groupIndex].groupCourses.reduce((sum, c) => sum + (c.credits || 0), 0);
    } else if (updatedCourses[groupIndex].courseType === 'or_group') {
      updatedCourses[groupIndex].credits = Math.max(...updatedCourses[groupIndex].groupCourses.map(c => c.credits || 0));
    }
    
    onUpdate('courses', updatedCourses);
  };

  // Calculate credits for this requirement (same logic as parent)
  const calculateRequirementCredits = (courses) => {
    if (!courses || courses.length === 0) return 0;
    
    let totalCredits = 0;
    let hasSelectionRequirement = false;
    let selectionCredits = 0;
    
    for (const course of courses) {
      if (course.courseType === 'selection' || course.isSelection) {
        hasSelectionRequirement = true;
        selectionCredits = course.credits || 0;
      } else if (course.courseType === 'or_group') {
        totalCredits += course.credits || 0;
      } else if (course.courseType === 'and_group') {
        totalCredits += course.credits || 0;
      } else if (course.courseType === 'flexible') {
        totalCredits += course.credits || 0;
      } else if (course.courseType !== 'or_option') {
        totalCredits += course.credits || 0;
      }
    }
    
    if (hasSelectionRequirement) {
      totalCredits += selectionCredits;
    }
    
    return totalCredits;
  };

  const renderCourseTypeInfo = (courseType) => {
    const typeInfo = {
      regular: { label: "Regular Course", color: "bg-blue-100 text-blue-800" },
      or_option: { label: "OR Option", color: "bg-orange-100 text-orange-800" },
      and_group: { label: "AND Group", color: "bg-green-100 text-green-800" },
      or_group: { label: "OR Group", color: "bg-purple-100 text-purple-800" },
      flexible: { label: "Flexible Req", color: "bg-yellow-100 text-yellow-800" },
      selection: { label: "Selection Req", color: "bg-pink-100 text-pink-800" }
    };
    
    const info = typeInfo[courseType] || typeInfo.regular;
    return <Badge className={`text-sm px-3 py-1 ${info.color}`}>{info.label}</Badge>;
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
            <div>
              <label className="block text-sm font-medium mb-2">Requirement Name</label>
              <Input
                value={requirement.name}
                onChange={(e) => onUpdate('name', e.target.value)}
                placeholder="Requirement name"
                className="h-12 text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Credits</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={requirement.credits}
                  onChange={(e) => onUpdate('credits', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="h-12 text-base"
                />
                <Badge variant="outline" className="text-sm whitespace-nowrap px-3 py-1">
                  Auto: {calculateRequirementCredits(requirement.courses || [])}
                </Badge>
              </div>
            </div>
          </div>
          <Button 
            onClick={onRemove} 
            variant="outline" 
            size="default"
            className="h-12 w-full lg:w-auto lg:ml-4"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <h5 className="text-base font-medium">Courses ({requirement.courses?.length || 0})</h5>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button onClick={addCourse} size="default" variant="outline" className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              Add Course
            </Button>
            <Button onClick={() => addLogicGroup('or')} size="default" variant="outline" className="flex-1 sm:flex-none">
              <Parentheses className="h-4 w-4 mr-2" />
              OR Group
            </Button>
            <Button onClick={() => addLogicGroup('and')} size="default" variant="outline" className="flex-1 sm:flex-none">
              <Parentheses className="h-4 w-4 mr-2" />
              AND Group
            </Button>
          </div>
        </div>
        
        <div className="space-y-6">
          {requirement.courses?.map((course, courseIndex) => (
            <div key={courseIndex}>
              {course.courseType === 'or_group' || course.courseType === 'and_group' ? (
                // Logic Group Rendering
                <Card className="bg-gray-50 border-dashed border-2">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Badge className={`${course.courseType === 'or_group' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'} text-base px-3 py-1`}>
                          {course.courseType === 'or_group' ? 'OR' : 'AND'} Group
                        </Badge>
                        <span className="text-base font-medium">{course.title}</span>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          onClick={() => moveCourse(courseIndex, 'up')}
                          disabled={courseIndex === 0}
                          variant="outline"
                          size="default"
                          className="flex-1 sm:flex-none"
                        >
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Up
                        </Button>
                        <Button
                          onClick={() => moveCourse(courseIndex, 'down')}
                          disabled={courseIndex === requirement.courses.length - 1}
                          variant="outline"
                          size="default"
                          className="flex-1 sm:flex-none"
                        >
                          <ChevronDown className="h-4 w-4 mr-1" />
                          Down
                        </Button>
                        <Button 
                          onClick={() => removeCourse(courseIndex)} 
                          variant="outline" 
                          size="default"
                          className="flex-1 sm:flex-none"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {course.groupCourses?.map((groupCourse, groupCourseIndex) => (
                        <Card key={groupCourseIndex} className="bg-white border">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                              <div>
                                <label className="block text-sm font-medium mb-2">Code</label>
                                <Input
                                  value={groupCourse.code}
                                  onChange={(e) => updateGroupCourse(courseIndex, groupCourseIndex, 'code', e.target.value)}
                                  placeholder="CS 1371"
                                  className="h-10"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-sm font-medium mb-2">Title</label>
                                <Input
                                  value={groupCourse.title}
                                  onChange={(e) => updateGroupCourse(courseIndex, groupCourseIndex, 'title', e.target.value)}
                                  placeholder="Course title"
                                  className="h-10"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">Credits</label>
                                <Input
                                  type="number"
                                  value={groupCourse.credits}
                                  onChange={(e) => updateGroupCourse(courseIndex, groupCourseIndex, 'credits', parseInt(e.target.value) || 0)}
                                  placeholder="0"
                                  className="h-10"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">Footnotes</label>
                                <Input
                                  value={groupCourse.footnoteRefs?.join(',') || ''}
                                  onChange={(e) => {
                                    const footnotes = e.target.value
                                      .split(',')
                                      .map(n => parseInt(n.trim()))
                                      .filter(n => !isNaN(n));
                                    updateGroupCourse(courseIndex, groupCourseIndex, 'footnoteRefs', footnotes);
                                  }}
                                  placeholder="1,2,3"
                                  className="h-10"
                                />
                              </div>
                              <div className="flex items-end gap-2">
                                <Button 
                                  onClick={() => removeGroupCourse(courseIndex, groupCourseIndex)} 
                                  variant="outline" 
                                  size="default"
                                  className="h-10 w-full"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {groupCourse.footnoteRefs && groupCourse.footnoteRefs.length > 0 && (
                              <div className="mt-3">
                                <Badge variant="outline" className="text-sm">
                                  Footnotes: {groupCourse.footnoteRefs.join(',')}
                                </Badge>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      <Button 
                        onClick={() => addCourseToGroup(courseIndex)} 
                        size="default" 
                        variant="outline"
                        className="w-full h-12"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Course to {course.courseType === 'or_group' ? 'OR' : 'AND'} Group
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                // Regular Course Rendering
                <Card className="bg-gray-50 border">
                  <CardContent className="p-4 sm:p-6">
                    {/* Mobile Move Buttons */}
                    <div className="flex sm:hidden justify-between items-center mb-4">
                      <span className="text-sm font-medium text-gray-600">Course {courseIndex + 1}</span>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => moveCourse(courseIndex, 'up')}
                          disabled={courseIndex === 0}
                          variant="outline"
                          size="sm"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => moveCourse(courseIndex, 'down')}
                          disabled={courseIndex === requirement.courses.length - 1}
                          variant="outline"
                          size="sm"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 relative">
                      {/* Desktop Move Buttons */}
                      <div className="hidden sm:flex absolute -left-12 top-8 flex-col gap-2">
                        <Button
                          onClick={() => moveCourse(courseIndex, 'up')}
                          disabled={courseIndex === 0}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => moveCourse(courseIndex, 'down')}
                          disabled={courseIndex === requirement.courses.length - 1}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Code</label>
                        <Input
                          value={course.code}
                          onChange={(e) => updateCourse(courseIndex, 'code', e.target.value)}
                          placeholder="CS 1371"
                          className="h-12"
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-medium mb-2">Title</label>
                        <Input
                          value={course.title}
                          onChange={(e) => updateCourse(courseIndex, 'title', e.target.value)}
                          placeholder="Course title"
                          className="h-12"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Credits</label>
                        <Input
                          type="number"
                          value={course.credits}
                          onChange={(e) => updateCourse(courseIndex, 'credits', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="h-12"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Footnotes</label>
                        <Input
                          value={course.footnoteRefs?.join(',') || ''}
                          onChange={(e) => {
                            const footnotes = e.target.value
                              .split(',')
                              .map(n => parseInt(n.trim()))
                              .filter(n => !isNaN(n));
                            updateCourse(courseIndex, 'footnoteRefs', footnotes);
                          }}
                          placeholder="1,2,3"
                          className="h-12"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Type</label>
                        <Select
                          value={course.courseType || 'regular'}
                          onValueChange={(value) => updateCourse(courseIndex, 'courseType', value)}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="regular">Regular Course</SelectItem>
                            <SelectItem value="or_option">OR Option</SelectItem>
                            <SelectItem value="flexible">Flexible Req</SelectItem>
                            <SelectItem value="selection">Selection Req</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Status and Actions Row */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-4">
                      <div className="flex items-center gap-3">
                        {renderCourseTypeInfo(course.courseType || 'regular')}
                        {course.footnoteRefs && course.footnoteRefs.length > 0 && (
                          <Badge variant="outline" className="text-sm">
                            Footnotes: {course.footnoteRefs.join(',')}
                          </Badge>
                        )}
                      </div>
                      <Button 
                        onClick={() => removeCourse(courseIndex)} 
                        variant="outline" 
                        size="default"
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Course
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};