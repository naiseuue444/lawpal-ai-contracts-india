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
    console.log('Request body received:', requestBody.substring(0, 100) + '...');
    
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

    const { contractId, analysis } = parsedBody;

    if (!contractId || !analysis) {
      console.error('Missing required data:', { contractId, hasAnalysis: !!analysis });
      return new Response(
        JSON.stringify({ error: 'Missing contractId or analysis data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Creating PDF document...');
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
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
    page.drawText(`Contract Type: ${analysis.contract_type || 'Not specified'}`, {
      x: 50,
      y,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    y -= 20;
    page.drawText(`Risk Score: ${analysis.risk_score || 'Not specified'}`, {
      x: 50,
      y,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    y -= 20;
    page.drawText(`Jurisdiction: ${analysis.jurisdiction || 'Not specified'}`, {
      x: 50,
      y,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    y -= 20;
    page.drawText(`Arbitration Present: ${analysis.arbitration_present ? 'Yes' : 'No'}`, {
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

    if (!analysis.clauses || !Array.isArray(analysis.clauses)) {
      console.error('No clauses found in analysis data');
      page.drawText('No clause analysis available', {
        x: 50,
        y: y - 30,
        size: 12,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
    } else {
      for (const clause of analysis.clauses) {
        y -= 30;
        if (y < 50) {
          // Add new page if we're running out of space
          const newPage = pdfDoc.addPage([595.28, 841.89]);
          y = newPage.getSize().height - 50;
        }

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

        y -= 20;
        page.drawText(`Summary (EN): ${clause.summary_en}`, {
          x: 50,
          y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });

        y -= 20;
        page.drawText(`Summary (HI): ${clause.summary_hi}`, {
          x: 50,
          y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });

        y -= 20;
        page.drawText(`Suggestion: ${clause.suggestion}`, {
          x: 50,
          y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });

        y -= 20;
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
      throw new Error('Failed to upload PDF report: ' + uploadError.message);
    }

    console.log('Getting public URL...');
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('contract-reports')
      .getPublicUrl(fileName);

    console.log('Saving report reference in database...');
    
    // Save report reference in database
    const { error: dbError } = await supabase
      .from('reports')
      .insert({
        contract_id: contractId,
        pdf_url: publicUrl
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save report reference: ' + dbError.message);
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
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}); 