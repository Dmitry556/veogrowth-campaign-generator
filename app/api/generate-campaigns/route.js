export const maxDuration = 60; // Vercel timeout

import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
// No more GoogleGenerativeAI needed

// Initialize Anthropic Client (for Claude)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Resend Client
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to safely parse JSON
function safeJsonParse(jsonString, promptName = "ClaudeOutput") {
  if (!jsonString || typeof jsonString !== 'string') {
    console.warn(`Invalid input to safeJsonParse for ${promptName}: not a string or empty. Input:`, jsonString);
    return { error: `Invalid input to JSON parser for ${promptName}. Expected string.`};
  }
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.warn(`Failed to parse JSON string for ${promptName}, returning error object. Details: ${e.message}. String (first 200 chars):`, jsonString.substring(0,200) + "...");
    return { error: `Failed to parse JSON output for ${promptName}.`, details: e.message, original_output_snippet: jsonString.substring(0,500) };
  }
}

// --- NEW COMPREHENSIVE METAPROMPT FOR CLAUDE (Research + Generation) ---
const METAPROMPT_FOR_CLAUDE_RESEARCH_AND_GENERATION = `You are VeoGrowth's AI strategist. Your goal is to analyze a company based on its website ({website}) and generate hyper-specific B2B cold email campaign ideas.
You will perform all necessary research using your web_search tool and then structure your entire output as a single, minified JSON object.

OVERALL TASK:
1.  Understand the company at {website}. The user has provided an initial assessment of their positioning clarity: "{positioning}".
2.  Using your web_search tool, research the company to gather information similar to the following (this is a guide, adapt your search and findings):
    a.  **Homepage Analysis:** Company name, primary product/service, mechanism, key features (top 5-7), main value propositions (1-3), target audience details (explicitly served, industries, company sizes, job titles, use cases), trust indicators (logos, certifications from homepage), and an assessment of their homepage positioning strength (clear/moderate/unclear).
    b.  **Case Study Analysis:** Find up to 2-3 distinct customer success stories/case studies. For each, identify customer name, problem faced (1-2 concise sentences), solution provided by {company} (1-2 concise sentences), most significant quantifiable result(s), and an optional supporting quote. Provide a summary note on your findings (e.g., "Found 2 detailed case studies," or "No comprehensive case studies discovered").
    c.  **Market Context Analysis:** Identify 1-2 main direct competitors, 1-2 key differentiators for {company}, 2-3 primary pain points {company} solves, their market category, pricing model clarity (transparent/opaque), 1-2 company growth signals, and 1-2 relevant market trends. Assess their overall market position (leader/challenger etc.).
3.  After your research and internal thinking/synthesis (for which you have a thinking budget), generate your complete analysis and campaign ideas.

CRITICAL RULES FOR FINAL JSON OUTPUT AND CONTENT:
1.  Your *ENTIRE RESPONSE* MUST be a single, minified JSON object. Do NOT include any text, explanations, or Markdown formatting (like \`\`\`json) before or after the JSON object.
2.  NEVER use personal names from testimonials (say "Mars" or "a leading CPG company" not "Lumeng Jin from Mars").
3.  Email examples must be concise, ideally under 70 words.
4.  Always use periods between sentences. Never use dashes as sentence separators.
5.  Never start observations with "noticed" or "saw". Jump straight to the fact.
6.  Make every observable fact specific and publicly findable (or clearly derivable from your web search).
7.  If your research for case studies (detailed_case_studies array in the output) yields no results or the search_summary_notes indicates no good case studies were found, the "socialProofNote" field in your JSON output MUST contain the warning note. Otherwise, it should be an empty string or null.
8.  Target segments must be substantial (1,000+ prospects minimum).
9.  When appropriate for personalization, use natural vivid imagery relevant to the prospect's pain.
10. For agencies: ALWAYS include specific execution details and valuable offers in the "veoGrowthPitch".
11. Show, don't tell: Demonstrate understanding through specifics found via your web_search tool.

VIVID IMAGERY GUIDELINES:
- Use ONLY when it naturally fits and is hyper-relevant to the problem.
- Examples: "Sunday nights look like Excel hell", "10 hours watching videos of coffee cups sliding".
- Don't force it. Clarity is paramount.

JSON OUTPUT STRUCTURE (Your entire output must conform to this):
{
  "researchedCompanyName": "[Actual company name found, e.g., 'IXON B.V.']",
  "researchedHomepageData": {
    "product": "[Primary product/service]",
    "mechanism": "[How it works]",
    "features": ["[Feature 1]", "[Feature 2]"],
    "value_props": ["[VP 1]", "[VP 2]"],
    "target_audience": {
      "explicit_served": "", "industries": "", "company_sizes": "", "job_titles": "", "use_cases": ""
    },
    "trust_indicators": [],
    "homepage_positioning_strength": "clear/moderate/unclear"
  },
  "researchedCaseStudies": {
    "detailed_case_studies": [
      { "customer_name": "", "problem_faced": "", "solution_provided_by_company": "", "quantifiable_results_achieved": [], "supporting_quote_snippet": "" }
    ],
    "search_summary_notes": ""
  },
  "researchedMarketContext": {
    "main_competitors_identified": [],
    "key_differentiators_identified": [],
    "pain_points_addressed_by_company": [],
    "market_category": "",
    "pricing_model_clarity": "transparent/opaque/not_found",
    "company_growth_signals": [],
    "relevant_market_trends": [],
    "overall_market_position_assessment": "leader/challenger/niche_player/emerging/unclear"
  },
  "positioningAssessmentOutput": "[Your 1-2 sentence positioning assessment, considering user input '{positioning}' and your research (researchedHomepageData.homepage_positioning_strength)]",
  "idealCustomerProfile": {
    "industry": "[Derived from researchedHomepageData.target_audience.industries]",
    "companySize": "[Derived from researchedHomepageData.target_audience.company_sizes]",
    "keyCharacteristics": [
      "[Pain point from researchedMarketContext.pain_points_addressed_by_company]",
      "[Use case from researchedHomepageData.target_audience.use_cases]",
      "[Need related to researchedHomepageData.features]",
      "[Another characteristic based on your research]",
      "[Market trend from researchedMarketContext.relevant_market_trends if applicable]"
    ]
  },
  "keyPersonas": [
    { "title": "[Title from researchedHomepageData.target_audience.job_titles or inferred]", "painPoints": "Challenge 1, Challenge 2, Challenge 3" },
    { "title": "[Another relevant title]", "painPoints": "Issue A, Issue B, Issue C" }
  ],
  "campaignIdeas": [
    {
      "name": "[Descriptive Campaign Name 1]",
      "target": "[Target persona 1] at [company type, e.g., B2B SaaS with specific observable characteristic]",
      "emailBody": "Hi [Name], [Observable fact about prospect's company, related to researchedHomepageData.product]. [Vivid pain point]. {website} helped [Customer name from researchedCaseStudies.detailed_case_studies[0].customer_name, or fallback 'a leading company'] achieve [Result from researchedCaseStudies.detailed_case_studies[0].quantifiable_results_achieved (join if array), or fallback benefit]. [CTA?]"
    },
    {
      "name": "[Descriptive Campaign Name 2]",
      "target": "[Target persona 2] at [different company type]",
      "emailBody": "Hi [Name], [Different observable fact]. [Different pain point]. Using {website}'s [feature from researchedHomepageData.features], companies like [Customer name from researchedCaseStudies.detailed_case_studies[1].customer_name if available, or fallback] saw [Result from researchedCaseStudies.detailed_case_studies[1].quantifiable_results_achieved if available, or fallback]. [Different CTA?]"
    },
    {
      "name": "[Descriptive Campaign Name 3]",
      "target": "[Target persona 3] at [third company type]",
      "emailBody": "Hi [Name], [Third observable fact, perhaps related to competitor from researchedMarketContext.main_competitors_identified]. [Pain point]. {website} addresses this by [solution from researchedHomepageData.mechanism or value_prop]. [Customer example or general benefit, drawing from researchedCaseStudies if available]. [Third CTA?]"
    }
  ],
  "socialProofNote": "[Generate this note if rule 6 applies, using researchedCaseStudies.search_summary_notes, otherwise empty string or null]",
  "veoGrowthPitch": "Want VeoGrowth to execute these campaigns? We'll [specific action related to ICP] and [specific outcome related to value prop].",
  "prospectTargetingNote": "Note: These campaigns would target approximately [X,000-Y,000] qualified prospects [specific description of who and why they're qualified, informed by your research]."
}
Ensure all string values in your JSON output are properly escaped (e.g., newlines as \\\\n, quotes as \\\\").
The examples below (EXAMPLE 1, EXAMPLE 2, etc.) are for style and content guidance for each section of *your* JSON output, which you will populate based on your web research for {website}.

---
EXAMPLE 1 - SaaS with Clear Positioning (IXON):
If your web research for {website} yielded information similar to what is known about IXON, your JSON output would be structured as defined above, with content reflecting IXON's details. For instance:
"researchedCompanyName": "IXON B.V.",
"researchedHomepageData": {
  "product": "IXON Cloud (IIoT platform for industrial remote access, data logging, and machine management)",
  "mechanism": "Connects industrial machines via IXrouter to the IXON Cloud platform...",
  "features": ["Remote Access (VPN, VNC, HTTP)", "Data Logging & Analytics", "..."],
  "value_props": ["Connect, control, and manage your industrial machines from anywhere.", "..."],
  "target_audience": { "explicit_served": "Machine builders, OEMs, System Integrators", "industries": "Industrial Automation", "..."},
  "trust_indicators": ["ISO 27001 certified", "G2 9.2/10 rating", "..."],
  "homepage_positioning_strength": "clear"
},
"researchedCaseStudies": {
  "detailed_case_studies": [
    { "customer_name": "VDL Enabling Technologies Group", "problem_faced": "VDL ETG faced challenges providing remote support...", "solution_provided_by_company": "IXON Cloud enabled secure remote access...", "quantifiable_results_achieved": ["Reduced travel costs by 50%", "Reduced machine downtime by 20%"], "supporting_quote_snippet": "IXON Cloud has enabled us to provide faster support..." }
    // Potentially 1-2 more case studies if found for IXON
  ],
  "search_summary_notes": "Found multiple detailed case studies for IXON directly on their website with quantifiable results."
},
"researchedMarketContext": {
  "main_competitors_identified": ["HMS Networks (eWON)", "Cumulocity IoT"],
  "key_differentiators_identified": ["Ease of use for machine builders", "All-in-one secure platform"],
  // ... other market context fields for IXON ...
  "overall_market_position_assessment": "challenger"
},
"positioningAssessmentOutput": "✅ CLEAR. IXON has excellent positioning as an Industrial IoT platform specifically for machine builders, with clear value props around secure remote access, machine insights, and service efficiency, strongly supported by their homepage and customer evidence.",
"idealCustomerProfile": {
  "industry": "Machine builders/OEMs (industrial equipment manufacturers)",
  "companySize": "50-500 employees (mid-market manufacturers)",
  "keyCharacteristics": ["Build complex industrial machines requiring remote support", "Have field service teams", "..."]
},
"keyPersonas": [
  { "title": "VP of Service / Service Manager", "painPoints": "High travel costs, slow response times, technician productivity, customer satisfaction" },
  // ... other personas for IXON ...
],
"campaignIdeas": [
  {
    "name": "Travel Cost Crusher",
    "target": "VP of Service at machine builders with 10+ field technicians",
    "emailBody": "Hi Mark, manufacturing packaging equipment with 15 field techs covering North America means travel probably eats 40% of service budget. IXON's secure remote access lets technicians fix issues from their desk. VDL Enabling Technologies Group cut travel costs by 50% using IXON. Worth exploring?"
  }
  // ... 2 more campaign ideas for IXON, using other case studies or researched data ...
],
"socialProofNote": "", // Empty because good case studies were found for IXON
"veoGrowthPitch": "Want VeoGrowth to execute these campaigns? We'll build targeted lists of machine builders struggling with service costs and craft messages that resonate with their specific challenges.",
"prospectTargetingNote": "Note: These campaigns would target approximately 3,000-5,000 qualified prospects across North America and Europe, focusing on mid-market manufacturers with distributed equipment."

---
EXAMPLE 2 - SaaS with Unclear Positioning (Tourmo):
If your web research for {website} yielded information similar to Tourmo:
"researchedCompanyName": "Tourmo.ai",
// ... populate researchedHomepageData, researchedCaseStudies (likely with few details and negative search_summary_notes), researchedMarketContext for Tourmo ...
"positioningAssessmentOutput": "⚠️ MODERATELY CLEAR. Tourmo.ai positions as an AI fleet management platform that integrates with existing systems, but the messaging covers many features without a single compelling focus. The 'no rip and replace' angle is strong but gets lost among numerous capabilities.",
// ... populate ICP, Personas, CampaignIdeas for Tourmo, emails will be more hypothetical ...
"socialProofNote": "Our AI research (leveraging Google Search) could not find specific customer case studies with detailed metrics for Tourmo.ai. The AI research notes: '[Example search_summary_notes from Tourmo's research stating lack of case studies]'. The examples above use hypothetical scenarios. When we work together, you'll provide real customer success stories.",
"additionalRecommendations": "Consider leading with ONE killer use case (like 'Stop drowning in false positive alerts') rather than trying to communicate all capabilities upfront. The 'no rip and replace' message is gold but needs to be tied to a specific, painful problem." // Note: This 'additionalRecommendations' field is NOT in the primary JSON output schema. If you want it, add it to the schema. For now, Claude should focus on the defined schema.

---
EXAMPLE 3 - Agency with Hyper-Personalization (ConversionLab):
...(Follow the JSON structure, populating with hypothetical ConversionLab research data and campaign ideas)...

---
EXAMPLE 4 - SEO Agency with Specific Execution (RankRise):
...(Follow the JSON structure, populating with hypothetical RankRise research data and campaign ideas)...

---
EXAMPLE 5 - Email Marketing Agency with Deep Personalization (FlowMasters):
...(Follow the JSON structure, populating with hypothetical FlowMasters research data and campaign ideas)...

Remember: The quality bar is EXTREMELY high. Every campaign idea must feel like it required hours of research and deep industry knowledge, drawing from the information you gather using your web_search tool. The prospect should think "how do they know exactly what I'm dealing with?"
For agencies especially: ALWAYS include specific things found on their site (from your research), exact execution plans, and valuable free offers in the campaign emails.
Your entire output MUST be only the single JSON object. Adhere strictly to the defined JSON output structure.
`;

