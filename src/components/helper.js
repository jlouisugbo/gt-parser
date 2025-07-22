
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { RequirementEditor } from './req';
import { Badge } from "@/components/ui/badge";

export const VisualFormEditor = ({ data, onChange }) => {
  const [formData, setFormData] = useState(data);

  const updateProgramInfo = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onChange(updated);
  };

  const updateRequirement = (reqIndex, field, value) => {
    const updated = { ...formData };
    updated.requirements[reqIndex][field] = value;
    
    // Auto-recalculate credits when courses change
    if (field === 'courses') {
      updated.requirements[reqIndex].credits = calculateRequirementCredits(value);
    }
    
    setFormData(updated);
    onChange(updated);
    
    // Recalculate total program credits
    recalculateTotalCredits(updated);
  };

  const addRequirement = () => {
    const updated = { ...formData };
    updated.requirements.push({
      name: "New Requirement",
      credits: 0,
      courses: []
    });
    setFormData(updated);
    onChange(updated);
  };

  const removeRequirement = (index) => {
    const updated = { ...formData };
    updated.requirements.splice(index, 1);
    setFormData(updated);
    onChange(updated);
    
    // Recalculate total credits after removal
    recalculateTotalCredits(updated);
  };

  const moveRequirement = (index, direction) => {
    const updated = { ...formData };
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < updated.requirements.length) {
      const [movedItem] = updated.requirements.splice(index, 1);
      updated.requirements.splice(newIndex, 0, movedItem);
      setFormData(updated);
      onChange(updated);
    }
  };

  // NEW: Calculate credits for a requirement
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
        // OR groups - take the max credits (student chooses one)
        const groupCredits = course.groupCourses ? 
          Math.max(...course.groupCourses.map(c => c.credits || 0)) : 0;
        totalCredits += groupCredits;
      } else if (course.courseType === 'and_group') {
        // AND groups - sum all credits (student takes all)
        const groupCredits = course.groupCourses ? 
          course.groupCourses.reduce((sum, c) => sum + (c.credits || 0), 0) : 0;
        totalCredits += groupCredits;
      } else if (course.courseType === 'flexible') {
        // Flexible requirements always count
        totalCredits += course.credits || 0;
      } else if (course.courseType !== 'or_option') {
        // Regular required courses (not OR options)
        totalCredits += course.credits || 0;
      }
      // OR options don't add to total (they're alternatives)
    }
    
    // Add selection requirement credits
    if (hasSelectionRequirement) {
      totalCredits += selectionCredits;
    }
    
    return totalCredits;
  };

  // NEW: Recalculate total program credits
  const recalculateTotalCredits = (updatedData) => {
    const total = updatedData.requirements.reduce((sum, req) => {
      return sum + (req.credits || 0);
    }, 0);
    
    updatedData.totalCredits = total;
    setFormData(updatedData);
    onChange(updatedData);
  };

  // NEW: Manual recalculate button
  const handleRecalculateAll = () => {
    const updated = { ...formData };
    
    // Recalculate each requirement
    updated.requirements.forEach(req => {
      req.credits = calculateRequirementCredits(req.courses);
    });
    
    // Recalculate total
    recalculateTotalCredits(updated);
  };

  return (
    <div className="space-y-6 min-h-screen">
      {/* Program Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Program Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Program Name</label>
            <Input
              value={formData.name}
              onChange={(e) => updateProgramInfo('name', e.target.value)}
              placeholder="Enter program name"
              className="h-12 text-base"
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Degree Type</label>
              <Select
                value={formData.degreeType}
                onValueChange={(value) => updateProgramInfo('degreeType', value)}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select degree type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BS">Bachelor of Science</SelectItem>
                  <SelectItem value="MS">Master of Science</SelectItem>
                  <SelectItem value="PhD">Doctor of Philosophy</SelectItem>
                  <SelectItem value="Minor">Minor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Total Credits</label>
              <Input
                type="number"
                value={formData.totalCredits}
                onChange={(e) => updateProgramInfo('totalCredits', parseInt(e.target.value) || 0)}
                placeholder="0"
                className="h-12 text-base"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements Section */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <span className="text-xl">Requirements</span>
            <Badge variant="outline" className="text-base px-3 py-1">
              Total: {formData.totalCredits} credits
            </Badge>
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={handleRecalculateAll} variant="outline" size="default" className="h-10">
              🔄 Recalculate All
            </Button>
            <Button onClick={addRequirement} size="default" className="h-10">
              <Plus className="h-4 w-4 mr-2" />
              Add Requirement
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {formData.requirements?.map((req, index) => (
            <div key={index} className="relative pl-4 sm:pl-16">
              {/* Move Buttons - Hidden on mobile, show on larger screens */}
              <div className="hidden sm:flex absolute -left-12 top-6 flex-col gap-2">
                <Button
                  onClick={() => moveRequirement(index, 'up')}
                  disabled={index === 0}
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => moveRequirement(index, 'down')}
                  disabled={index === formData.requirements.length - 1}
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Mobile Move Buttons */}
              <div className="flex sm:hidden justify-between items-center mb-4">
                <span className="text-sm font-medium text-gray-600">Requirement {index + 1}</span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => moveRequirement(index, 'up')}
                    disabled={index === 0}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronUp className="h-4 w-4" />
                    Up
                  </Button>
                  <Button
                    onClick={() => moveRequirement(index, 'down')}
                    disabled={index === formData.requirements.length - 1}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronDown className="h-4 w-4" />
                    Down
                  </Button>
                </div>
              </div>
              
              <RequirementEditor
                requirement={req}
                requirementIndex={index}
                onUpdate={(field, value) => updateRequirement(index, field, value)}
                onRemove={() => removeRequirement(index)}
                formData={formData}
                setFormData={setFormData}
                onChange={onChange}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
