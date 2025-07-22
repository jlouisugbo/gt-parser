'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  Edit3,
  Save,
  Database,
  Eye,
  AlertTriangle,
  CheckCircle,
  Copy,
  RotateCcw,
  Download,
  Code,
  Settings,
  RefreshCw
} from 'lucide-react';

import {
  parseProgram,
  validateParsedData,
  ProgramData,
} from '@/lib/gtParser';
import { VisualFormEditor } from './VisualFormEditor';

interface ConcentrationInfo {
  concentration: string;
  thread: string;
}

interface ApiResponse {
  success: boolean;
  error?: string;
  action?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  success?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  program?: any;
}

const GTParser: React.FC = () => {
  const [catalogText, setCatalogText] = useState('');
  const [parsedData, setParsedData] = useState<ProgramData | null>(null);
  const [editedData, setEditedData] = useState<ProgramData | null>(null);
  const [currentStep, setCurrentStep] = useState<
    'input' | 'parsed' | 'edit' | 'preview' | 'confirm'
  >('input');
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState<'json' | 'visual'>('json');
  const [jsonError, setJsonError] = useState('');
  const [insertStatus, setInsertStatus] = useState<
    'updating' | 'success' | 'error' | null
  >(null);
  const [insertError, setInsertError] = useState('');
  const [savedData, setSavedData] = useState<ProgramData | null>(null);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [concentrationInfo, setConcentrationInfo] = useState<ConcentrationInfo>(
    {
      concentration: '',
      thread: ''
    }
  );

  // Auto-save edited data
  useEffect(() => {
    if (editedData) {
      setSavedData(editedData);
      localStorage.setItem('gt-parser-backup', JSON.stringify(editedData));
    }
  }, [editedData]);

  // Load backup on component mount
  useEffect(() => {
    const backup = localStorage.getItem('gt-parser-backup');
    if (backup) {
      try {
        const parsedBackup = JSON.parse(backup) as ProgramData;
        setSavedData(parsedBackup);
      } catch (error) {
        console.warn('Could not load backup data:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (editedData && editMode === 'json') {
      const jsonString = JSON.stringify(editedData, null, 2);
      const jsonTextarea = document.querySelector(
        'textarea[placeholder="Edit the JSON data here..."]'
      ) as HTMLTextAreaElement;
      if (jsonTextarea) {
        jsonTextarea.value = jsonString;
      }
    }
  }, [editedData, editMode]);

  const handleParse = () => {
    if (!catalogText.trim()) {
      alert('Please enter catalog text first');
      return;
    }

    try {
      // Use your actual parser here
      const result = parseProgram(catalogText);
      const validation = validateParsedData(result);

      if (!validation.isValid) {
        console.warn('Validation issues found:', validation.errors);
        // Could show warnings to user but still proceed
      }

      setParsedData(result);
      setEditedData(result);
      setCurrentStep('parsed');
      setInsertStatus(null);
      setInsertError('');
      setValidationResult(null);
    } catch (error) {
      alert('Error parsing catalog text: ' + (error as Error).message);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setCurrentStep('edit');
  };

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFieldChange = (field: keyof ProgramData, value: any) => {
    if (!editedData) return;
    const updated = { ...editedData, [field]: value };
    setEditedData(updated);
    setParsedData(updated);
  };

  const handleJsonChange = (value: string) => {
    try {
      const parsed = JSON.parse(value) as ProgramData;
      setEditedData(parsed);
      setParsedData(parsed);
      setJsonError('');
    } catch (error) {
      setJsonError(`Invalid JSON: ${(error as Error).message}`);
    }
  };

  const handleVisualChange = (data: ProgramData) => {
    setEditedData(data);
    setParsedData(data);
    setJsonError('');

    // Trigger re-render of JSON editor if it's active
    if (editMode === 'json') {
      // Force JSON textarea to update
      const jsonTextarea = document.querySelector(
        'textarea[placeholder="Edit the JSON data here..."]'
      ) as HTMLTextAreaElement;
      if (jsonTextarea) {
        jsonTextarea.value = JSON.stringify(data, null, 2);
      }
    }
  };

  const handleSaveEdits = () => {
    try {
      if (!editedData) return;
      setParsedData(editedData);
      setIsEditing(false);
      setCurrentStep('preview');
      setJsonError('');
    } catch (error) {
      setJsonError(`Cannot save data: ${(error as Error).message}`);
    }
  };

  const handleReset = () => {
    if (parsedData) {
      setEditedData(parsedData);
    }
    setJsonError('');
  };

  // Direct database update function
  const handleUpdateDatabase = async () => {
    if (!editedData) return;

    setCurrentStep('confirm');
    setInsertStatus('updating');
    setInsertError('');

    try {
      const payload = {
        name: editedData.name,
        degree_type: editedData.degreeType,
        concentration: concentrationInfo.concentration.trim() || null,
        thread: concentrationInfo.thread.trim() || null,
        requirements: editedData.requirements || [],
        footnotes: editedData.footnotes || [],
        total_credits: editedData.totalCredits || 0,
      };

      // Add concentration info if provided
      if (concentrationInfo.concentration.trim()) {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload as any).concentration = concentrationInfo.concentration.trim();
      }
      if (concentrationInfo.thread.trim()) {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload as any).thread = concentrationInfo.thread.trim();
      }

      const response = await fetch('/api/create-degree', {  // Changed endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result: ApiResponse = await response.json();

      if (response.ok && result.success) {
        setInsertStatus('success');
        setInsertError('');
        localStorage.removeItem('gt-parser-backup');
        console.log('🎉 Database updated successfully:', result);

        // Show what was created/updated
        if (result.action === 'created') {
          console.log('✨ Created new concentration');
        } else {
          console.log('📝 Updated existing program');
        }
      } else {
        throw new Error(result.error || 'Update failed');
      }
    } catch (error) {
      setInsertStatus('error');
      setInsertError(`Database update error: ${(error as Error).message}`);
      console.error('Database update error:', error);
    }
  };

  const handleRetryUpdate = () => {
    if (savedData) {
      setEditedData(savedData);
      setParsedData(savedData);
      handleUpdateDatabase();
    }
  };

  const handleLoadBackup = () => {
    if (savedData) {
      setEditedData(savedData);
      setParsedData(savedData);
      setCurrentStep('preview');
      setInsertStatus(null);
      setInsertError('');
      setValidationResult(null);
    }
  };

  const downloadJson = () => {
    if (!editedData) return;
    const jsonData = JSON.stringify(editedData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${
      editedData?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'degree-program'
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    if (!editedData) return;
    const jsonData = JSON.stringify(editedData, null, 2);
    navigator.clipboard.writeText(jsonData);
    alert('JSON copied to clipboard!');
  };

  const renderProgramSummary = (data: ProgramData) => (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6='>
        <div>
          <h3 className='font-semibold text-xl mb-2'>{data.name}</h3>
          <div className='flex gap-2 mb-4'>
            <Badge variant='outline' className='text-base px-3 py-1'>
              {data.degreeType}
            </Badge>
          </div>
        </div>
      </div>

      <div>
        <h4 className='font-semibold text-lg mb-4'>
          Requirements ({data.requirements?.length || 0} categories)
        </h4>
        <div className='space-y-2'>
          {data.requirements?.map((req, idx) => (
            <Card key={idx} className='border-l-4 border-l-blue-500 py-2 gap-0'>
              <CardHeader>
                <div className='flex justify-between items-start'>
                  <CardTitle className='text-base'>{req.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  {req.courses?.map((course, courseIdx) => (
                    <div key={courseIdx}>
                      {course.courseType === 'or_group' ||
                      course.courseType === 'and_group' ? (
                        // Logic Group Display
                        <div className='bg-gray-50 border rounded-lg p-3'>
                          <div className='flex items-center gap-2 mb-2'>
                            <Badge
                              className={`text-xs ${
                                course.courseType === 'or_group'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {course.courseType === 'or_group' ? 'OR' : 'AND'}{' '}
                              Group
                            </Badge>
                            <span className='text-sm font-medium'>
                              {course.title}
                            </span>
                          </div>
                          <div className='ml-4 space-y-1'>
                            {course.groupCourses?.map(
                              (groupCourse, groupIdx) => (
                                <div
                                  key={groupIdx}
                                  className='flex items-center justify-between text-sm'
                                >
                                  <div className='flex items-center gap-2'>
                                    <span className='font-mono text-blue-600'>
                                      {groupCourse.code}
                                    </span>
                                    <span>{groupCourse.title}</span>
                                    {groupCourse.footnoteRefs &&
                                      groupCourse.footnoteRefs.length > 0 && (
                                        <Badge
                                          variant='outline'
                                          className='text-xs'
                                        >
                                          {groupCourse.footnoteRefs.join(',')}
                                        </Badge>
                                      )}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      ) : course.courseType === 'selection' ? (
                        // Selection Group Display
                        <div className='bg-purple-50 border border-purple-200 rounded-lg p-3'>
                          <div className='flex items-center gap-2 mb-2'>
                            <Badge className='bg-purple-100 text-purple-800 text-xs'>
                              SELECT {course.selectionCount || 1} of the
                              following
                            </Badge>
                            <span className='text-sm font-medium'>
                              {course.title}
                            </span>
                          </div>
                          <div className='ml-4 space-y-1'>
                            {course.selectionOptions?.map(
                              (option, optionIdx) => (
                                <div key={optionIdx}>
                                  {option.courseType === 'and_group' ? (
                                    <div className='bg-green-25 border border-green-200 rounded p-2'>
                                      <Badge className='bg-green-100 text-green-800 text-xs mb-1'>
                                        AND Group
                                      </Badge>
                                      {option.groupCourses?.map(
                                        (groupCourse, groupIdx) => (
                                          <div
                                            key={groupIdx}
                                            className='flex items-center justify-between text-sm ml-2'
                                          >
                                            <div className='flex items-center gap-2'>
                                              <span className='font-mono text-blue-600'>
                                                {groupCourse.code}
                                              </span>
                                              <span>{groupCourse.title}</span>
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <div className='flex items-center justify-between text-sm'>
                                      <div className='flex items-center gap-2'>
                                        <span className='font-mono text-blue-600'>
                                          {option.code}
                                        </span>
                                        <span>{option.title}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      ) : (
                        // Regular Course Display
                        <div className='flex items-center justify-between border-b border-gray-100 last:border-b-0'>
                          <div className='flex items-center gap-3'>
                            <span className='font-mono text-blue-600 min-w-[80px]'>
                              {course.code}
                            </span>
                            <span className='flex-1'>{course.title}</span>
                            <div className='flex gap-1'>
                              {course.courseType &&
                                course.courseType !== 'regular' && (
                                  <Badge variant='outline' className='text-xs'>
                                    {course.courseType === 'or_option'
                                      ? 'OR'
                                      : course.courseType === 'flexible'
                                      ? 'FLEX'
                                      : course.courseType === 'selection'
                                      ? 'SELECT'
                                      : (course.courseType as string).toUpperCase()}
                                  </Badge>
                                )}
                              {course.footnoteRefs &&
                                course.footnoteRefs.length > 0 && (
                                  <Badge variant='outline' className='text-xs'>
                                    {course.footnoteRefs.join(',')}
                                  </Badge>
                                )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Category Summary */}
                <div className='mt-3  border-t border-gray-200'>
                  <div className='text-sm text-gray-600'>
                    {req.courses?.length || 0} items
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {data.footnotes?.length && data.footnotes.length > 0 && (
        <div>
          <h4 className='font-semibold text-lg mb-3'>
            Footnotes ({data.footnotes.length})
          </h4>
          <div className='space-y-2'>
            {data.footnotes.map((footnote, idx) => (
              <div key={idx} className='text-sm bg-gray-50 p-3 rounded'>
                <span className='font-semibold text-blue-600'>
                  {footnote.number}.
                </span>{' '}
                {footnote.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className='max-w-6xl mx-auto p-6 space-y-6'>
      {savedData && (
        <Card className='border-yellow-200 bg-yellow-50'>
          <CardContent>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <AlertTriangle className='h-4 w-4 text-yellow-600' />
                <span className='text-sm text-yellow-800'>
                  Backup data available from previous session
                </span>
              </div>
              <Button onClick={handleLoadBackup} size='sm' variant='outline'>
                Load Backup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Upload className='h-5 w-5' />
            GT Degree Program Parser - Structure Only (No Credits)
            {isEditing && <Badge variant="outline">Editing Mode</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={currentStep} className='w-full'>
            <TabsList className='grid grid-cols-5 w-full h-10'>
              <TabsTrigger value='input' className='text-sm'>
                <Upload className='h-3 w-3 mr-1' />
                Input
              </TabsTrigger>
              <TabsTrigger
                value='parsed'
                disabled={!parsedData}
                className='text-sm'
              >
                <Eye className='h-3 w-3 mr-1' />
                Parsed
              </TabsTrigger>
              <TabsTrigger
                value='edit'
                disabled={!parsedData}
                className='text-sm'
              >
                <Edit3 className='h-3 w-3 mr-1' />
                Edit
              </TabsTrigger>
              <TabsTrigger
                value='preview'
                disabled={!parsedData}
                className='text-sm'
              >
                <CheckCircle className='h-3 w-3 mr-1' />
                Preview
              </TabsTrigger>
              <TabsTrigger
                value='confirm'
                disabled={!parsedData}
                className='text-sm'
              >
                <Database className='h-3 w-3 mr-1' />
                Update DB
              </TabsTrigger>
            </TabsList>

            <TabsContent value='input' className='space-y-4'>
              <div>
                <label className='block text-sm font-medium mb-2'>
                  Paste GT Catalog Text:
                </label>
                <Textarea
                  value={catalogText}
                  onChange={e => setCatalogText(e.target.value)}
                  placeholder='Paste the degree program requirements from GT catalog here...'
                  className='min-h-[300px] font-mono text-sm'
                />
              </div>
              <Button
                onClick={handleParse}
                className='w-full'
                disabled={!catalogText.trim()}
              >
                Parse Catalog Text
              </Button>
            </TabsContent>

            <TabsContent value='parsed' className='space-y-4'>
              {parsedData && (
                <>
                  <Card className="border-blue-200">
                    <CardHeader>
                      <CardTitle>Quick Edit Program Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Program Name</label>
                          <Input
                            value={editedData?.name || ''}
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Degree Type</label>
                          <Input
                            value={editedData?.degreeType || ''}
                            onChange={(e) => handleFieldChange('degreeType', e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Alert>
                    <CheckCircle className='h-4 w-4' />
                    <AlertDescription>
                      Successfully parsed! Review the data below and edit if
                      needed.
                    </AlertDescription>
                  </Alert>

                  <div className='grid grid-cols-1'>
                    <Card>
                      <CardHeader>
                        <CardTitle>Program Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {renderProgramSummary(parsedData)}
                      </CardContent>
                    </Card>
                  </div>

                  <div className='flex gap-3'>
                    <Button onClick={handleEdit} variant='outline'>
                      <Edit3 className='h-4 w-4 mr-2' />
                      Edit Data
                    </Button>
                    <Button onClick={() => setCurrentStep('preview')}>
                      Continue to Preview
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value='edit' className='space-y-4'>
              <div className='flex justify-between items-center'>
                <h3 className='text-lg font-semibold'>Edit Program Data</h3>
                <div className='flex gap-2'>
                  <div className='flex border rounded-md'>
                    <Button
                      onClick={() => setEditMode('visual')}
                      variant={editMode === 'visual' ? 'default' : 'ghost'}
                      size='sm'
                      className='rounded-r-none h-8 text-xs'
                    >
                      <Settings className='h-3 w-3 mr-1' />
                      Visual
                    </Button>
                    <Button
                      onClick={() => setEditMode('json')}
                      variant={editMode === 'json' ? 'default' : 'ghost'}
                      size='sm'
                      className='rounded-l-none h-8 text-xs'
                    >
                      <Code className='h-3 w-3 mr-1' />
                      JSON
                    </Button>
                  </div>

                  <Button
                    onClick={handleReset}
                    variant='outline'
                    size='sm'
                    className='h-8 text-xs'
                  >
                    <RotateCcw className='h-3 w-3 mr-1' />
                    Reset
                  </Button>
                  <Button
                    onClick={copyToClipboard}
                    variant='outline'
                    size='sm'
                    className='h-8 text-xs'
                  >
                    <Copy className='h-3 w-3 mr-1' />
                    Copy
                  </Button>
                  <Button
                    onClick={downloadJson}
                    variant='outline'
                    size='sm'
                    className='h-8 text-xs'
                  >
                    <Download className='h-3 w-3 mr-1' />
                    Download
                  </Button>
                </div>
              </div>

              {jsonError && (
                <Alert variant='destructive'>
                  <AlertTriangle className='h-4 w-4' />
                  <AlertDescription>{jsonError}</AlertDescription>
                </Alert>
              )}

              {/* Program Info Fields (only show in visual mode) */}
              {editMode === 'visual' && (
                <Card className='border-l-4 border-l-purple-500'>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-lg'>
                      Program Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
                      <div>
                        <label className='block text-sm font-medium mb-1'>
                          Concentration (Optional)
                        </label>
                        <Input
                          value={concentrationInfo.concentration}
                          onChange={e =>
                            setConcentrationInfo(prev => ({
                              ...prev,
                              concentration: e.target.value
                            }))
                          }
                          placeholder='e.g., Intelligence, Systems & Architecture'
                          className='h-8 text-sm'
                        />
                        <p className='text-xs text-gray-500 mt-1'>
                          Leave empty for base/general program
                        </p>
                      </div>
                      <div>
                        <label className='block text-sm font-medium mb-1'>
                          Thread (Optional)
                        </label>
                        <Input
                          value={concentrationInfo.thread}
                          onChange={e =>
                            setConcentrationInfo(prev => ({
                              ...prev,
                              thread: e.target.value
                            }))
                          }
                          placeholder='e.g., Machine Learning, Robotics'
                          className='h-8 text-sm'
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Editor Content */}
              {editedData &&
                (editMode === 'visual' ? (
                  <VisualFormEditor
                    data={editedData}
                    onChange={(data) => handleVisualChange(data)}
                  />
                ) : (
                  <Textarea
                    key={`json-${Date.now()}`}
                    value={JSON.stringify(editedData, null, 2)}
                    onChange={e => handleJsonChange(e.target.value)}
                    className='min-h-[500px] font-mono text-sm'
                    placeholder='Edit the JSON data here...'
                  />
                ))}

              <div className='flex gap-2'>
                <Button
                  onClick={handleSaveEdits}
                  disabled={!!jsonError}
                  className='flex items-center gap-1 h-9 text-sm'
                >
                  <Save className='h-3 w-3' />
                  Save Changes
                </Button>
                <Button
                  onClick={() => setCurrentStep('parsed')}
                  variant='outline'
                  className='h-9 text-sm'
                >
                  Cancel
                </Button>
              </div>
            </TabsContent>

            <TabsContent value='preview' className='space-y-4'>
              {parsedData && (
                <>
                  <Alert>
                    <CheckCircle className='h-4 w-4' />
                    <AlertDescription>
                      Final preview before database update. Review all courses
                      and structure below.
                    </AlertDescription>
                  </Alert>

                  {/* Validation Status */}
                  {validationResult && (
                    <Alert
                      className={
                        validationResult.success
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      }
                    >
                      {validationResult.success ? (
                        <CheckCircle className='h-4 w-4 text-green-600' />
                      ) : (
                        <AlertTriangle className='h-4 w-4 text-red-600' />
                      )}
                      <AlertDescription
                        className={
                          validationResult.success
                            ? 'text-green-800'
                            : 'text-red-800'
                        }
                      >
                        {validationResult.success ? (
                          <div>
                            <div className='font-semibold'>
                              ✅ Degree program found in database!
                            </div>
                            <div className='text-sm mt-1'>
                              Program: {validationResult.program?.name} (
                              {validationResult.program?.degree_type})<br />
                              Record ID: {validationResult.program?.id}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className='font-semibold'>
                              ❌ Validation failed
                            </div>
                            <div className='text-sm mt-1'>
                              {validationResult.errors}
                            </div>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Complete Program Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {renderProgramSummary(parsedData)}
                    </CardContent>
                  </Card>

                  <div className='flex gap-3'>
                    <Button
                      onClick={() => setCurrentStep('edit')}
                      variant='outline'
                    >
                      <Edit3 className='h-4 w-4 mr-2' />
                      Edit Again
                    </Button>
                    <Button
                      onClick={handleUpdateDatabase}
                      disabled={isEditing}
                      className='bg-green-600 hover:bg-green-700'
                    >
                      <Database className='h-4 w-4 mr-2' />
                      Update Database
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value='confirm' className='space-y-4'>
              {insertStatus === 'updating' && (
                <Alert>
                  <RefreshCw className='h-4 w-4 animate-spin' />
                  <AlertDescription>
                    Updating requirements in database...
                  </AlertDescription>
                </Alert>
              )}

              {insertStatus === 'success' && editedData && (
                <Alert className='border-green-200 bg-green-50'>
                  <CheckCircle className='h-4 w-4 text-green-600' />
                  <AlertDescription className='text-green-800'>
                    <div className='space-y-3'>
                      <div className='font-semibold'>
                        🎉 Database updated successfully!
                      </div>
                      <div className='text-sm'>
                        The degree program structure has been updated directly
                        in your database:
                        <ul className='list-disc list-inside mt-2 ml-4'>
                          <li>
                            Program: {editedData.name} ({editedData.degreeType}) {editedData.concentration ? `- ${editedData.concentration}` : ''}
                          </li>
                          <li>
                            Requirements JSON field updated with{' '}
                            {editedData.requirements?.length || 0} categories
                          </li>
                          <li>Changes are live immediately</li>
                        </ul>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {insertStatus === 'error' && (
                <Alert variant='destructive'>
                  <AlertTriangle className='h-4 w-4' />
                  <AlertDescription>
                    <div className='space-y-2'>
                      <div className='font-semibold'>
                        Database update failed:
                      </div>
                      <div className='text-sm'>{insertError}</div>
                      <div className='flex gap-2 mt-3'>
                        <Button
                          onClick={handleRetryUpdate}
                          size='sm'
                          variant='outline'
                        >
                          <RefreshCw className='h-4 w-4 mr-1' />
                          Retry Update
                        </Button>
                        <Button
                          onClick={() => setCurrentStep('edit')}
                          size='sm'
                          variant='outline'
                        >
                          <Edit3 className='h-4 w-4 mr-1' />
                          Edit Data
                        </Button>
                        <Button
                          onClick={downloadJson}
                          size='sm'
                          variant='outline'
                        >
                          <Download className='h-4 w-4 mr-1' />
                          Save JSON
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className='flex gap-3'>
                <Button
                  onClick={() => {
                    setCatalogText('');
                    setParsedData(null);
                    setEditedData(null);
                    setCurrentStep('input');
                    setInsertStatus(null);
                    setInsertError('');
                    setValidationResult(null);
                  }}
                >
                  Parse Another Program
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default GTParser;
