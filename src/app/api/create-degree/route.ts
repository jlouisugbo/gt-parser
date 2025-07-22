import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { 
      name, 
      degree_type, 
      concentration, 
      thread,
      requirements, 
      total_credits, 
      footnotes,
    } = await request.json();

    // Create the full program name with concentration OR thread
    let fullProgramName = name;
    if (concentration?.trim()) {
      fullProgramName = `${name} - ${concentration.trim()}`;
    } else if (thread?.trim()) {
      fullProgramName = `${name} - ${thread.trim()}`;
    }

    console.log(`🔍 Processing: "${fullProgramName}" (${degree_type})`);

    // Simple query by exact name match
    const { data: existingPrograms, error: findError } = await supabaseAdmin
      .from('degree_programs')
      .select('id, name, degree_type, total_credits')
      .eq('name', fullProgramName)
      .eq('degree_type', degree_type)
      .eq('is_active', true);

    if (findError) {
      console.error('❌ Database search error:', findError);
      return NextResponse.json({
        success: false,
        error: `Database error: ${findError.message}`
      }, { status: 500 });
    }

    const existingProgram = existingPrograms?.[0];

    if (existingProgram) {
      // UPDATE existing program
      console.log(`✅ Found existing program (ID: ${existingProgram.id}), updating...`);

      const { data: updatedProgram, error: updateError } = await supabaseAdmin
        .from('degree_programs')
        .update({
          requirements: requirements || [],
          footnotes: footnotes || [],  // ADD THIS - update footnotes column
          total_credits: total_credits || existingProgram.total_credits,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProgram.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Update error:', updateError);
        return NextResponse.json({
          success: false,
          error: `Update failed: ${updateError.message}`
        }, { status: 500 });
      }

      console.log('🎉 Program updated successfully!');
      return NextResponse.json({
        success: true,
        program: updatedProgram,
        action: 'updated'
      });

    } else {
      // CREATE new program
      console.log(`✨ Creating new program: "${fullProgramName}"`);

      const { data: newProgram, error: createError } = await supabaseAdmin
        .from('degree_programs')
        .insert({
          name: fullProgramName,
          degree_type,
          requirements: requirements || [],
          footnotes: footnotes || [],  // ADD THIS - insert footnotes column
          total_credits: total_credits || 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Create error:', createError);
        return NextResponse.json({
          success: false,
          error: `Failed to create program: ${createError.message}`
        }, { status: 500 });
      }

      console.log('🎉 New program created successfully!');
      return NextResponse.json({
        success: true,
        program: newProgram,
        action: 'created'
      });
    }

  } catch (error) {
    console.error('💥 API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}