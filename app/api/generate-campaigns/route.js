export const maxDuration = 60; // Vercel timeout

import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

// Initialize Anthropic Client
const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Resend Client
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to safely parse JSON from AI outputs
function safeJsonParse(jsonString, stepName = "AIOutput") {
  if (typeof jsonString !== 'string' || !jsonString.trim()) {
    console.warn(`safeJsonParse for ${stepName}: Input is not a non-empty string. Input:`, jsonString);
    return { error: `Input for ${stepName} was not a non-empty string.` };
  }
  let textToParse = jsonString.trim();
  const markdownJsonRegex = /^```json\s*([\s\S]*?)\s*```$/;
  const match = textToParse.match(markdownJsonRegex);
  if (match && match[1]) {
    textToParse = match[1].trim();
    console.log(`Stripped markdown wrapper for ${stepName}.`);
  }
  try {
    const parsed = JSON.parse(textToParse);
    return parsed;
  } catch (e) {
    console.error(`safeJsonParse for ${stepName} failed: ${e.message}. Snippet:`, textToParse.substring(0, 200));
    return { error: `Failed to parse JSON for ${stepName}. Details: ${e.message}`, original_snippet: textToParse.substring(0, 500) };
  }
}

// --- RESEARCH PROMPTS for Claude Haiku ---
const HAIKU_RESEARCH_PROMPTS = {
  homepage: {
    promptName: "HaikuHomepageAnalysis",
    content: `You are an AI research assistant. Your task is to analyze the homepage of {website} for the company {company}.
Use your web_search tool if needed to understand the company and its offerings from their homepage.
Extract the following information:
1.  "company_name": The official company name found.
2.  "product_description": A concise 1-2 sentence description of their main product/service.
3.  "key_features": A list of 3-5 key features mentioned.
4.  "target_audience_keywords": A list of 3-5 keywords describing their target audience or industries.
Return this information *ONLY* as a single, minified JSON object with these exact keys. No other text.
Example: {"company_name": "Example Inc.", "product_description": "Provides AI solutions for X.", "key_features": ["Feature A", "Feature B"], "target_audience_keywords": ["SaaS", "B2B", "Enterprise"]} `
  },
  caseStudies: {
    promptName: "HaikuCaseStudySearch",
    content: `You are an AI research assistant. Find **up to 2** concise customer case studies or success story summaries for {company} ({website}).
Use your web_search tool. Focus on finding mentions of customer names and quantifiable results or specific benefits.
For each case study (max 2):
1.  "customer_name": The customer's company name.
2.  "key_result_or_benefit": A brief (1 sentence) summary of the main result or benefit achieved by the customer using {company}'s product/service.
Return this information *ONLY* as a single, minified JSON object.
The main key should be "found_case_studies", an array of these objects. Include a "search_summary_note" string.
Example: {"found_case_studies": [{"customer_name": "Acme Corp", "key_result_or_benefit": "Increased efficiency by 30%."}], "search_summary_note": "Found 1 relevant case study snippet."}
If no clear case studies are found, return an empty array for "found_case_studies" and note it in "search_summary_note".`
  },
  marketContext: {
    promptName: "HaikuMarketContextSearch",
    content: `You are an AI research assistant. Provide a brief market context for {company} ({website}).
Use your web_search tool to identify:
1.  "identified_competitors": A list of 1-2 main competitors.
2.  "core_differentiators": A list of 1-2 key differentiators for {company} compared to alternatives.
Return this information *ONLY* as a single, minified JSON object with these exact keys. No other text.
Example: {"identified_competitors": ["CompetitorX", "CompetitorY"], "core_differentiators": ["Unique Feature Z", "Better Pricing"]}`
  }
};

