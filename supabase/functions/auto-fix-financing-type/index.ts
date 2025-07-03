import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse the request body (webhook payload)
    const payload = await req.json()
    console.log('🔄 Auto-fix financing_type triggered:', payload)

    // Extract application data from the webhook
    const applicationData = payload.record || payload
    const applicationId = applicationData.id
    const applicationType = applicationData.application_type
    const sourceId = applicationData.source_id
    const currentFinancingType = applicationData.financing_type

    console.log(`📋 Processing application: ${applicationId}`)
    console.log(`   Type: ${applicationType}`)
    console.log(`   Source ID: ${sourceId}`)
    console.log(`   Current financing_type: ${currentFinancingType}`)

    // Only process selected_plans applications with source_id
    if (applicationType !== 'selected_plans' || !sourceId) {
      console.log('⏭️  Skipping: Not a selected_plans application or no source_id')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Skipped: Not applicable for auto-fix',
          applicationId 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Get simulation_type from selected_plans
    const { data: planData, error: planError } = await supabase
      .from('selected_plans')
      .select('simulation_type')
      .eq('id', sourceId)
      .single()

    if (planError || !planData) {
      console.error('❌ Error getting plan data:', planError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not get plan data',
          applicationId 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Determine correct financing_type
    const correctFinancingType = planData.simulation_type === 'cash' ? 'personal' : 'produto'
    
    console.log(`🔍 Plan simulation_type: ${planData.simulation_type}`)
    console.log(`🎯 Correct financing_type should be: ${correctFinancingType}`)

    // Check if correction is needed
    if (currentFinancingType === correctFinancingType) {
      console.log('✅ financing_type is already correct, no action needed')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'financing_type already correct',
          applicationId,
          currentFinancingType,
          correctFinancingType
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Update the application with correct financing_type
    console.log(`🔧 Correcting financing_type: ${currentFinancingType} → ${correctFinancingType}`)
    
    const { error: updateError } = await supabase
      .from('applications')
      .update({ 
        financing_type: correctFinancingType,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)

    if (updateError) {
      console.error('❌ Error updating application:', updateError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: updateError.message,
          applicationId 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    console.log('✅ financing_type corrected successfully!')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'financing_type corrected automatically',
        applicationId,
        correctedFrom: currentFinancingType,
        correctedTo: correctFinancingType,
        simulationType: planData.simulation_type
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}) 
 
 