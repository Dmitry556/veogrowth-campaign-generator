export const maxDuration = 60; // Vercel timeout

import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Initialize Anthropic Client (for Claude)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Google Gemini Client (using Flash for all research)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let geminiFlashModel;

if (GEMINI_API_KEY) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  geminiFlashModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-05-20", 
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ],
    generationConfig: { temperature: 0.3 }
  });
} else {
  console.error("GEMINI_API_KEY is not set. Gemini research will be disabled.");
}

// Initialize Resend Client
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to perform research with Gemini Flash model
async function performResearchWithGemini(website, researchPromptObject) {
  const promptIdentifier = researchPromptObject.promptName || 'unknown_research';
  const promptText = researchPromptObject.content;

  if (!geminiFlashModel) {
    console.error(`Gemini Flash model not initialized for "${promptIdentifier}" on ${website}.`);
    return JSON.stringify({ error: `Gemini Flash model for ${promptIdentifier} not configured` });
  }

  try {
    const modelNameForLog = geminiFlashModel.model;
    console.log(`Starting Gemini research for "${promptIdentifier}" on ${website} using model: ${modelNameForLog}`);
    console.time(`${promptIdentifier}_${website}`);

    const fullPrompt = promptText
      .replace('{website}', website)
      .replace('{domain}', website.replace(/https?:\/\//, '').replace('www.', ''))
      .replace('{company}', website.replace(/https?:\/\//, '').replace('www.', '').split('/')[0]);
    
    const result = await geminiFlashModel.generateContent(fullPrompt);
    const response = result.response;

    if (!response || !response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts || response.candidates[0].content.parts.length === 0) {
      const blockReason = response?.promptFeedback?.blockReason || 'No content returned';
      const safetyRatings = response?.promptFeedback?.safetyRatings || 'N/A';
      console.warn(`Gemini research for "${promptIdentifier}" on ${website} returned no content or was blocked. Reason: ${blockReason}. Safety Ratings: ${JSON.stringify(safetyRatings)}`);
      console.timeEnd(`${promptIdentifier}_${website}`);
      return JSON.stringify({ error: `Gemini returned no content or was blocked for ${promptIdentifier}. Reason: ${blockReason}` });
    }
    
    let researchOutputText = response.text();
    
    const markdownJsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = researchOutputText.match(markdownJsonRegex);
    if (match && match[1]) {
      researchOutputText = match[1].trim();
      console.log(`Cleaned Markdown JSON for "${promptIdentifier}"`);
    } else {
      const markdownGenericRegex = /```\s*([\s\S]*?)\s*```/;
      const genericMatch = researchOutputText.match(markdownGenericRegex);
      if (genericMatch && genericMatch[1]) {
          researchOutputText = genericMatch[1].trim();
          console.log(`Cleaned generic Markdown for "${promptIdentifier}"`);
      }
    }
    
    console.timeEnd(`${promptIdentifier}_${website}`);
    console.log(`Gemini research for "${promptIdentifier}" on ${website} (model: ${modelNameForLog}) completed. Output for parsing (first 100 chars): ${researchOutputText.substring(0,100)}`);
    return researchOutputText;

  } catch (error) {
    console.timeEnd(`${promptIdentifier}_${website}`);
    console.error(`Error during Gemini research for "${promptIdentifier}" on ${website}:`, error);
    let errorMessage = error.message;
    if (error.errorDetails) { 
        errorMessage += " Details: " + JSON.stringify(error.errorDetails);
    } else if (error.response && error.response.data) {
      errorMessage += " API Error Details: " + JSON.stringify(error.response.data);
    }
    return JSON.stringify({ error: `Failed Gemini research for ${promptIdentifier}`, details: errorMessage });
  }
}

// Helper function to safely parse JSON
function safeJsonParse(jsonString, promptName = "unknown") {
  if (!jsonString || typeof jsonString !== 'string') {
    console.warn(`Invalid input to safeJsonParse for ${promptName}: not a string or empty. Input:`, jsonString);
    return { error: `Invalid input to JSON parser for ${promptName}. Expected string.`};
  }
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.warn(`Failed to parse JSON string from Gemini or Claude for ${promptName}, returning error object. Details: ${e.message}. String (first 100 chars):`, jsonString.substring(0,100) + "...");
    return { error: `Failed to parse JSON output for ${promptName}.`, details: e.message, original_output_snippet: jsonString.substring(0,200) };
  }
}

// --- RESEARCH PROMPTS (for Gemini Flash) ---
const RESEARCH_PROMPTS = {
  homepage: {
    promptName: "HomepageAnalysis",
    content: `<homepage_analysis_task>
You are an expert business analyst. Analyze the content of the homepage of {website} to understand their product and positioning.
If the direct content of {website} is insufficient for any section, use your web search capabilities to briefly augment your understanding of the company {company}.

<extraction_requirements>
<product_details>
- Exact company name (as stated on their site)
- Primary product/service (what they primarily sell or offer)
- How it works (the core mechanism or technology described, concisely)
- Key features (list the top 5-7 most prominent features mentioned)
- Unique selling propositions (1-2 clear points that make them stand out, if stated)
</product_details>
<positioning_analysis>
- Headline/tagline (the main H1 or tagline on the homepage)
- Main value propositions (1-3 key benefits highlighted on the site, verbatim if possible)
- Hero section messaging (key messages in the main banner/top section)
- Call-to-action text (main CTAs on the homepage)
- Trust indicators (e.g., customer logos, awards, security badges found on the homepage)
</positioning_analysis>
<target_identification>
- Who they explicitly say they serve (target customers/users)
- Industries mentioned as targets (if any)
- Company sizes referenced (if any)
- Job titles/departments targeted (if mentioned)
- Key use cases described on the homepage
</target_identification>
</extraction_requirements>

<output_instructions>
Return your analysis *ONLY* as a single, minified JSON object with these exact keys. Do not include any other text or explanations before or after the JSON.
{
  "company_name": "",
  "product": "",
  "mechanism": "",
  "features": [],
  "value_props": [],
  "target_audience": {
    "explicit_served": "",
    "industries": "",
    "company_sizes": "",
    "job_titles": "",
    "use_cases": ""
  },
  "trust_indicators": [],
  "positioning_strength": "clear/moderate/unclear" /* Assess based on clarity and compelling nature of homepage messaging */
}
Ensure all string values are properly escaped. Be concise but thorough for each field.
</output_instructions>
</homepage_analysis_task>`
  },
  caseStudies: { 
    promptName: "CaseStudyAnalysis",
    content: `<case_study_search_task>
You are an expert market researcher. Your primary goal is to find **up to 2-3** distinct customer success stories or case studies for {company} at {website} that clearly articulate the customer's problem, the solution provided by {company}, and showcase **quantifiable results or specific, measurable achievements.**

Use your web search tool efficiently. Focus on finding official case studies or detailed customer stories. Search for:
- "{company} case study problem solution results"
- "{company} customer success metrics"
- "{domain} client impact story"

For each of the (up to) 2-3 best examples you find:
1.  Identify the customer's COMPANY name.
2.  Briefly describe the **customer's primary problem or pain point** before using {company}'s solution (1-2 concise sentences).
3.  Briefly describe **how {company}'s product/service provided the solution** (1-2 concise sentences).
4.  Extract the **most significant quantifiable result(s)** or specific measurable achievement(s) resulting from the solution. (e.g., "Increased revenue by 25%", "Reduced operational costs by $50,000 annually"). Be specific.
5.  (Optional) If a concise, impactful quote from the customer COMPANY directly supports the problem, solution, or results, include a short snippet.

<output_format>
Return your analysis *ONLY* as a single, minified JSON object with these exact keys. Do not include any other text or explanations before or after the JSON.
{
  "detailed_case_studies": [ 
    /* Array of 0 to 3 case study objects. If 0, this array is empty. */
    /* Example:
    {
      "customer_name": "ExampleCorp",
      "problem_faced": "Struggled with inefficient manual data processing.",
      "solution_provided_by_company": "{company}'s platform automated their data workflows.",
      "quantifiable_results_achieved": ["Reduced data processing time by 70%", "Improved data accuracy by 95%"],
      "supporting_quote_snippet": "This transformed our operations." 
    }
    */
  ],
  "search_summary_notes": "" /* e.g., "Found 2 detailed case studies." or "Limited detailed case studies found." or "No comprehensive case studies discovered." */
}
If you cannot find any case studies that clearly outline problem, solution, and **quantifiable results** after a focused search, return an empty "detailed_case_studies" array and reflect this in "search_summary_notes".
Prioritize clear, impactful examples. Do not spend excessive time if results are not readily apparent.
Ensure all string values are properly escaped.
</output_format>
</case_study_search_task>`
  },
  marketContext: { 
    promptName: "MarketContextAnalysis",
    content: `<market_context_task>
You are an expert competitive intelligence analyst. Analyze {company}'s ({website}) market positioning and competitive landscape.
Use your web search tool efficiently. Focus on finding key information regarding competitors, differentiators, and market signals. Search for:
- "{company} vs main alternatives"
- "reviews {company} product category"
- "{company} pricing model"
- "news {company} funding or growth"

Analyze {company}'s own website ({website}) for explicit claims about their positioning.

<analysis_targets>
<competitive_positioning>
- List 1-2 main direct competitors if clearly identifiable from search or their website.
- What are 1-2 key differentiators {company} emphasizes or that are apparent from reviews?
- What is the primary market category they operate in (e.g., "AI Voice Generation", "CRM Software")?
</competitive_positioning>
<pain_point_extraction>
- List 2-3 primary customer pain points {company} claims to solve (based on their website or strong review themes).
</pain_point_extraction>
<market_signals>
- Is their pricing model generally transparent (details on site) or opaque ("contact sales")?
- Note 1-2 significant company growth signals if found via search (e.g., "recent major funding", "significant hiring trend").
- Note 1-2 major industry trends relevant to {company}.
</market_signals>
</analysis_targets>

<output_specification>
Return your analysis *ONLY* as a single, minified JSON object with these exact keys. Do not include any other text or explanations before or after the JSON.
{
  "main_competitors_identified": [], /* Max 2 names */
  "key_differentiators_identified": [], /* Max 2 points */
  "pain_points_addressed_by_company": [ /* Max 3 pain points as strings */
    "Pain point 1 description",
    "Pain point 2 description" 
  ],
  "market_category": "",
  "pricing_model_clarity": "transparent/opaque/not_found",
  "company_growth_signals": [], /* Max 2 signals */
  "relevant_market_trends": [], /* Max 2 trends */
  "overall_market_position_assessment": "leader/challenger/niche_player/emerging/unclear" /* Your brief assessment */
}
Be concise. If specific information isn't found quickly for a field, use an empty array or string for that field.
Ensure all string values are properly escaped.
</output_specification>
</market_context_task>`
  }
};

// --- CLAUDE'S METAPROMPT --- 
// MODIFIED TO REQUEST JSON OUTPUT AND UPDATED EXAMPLES
const METAPROMPT = `You are VeoGrowth's AI strategist analyzing a company's website to generate hyper-specific B2B cold email campaign ideas.
Follow all instructions and rules precisely.

CRITICAL CONTEXT: VeoGrowth is an AI-powered lead generation agency that creates hyper-personalized cold email campaigns. We help companies book qualified meetings by understanding their prospects deeply and crafting messages that resonate.

INPUTS PROVIDED TO YOU (available in the {research} placeholder within this prompt):
- Research Data: This is a JSON object containing three main keys: "homepage", "caseStudies", and "marketContext". Each of these keys holds structured information gathered by a research AI (Gemini). You will use this data extensively.
  - ResearchData.homepage: Contains details about the company's product, features, target audience, etc., extracted from their homepage.
  - ResearchData.caseStudies: Contains summaries of customer case studies, including problems faced, solutions, and quantifiable results, if found. Key: "detailed_case_studies" (an array).
  - ResearchData.marketContext: Contains information about competitors, differentiators, pain points solved, etc.
- Website: The primary URL of the company being analyzed (e.g., "{website}").
- Positioning Assessment (User Input): A string indicating the user's view of their website's positioning clarity ("clear", "moderate", "unclear") - this is available as "{positioning}".

NEVER FORGET RULES:
1. NEVER use personal names from testimonials (say "Mars" or "a leading CPG company" not "Lumeng Jin from Mars").
2. Email examples must be concise, ideally under 70 words.
3. Always use periods between sentences. Never use dashes as sentence separators.
4. Never start observations with "noticed" or "saw". Jump straight to the fact.
5. Make every observable fact specific and publicly findable (or clearly derivable from the Research Data).
6. If ResearchData.caseStudies.detailed_case_studies is empty or ResearchData.caseStudies.search_summary_notes indicates no good case studies were found, ALWAYS include the "socialProofNote" in your JSON output.
7. Target segments must be substantial (1,000+ prospects minimum).
8. When appropriate for personalization, use natural vivid imagery relevant to the prospect's pain.
9. For agencies: ALWAYS include specific execution details and valuable offers in the "veoGrowthPitch".
10. Show, don't tell: Demonstrate understanding through specifics drawn from ResearchData.

VIVID IMAGERY GUIDELINES:
- Use ONLY when it naturally fits and is hyper-relevant to the problem.
- Examples: "Sunday nights look like Excel hell", "10 hours watching videos of coffee cups sliding".
- Don't force it. Clarity is paramount.
- The imagery should make the prospect think "that's exactly what I'm dealing with".

<output_instructions>
Your *ENTIRE RESPONSE* MUST be a single, minified JSON object. Do NOT include any text, explanations, or Markdown formatting before or after the JSON object.
The JSON object must have the following top-level keys:
"positioningAssessmentOutput": A string containing your 1-2 sentence positioning assessment.
"idealCustomerProfile": An object with keys: "industry" (string), "companySize" (string), "keyCharacteristics" (array of 3-5 strings).
"keyPersonas": An array of 2-3 objects, each with "title" (string) and "painPoints" (string, comma-separated list of 3-4 pain points).
"campaignIdeas": An array of 3 objects, each with "name" (string, descriptive campaign name), "target" (string), and "emailBody" (string, the example email).
"socialProofNote": A string for the social proof note if applicable (see rule 6), otherwise an empty string or null.
"veoGrowthPitch": A string for the VeoGrowth pitch.
"prospectTargetingNote": A string for the note about prospect targeting numbers.

Refer to the ResearchData object (passed in {research}) extensively to populate these fields.
Example of the overall JSON structure you need to return (content will vary based on {research} and {website}):
{
  "positioningAssessmentOutput": "✅ CLEAR: {website} clearly communicates its value proposition for [target audience] by focusing on [key benefit from ResearchData.homepage.value_props]. The messaging is consistent.",
  "idealCustomerProfile": {
    "industry": "[Derived from ResearchData.homepage.target_audience.industries]",
    "companySize": "[Derived from ResearchData.homepage.target_audience.company_sizes]",
    "keyCharacteristics": [
      "[Pain point from ResearchData.marketContext.pain_points_addressed_by_company]",
      "[Use case from ResearchData.homepage.target_audience.use_cases]",
      "[Need related to ResearchData.homepage.features]",
      "[Another characteristic based on ResearchData]",
      "[Market trend from ResearchData.marketContext.relevant_market_trends if applicable]"
    ]
  },
  "keyPersonas": [
    { "title": "[Title from ResearchData.homepage.target_audience.job_titles or inferred]", "painPoints": "Challenge 1, Challenge 2, Challenge 3" },
    { "title": "[Another relevant title]", "painPoints": "Issue A, Issue B, Issue C" }
  ],
  "campaignIdeas": [
    {
      "name": "[Descriptive Campaign Name 1]",
      "target": "[Target persona 1] at [company type from ResearchData, e.g., B2B SaaS with specific observable characteristic]",
      "emailBody": "Hi [Name], [Observable fact about prospect's company, related to ResearchData.homepage.product]. [Vivid pain point]. {website} helped [Customer name from ResearchData.caseStudies.detailed_case_studies[0].customer_name, or fallback] achieve [Result from ResearchData.caseStudies.detailed_case_studies[0].quantifiable_results_achieved, or fallback]. [CTA?]"
    },
    {
      "name": "[Descriptive Campaign Name 2]",
      "target": "[Target persona 2] at [different company type]",
      "emailBody": "Hi [Name], [Different observable fact]. [Different pain point]. Using {website}'s [feature from ResearchData.homepage.features], companies like [Customer name from ResearchData.caseStudies.detailed_case_studies[1].customer_name, or fallback] saw [Result from ResearchData.caseStudies.detailed_case_studies[1].quantifiable_results_achieved, or fallback]. [Different CTA?]"
    },
    {
      "name": "[Descriptive Campaign Name 3]",
      "target": "[Target persona 3] at [third company type]",
      "emailBody": "Hi [Name], [Third observable fact, perhaps related to competitor from ResearchData.marketContext.main_competitors_identified]. [Pain point]. {website} addresses this by [solution from ResearchData.homepage.mechanism or value_prop]. [Customer example or general benefit]. [Third CTA?]"
    }
  ],
  "socialProofNote": "[Generate this note if rule 6 applies, using ResearchData.caseStudies.search_summary_notes if available, otherwise empty string]",
  "veoGrowthPitch": "Want VeoGrowth to execute these campaigns? We'll [specific action related to ICP] and [specific outcome related to value prop].",
  "prospectTargetingNote": "Note: These campaigns would target approximately [X,000-Y,000] qualified prospects [specific description of who and why they're qualified, informed by ResearchData]."
}
Ensure all string values in your JSON output are properly escaped (e.g., newlines as \\n, quotes as \\").
The examples below (EXAMPLE 1, EXAMPLE 2, etc.) are for style and content guidance for each section of *your* JSON output. Do not just copy them; adapt their content quality and specificity using the provided {research} data.
</output_instructions>

---
EXAMPLE 1 - SaaS with Clear Positioning (IXON):
This section now guides the *content* of your JSON output if the input were like IXON.
If the {research} data was for IXON (hypothetically):
The "positioningAssessmentOutput" string would be: "✅ CLEAR. IXON has excellent positioning as an Industrial IoT platform specifically for machine builders, with clear value props around secure remote access, machine insights, and service efficiency."
The "idealCustomerProfile" object would be:
{
  "industry": "Machine builders/OEMs (industrial equipment manufacturers)",
  "companySize": "50-500 employees (mid-market manufacturers)",
  "keyCharacteristics": [
    "Build complex industrial machines requiring remote support",
    "Have field service teams traveling to customer sites",
    "Face pressure to reduce service costs and improve uptime",
    "Need to comply with security standards (ISO, IEC, NIS2)",
    "Expanding globally with machines in multiple countries"
  ]
}
The "keyPersonas" array would contain objects like:
[
  { "title": "VP of Service / Service Manager", "painPoints": "High travel costs, slow response times, technician productivity, customer satisfaction" },
  { "title": "CTO / Head of Engineering", "painPoints": "Security compliance, data collection from machines, building competitive advantages" },
  { "title": "Field Service Manager", "painPoints": "Managing distributed technicians, reducing truck rolls, first-time fix rates" }
]
The "campaignIdeas" array would contain 3 campaign objects, for example, the first one:
{
  "name": "Travel Cost Crusher",
  "target": "VP of Service at machine builders with 10+ field technicians",
  "emailBody": "Hi Mark, manufacturing packaging equipment with 15 field techs covering North America means travel probably eats 40% of service budget. IXON's secure remote access lets technicians fix issues from their desk. Repak cut on-site visits by 70%. Worth exploring?"
}
... (and two other campaign objects for IXON) ...
The "socialProofNote" would be an empty string if IXON had case studies in ResearchData.
The "veoGrowthPitch": "Want VeoGrowth to execute these campaigns? We'll build targeted lists of machine builders struggling with service costs and craft messages that resonate with their specific challenges."
The "prospectTargetingNote": "Note: These campaigns would target approximately 3,000-5,000 qualified prospects across North America and Europe, focusing on mid-market manufacturers with distributed equipment."

---
EXAMPLE 2 - SaaS with Unclear Positioning (Tourmo):
If {research} data was for Tourmo:
"positioningAssessmentOutput": "⚠️ MODERATELY CLEAR. Tourmo positions as an AI fleet management platform that integrates with existing systems, but the messaging covers many features without a single compelling focus. The 'no rip and replace' angle is strong but gets lost among numerous capabilities."
... (similar structured JSON breakdown for Tourmo's ICP, Personas, Campaigns as shown for IXON, adapting content) ...
"socialProofNote": "Our AI research (leveraging Google Search via Gemini) found limited or no detailed customer case studies for Tourmo. The AI research notes: '[Content from ResearchData.caseStudies.search_summary_notes for Tourmo]'. The examples above may use hypothetical scenarios. When we work together, you'll provide real customer success stories."
"additionalRecommendations": "Consider leading with ONE killer use case (like 'Stop drowning in false positive alerts') rather than trying to communicate all capabilities upfront. The 'no rip and replace' message is gold but needs to be tied to a specific, painful problem." // Optional new field if you want such recommendations. For now, stick to the defined schema.

---
EXAMPLE 3 - Agency with Hyper-Personalization (ConversionLab):
... (structured JSON breakdown for ConversionLab) ...

---
EXAMPLE 4 - SEO Agency with Specific Execution (RankRise):
... (structured JSON breakdown for RankRise) ...

---
EXAMPLE 5 - Email Marketing Agency with Deep Personalization (FlowMasters):
... (structured JSON breakdown for FlowMasters) ...

Remember: The quality bar is EXTREMELY high. Every campaign idea must feel like it required hours of research and deep industry knowledge, drawing from the {research} data. The prospect should think "how do they know exactly what I'm dealing with?"
For agencies especially: ALWAYS include specific things found on their site (from {research}), exact execution plans, and valuable free offers in the campaign emails.
Your entire output MUST be only the single JSON object.
`;

// --- Function to send email with analysis ---
async function sendEmailReport(email, companyName, claudeAnalysisJson, geminiResearchJson) { // Now takes structured JSON
  // This function will need to be updated to build HTML from the JSON objects
  // For now, let's just send a simplified version or the raw JSON for debugging.
  // In a real implementation, you'd iterate through claudeAnalysisJson to build nice HTML.
  
  let analysisHtml = `<h1>Campaign Analysis for ${companyName}</h1>`;
  analysisHtml += `<h2>Positioning Assessment</h2><p>${claudeAnalysisJson.positioningAssessmentOutput || 'N/A'}</p>`;
  analysisHtml += `<h2>Ideal Customer Profile</h2><pre>${JSON.stringify(claudeAnalysisJson.idealCustomerProfile || {}, null, 2)}</pre>`;
  analysisHtml += `<h2>Key Personas</h2><pre>${JSON.stringify(claudeAnalysisJson.keyPersonas || [], null, 2)}</pre>`;
  analysisHtml += `<h2>Campaign Ideas</h2>`;
  if (claudeAnalysisJson.campaignIdeas && claudeAnalysisJson.campaignIdeas.length > 0) {
    claudeAnalysisJson.campaignIdeas.forEach(campaign => {
      analysisHtml += `<div><h4>${campaign.name}</h4><p><strong>Target:</strong> ${campaign.target}</p><p><em>Email:</em> ${campaign.emailBody}</p></div>`;
    });
  }
  if (claudeAnalysisJson.socialProofNote) {
    analysisHtml += `<h3>Social Proof Note</h3><p>${claudeAnalysisJson.socialProofNote}</p>`;
  }
  // ... and so on for veoGrowthPitch, prospectTargetingNote.
  // This is a placeholder; a proper HTML email would be more styled.

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

          ${claudeAnalysisJson.socialProofNote ? `
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

    if (!GEMINI_API_KEY || !geminiFlashModel ) { 
        console.error("Critical: GEMINI_API_KEY not configured or Gemini Flash model failed to initialize. Aborting research.");
        return Response.json({ success: false, error: 'Research module not configured (API Key or Flash model init issue).' }, { status: 500 });
    }

    console.log(`Starting PARALLEL Gemini research for ${website} (ALL TASKS WITH FLASH MODEL)...`);
    const [homepageDataString, caseStudyDataString, marketDataString] = await Promise.all([
      performResearchWithGemini(website, RESEARCH_PROMPTS.homepage),      
      performResearchWithGemini(website, RESEARCH_PROMPTS.caseStudies),     
      performResearchWithGemini(website, RESEARCH_PROMPTS.marketContext)  
    ]);
    console.log(`All PARALLEL Gemini research completed for ${website}.`);

    const geminiResearchData = {
      homepage: safeJsonParse(homepageDataString, "HomepageAnalysis"),
      caseStudies: safeJsonParse(caseStudyDataString, "CaseStudyAnalysis"),
      marketContext: safeJsonParse(marketDataString, "MarketContextAnalysis"),
    };

    console.log('GEMINI RESEARCH OUTPUT (to be passed to Claude):', JSON.stringify(geminiResearchData, null, 2));

    const positioningAssessmentForClaude = positioning === 'yes' ? 'clear' : positioning === 'no' ? 'unclear' : 'moderate';

    const claudePromptInput = METAPROMPT
      .replace('{research}', JSON.stringify(geminiResearchData)) 
      .replace('{website}', website)
      .replace('{positioning}', positioningAssessmentForClaude);
    
    console.time("ClaudeGeneration");
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 4000,
      temperature: 0.7,
      messages: [{ role: 'user', content: claudePromptInput }]
    });
    console.timeEnd("ClaudeGeneration");
    
    const claudeOutputText = claudeResponse.content[0].text;
    console.log("Raw Claude output (first 200 chars):", claudeOutputText.substring(0,200));
    const claudeAnalysisJson = safeJsonParse(claudeOutputText, "ClaudeAnalysis");

    if (claudeAnalysisJson.error) {
        console.error("Failed to get valid JSON from Claude. Claude's raw output snippet:", claudeOutputText.substring(0, 500));
        // Potentially try to re-parse if it's wrapped in markdown, though the prompt asks it not to.
        const markdownJsonRegex = /```json\s*([\s\S]*?)\s*```/;
        const match = claudeOutputText.match(markdownJsonRegex);
        if (match && match[1]) {
            console.log("Attempting to re-parse Claude output after stripping markdown...");
            const reparsedClaudeJson = safeJsonParse(match[1].trim(), "ClaudeAnalysisReparsed");
            if (!reparsedClaudeJson.error) {
                Object.assign(claudeAnalysisJson, reparsedClaudeJson); // Merge if reparse successful
                 console.log("Successfully reparsed Claude output after stripping markdown.");
            } else {
                 console.error("Reparsing Claude output also failed.");
                 // Fallback or throw error - for now, we'll proceed with the error object
            }
        }
        if (claudeAnalysisJson.error) { // Check again if still an error after potential reparse
             return Response.json({ success: false, error: "Failed to parse analysis from Claude.", claude_error_details: claudeAnalysisJson }, { status: 500 });
        }
    }


    const companyNameFromUrl = website.replace(/https?:\/\//, '').replace('www.', '').split('/')[0];
    
    // Send email with structured data
    await sendEmailReport(email, companyNameFromUrl, claudeAnalysisJson, geminiResearchData);

    // Send structured JSON to the frontend
    return Response.json({
      success: true,
      data: { 
        companyName: companyNameFromUrl, 
        website: website,
        positioningInput: positioning, // User's input
        geminiResearch: geminiResearchData,
        claudeAnalysis: claudeAnalysisJson
      }
    });

  } catch (error) {
    console.error('API Error in POST function:', error);
    return Response.json({ success: false, error: 'Failed to generate analysis. Please try again.' }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ message: 'VeoGrowth Campaign Generator API - Now with Gemini Powered Research and JSON output!' });
}
