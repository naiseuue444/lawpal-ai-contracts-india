
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting PDF report generation...');
    
    const requestBody = await req.text();
    console.log('Request body received');
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(requestBody);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { contractId } = parsedBody;

    if (!contractId) {
      console.error('Missing contractId');
      return new Response(
        JSON.stringify({ error: 'Missing contractId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Fetching contract data for ID:', contractId);
    
    // Fetch contract with clauses
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        clauses (*)
      `)
      .eq('id', contractId)
      .single();

    if (contractError) {
      console.error('Error fetching contract:', contractError);
      return new Response(
        JSON.stringify({ error: 'Contract not found: ' + contractError.message }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!contract) {
      return new Response(
        JSON.stringify({ error: 'Contract not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Creating PDF document...');
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Add title
    page.drawText('Contract Analysis Report', {
      x: 50,
      y: height - 50,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Add contract details
    let y = height - 100;
    page.drawText('Contract Details:', {
      x: 50,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    y -= 30;
    page.drawText(`Filename: ${contract.filename || 'Not specified'}`, {
      x: 50,
      y,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    y -= 20;
    page.drawText(`Contract Type: ${contract.contract_type || 'Not specified'}`, {
      x: 50,
      y,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    y -= 20;
    page.drawText(`Risk Score: ${contract.risk_score || 'Not specified'}`, {
      x: 50,
      y,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    y -= 20;
    page.drawText(`Jurisdiction: ${contract.jurisdiction || 'Not specified'}`, {
      x: 50,
      y,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    y -= 20;
    page.drawText(`Arbitration Present: ${contract.arbitration_present ? 'Yes' : 'No'}`, {
      x: 50,
      y,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Add clauses analysis
    y -= 40;
    page.drawText('Clause Analysis:', {
      x: 50,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    if (!contract.clauses || !Array.isArray(contract.clauses) || contract.clauses.length === 0) {
      console.log('No clauses found in contract data');
      y -= 30;
      page.drawText('No clause analysis available', {
        x: 50,
        y,
        size: 12,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
    } else {
      console.log(`Found ${contract.clauses.length} clauses`);
      
      for (let i = 0; i < contract.clauses.length; i++) {
        const clause = contract.clauses[i];
        
        // Check if we need a new page
        if (y < 150) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = page.getSize().height - 50;
        }

        y -= 30;
        page.drawText(`Clause ${clause.clause_number}: ${clause.title}`, {
          x: 50,
          y,
          size: 14,
          font: boldFont,
          color: rgb(0, 0, 0),
        });

        y -= 20;
        page.drawText(`Risk Level: ${clause.risk_score}`, {
          x: 50,
          y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });

        if (clause.summary_en) {
          y -= 20;
          const summaryText = clause.summary_en.length > 80 
            ? clause.summary_en.substring(0, 80) + '...'
            : clause.summary_en;
          page.drawText(`Summary: ${summaryText}`, {
            x: 50,
            y,
            size: 12,
            font: font,
            color: rgb(0, 0, 0),
          });
        }

        if (clause.suggestion) {
          y -= 20;
          const suggestionText = clause.suggestion.length > 80 
            ? clause.suggestion.substring(0, 80) + '...'
            : clause.suggestion;
          page.drawText(`Suggestion: ${suggestionText}`, {
            x: 50,
            y,
            size: 12,
            font: font,
            color: rgb(0, 0, 0),
          });
        }

        y -= 10; // Extra space between clauses
      }
    }

    console.log('Saving PDF document...');
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();

    console.log('Uploading PDF to storage...');
    
    // Upload to Supabase Storage
    const fileName = `reports/${contractId}-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('contract-reports')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload PDF report: ' + uploadError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Getting public URL...');
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('contract-reports')
      .getPublicUrl(fileName);

    console.log('Saving report reference in database...');
    
    // Save or update report reference in database
    const { error: dbError } = await supabase
      .from('reports')
      .upsert({
        contract_id: contractId,
        pdf_url: publicUrl
      }, {
        onConflict: 'contract_id'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to save report reference: ' + dbError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('PDF report generation completed successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfUrl: publicUrl 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response(
      JSON.stringify({ error: 'PDF generation failed: ' + error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}); 
