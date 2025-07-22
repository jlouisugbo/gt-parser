import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { RequirementEditor } from './RequirementEditor';
import { Badge } from "@/components/ui/badge";
import { Requirement } from './RequirementEditor'; // Assuming Requirement type is exported from RequirementEditor


interface Footnote {
  number: number;
  text: string;
}

interface ProgramData {
  name: string;
  degreeType: string;
  concentration?: string;
  thread?: string;
  requirements: Requirement[];
  footnotes?: Footnote[];
  college?: string;
  totalCredits?: number;
}

interface VisualFormEditorProps {
  data: ProgramData;
  onChange: (data: ProgramData & { footnotes?: Footnote[] }) => void; // Make footnotes optional
}

export const VisualFormEditor: React.FC<VisualFormEditorProps> = ({ data, onChange }) => {
  const [formData, setFormData] = useState<ProgramData>(data);

  const updateProgramInfo = (field: keyof ProgramData, value: string) => {
    const updated = { ...formData, [field]: value };
  
    setFormData(updated);
    onChange(updated);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateRequirement = (reqIndex: number, field: string, value: any) => {
    const updated = { ...formData };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updated.requirements[reqIndex] as any)[field] = value;
    
    setFormData(updated);
    onChange(updated);
  };


  const addCategory = (newCategory: Requirement) => {
    const updated = { ...formData };
    updated.requirements.push(newCategory);
    setFormData(updated);
    onChange(updated);
  };
  const addRequirement = () => {
    const updated = { ...formData };
    updated.requirements.push({
      name: "New Requirement",
      courses: []
    });
    setFormData(updated);
    onChange(updated);
  };

  const removeRequirement = (index: number) => {
    const updated = { ...formData };
    updated.requirements.splice(index, 1);
    setFormData(updated);
    onChange(updated);
  };

  const moveRequirement = (index: number, direction: 'up' | 'down') => {
    const updated = { ...formData };
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < updated.requirements.length) {
      const [movedItem] = updated.requirements.splice(index, 1);
      updated.requirements.splice(newIndex, 0, movedItem);
      setFormData(updated);
      onChange(updated);
    }
  };

  return (
  <div className="space-y-3 min-h-screen">
    {/* Program Info Section - MADE COMPACT */}
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Program Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium mb-1">Program Name</label>
            <Input
              value={formData.name}
              onChange={(e) => updateProgramInfo('name', e.target.value)}
              placeholder="Enter program name"
              className="h-10 text-sm lg:text-base font-medium w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Degree Type</label>
            <Select
              value={formData.degreeType}
              onValueChange={(value) => updateProgramInfo('degreeType', value)}
            >
              <SelectTrigger className="h-10 text-sm">
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
        </div>
      </CardContent>
    </Card>

    {/* Requirements Section - MADE COMPACT */}
    <Card>
      <CardHeader className="pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-lg">Requirements</span>
          <Badge variant="outline" className="text-sm px-2 py-1">
            Structure Only - Codes & Groupings
          </Badge>
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={addRequirement} size="sm" className="h-8">
            <Plus className="h-3 w-3 mr-1" />
            Add Requirement
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {formData.requirements?.map((req, index) => (
          <div key={index} className="relative pl-3 sm:pl-12">
            {/* Move Buttons - SMALLER */}
            <div className="hidden sm:flex absolute -left-10 top-4 flex-col gap-1">
              <Button
                onClick={() => moveRequirement(index, 'up')}
                disabled={index === 0}
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => moveRequirement(index, 'down')}
                disabled={index === formData.requirements.length - 1}
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
            
            {/* Mobile Move Buttons - SMALLER */}
            <div className="flex sm:hidden justify-between items-center mb-2">
              <span className="text-xs font-medium text-gray-600">Requirement {index + 1}</span>
              <div className="flex gap-1">
                <Button
                  onClick={() => moveRequirement(index, 'up')}
                  disabled={index === 0}
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                >
                  <ChevronUp className="h-3 w-3" />
                  Up
                </Button>
                <Button
                  onClick={() => moveRequirement(index, 'down')}
                  disabled={index === formData.requirements.length - 1}
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                >
                  <ChevronDown className="h-3 w-3" />
                  Down
                </Button>
              </div>
            </div>
            
            <RequirementEditor
              requirement={req}
              requirementName={req.name}
              onUpdate={(field, value) => updateRequirement(index, field, value)}
              onRemove={() => removeRequirement(index)}
              onAddCategory={addCategory}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);
};