// --- Function to send email with analysis ---
async function sendEmailReport(email, companyName, claudeAnalysisJson) { // Removed geminiResearchJson for simplicity, assuming claudeAnalysisJson has all needed for email
  try {
    const emailHtmlForUser = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; }
          h1, h2, h3, h4 { color: #1f2937; }
          h2 { margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;}
          h3 { margin-top: 20px; color: #4f46e5; }
          h4 { margin-top: 15px; color: #1f2937; }
          .campaign-card { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #e5e7eb;}
          .email-body { background: #ffffff; padding: 10px; border-left: 3px solid #4f46e5; margin-top: 5px; white-space: pre-line; font-style: italic;}
          .note { background: #fef3c7; border-left: 3px solid #f59e0b; padding: 10px; margin-top: 15px; }
          .pitch-section { background: #4f46e5; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-top:30px; }
          .pitch-section h2 { color: white; border: none;}
          .pitch-section a { display: inline-block; background: white; color: #4f46e5; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-top:15px;}
          ul { padding-left: 20px; }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="margin: 0;">VeoGrowth</h1>
          <p style="color: #6b7280; margin-top: 5px;">AI-Powered B2B Lead Generation</p>
        </div>

        <div style="background: #f9fafb; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; border:none;">Your Campaign Analysis for ${companyName}</h2>
          <p style="color: #4b5563;">Thank you for using VeoGrowth! Here's the AI-generated analysis:</p>
        </div>

        <div>
          <h2>Positioning Assessment</h2>
          <p>${claudeAnalysisJson.positioningAssessmentOutput || 'Not available.'}</p>

          <h2>Ideal Customer Profile</h2>
          <p><strong>Industry:</strong> ${claudeAnalysisJson.idealCustomerProfile?.industry || 'N/A'}</p>
          <p><strong>Company Size:</strong> ${claudeAnalysisJson.idealCustomerProfile?.companySize || 'N/A'}</p>
          <p><strong>Key Characteristics:</strong></p>
          <ul>${(claudeAnalysisJson.idealCustomerProfile?.keyCharacteristics || []).map(char => `<li>${char}</li>`).join('')}</ul>

          <h2>Key Personas</h2>
          ${(claudeAnalysisJson.keyPersonas || []).map(persona => `
            <div class="campaign-card" style="background:#eef2ff; border-left: 3px solid #6366f1;">
              <h4>${persona.title}</h4>
              <p><strong>Pain Points:</strong> ${persona.painPoints}</p>
            </div>
          `).join('')}

          <h2>Campaign Ideas</h2>
          ${(claudeAnalysisJson.campaignIdeas || []).map(campaign => `
            <div class="campaign-card">
              <h3>${campaign.name}</h3>
              <p><strong>Target:</strong> ${campaign.target}</p>
              <p><strong>Example Email:</strong></p>
              <div class="email-body">${campaign.emailBody.replace(/\n/g, '<br>')}</div>
            </div>
          `).join('')}

          ${(claudeAnalysisJson.socialProofNote && claudeAnalysisJson.socialProofNote.trim() !== "") ? `
            <div class="note">
              <h4>⚠️ Note on Social Proof</h4>
              <p>${claudeAnalysisJson.socialProofNote}</p>
            </div>
          ` : ''}
          
          <div style="margin-top:30px; padding-top:20px; border-top:1px solid #e5e7eb;">
            <p><strong>VeoGrowth Pitch:</strong> ${claudeAnalysisJson.veoGrowthPitch || ''}</p>
            <p><em>${claudeAnalysisJson.prospectTargetingNote || ''}</em></p>
          </div>
        </div>

        <div class="pitch-section">
          <h2>Ready to Execute These Campaigns?</h2>
          <p>VeoGrowth will implement these campaigns for you: Build targeted lists, craft hyper-personalized messages, and book qualified meetings.</p>
          <a href="https://calendly.com/veogrowth/strategy">Book a Strategy Call</a>
        </div>

        <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top:30px;">
          <p>Questions? Reply to this email and I'll personally respond.</p>
          <p style="margin-top: 20px;">
            Best regards,<br>
            <strong>Dmitry Pinchuk</strong><br>
            Founder, VeoGrowth
          </p>
        </div>
      </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: 'VeoGrowth <campaigns@veogrowth.com>',
      to: email,
      subject: `Your B2B Cold Email Campaigns for ${companyName}`,
      html: emailHtmlForUser,
      replyTo: 'dmitry@veogrowth.com'
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }

    console.log('Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

// --- MAIN API ROUTE FUNCTION (POST) ---
export async function POST(req) {
  try {
    const { email, website, positioning } = await req.json();

    // Validate work email
    const freeEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'mail.com', 'protonmail.com', 'icloud.com'];
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (freeEmailDomains.includes(emailDomain)) {
      return Response.json({ success: false, error: 'Please enter a work email address' }, { status: 400 });
    }
    if (!email || !website || !positioning) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    console.log('New lead:', { email, website, positioning, timestamp: new Date() });

    // No more Gemini, so remove Gemini API key check and model init check for Gemini
    if (!process.env.ANTHROPIC_API_KEY) { // Check Anthropic key
        console.error("Critical: ANTHROPIC_API_KEY not configured. Aborting.");
        return Response.json({ success: false, error: 'AI module not configured (API Key missing).' }, { status: 500 });
    }
    
    const companyNameFromUrl = website.replace(/https?:\/\//, '').replace('www.', '').split('/')[0];

    // Prepare the prompt for Claude (no more {research} placeholder from Gemini)
    // Claude will do its own research using the web_search tool.
    // The METAPROMPT instructs it on what kind of research to do.
    let finalClaudePrompt = METAPROMPT_FOR_CLAUDE_RESEARCH_AND_GENERATION
      .replace('{website}', website) // Replace {website} in the main prompt
      .replace(/{company}/g, companyNameFromUrl) // Replace {company} globally
      .replace('{positioning}', positioning); // User's positioning assessment
    
    console.log(`Starting Claude Opus 4 task for ${website} with web search and thinking enabled...`);
    console.time("ClaudeFullProcess");
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 4000, // Max tokens for Claude's output (JSON)
      temperature: 0.5, // Slightly lower temp for more factual/structured output
      system: "You are an expert AI strategist. Follow all instructions precisely. Your entire output must be a single minified JSON object.", // System prompt can reinforce output format
      messages: [{ role: 'user', content: finalClaudePrompt }],
      tools: [{ // Enable web search tool for Claude
        "type": "web_search_20250305", // Using the identifier from your research
        "name": "web_search",
        "max_uses": 10 // Allow more searches if needed for comprehensive research
      }],
      // Enable extended thinking for Claude
      // thinking: { // According to your research, this is how it's enabled.
      //   "type": "enabled",
      //   "budget_tokens": 10000 // Example budget, can be tuned
      // } 
      // The above 'thinking' parameter might need to be at the top level of the request body,
      // not inside 'messages'. Let's try it at the top level.
    },
    // Top-level parameters for the request
    {
      thinking: { // Correct placement for thinking based on some SDK structures
        "type": "enabled",
        "budget_tokens": 15000 // Increased budget slightly
      }
    }
    );
    console.timeEnd("ClaudeFullProcess");
    
    const claudeOutputText = claudeResponse.content[0].text;
    console.log("Raw Claude output (first 300 chars):", claudeOutputText.substring(0,300));
    
    let claudeAnalysisJson = safeJsonParse(claudeOutputText, "ClaudeAnalysis");

    // If parsing failed, try to strip markdown just in case Claude added it despite instructions
    if (claudeAnalysisJson.error) {
        console.warn("Initial JSON parse from Claude failed. Attempting to strip markdown...");
        const markdownJsonRegex = /```json\s*([\s\S]*?)\s*```/;
        const match = claudeOutputText.match(markdownJsonRegex);
        if (match && match[1]) {
            const strippedText = match[1].trim();
            console.log("Attempting to re-parse Claude output after stripping markdown (first 100 chars of stripped):", strippedText.substring(0,100));
            claudeAnalysisJson = safeJsonParse(strippedText, "ClaudeAnalysisReparsed");
            if (!claudeAnalysisJson.error) {
                 console.log("Successfully reparsed Claude output after stripping markdown.");
            } else {
                 console.error("Reparsing Claude output also failed. Final attempt with raw text if it looks like JSON.");
                 // Final desperate attempt: if it looks like JSON but parse failed, wrap it for the error message
                 if (claudeOutputText.trim().startsWith("{") && claudeOutputText.trim().endsWith("}")) {
                    claudeAnalysisJson = { error: "Raw output looked like JSON but failed to parse.", details: claudeAnalysisJson.details, original_output_snippet: claudeOutputText.substring(0,500)};
                 }
            }
        }
        if (claudeAnalysisJson.error) { 
             console.error("Claude did not return valid JSON. Raw output snippet:", claudeOutputText.substring(0, 1000));
             return Response.json({ success: false, error: "Failed to parse analysis from AI. Please try again.", debug_claude_output_snippet: claudeOutputText.substring(0, 1000) }, { status: 500 });
        }
    }
    
    // Log the structured data that will be sent to email and frontend
    console.log('FINAL STRUCTURED DATA (from Claude, for email & frontend):', JSON.stringify(claudeAnalysisJson, null, 2));

    await sendEmailReport(email, companyNameFromUrl, claudeAnalysisJson);

    // Send structured JSON to the frontend
    return Response.json({
      success: true,
      data: { 
        companyName: companyNameFromUrl, 
        website: website,
        positioningInput: positioning,
        // No more separate geminiResearch, claudeAnalysis IS the main data now
        analysis: claudeAnalysisJson 
      }
    });

  } catch (error) {
    console.error('API Error in POST function:', error);
    if (error.response && error.response.data) { // Anthropic API errors often have this structure
        console.error('Anthropic API Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    return Response.json({ success: false, error: 'Failed to generate analysis. Please try again.' }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ message: 'VeoGrowth Campaign Generator API - Now with CLAUDE OPUS 4 Powered Research & Generation!' });
}