// Function to perform research with Claude Haiku + Web Search
async function performClaudeHaikuResearch(website, researchObjective) {
  const companyNameFromUrl = website.replace(/https?:\/\//, "").replace("www.", "").split("/")[0];
  const prompt = researchObjective.content
    .replace("{website}", website)
    .replace(/{company}/g, companyNameFromUrl); 

  console.log(`Starting Haiku research: ${researchObjective.promptName} for ${website}`);
  console.time(researchObjective.promptName);
  let finalJsonString = ""; 

  try {
    const response = await anthropicClient.messages.create({
      model: "claude-3-5-haiku-latest", 
      max_tokens: 2000, 
      messages: [{ role: "user", content: prompt }],
      tools: [{
        "type": "web_search_20250305",
        "name": "web_search",
        "max_uses": 3 
      }]
    });
    
    if (response && response.content && response.content.length > 0) {
      for (let i = response.content.length - 1; i >= 0; i--) {
        if (response.content[i].type === 'text' && typeof response.content[i].text === 'string') {
          finalJsonString = response.content[i].text;
          break; 
        }
      }
      if (finalJsonString) {
        console.log(`Haiku research ${researchObjective.promptName} - final text block (first 100): ${finalJsonString.substring(0, 100)}`);
      } else {
        console.warn(`Haiku research ${researchObjective.promptName} for ${website} did not produce a final text block after tool use. Content:`, JSON.stringify(response.content.slice(-2), null, 2)); 
        finalJsonString = JSON.stringify({ error: `Haiku did not produce a final text JSON for ${researchObjective.promptName} after tool interactions.` });
      }
    } else {
      console.warn(`Haiku research ${researchObjective.promptName} for ${website} returned no content array or empty content. Response:`, JSON.stringify(response, null, 2));
      finalJsonString = JSON.stringify({ error: `Haiku returned no content for ${researchObjective.promptName}` });
    }
    
    console.timeEnd(researchObjective.promptName);
    return safeJsonParse(finalJsonString, researchObjective.promptName);

  } catch (error) {
    console.timeEnd(researchObjective.promptName); 
    console.error(`Error during Haiku research (${researchObjective.promptName}) for ${website}:`, error);
    const errorDetails = error.message ? error.message : "Unknown error during Haiku research";
    return safeJsonParse(JSON.stringify({ error: `Failed Haiku research for ${researchObjective.promptName}`, details: errorDetails }), researchObjective.promptName);
  }
}

// --- CLAUDE OPUS METAPROMPT for Campaign Generation (using research from Haiku) ---
const CLAUDE_OPUS_GENERATION_METAPROMPT = `You are VeoGrowth's AI strategist analyzing a company's website to generate hyper-specific B2B cold email campaign ideas. You will produce EXACTLY the same format and quality as shown in the examples, with zero deviation.

CRITICAL CONTEXT: VeoGrowth is an AI-powered lead generation agency that creates hyper-personalized cold email campaigns. We help companies book qualified meetings by understanding their prospects deeply and crafting messages that resonate.

INPUTS PROVIDED TO YOU (available in the {research_data_json} placeholder):
- Research Data (research_data_json): This is a JSON object containing three main keys: "homepageInfo", "caseStudyInfo", and "marketInfo". Each of these keys holds structured information gathered by a research AI (Claude Haiku).
  - research_data_json.homepageInfo: Contains "company_name", "product_description", "key_features", "target_audience_keywords".
  - research_data_json.caseStudyInfo: Contains "found_case_studies" (an array of objects with "customer_name", "key_result_or_benefit") and "search_summary_note".
  - research_data_json.marketInfo: Contains "identified_competitors" and "core_differentiators".
- Website URL: {website}
- User's Positioning Assessment: {positioning_input}

NEVER FORGET RULES:
1. NEVER use personal names from testimonials (use company names like "Mars" or generic descriptions like "a leading CPG company").
2. Email examples must be concise, ideally under 70 words.
3. Always use periods between sentences. Never use dashes as sentence separators.
4. Never start observations with "noticed" or "saw". Jump straight to the fact.
5. Make every observable fact specific and publicly findable (or clearly derivable from the Research Data).
6. If (!research_data_json.caseStudyInfo || !research_data_json.caseStudyInfo.found_case_studies || research_data_json.caseStudyInfo.found_case_studies.length === 0 || (research_data_json.caseStudyInfo.search_summary_note && research_data_json.caseStudyInfo.search_summary_note.toLowerCase().includes("no"))), ALWAYS include the "socialProofNote" in your JSON output.
7. Target segments must be substantial (1,000+ prospects minimum).
8. When appropriate for personalization, use natural vivid imagery relevant to the prospect's pain.
9. For agencies: ALWAYS include specific execution details and valuable offers in the "veoGrowthPitch".
10. Show, don't tell: Demonstrate understanding through specifics drawn from research_data_json.

VIVID IMAGERY GUIDELINES:
- Use ONLY when it naturally fits and is hyper-relevant to the problem.
- Examples: "Sunday nights look like Excel hell", "10 hours watching videos of coffee cups sliding".
- Don't force it. Clarity is paramount.

<output_instructions>
Your *ENTIRE RESPONSE* MUST be a single, minified JSON object. Do NOT include any text, explanations, or Markdown formatting before or after the JSON object.
The JSON object must have the following top-level keys:
"positioningAssessmentOutput": A string containing your 1-2 sentence positioning assessment based on research_data_json.homepageInfo and {positioning_input}.
"idealCustomerProfile": An object with keys: "industry" (string, use research_data_json.homepageInfo.target_audience_keywords), "companySize" (string, e.g., "SMBs, Mid-Market, Enterprise" - infer if not explicit), "keyCharacteristics" (array of 3-5 strings, using all research data).
"keyPersonas": An array of 2-3 objects, each with "title" (string) and "painPoints" (string, comma-separated list of 3-4 pain points).
"campaignIdeas": An array of 3 objects, each with "name" (string, descriptive campaign name), "target" (string), and "emailBody" (string, the example email).
"socialProofNote": A string for the social proof note if applicable (see rule 6), otherwise an empty string or null.
"veoGrowthPitch": A string for the VeoGrowth pitch.
"prospectTargetingNote": A string for the note about prospect targeting numbers.

Refer to the research_data_json object extensively.
Example of the overall JSON structure (content will vary):
{
  "positioningAssessmentOutput": "✅ CLEAR: {website} clearly communicates its value as [research_data_json.homepageInfo.product_description] for [research_data_json.homepageInfo.target_audience_keywords.join(', ')].",
  "idealCustomerProfile": {
    "industry": "[research_data_json.homepageInfo.target_audience_keywords.join(', ') or specific industry]",
    "companySize": "Small to Large Businesses",
    "keyCharacteristics": [
      "Seeking solutions for [pain point related to research_data_json.homepageInfo.product_description]",
      "Utilizes technologies where [research_data_json.homepageInfo.key_features[0]] would be beneficial",
      "Operates in a market with competitors like [research_data_json.marketInfo.identified_competitors[0] if available]",
      "Values [research_data_json.marketInfo.core_differentiators[0] if available]",
      "Aims to achieve outcomes similar to those in research_data_json.caseStudyInfo.found_case_studies (if any)"
    ]
  },
  "keyPersonas": [
    { "title": "[Common title for target_audience_keywords]", "painPoints": "Pain A, Pain B, Pain C" },
    { "title": "[Another title]", "painPoints": "Challenge X, Challenge Y, Challenge Z" }
  ],
  "campaignIdeas": [
    {
      "name": "[Descriptive Campaign Name 1]",
      "target": "[Target persona 1] at [company type using target_audience_keywords]",
      "emailBody": "Hi [Name], [Observable fact about prospect's company related to research_data_json.homepageInfo.product_description]. [Vivid pain point]. {company} helped [IF research_data_json.caseStudyInfo.found_case_studies && research_data_json.caseStudyInfo.found_case_studies.length > 0, use research_data_json.caseStudyInfo.found_case_studies[0].customer_name, ELSE 'companies like yours'] achieve [IF research_data_json.caseStudyInfo.found_case_studies && research_data_json.caseStudyInfo.found_case_studies.length > 0, use research_data_json.caseStudyInfo.found_case_studies[0].key_result_or_benefit, ELSE a benefit related to research_data_json.homepageInfo.key_features]. [CTA?]"
    },
    {
      "name": "[Descriptive Campaign Name 2]",
      "target": "[Target persona 2] at [different company type]",
      "emailBody": "Hi [Name], [Different observable fact]. [Different pain point]. Using {company}'s [research_data_json.homepageInfo.key_features[1] if available, else a general feature], companies like [IF research_data_json.caseStudyInfo.found_case_studies && research_data_json.caseStudyInfo.found_case_studies.length > 1, use research_data_json.caseStudyInfo.found_case_studies[1].customer_name, ELSE IF research_data_json.caseStudyInfo.found_case_studies && research_data_json.caseStudyInfo.found_case_studies.length > 0, 'another leading business', ELSE 'other businesses'] saw [IF research_data_json.caseStudyInfo.found_case_studies && research_data_json.caseStudyInfo.found_case_studies.length > 1, research_data_json.caseStudyInfo.found_case_studies[1].key_result_or_benefit, ELSE IF research_data_json.caseStudyInfo.found_case_studies && research_data_json.caseStudyInfo.found_case_studies.length > 0, 'significant improvements', ELSE 'positive results']. [Different conversational CTA?]"
    },
    {
      "name": "[Descriptive Campaign Name 3]",
      "target": "[Target persona 3] at [third company type]",
      "emailBody": "Hi [Name], [Third observable fact, perhaps related to research_data_json.marketInfo.identified_competitors[0] if available]. [Pain point]. {company} addresses this by [research_data_json.marketInfo.core_differentiators[0] if available, else research_data_json.homepageInfo.product_description]. [General benefit or a reference to research_data_json.homepageInfo.value_props[0] if available]. [Third CTA?]"
    }
  ],
  "socialProofNote": "[Generate if rule 6 applies, using research_data_json.caseStudyInfo.search_summary_note, else empty string]",
  "veoGrowthPitch": "Want VeoGrowth to execute these campaigns? We'll leverage insights about your [research_data_json.homepageInfo.product_description] to connect with ideal clients.",
  "prospectTargetingNote": "Note: These campaigns would target approximately [X,000-Y,000] qualified prospects in the [research_data_json.homepageInfo.target_audience_keywords.join('/')] sectors."
}
Ensure all string values are properly escaped.
The examples below (EXAMPLE 1, EXAMPLE 2, etc.) are for style and content guidance for each section of *your* JSON output. Do not just copy them; adapt their content quality and specificity using the provided {research_data_json}.
</output_instructions>

---
EXAMPLE 1 - SaaS with Clear Positioning (IXON):
This section now guides the *content* of your JSON output if the {research_data_json} were like IXON.
If {research_data_json} for IXON was:
research_data_json.homepageInfo = {"company_name": "IXON", "product_description": "IIoT platform for industrial remote access...", "key_features": ["Remote Access", "Data Logging"], "target_audience_keywords": ["Machine Builders", "OEMs"]}
research_data_json.caseStudyInfo = {"found_case_studies": [{"customer_name": "Repak", "key_result_or_benefit": "Cut on-site visits by 70%."}], "search_summary_note": "Found 1 strong case study."}
research_data_json.marketInfo = {"identified_competitors": ["HMS eWON"], "core_differentiators": ["All-in-one platform", "Ease of use"]}

Your JSON output's "positioningAssessmentOutput" string would be: "✅ CLEAR. IXON clearly positions its IIoT platform for Machine Builders and OEMs, emphasizing remote access and data logging."
The "idealCustomerProfile" object would be:
{
  "industry": "Machine Builders, OEMs, Industrial Automation",
  "companySize": "50-500 employees (mid-market manufacturers)",
  "keyCharacteristics": ["Build complex industrial machines requiring remote support", "Need secure remote access", "Value ease of use in IIoT", "Competes with or considers HMS eWON"]
}
The "keyPersonas" array would contain objects like:
[
  { "title": "VP of Service / Service Manager", "painPoints": "High travel costs, slow response times, technician productivity, customer satisfaction" },
  { "title": "CTO / Head of Engineering", "painPoints": "Security compliance, data collection from machines, building competitive advantages" }
]
The "campaignIdeas" array would contain 3 campaign objects, for example, the first one:
{
  "name": "Travel Cost Crusher",
  "target": "VP of Service at Machine Builders with 10+ field technicians",
  "emailBody": "Hi Mark, many Machine Builders struggle with high travel costs for service calls. IXON's IIoT platform helped Repak cut on-site visits by 70% through secure remote access. Worth exploring how you can achieve similar savings?"
}
// ... (and two other campaign objects for IXON) ...
The "socialProofNote" would be an empty string.
The "veoGrowthPitch": "Want VeoGrowth to execute these campaigns? We'll build targeted lists of machine builders struggling with service costs and craft messages that resonate with their specific challenges."
The "prospectTargetingNote": "Note: These campaigns would target approximately 3,000-5,000 qualified Machine Builders and OEMs in North America and Europe."

---
EXAMPLE 2 - SaaS with Unclear Positioning (Tourmo):
// ... (Follow the JSON structure, populating with hypothetical Tourmo research data from Haiku and campaign ideas from Opus) ...
"socialProofNote": "Our AI research found limited specific case studies for Tourmo. The research notes: '[Content from research_data_json.caseStudyInfo.search_summary_note for Tourmo]'. The examples above use hypothetical scenarios. When we work together, you'll provide real customer success stories."

---
EXAMPLE 3 - Agency with Hyper-Personalization (ConversionLab):
// ...(Follow the JSON structure for ConversionLab)...

---
EXAMPLE 4 - SEO Agency with Specific Execution (RankRise):
// ...(Follow the JSON structure for RankRise)...

---
EXAMPLE 5 - Email Marketing Agency with Deep Personalization (FlowMasters):
// ...(Follow the JSON structure for FlowMasters)...

Remember: The quality bar is EXTREMELY high. Every campaign idea must feel like it required hours of research and deep industry knowledge, drawing from the {research_data_json}.
Your entire output MUST be only the single JSON object. Adhere strictly to the defined JSON output structure.
`;

// --- Function to send email with analysis (uses final Claude Opus JSON) ---
async function sendEmailReport(email, companyName, claudeAnalysisJson) {
  try {
    const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return '';
        return unsafe
             .replace(/&/g, "&")     // Replace & with &
             .replace(/</g, "<")       // Replace < with <
             .replace(/>/g, ">")       // Replace > with >
             .replace(/"/g, """)  // Replace " with "
             .replace(/'/g, "'"); // Replace ' with ' (or ')
    };
    
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
          h3 { margin-top: 20px; color: #4f46e5; font-size: 1.25em; }
          h4 { margin-top: 15px; color: #1f2937; font-size: 1.1em; }
          .campaign-card { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #e5e7eb;}
          .email-body { background: #ffffff; padding: 10px; border-left: 3px solid #4f46e5; margin-top: 5px; white-space: pre-line; font-style: italic; font-size: 0.95em; }
          .note { background: #fef3c7; border-left: 3px solid #f59e0b; padding: 10px; margin-top: 15px; border-radius: 4px; }
          .pitch-section { background: #4f46e5; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-top:30px; }
          .pitch-section h2 { color: white; border: none;}
          .pitch-section a { display: inline-block; background: white; color: #4f46e5; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold; margin-top:15px;}
          ul { padding-left: 20px; list-style-position: inside; }
          li { margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="margin: 0; font-size: 2em;">VeoGrowth</h1>
          <p style="color: #6b7280; margin-top: 5px;">AI-Powered B2B Lead Generation</p>
        </div>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
          <h2 style="margin-top: 0; border:none; font-size: 1.5em;">Your Campaign Analysis for ${escapeHtml(companyName)}</h2>
          <p style="color: #4b5563;">Thank you for using VeoGrowth! Here's the AI-generated analysis:</p>
        </div>

        <div>
          <h2>Positioning Assessment</h2>
          <p>${escapeHtml(claudeAnalysisJson.positioningAssessmentOutput) || 'Not available.'}</p>

          <h2>Ideal Customer Profile</h2>
          <p><strong>Industry:</strong> ${escapeHtml(claudeAnalysisJson.idealCustomerProfile?.industry) || 'N/A'}</p>
          <p><strong>Company Size:</strong> ${escapeHtml(claudeAnalysisJson.idealCustomerProfile?.companySize) || 'N/A'}</p>
          <p><strong>Key Characteristics:</strong></p>
          <ul>${(claudeAnalysisJson.idealCustomerProfile?.keyCharacteristics || []).map(char => `<li>${escapeHtml(char)}</li>`).join('')}</ul>

          <h2>Key Personas</h2>
          ${(claudeAnalysisJson.keyPersonas || []).map(persona => `
            <div class="campaign-card" style="background:#eef2ff; border-left: 3px solid #6366f1;">
              <h4>${escapeHtml(persona.title) || 'N/A'}</h4>
              <p><strong>Pain Points:</strong> ${escapeHtml(persona.painPoints) || 'N/A'}</p>
            </div>
          `).join('')}

          <h2>Campaign Ideas</h2>
          ${(claudeAnalysisJson.campaignIdeas || []).map(campaign => `
            <div class="campaign-card">
              <h3>${escapeHtml(campaign.name) || 'N/A'}</h3>
              <p><strong>Target:</strong> ${escapeHtml(campaign.target) || 'N/A'}</p>
              <p><strong>Example Email:</strong></p>
              <div class="email-body">${(campaign.emailBody || 'N/A').replace(/\n/g, '<br>')}</div>
            </div>
          `).join('')}

          ${(claudeAnalysisJson.socialProofNote && claudeAnalysisJson.socialProofNote.trim() !== "") ? `
            <div class="note">
              <h4>⚠️ Note on Social Proof</h4>
              <p>${escapeHtml(claudeAnalysisJson.socialProofNote)}</p>
            </div>
          ` : ''}
          
          <div style="margin-top:30px; padding-top:20px; border-top:1px solid #e5e7eb;">
            <p><strong>VeoGrowth Pitch:</strong> ${escapeHtml(claudeAnalysisJson.veoGrowthPitch) || ''}</p>
            <p><em>${escapeHtml(claudeAnalysisJson.prospectTargetingNote) || ''}</em></p>
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

    // Validate inputs
    const freeEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'mail.com', 'protonmail.com', 'icloud.com'];
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (freeEmailDomains.includes(emailDomain)) {
      return Response.json({ success: false, error: 'Please enter a work email address' }, { status: 400 });
    }
    if (!email || !website || !positioning) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    console.log('New lead:', { email, website, positioning, timestamp: new Date() });

    if (!process.env.ANTHROPIC_API_KEY) {
        console.error("Critical: ANTHROPIC_API_KEY not configured. Aborting.");
        return Response.json({ success: false, error: 'AI module not configured (API Key missing).' }, { status: 500 });
    }
    
    const companyNameFromUrl = website.replace(/https?:\/\//, '').replace('www.', '').split('/')[0];

    // Step 1: Perform research with Claude Haiku (3 tasks in parallel)
    console.log(`Starting PARALLEL Haiku research for ${website}...`);
    console.time("HaikuResearchTotal");
    const [homepageInfo, caseStudyInfo, marketInfo] = await Promise.all([
      performClaudeHaikuResearch(website, HAIKU_RESEARCH_PROMPTS.homepage),
      performClaudeHaikuResearch(website, HAIKU_RESEARCH_PROMPTS.caseStudies),
      performClaudeHaikuResearch(website, HAIKU_RESEARCH_PROMPTS.marketContext)
    ]);
    console.timeEnd("HaikuResearchTotal");
    console.log(`All PARALLEL Haiku research completed for ${website}.`);

    const researchDataForOpus = {
      homepageInfo: homepageInfo.error ? { error: homepageInfo.error, details: homepageInfo.details, original_snippet: homepageInfo.original_snippet } : homepageInfo,
      caseStudyInfo: caseStudyInfo.error ? { error: caseStudyInfo.error, details: caseStudyInfo.details, original_snippet: caseStudyInfo.original_snippet } : caseStudyInfo,
      marketInfo: marketInfo.error ? { error: marketInfo.error, details: marketInfo.details, original_snippet: marketInfo.original_snippet } : marketInfo,
    };
    console.log('HAIKU RESEARCH OUTPUT (to be passed to Opus):', JSON.stringify(researchDataForOpus, null, 2));

    // Step 2: Generate Campaigns with Claude Opus, using Haiku's research
    const finalPromptForOpus = CLAUDE_OPUS_GENERATION_METAPROMPT
      .replace('{research_data_json}', JSON.stringify(researchDataForOpus))
      .replace('{website}', website)
      .replace(/{company}/g, companyNameFromUrl) 
      .replace('{positioning_input}', positioning);
      
    console.log(`Starting Claude Opus campaign generation for ${website} with extended thinking...`);
    console.time("ClaudeOpusGeneration");

    const opusThinkingBudget = 10000; 
    const opusResponseTokens = 4000;  

    const opusCallOptions = {
      model: 'claude-opus-4-20250514',
      max_tokens: opusThinkingBudget + opusResponseTokens, 
      messages: [{ role: 'user', content: finalPromptForOpus }],
    };

    const enableThinkingForOpus = true; 
    if (enableThinkingForOpus) {
      opusCallOptions.thinking = {
          "type": "enabled",
          "budget_tokens": opusThinkingBudget 
      };
      opusCallOptions.temperature = 1.0; 
      console.log(`Extended thinking enabled for Opus. budget_tokens: ${opusCallOptions.thinking.budget_tokens}, max_tokens: ${opusCallOptions.max_tokens}, temperature: 1.0.`);
    } else {
      opusCallOptions.temperature = 0.7; 
      opusCallOptions.max_tokens = opusResponseTokens; 
      console.log(`Extended thinking disabled for Opus. max_tokens: ${opusCallOptions.max_tokens}, temperature: 0.7.`);
    }
    
    const opusResponse = await anthropicClient.messages.create(opusCallOptions);
    console.timeEnd("ClaudeOpusGeneration");

    const opusOutputText = (opusResponse.content && opusResponse.content.length > 0 && typeof opusResponse.content[0].text === 'string') ? opusResponse.content[0].text : '';
    console.log("Raw Claude Opus output (first 300 chars):", opusOutputText.substring(0,300));
    
    let finalAnalysisJson = safeJsonParse(opusOutputText, "ClaudeOpusOutput");

    if (finalAnalysisJson.error) {
        console.error("Claude Opus did not return valid JSON. Raw output snippet:", opusOutputText.substring(0, 1000));
        // If parsing fails, we still want to send an email, but with an error message or the raw text for debugging
        const errorEmailHtml = `<h1>Analysis Generation Failed</h1><p>Could not parse the AI's response. Raw output snippet:</p><pre>${escapeHtml(opusOutputText.substring(0,2000))}</pre>`;
        await sendEmailReport(email, companyNameFromUrl, { error: "AI_OUTPUT_PARSE_ERROR", raw_snippet: opusOutputText.substring(0,2000), positioningAssessmentOutput: errorEmailHtml }); // Send a modified payload or just error
        return Response.json({ success: false, error: "Failed to parse final analysis from AI.", debug_opus_output_snippet: opusOutputText.substring(0, 1000) }, { status: 500 });
    }
    
    console.log('FINAL STRUCTURED JSON (from Claude Opus):', JSON.stringify(finalAnalysisJson, null, 2));

    await sendEmailReport(email, companyNameFromUrl, finalAnalysisJson);

    // Send structured JSON to the frontend
    return Response.json({
      success: true,
      data: { 
        companyName: companyNameFromUrl, 
        website: website,
        positioningInput: positioning,
        analysis: finalAnalysisJson 
      }
    });

  } catch (error) {
    console.error('API Error in POST function:', error);
    if (error.response && error.response.data) { 
        console.error('Anthropic API Error Details:', JSON.stringify(error.response.data, null, 2));
    } else if (error.status && error.message) { 
        console.error(`API Call Error: ${error.status} ${error.message}`);
    }
    return Response.json({ success: false, error: 'Failed to generate analysis due to an API error. Please try again.' }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ message: 'VeoGrowth Campaign Generator API - Haiku Research + Opus Campaigns!' });
}
