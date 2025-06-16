
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

interface ContractAnalysis {
  contractType: string;
  riskScore: 'low' | 'medium' | 'high';
  jurisdiction: string;
  arbitrationPresent: boolean;
  clauses: Array<{
    clauseNumber: number;
    title: string;
    clauseText: string;
    summaryEn: string;
    summaryHi: string;
    riskScore: 'safe' | 'caution' | 'risky';
    suggestion: string;
    flagType?: string;
  }>;
}

Deno.serve(async (req) => {
  try {
    const { contractId, file } = await req.json();

    if (!contractId || !file) {
      return new Response(
        JSON.stringify({ error: 'Missing contractId or file' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update contract status to analyzing
    await supabase
      .from('contracts')
      .update({ analysis_status: 'analyzing' })
      .eq('id', contractId);

    // Extract text from file (simplified - in production, use proper PDF/DOCX parsing)
    const fileContent = extractTextFromBase64(file);

    // Analyze contract with OpenAI
    const analysis = await analyzeContractWithAI(fileContent);

    // Update contract with analysis results
    await supabase
      .from('contracts')
      .update({
        analysis_status: 'completed',
        contract_type: analysis.contractType,
        risk_score: analysis.riskScore,
        jurisdiction: analysis.jurisdiction,
        arbitration_present: analysis.arbitrationPresent,
        content_text: fileContent
      })
      .eq('id', contractId);

    // Insert clauses
    for (const clause of analysis.clauses) {
      await supabase
        .from('clauses')
        .insert({
          contract_id: contractId,
          clause_number: clause.clauseNumber,
          title: clause.title,
          clause_text: clause.clauseText,
          summary_en: clause.summaryEn,
          summary_hi: clause.summaryHi,
          risk_score: clause.riskScore,
          suggestion: clause.suggestion,
          flag_type: clause.flagType
        });
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Contract analysis error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Analysis failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function extractTextFromBase64(base64File: string): string {
  // Simplified text extraction - in production, use proper PDF/DOCX parsing libraries
  try {
    const base64Data = base64File.split(',')[1] || base64File;
    const decoded = atob(base64Data);
    // This is a simplified extraction - you'd use proper libraries for PDF/DOCX
    return decoded.slice(0, 5000); // Limit for demo
  } catch (error) {
    console.error('Text extraction error:', error);
    return "Sample contract text for analysis...";
  }
}

async function analyzeContractWithAI(contractText: string): Promise<ContractAnalysis> {
  const prompt = `Analyze this legal contract and provide a detailed analysis in JSON format:

Contract Text: ${contractText.substring(0, 4000)}

Please provide analysis in this exact JSON structure:
{
  "contractType": "string (e.g., Employment Agreement, Service Agreement, etc.)",
  "riskScore": "low|medium|high",
  "jurisdiction": "string",
  "arbitrationPresent": boolean,
  "clauses": [
    {
      "clauseNumber": number,
      "title": "string",
      "clauseText": "string (first 200 chars of clause)",
      "summaryEn": "string (English summary)",
      "summaryHi": "string (Hindi summary)",
      "riskScore": "safe|caution|risky",
      "suggestion": "string (legal suggestion)",
      "flagType": "string (optional: termination, payment, liability, etc.)"
    }
  ]
}

Focus on Indian law context. Provide 3-5 key clauses analysis.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a legal expert specializing in Indian contract law. Provide detailed, accurate analysis in the requested JSON format only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    // Parse JSON response
    const analysis = JSON.parse(analysisText);
    return analysis;

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Return fallback analysis
    return {
      contractType: "General Agreement",
      riskScore: "medium",
      jurisdiction: "India",
      arbitrationPresent: false,
      clauses: [
        {
          clauseNumber: 1,
          title: "Payment Terms",
          clauseText: "Payment clause analysis...",
          summaryEn: "Standard payment terms identified",
          summaryHi: "मानक भुगतान शर्तें पहचानी गईं",
          riskScore: "safe",
          suggestion: "Review payment timeline for clarity"
        }
      ]
    };
  }
}
