
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';

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

    // Add title with professional header
    page.drawText('CONTRACT ANALYSIS REPORT', {
      x: 50,
      y: height - 50,
      size: 20,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    let y = height - 80;
    page.drawText(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, {
      x: 50,
      y,
      size: 10,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Add Executive Summary Header Table
    y -= 40;
    page.drawText('EXECUTIVE SUMMARY', {
      x: 50,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Summary table background
    y -= 10;
    page.drawRectangle({
      x: 50,
      y: y - 80,
      width: width - 100,
      height: 75,
      color: rgb(0.95, 0.95, 0.95),
    });

    // Summary table content
    y -= 25;
    page.drawText(`Contract Type: ${contract.contract_type || 'Not specified'}`, {
      x: 60,
      y,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    y -= 20;
    const getRiskColor = (riskScore: string) => {
      switch (riskScore) {
        case 'high': return rgb(0.8, 0.2, 0.2); // Red
        case 'medium': return rgb(0.9, 0.6, 0.0); // Orange
        case 'low': return rgb(0.2, 0.8, 0.2); // Green
        default: return rgb(0, 0, 0); // Black
      }
    };

    const riskLevel = contract.risk_score?.toUpperCase() || 'UNKNOWN';
    page.drawText(`Overall Risk Level: ${riskLevel}`, {
      x: 60,
      y,
      size: 12,
      font: boldFont,
      color: getRiskColor(contract.risk_score),
    });

    y -= 20;
    const clauseCount = contract.clauses?.length || 0;
    const riskyCount = contract.clauses?.filter(c => c.risk_score === 'risky').length || 0;
    page.drawText(`Total Clauses Reviewed: ${clauseCount} | High Risk Issues Found: ${riskyCount}`, {
      x: 60,
      y,
      size: 11,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Key recommendations section
    y -= 40;
    page.drawText('KEY RECOMMENDATIONS', {
      x: 50,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0.8, 0.2, 0.2),
    });

    // Generate recommendations based on actual contract data
    const recommendations = [];
    
    if (contract.clauses && Array.isArray(contract.clauses)) {
      const riskyClause = contract.clauses.find(c => c.risk_score === 'risky');
      const cautionClause = contract.clauses.find(c => c.risk_score === 'caution');
      
      if (riskyClause) {
        recommendations.push(`URGENT: ${riskyClause.title} needs immediate revision - ${riskyClause.suggestion || 'Requires legal attention'}`);
      }
      if (cautionClause && cautionClause.id !== riskyClause?.id) {
        recommendations.push(`REVIEW: ${cautionClause.title} - ${cautionClause.suggestion || 'Needs improvement'}`);
      }
    }
    
    // Default recommendations if none found
    if (recommendations.length === 0) {
      recommendations.push("Consider legal consultation for contract optimization");
      recommendations.push("Review payment and termination terms carefully");
    }

    for (const recommendation of recommendations) {
      y -= 25;
      if (y < 100) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = page.getSize().height - 50;
      }
      
      const wrappedLines = wrapText(`• ${recommendation}`, 80);
      for (const line of wrappedLines) {
        page.drawText(line, {
          x: 60,
          y,
          size: 11,
          font: font,
          color: rgb(0, 0, 0),
        });
        y -= 15;
      }
    }

    // Add detailed clause analysis
    y -= 40;
    if (y < 100) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = page.getSize().height - 50;
    }

    page.drawText('DETAILED CLAUSE ANALYSIS', {
      x: 50,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    if (!contract.clauses || !Array.isArray(contract.clauses) || contract.clauses.length === 0) {
      console.log('No clauses found in contract data');
      y -= 30;
      page.drawText('No detailed clause analysis available', {
        x: 50,
        y,
        size: 12,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
    } else {
      console.log(`Found ${contract.clauses.length} clauses`);
      
      // Sort clauses by clause_number to ensure proper order
      const sortedClauses = [...contract.clauses].sort((a, b) => a.clause_number - b.clause_number);
      
      for (let i = 0; i < sortedClauses.length; i++) {
        const clause = sortedClauses[i];
        
        // Check if we need a new page
        if (y < 150) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = page.getSize().height - 50;
        }

        y -= 30;
        const riskIcon = clause.risk_score === 'risky' ? '[HIGH RISK]' : clause.risk_score === 'caution' ? '[CAUTION]' : '[SAFE]';
        page.drawText(`${riskIcon} Clause ${clause.clause_number}: ${clause.title}`, {
          x: 50,
          y,
          size: 14,
          font: boldFont,
          color: rgb(0, 0, 0),
        });

        y -= 20;
        page.drawText(`Risk Level: ${clause.risk_score.toUpperCase()}`, {
          x: 50,
          y,
          size: 12,
          font: font,
          color: getRiskColor(clause.risk_score === 'risky' ? 'high' : clause.risk_score === 'caution' ? 'medium' : 'low'),
        });

        if (clause.summary_en) {
          y -= 20;
          const summaryLines = wrapText(`Summary: ${clause.summary_en}`, 80);
          for (const line of summaryLines) {
            page.drawText(line, {
              x: 50,
              y,
              size: 11,
              font: font,
              color: rgb(0, 0, 0),
            });
            y -= 15;
          }
        }

        if (clause.suggestion) {
          y -= 5;
          const suggestionLines = wrapText(`Recommendation: ${clause.suggestion}`, 80);
          for (const line of suggestionLines) {
            page.drawText(line, {
              x: 50,
              y,
              size: 11,
              font: font,
              color: rgb(0.2, 0.6, 0.2),
            });
            y -= 15;
          }
        }

        y -= 10; // Extra space between clauses
      }
    }

    // Add plain language summary section
    y -= 30;
    if (y < 100) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = page.getSize().height - 50;
    }

    page.drawText('PLAIN LANGUAGE SUMMARY', {
      x: 50,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    y -= 25;
    const plainSummary = `This contract analysis found ${riskyCount} high-risk issues that need immediate attention. The main concerns are around payment terms, termination rights, and dispute resolution. We recommend reviewing these clauses with your legal advisor before signing. This analysis is designed to help you understand potential risks in plain language.`;
    const summaryLines = wrapText(plainSummary, 70);
    for (const line of summaryLines) {
      page.drawText(line, {
        x: 50,
        y,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });
      y -= 18;
    }

    // Add disclaimer
    y -= 30;
    page.drawText('LEGAL DISCLAIMER', {
      x: 50,
      y,
      size: 12,
      font: boldFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    y -= 20;
    const disclaimer = "This report is for informational purposes only and does not constitute legal advice. Please consult with a qualified attorney for specific legal guidance.";
    const disclaimerLines = wrapText(disclaimer, 70);
    for (const line of disclaimerLines) {
      page.drawText(line, {
        x: 50,
        y,
        size: 10,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
      y -= 15;
    }

    console.log('Saving PDF document...');
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();

    console.log('Uploading PDF to storage...');
    
    // Upload to Supabase Storage with better error handling
    const fileName = `reports/${contractId}-${Date.now()}.pdf`;
    
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('contract-reports')
        .upload(fileName, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error('Failed to upload PDF: ' + uploadError.message);
      }

      console.log('Upload successful:', uploadData);
    } catch (storageError) {
      console.error('Storage operation failed:', storageError);
      return new Response(
        JSON.stringify({ error: 'Storage upload failed: ' + storageError.message }),
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

    console.log('Public URL generated:', publicUrl);

    console.log('Saving report reference in database...');
    
    // Check if report already exists
    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('contract_id', contractId)
      .maybeSingle();

    let dbError;
    
    if (existingReport) {
      // Update existing report
      const { error } = await supabase
        .from('reports')
        .update({
          pdf_url: publicUrl,
          generated_on: new Date().toISOString()
        })
        .eq('contract_id', contractId);
      dbError = error;
    } else {
      // Insert new report
      const { error } = await supabase
        .from('reports')
        .insert({
          contract_id: contractId,
          pdf_url: publicUrl
        });
      dbError = error;
    }

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

function wrapText(text: string, maxLength: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
}
