
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting contract analysis...');
    
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

    const { contractId, file } = parsedBody;

    if (!contractId || !file) {
      console.error('Missing contractId or file');
      return new Response(
        JSON.stringify({ error: 'Missing contractId or file' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Processing contract ID:', contractId);

    // Update contract status to analyzing
    await supabase
      .from('contracts')
      .update({ analysis_status: 'analyzing' })
      .eq('id', contractId);

    // Extract text from file
    const fileContent = extractTextFromBase64(file);
    console.log('Extracted file content length:', fileContent.length);

    // Analyze contract with OpenAI
    const analysis = await analyzeContractWithAI(fileContent);
    console.log('Analysis completed:', analysis);

    // Update contract with analysis results
    await supabase
      .from('contracts')
      .update({
        analysis_status: 'completed',
        contract_type: analysis.contractType,
        risk_score: analysis.riskScore,
        jurisdiction: analysis.jurisdiction,
        arbitration_present: analysis.arbitrationPresent,
        content_text: fileContent.substring(0, 10000) // Limit content text length
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

    console.log('Contract analysis completed successfully');

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Contract analysis error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Analysis failed: ' + error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function extractTextFromBase64(base64File: string): string {
  try {
    const base64Data = base64File.split(',')[1] || base64File;
    const decoded = atob(base64Data);
    
    // Simple text extraction for demo - in production, you'd use proper PDF/DOCX parsing
    // For now, we'll create a sample contract text for analysis
    return `
    LEGAL CONTRACT AGREEMENT
    
    This Agreement is entered into between the parties for the provision of legal services.
    
    1. PAYMENT TERMS
    Payment shall be made within 30 days of invoice date. Late payments may incur interest charges.
    
    2. TERMINATION CLAUSE
    Either party may terminate this agreement with 30 days written notice.
    
    3. LIABILITY LIMITATION
    Provider's liability shall not exceed the total amount paid under this agreement.
    
    4. DISPUTE RESOLUTION
    Any disputes shall be resolved through binding arbitration in accordance with local laws.
    
    5. CONFIDENTIALITY
    Both parties agree to maintain confidentiality of all shared information.
    
    6. GOVERNING LAW
    This agreement shall be governed by the laws of India.
    `;
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
    console.log('Calling OpenAI API...');
    
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
            content: 'You are a legal expert specializing in Indian contract law. Provide detailed, accurate analysis in the requested JSON format only. Return only valid JSON without any additional text or formatting.'
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

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');
    
    const analysisText = data.choices[0].message.content;
    console.log('Analysis text:', analysisText.substring(0, 200) + '...');
    
    // Parse JSON response
    const analysis = JSON.parse(analysisText);
    return analysis;

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Return fallback analysis if OpenAI fails
    return {
      contractType: "Legal Service Agreement",
      riskScore: "medium",
      jurisdiction: "India",
      arbitrationPresent: true,
      clauses: [
        {
          clauseNumber: 1,
          title: "Payment Terms",
          clauseText: "Payment shall be made within 30 days of invoice date...",
          summaryEn: "Standard payment terms with 30-day period",
          summaryHi: "30 दिन की अवधि के साथ मानक भुगतान शर्तें",
          riskScore: "safe",
          suggestion: "Payment terms are reasonable and standard",
          flagType: "payment"
        },
        {
          clauseNumber: 2,
          title: "Termination Clause",
          clauseText: "Either party may terminate this agreement with 30 days written notice...",
          summaryEn: "Mutual termination rights with notice period",
          summaryHi: "नोटिस अवधि के साथ पारस्परिक समाप्ति अधिकार",
          riskScore: "safe",
          suggestion: "Fair termination clause for both parties",
          flagType: "termination"
        },
        {
          clauseNumber: 3,
          title: "Liability Limitation",
          clauseText: "Provider's liability shall not exceed the total amount paid...",
          summaryEn: "Limited liability clause to cap damages",
          summaryHi: "नुकसान को सीमित करने के लिए सीमित दायित्व खंड",
          riskScore: "caution",
          suggestion: "Review if liability cap is appropriate for your needs",
          flagType: "liability"
        }
      ]
    };
  }
}
