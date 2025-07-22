"use client";
// main.js - Enhanced with direct database updates (Updated for validation + direct update)

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

// Import your actual parser and visual editor
import { parseProgram } from '@/lib/gtParser'; // Your actual parser
import { VisualFormEditor } from './helper'; // Visual form editor

const GTParserWithDirectUpdate = () => {
  const [catalogText, setCatalogText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [editedData, setEditedData] = useState(null);
  const [currentStep, setCurrentStep] = useState('input'); // input, parsed, edit, preview, confirm
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState('json'); // 'json' or 'visual'
  const [jsonError, setJsonError] = useState('');
  const [insertStatus, setInsertStatus] = useState(null);
  const [insertError, setInsertError] = useState('');
  const [savedData, setSavedData] = useState(null); // For error recovery
  const [validationResult, setValidationResult] = useState(null);

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
        const parsedBackup = JSON.parse(backup);
        setSavedData(parsedBackup);
      } catch (error) {
        console.warn('Could not load backup data:', error);
      }
    }
  }, []);

  const handleParse = () => {
    if (!catalogText.trim()) {
      alert('Please enter catalog text first');
      return;
    }

    try {
      // Use your actual parser here
      const result = parseProgram(catalogText);
      setParsedData(result);
      setEditedData(result); // Store as object for visual editor
      setCurrentStep('parsed');
      setInsertStatus(null);
      setInsertError('');
      setValidationResult(null);
    } catch (error) {
      alert('Error parsing catalog text: ' + error.message);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setCurrentStep('edit');
  };

  const handleJsonChange = (value) => {
    try {
      const parsed = JSON.parse(value);
      setEditedData(parsed);
      setJsonError('');
    } catch (error) {
      setJsonError(`Invalid JSON: ${error.message}`);
    }
  };

  const handleVisualChange = (data) => {
    setEditedData(data);
    setJsonError('');
  };

  const handleSaveEdits = () => {
    try {
      // editedData is already an object from visual editor
      setParsedData(editedData);
      setIsEditing(false);
      setCurrentStep('preview');
      setJsonError('');
    } catch (error) {
      setJsonError(`Cannot save data: ${error.message}`);
    }
  };

  const handleReset = () => {
    setEditedData(parsedData);
    setJsonError('');
  };


const validateDegreeProgram = async () => {
  if (!editedData?.name || !editedData?.degreeType) {
    setValidationResult({
      success: false,
      error: 'Program name and degree type are required for validation'
    });
    return false;
  }

  try {
    console.log(`🔍 Validating degree program: "${editedData.name}" (${editedData.degreeType})`);

    // Query the database for exact match first
    const { data: exactMatch, error: exactError } = await supabaseAdmin
      .from('degree_programs')
      .select('id, name, degree_type, total_credits, requirements')
      .eq('name', editedData.name)
      .eq('degree_type', editedData.degreeType)
      .eq('is_active', true)
      .single();

    if (exactError && exactError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Database error during exact match query:', exactError);
      setValidationResult({
        success: false,
        error: `Database error: ${exactError.message}`
      });
      return false;
    }

    if (exactMatch) {
      console.log('✅ Found exact match:', exactMatch);
      setValidationResult({
        success: true,
        program: exactMatch,
        matchType: 'exact'
      });
      return true;
    }

    // If no exact match, try fuzzy matching on name only (with same degree_type)
    console.log('⚠️ No exact match found, trying fuzzy match...');
    
    const { data: fuzzyMatches, error: fuzzyError } = await supabaseAdmin
      .from('degree_programs')
      .select('id, name, degree_type, total_credits, requirements')
      .eq('degree_type', editedData.degreeType)
      .eq('is_active', true)
      .ilike('name', `%${editedData.name}%`);

    if (fuzzyError) {
      console.error('Database error during fuzzy match query:', fuzzyError);
      setValidationResult({
        success: false,
        error: `Database error: ${fuzzyError.message}`
      });
      return false;
    }

    if (fuzzyMatches && fuzzyMatches.length > 0) {
      console.log(`🔍 Found ${fuzzyMatches.length} fuzzy matches:`, fuzzyMatches.map(m => m.name));
      
      setValidationResult({
        success: true,
        program: fuzzyMatches[0],
        matchType: 'fuzzy',
        warning: `No exact match found. Using closest match: "${fuzzyMatches[0].name}"`,
        allMatches: fuzzyMatches
      });
      return true;
    }

    // No matches found at all
    console.log('❌ No degree program found');
    setValidationResult({
      success: false,
      error: `No degree program found with name "${editedData.name}" and type "${editedData.degreeType}". Please check the spelling and make sure the program exists in the database.`
    });
    return false;

  } catch (error) {
    console.error('Validation error:', error);
    setValidationResult({
      success: false,
      error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    return false;
  }
};

  // NEW: Direct database update function
  const handleUpdateDatabase = async () => {
    setCurrentStep('confirm');
    setInsertStatus('updating');
    setInsertError('');

    try {
      const response = await fetch('/api/validate-and-update-degree', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editedData.name,
          degree_type: editedData.degreeType,
          requirements: editedData.requirements || [],
          total_credits: editedData.totalCredits || 0,
          gen_ed_requirements: editedData.gen_ed_requirements || null
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setInsertStatus('success');
        setInsertError('');
        localStorage.removeItem('gt-parser-backup');
        console.log('🎉 Database updated successfully:', result);
      } else {
        throw new Error(result.error || 'Update failed');
      }
      
    } catch (error) {
      setInsertStatus('error');
      setInsertError(`Database update error: ${error.message}`);
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
    const jsonData = JSON.stringify(editedData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editedData?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'degree-program'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    const jsonData = JSON.stringify(editedData, null, 2);
    navigator.clipboard.writeText(jsonData);
    alert('JSON copied to clipboard!');
  };

  const renderProgramSummary = (data) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-xl mb-2">{data.name}</h3>
          <div className="flex gap-2 mb-4">
            <Badge variant="outline" className="text-base px-3 py-1">{data.degreeType}</Badge>
            <Badge variant="outline" className="text-base px-3 py-1">{data.totalCredits} Credits</Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-600">{data.totalCredits}</div>
          <div className="text-sm text-gray-600">Total Credits Required</div>
        </div>
      </div>
      
      <div>
        <h4 className="font-semibold text-lg mb-4">Requirements ({data.requirements?.length || 0} categories)</h4>
        <div className="space-y-4">
          {data.requirements?.map((req, idx) => (
            <Card key={idx} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{req.name}</CardTitle>
                  <Badge variant="outline" className="text-sm">
                    {req.credits} credits
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {req.courses?.map((course, courseIdx) => (
                    <div key={courseIdx}>
                      {course.courseType === 'or_group' || course.courseType === 'and_group' ? (
                        // Logic Group Display
                        <div className="bg-gray-50 border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`text-xs ${course.courseType === 'or_group' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                              {course.courseType === 'or_group' ? 'OR' : 'AND'} Group
                            </Badge>
                            <span className="text-sm font-medium">{course.title}</span>
                            <span className="text-xs text-gray-500">({course.credits} credits)</span>
                          </div>
                          <div className="ml-4 space-y-1">
                            {course.groupCourses?.map((groupCourse, groupIdx) => (
                              <div key={groupIdx} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-blue-600">{groupCourse.code}</span>
                                  <span>{groupCourse.title}</span>
                                  {groupCourse.footnoteRefs && groupCourse.footnoteRefs.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      {groupCourse.footnoteRefs.join(',')}
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-gray-500">{groupCourse.credits} cr</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        // Regular Course Display
                        <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-blue-600 min-w-[80px]">{course.code}</span>
                            <span className="flex-1">{course.title}</span>
                            <div className="flex gap-1">
                              {course.courseType && course.courseType !== 'regular' && (
                                <Badge variant="outline" className="text-xs">
                                  {course.courseType === 'or_option' ? 'OR' : 
                                   course.courseType === 'flexible' ? 'FLEX' :
                                   course.courseType === 'selection' ? 'SELECT' : 
                                   course.courseType.toUpperCase()}
                                </Badge>
                              )}
                              {course.footnoteRefs && course.footnoteRefs.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {course.footnoteRefs.join(',')}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <span className="text-gray-500 min-w-[60px] text-right">
                            {course.credits} cr
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Category Summary */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    {req.courses?.length || 0} items • {req.credits} credits total
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {data.footnotes?.length > 0 && (
        <div>
          <h4 className="font-semibold text-lg mb-3">Footnotes ({data.footnotes.length})</h4>
          <div className="space-y-2">
            {data.footnotes.map((footnote, idx) => (
              <div key={idx} className="text-sm bg-gray-50 p-3 rounded">
                <span className="font-semibold text-blue-600">{footnote.number}.</span> {footnote.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {savedData && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  Backup data available from previous session
                </span>
              </div>
              <Button onClick={handleLoadBackup} size="sm" variant="outline">
                Load Backup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            GT Degree Program Parser - Direct Database Update
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={currentStep} className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="input" className="flex items-center gap-1">
                <Upload className="h-4 w-4" />
                Input
              </TabsTrigger>
              <TabsTrigger value="parsed" disabled={!parsedData}>
                <Eye className="h-4 w-4" />
                Parsed
              </TabsTrigger>
              <TabsTrigger value="edit" disabled={!parsedData}>
                <Edit3 className="h-4 w-4" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview" disabled={!parsedData}>
                <CheckCircle className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="confirm" disabled={!parsedData}>
                <Database className="h-4 w-4" />
                Update DB
              </TabsTrigger>
            </TabsList>

            <TabsContent value="input" className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Paste GT Catalog Text:
                </label>
                <Textarea
                  value={catalogText}
                  onChange={(e) => setCatalogText(e.target.value)}
                  placeholder="Paste the degree program requirements from GT catalog here..."
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>
              <Button onClick={handleParse} className="w-full" disabled={!catalogText.trim()}>
                Parse Catalog Text
              </Button>
            </TabsContent>

            <TabsContent value="parsed" className="space-y-4">
              {parsedData && (
                <>
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Successfully parsed! Review the data below and edit if needed.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Program Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {renderProgramSummary(parsedData)}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Raw JSON Preview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-[400px]">
                          {JSON.stringify(parsedData, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button onClick={handleEdit} variant="outline">
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Data
                    </Button>
                    <Button onClick={() => setCurrentStep('preview')}>
                      Continue to Preview
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="edit" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Edit Program Data</h3>
                <div className="flex gap-2">
                  {/* Editor Mode Toggle */}
                  <div className="flex border rounded-md">
                    <Button
                      onClick={() => setEditMode('visual')}
                      variant={editMode === 'visual' ? 'default' : 'ghost'}
                      size="sm"
                      className="rounded-r-none"
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Visual
                    </Button>
                    <Button
                      onClick={() => setEditMode('json')}
                      variant={editMode === 'json' ? 'default' : 'ghost'}
                      size="sm"
                      className="rounded-l-none"
                    >
                      <Code className="h-4 w-4 mr-1" />
                      JSON
                    </Button>
                  </div>
                  
                  <Button onClick={handleReset} variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                  <Button onClick={copyToClipboard} variant="outline" size="sm">
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                  <Button onClick={downloadJson} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>

              {jsonError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{jsonError}</AlertDescription>
                </Alert>
              )}

              {/* Editor Content */}
              {editMode === 'visual' ? (
                <VisualFormEditor
                  data={editedData}
                  onChange={handleVisualChange}
                />
              ) : (
                <Textarea
                  value={JSON.stringify(editedData, null, 2)}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  className="min-h-[500px] font-mono text-sm"
                  placeholder="Edit the JSON data here..."
                />
              )}

              <div className="flex gap-3">
                <Button 
                  onClick={handleSaveEdits}
                  disabled={!!jsonError}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
                <Button 
                  onClick={() => setCurrentStep('parsed')} 
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              {parsedData && (
                <>
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Final preview before database update. Review all courses and details below.
                    </AlertDescription>
                  </Alert>
                  
                  {/* Validation Status */}
                  {validationResult && (
                    <Alert className={validationResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                      {validationResult.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <AlertDescription className={validationResult.success ? "text-green-800" : "text-red-800"}>
                        {validationResult.success ? (
                          <div>
                            <div className="font-semibold">✅ Degree program found in database!</div>
                            <div className="text-sm mt-1">
                              Program: {validationResult.program?.name} ({validationResult.program?.degree_type})<br/>
                              Current credits: {validationResult.program?.total_credits}<br/>
                              Record ID: {validationResult.program?.id}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold">❌ Validation failed</div>
                            <div className="text-sm mt-1">{validationResult.error}</div>
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
                  
                  <div className="flex gap-3">
                    <Button onClick={() => setCurrentStep('edit')} variant="outline">
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Again
                    </Button>
                    <Button onClick={handleUpdateDatabase} className="bg-green-600 hover:bg-green-700">
                      <Database className="h-4 w-4 mr-2" />
                      Update Database
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="confirm" className="space-y-4">
              {insertStatus === 'validating' && (
                <Alert>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Validating degree program in database...
                  </AlertDescription>
                </Alert>
              )}

              {insertStatus === 'updating' && (
                <Alert>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Updating requirements in database...
                  </AlertDescription>
                </Alert>
              )}
              
              {insertStatus === 'success' && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <div className="space-y-3">
                      <div className="font-semibold">🎉 Database updated successfully!</div>
                      <div className="text-sm">
                        The degree program requirements have been updated directly in your database:
                        <ul className="list-disc list-inside mt-2 ml-4">
                          <li>Program: {editedData?.name} ({editedData?.degreeType})</li>
                          <li>Requirements JSON field updated with {editedData?.requirements?.length || 0} categories</li>
                          <li>Total credits updated to {editedData?.totalCredits}</li>
                          <li>Changes are live immediately</li>
                        </ul>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {insertStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-semibold">Database update failed:</div>
                      <div className="text-sm">{insertError}</div>
                      <div className="flex gap-2 mt-3">
                        <Button onClick={handleRetryUpdate} size="sm" variant="outline">
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Retry Update
                        </Button>
                        <Button onClick={() => setCurrentStep('edit')} size="sm" variant="outline">
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit Data
                        </Button>
                        <Button onClick={downloadJson} size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-1" />
                          Save JSON
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex gap-3">
                <Button onClick={() => {
                  setCatalogText('');
                  setParsedData(null);
                  setEditedData(null);
                  setCurrentStep('input');
                  setInsertStatus(null);
                  setInsertError('');
                  setValidationResult(null);
                }}>
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

export default GTParserWithDirectUpdate;