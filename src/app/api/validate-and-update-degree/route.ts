import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { name, degree_type, requirements, total_credits, gen_ed_requirements } = await request.json();

    console.log(`🔍 Validating and updating: "${name}" (${degree_type})`);

    // Step 1: Find the program
    const { data: existingProgram, error: findError } = await supabaseAdmin
      .from('degree_programs')
      .select('id, name, degree_type, total_credits')
      .eq('name', name)
      .eq('degree_type', degree_type)
      .eq('is_active', true)
      .single();

    if (findError || !existingProgram) {
      return NextResponse.json({
        success: false,
        error: `Could not find degree program: ${name} (${degree_type})`
      }, { status: 404 });
    }

    console.log('✅ Found program, updating...');

    // Step 2: Update the program
    const { data: updatedProgram, error: updateError } = await supabaseAdmin
      .from('degree_programs')
      .update({
        requirements: requirements || [],
        total_credits: total_credits || existingProgram.total_credits,
        gen_ed_requirements: gen_ed_requirements || null
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

    console.log('🎉 Update successful!');
    return NextResponse.json({
      success: true,
      program: updatedProgram
    });

  } catch (error) {
    console.error('💥 API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}