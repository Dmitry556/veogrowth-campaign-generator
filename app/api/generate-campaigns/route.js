export const maxDuration = 60; // Vercel timeout

import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Initialize Anthropic Client (for Claude)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Google Gemini Client
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiResearchModel = genAI.getGenerativeModel({
  model: "gemini-1.5-pro-latest", // Using 1.5 Pro as "2.5 Pro" might not be generally available via this exact identifier yet. 1.5 Pro is very capable.
  tools: [{ // This enables the built-in Google Search tool for grounding
    googleSearchRetrieval: {} // Empty object for default behavior
  }],
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ],
  generationConfig: {
    temperature: 0.3, // Lower temperature for more factual/deterministic research output
    // responseMimeType: "application/json", // If Gemini supports this for enforcing JSON output directly
  }
});


// Initialize Resend Client
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to perform research with Gemini and its search tool
async function performResearchWithGemini(website, researchPromptObject) {
  const promptIdentifier = researchPromptObject.promptName || 'unknown_research'; // Get a name for logging
  const promptText = researchPromptObject.content;

  try {
    console.log(`Starting Gemini research for "${promptIdentifier}" on ${website}`);

    const fullPrompt = promptText
      .replace('{website}', website)
      .replace('{domain}', website.replace(/https?:\/\//, '').replace('www.', ''))
      .replace('{company}', website.replace(/https?:\/\//, '').replace('www.', '').split('/')[0]); // Add {company} replacement

    // Note: The RESEARCH_PROMPTS themselves instruct Gemini to return JSON.
    // We are relying on Gemini's instruction-following for this.
    // If Gemini supports response_mime_type: "application/json" in generationConfig, that's even better.
    // For now, let's assume it follows the prompt's JSON instruction.
    
    const result = await geminiResearchModel.generateContent(fullPrompt);
    const response = result.response;
    const researchOutputText = response.text();
    
    console.log(`Gemini research for "${promptIdentifier}" on ${website} completed. Output (first 100 chars): ${researchOutputText.substring(0,100)}`);
    return researchOutputText; // This should be the JSON string if Gemini followed instructions

  } catch (error) {
    console.error(`Error during Gemini research for "${promptIdentifier}" on ${website}:`, error);
    // Check for specific Gemini API errors if available in the error object
    if (error.response && error.response.data) {
      console.error("Gemini API Error Details:", error.response.data);
    }
    // Return a string that indicates failure but can be safely parsed by safeJsonParse later
    return JSON.stringify({ error: `Failed Gemini research for ${promptIdentifier}`, details: error.message });
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
    console.warn(`Failed to parse JSON string from Gemini for ${promptName}, returning error object. Details: ${e.message}. String (first 100 chars):`, jsonString.substring(0,100) + "...");
    return { error: `Failed to parse JSON output from Gemini for ${promptName}.`, details: e.message, original_output_snippet: jsonString.substring(0,200) };
  }
}

// --- RESEARCH PROMPTS (for Gemini) ---
// These prompts instruct Gemini to use its search capabilities and return structured JSON.
const RESEARCH_PROMPTS = {
  homepage: {
    promptName: "HomepageAnalysis",
    content: `<homepage_analysis_task>
You are an expert business analyst. Fetch and analyze the homepage of {website} to understand their product and positioning.
Use your web search tool if necessary to understand the company better or to augment information from the direct fetch of {website}.

<extraction_requirements>
<product_details>
- Exact company name (as stated on their site)
- Primary product/service (what they primarily sell or offer)
- How it works (the core mechanism or technology described)
- Key features (list the top 5-10 most prominent features mentioned)
- Unique selling propositions (what makes them stand out, if stated)
</product_details>
<positioning_analysis>
- Headline/tagline (the main H1 or tagline on the homepage)
- Main value propositions (verbatim key benefits highlighted on the site)
- Hero section messaging (key messages in the main banner/top section)
- Call-to-action text (main CTAs on the homepage)
- Trust indicators (e.g., customer logos, awards, security badges, compliance mentions found on the homepage)
</positioning_analysis>
<target_identification>
- Who they explicitly say they serve (target customers/users)
- Industries mentioned as targets
- Company sizes referenced (e.g., SMB, enterprise)
- Job titles/departments targeted (if mentioned)
- Use cases described on the homepage
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
  "positioning_strength": "clear/moderate/unclear" /* Assess based on clarity of homepage messaging */
}
Ensure all string values are properly escaped within the JSON.
</output_instructions>
</homepage_analysis_task>`
  },
  caseStudies: {
    promptName: "CaseStudyAnalysis",
    content: `<case_study_search_task>
You are an expert market researcher. Find customer success stories, case studies, and testimonials for the company at {website}.
Use your web search tool extensively. Search for things like:
- "{company} case studies"
- "{company} customer success stories"
- "{domain} testimonials"
- "{domain} reviews"
- "site:{domain} client results"
- "{company} helped [common industry problem]"

Follow links found in search results to gather detailed information.

<extraction_focus>
<customer_evidence>
- List every distinct customer COMPANY name mentioned in case studies or testimonials.
- For each customer, summarize specific, quantifiable results or metrics achieved (e.g., "20% increase in X", "50 hours saved").
- Note the industry of each customer, if available.
- Note the size of the customer company (e.g., SMB, Fortune 500), if mentioned.
- Extract 1-2 impactful direct quotes per case study (attribute to the company, not individuals).
</customer_evidence>
<success_metrics>
- Common types of percentage improvements reported (e.g., "revenue increase", "cost reduction").
- Typical time savings or efficiency gains mentioned.
- ROI figures or cost reduction claims.
</success_metrics>
<testimonial_themes>
- What are the most common praise points or benefits highlighted by customers?
- What specific problems do customers say {company} solved for them?
</testimonial_themes>
</extraction_focus>

<output_format>
Return your analysis *ONLY* as a single, minified JSON object with these exact keys. Do not include any other text or explanations before or after the JSON.
{
  "customers_found": ["company_name1", "company_name2"],
  "case_studies_summary": [
    {
      "customer_name": "",
      "industry": "",
      "results_summary": "", /* Brief summary of key results/metrics */
      "quote": "" /* A compelling quote */
    }
  ],
  "common_success_metrics": { /* Aggregated themes */
    "percentage_improvements_themes": [], /* e.g., "Increased efficiency by X%" */
    "time_savings_themes": [],
    "roi_or_cost_reduction_themes": []
  },
  "testimonial_themes_summary": [], /* e.g., "Easy to use", "Solved X problem effectively" */
  "evidence_quality": "strong/moderate/weak/none" /* Assess based on availability and specificity of evidence found */
}
If no specific case studies or testimonials are found, return empty arrays and "evidence_quality" as "none".
Ensure all string values are properly escaped within the JSON.
</output_format>
</case_study_search_task>`
  },
  marketContext: {
    promptName: "MarketContextAnalysis",
    content: `<market_context_task>
You are an expert competitive intelligence analyst. Analyze {website}'s market positioning and competitive landscape.
Use your web search tool extensively. Search for things like:
- "{company} vs [known competitor in their space if you can infer one]"
- "{company} alternatives"
- "reviews of {company}'s product category"
- "market trends in [company's industry]"
- "{company} pricing"
- "{company} differentiators"

Analyze the company's own website ({website}) for how they position themselves against others or the market.

<analysis_targets>
<competitive_positioning>
- List 2-3 main direct competitors if identifiable.
- What are the key differentiators {company} claims or that you can infer from their site or reviews?
- What is the primary market category they operate in?
</competitive_positioning>
<pain_point_extraction>
- What specific customer pain points does {company} claim to solve (based on their website or reviews)?
- What "before/after" scenarios or customer struggles are highlighted?
</pain_point_extraction>
<market_signals>
- Is their pricing model transparent (visible on site) or opaque (e.g., "contact sales")?
- Any indicators of company size or growth trajectory (e.g., "hiring aggressively", "new funding rounds" - from web search).
- What industry trends do they seem to be leveraging or responding to?
</market_signals>
</analysis_targets>

<output_specification>
Return your analysis *ONLY* as a single, minified JSON object with these exact keys. Do not include any other text or explanations before or after the JSON.
{
  "main_competitors_identified": [],
  "key_differentiators_identified": [],
  "pain_points_addressed_by_company": [ /* List of distinct pain points */
    {
      "pain": "", /* e.g., "Wasting time on manual data entry" */
      "solution_implied": "" /* e.g., "Automates data entry" */
    }
  ],
  "market_category": "",
  "pricing_model_clarity": "transparent/opaque/not_found",
  "company_growth_signals": [], /* e.g., "Recent Series B funding", "Multiple job openings for sales roles" */
  "relevant_market_trends": [],
  "overall_market_position_assessment": "leader/challenger/niche_player/emerging" /* Your assessment */
}
If specific information isn't found, use empty arrays or empty strings.
Ensure all string values are properly escaped within the JSON.
</output_specification>
</market_context_task>`
  }
};

// --- CLAUDE'S METAPROMPT (largely unchanged, relies on {research} from Gemini) ---
const METAPROMPT = `You are VeoGrowth's AI strategist analyzing a company's website to generate hyper-specific B2B cold email campaign ideas. You will produce EXACTLY the same format and quality as shown in the examples, with zero deviation.

CRITICAL CONTEXT: VeoGrowth is an AI-powered lead generation agency that creates hyper-personalized cold email campaigns. We help companies book qualified meetings by understanding their prospects deeply and crafting messages that resonate.

INPUTS PROVIDED:
- Research Data: {research}
- Website: {website}
- Positioning Assessment: {positioning}

NEVER FORGET RULES:
1. NEVER use personal names from testimonials (say "Mars" not "Lumeng Jin")
2. Email examples must be under 70 words
3. Always use periods between sentences, never dashes
4. Never start observations with "noticed" or "saw" - jump straight to the fact
5. Make every observable fact specific and publicly findable
6. If no case studies found (based on Research Data.caseStudies.evidence_quality === "none"), ALWAYS add the warning note
7. Target segments must be large (1,000+ prospects minimum)
8. When focusing on personalization, don't forget natural vivid imagery
9. For agencies: ALWAYS include specific execution details and valuable offers
10. Show don't tell - demonstrate understanding through specifics

VIVID IMAGERY GUIDELINES:
- Use ONLY when it naturally fits and is hyper-relevant to the problem
- Examples that work: "Sunday nights look like Excel hell", "10 hours watching videos of coffee cups sliding"
- Don't force it - better to be clear than clever
- The imagery should make the prospect think "that's exactly what happens"

Generate output following this EXACT structure:

Based on [Company]'s website analysis:

## **Positioning Assessment: [✅ CLEAR / ⚠️ MODERATELY CLEAR / ❌ UNCLEAR]**
[1-2 sentences explaining why, mentioning specific strengths or gaps based on Research Data.homepage.positioning_strength and your analysis of Research Data.homepage]

---

## **Your ICP appears to be:**
- **Industry**: [Specific verticals based on Research Data.homepage.target_audience.industries or your inference]
- **Company size**: [Employee count/revenue based on Research Data.homepage.target_audience.company_sizes or Research Data.marketContext.company_growth_signals]
- **Key characteristics**:
  - [Specific pain point from Research Data.marketContext.pain_points_addressed_by_company or inferred from Research Data.homepage.product]
  - [Another specific pain point or situation]
  - [Use case from Research Data.homepage.target_audience.use_cases]
  - [Characteristic related to Research Data.homepage.features]
  - [Characteristic related to Research Data.marketContext.relevant_market_trends if available]

## **Key Personas to Target:**

**1. [Specific Title based on Research Data.homepage.target_audience.job_titles or common for the ICP]**
- Pain points: [Comma-separated list of 3-4 specific challenges relevant to this persona and the Research Data]

**2. [Different Title]**
- Pain points: [Comma-separated list of 3-4 specific challenges]

**3. [Another Title]**
- Pain points: [Comma-separated list of 3-4 specific challenges]

---

## **Campaign Ideas for [Company]:**

### **Campaign 1: "[Descriptive Name]"**
**Target**: [Specific role] at [specific company type with observable characteristic, informed by Research Data]
**Example email:**
"Hi [Name], [specific observable fact about prospect company, try to relate to Research Data.homepage.product or Research Data.marketContext.pain_points_addressed_by_company]. [Natural insight or vivid pain point]. [Company] helped [IF Research Data.caseStudies.case_studies_summary is NOT empty, use a customer_name from there, ELSE use a plausible generic customer type like 'a similar company'] [IF Research Data.caseStudies.case_studies_summary is NOT empty, use a result_summary or quote from there, ELSE use a plausible benefit related to Research Data.homepage.product]. [Conversational CTA ending in ?]"

### **Campaign 2: "[Different Name]"**
**Target**: [Different specific role] at [different segment]
**Example email:**
"Hi [Name], [different observable fact]. [Different insight or pain point]. [Company]'s [mechanism from Research Data.homepage.mechanism or a key feature from Research Data.homepage.features] [achieves outcome related to Research Data.homepage.value_props]. [IF Research Data.caseStudies.case_studies_summary has another example, use it. ELSE, use a general benefit statement]. [Different conversational CTA?]"

### **Campaign 3: "[Another Name]"**
**Target**: [Third role] at [third segment]
**Example email:**
"Hi [Name], [third observable fact, perhaps related to Research Data.marketContext.main_competitors_identified if available]. [Third insight or pain point]. [Solution connection using Research Data.homepage.product/features]. [IF Research Data.caseStudies.case_studies_summary has a third example, use it. ELSE, use another general benefit statement]. [Third CTA?]"

---

[IF Research Data.caseStudies.evidence_quality is "none" or Research Data.caseStudies.case_studies_summary is empty, ADD THIS:]
### ⚠️ **Note on Social Proof**: 
*Our AI research (leveraging Google Search via Gemini) could not find specific customer case studies or detailed testimonials for {website} in the structured format required. The examples above may use hypothetical scenarios or generalized benefits based on the company's product description. When we work together, you'll provide us with your real customer success stories, metrics, and testimonials to make these campaigns authentic and powerful.*

**Want VeoGrowth to execute these campaigns?**  
We'll [specific action related to their ICP] and [specific outcome related to their value prop].

[Book a Strategy Call →]

*Note: These campaigns would target approximately [X,000-Y,000] qualified prospects [specific description of who and why they're qualified, informed by Research Data].*

---
[Include ALL EXAMPLES from the original METAPROMPT here, unchanged, as they guide style and format]
EXAMPLE 1 - SaaS with Clear Positioning (IXON):
... [rest of example 1] ...
EXAMPLE 2 - SaaS with Unclear Positioning (Tourmo):
... [rest of example 2] ...
EXAMPLE 3 - Agency with Hyper-Personalization:
... [rest of example 3] ...
EXAMPLE 4 - SEO Agency with Specific Execution:
... [rest of example 4] ...
EXAMPLE 5 - Email Marketing Agency with Deep Personalization:
... [rest of example 5] ...
Remember: The quality bar is EXTREMELY high. Every campaign idea must feel like it required hours of research and deep industry knowledge. The prospect should think "how do they know exactly what I'm dealing with?"
For agencies especially: ALWAYS include specific things found on their site, exact execution plans, and valuable free offers.`;


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

    // Run three research prompts in parallel with Gemini
    const [homepageDataString, caseStudyDataString, marketDataString] = await Promise.all([
      performResearchWithGemini(website, RESEARCH_PROMPTS.homepage),
      performResearchWithGemini(website, RESEARCH_PROMPTS.caseStudies),
      performResearchWithGemini(website, RESEARCH_PROMPTS.marketContext)
    ]);

    // Combine research results safely
    const combinedResearch = {
      homepage: safeJsonParse(homepageDataString, "HomepageAnalysis"),
      caseStudies: safeJsonParse(caseStudyDataString, "CaseStudyAnalysis"),
      marketContext: safeJsonParse(marketDataString, "MarketContextAnalysis"),
      website: website
    };

    console.log('CLAUDE INPUT (from Gemini research):', JSON.stringify(combinedResearch, null, 2));

    // Determine positioning clarity for Claude's prompt
    const positioningAssessment = positioning === 'yes' ? 'clear' : positioning === 'no' ? 'unclear' : 'moderate';

    // Prepare the prompt for Claude
    let finalClaudePrompt = METAPROMPT
      .replace('{research}', JSON.stringify(combinedResearch)) // Pass Gemini's research to Claude
      .replace('{website}', website)
      .replace('{positioning}', positioningAssessment);
    
    // Ensure all example placeholders in METAPROMPT are filled, or handle if not.
    // For this example, we assume METAPROMPT is complete with its own examples.

    // Call Claude Opus for campaign generation
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-opus-4-20250514', // Confirmed Claude model
      max_tokens: 4000,
      temperature: 0.7,
      messages: [{ role: 'user', content: finalClaudePrompt }]
    });

    const analysis = claudeResponse.content[0].text;

    const companyNameFromUrl = website.replace(/https?:\/\//, '').replace('www.', '').split('/')[0];

    // Format the response nicely with proper HTML (same as before)
    const formattedAnalysis = `
      <div style="max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <h2 style="color: #1f2937; margin-bottom: 32px; font-size: 28px; font-weight: 700;">
          Campaign Analysis for ${companyNameFromUrl}
        </h2>
        <div style="background: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          ${analysis
            .replace(/## \*\*Positioning Assessment:/g, '<h3 style="color: #4f46e5; margin: 24px 0 16px 0; font-size: 20px; font-weight: 600;">Positioning Assessment:')
            .replace(/## \*\*Your ICP appears to be:\*\*/g, '<h3 style="color: #4f46e5; margin: 32px 0 16px 0; font-size: 20px; font-weight: 600;">Your ICP appears to be:</h3>')
            .replace(/## \*\*Key Personas to Target:\*\*/g, '<h3 style="color: #4f46e5; margin: 32px 0 16px 0; font-size: 20px; font-weight: 600;">Key Personas to Target:</h3>')
            .replace(/## \*\*Campaign Ideas for.*?:\*\*/g, '<h3 style="color: #4f46e5; margin: 32px 0 16px 0; font-size: 20px; font-weight: 600;">Campaign Ideas:</h3>')
            .replace(/### \*\*Campaign \d+: "(.*?)"\*\*/g, (match, p1) => `<div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;"><h4 style="color: #1f2937; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">${p1.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>')}</h4>`)
            .replace(/\*\*Target\*\*:/g, '<p style="margin: 8px 0;"><strong>Target:</strong>')
            .replace(/\*\*Example email:\*\*/g, '<p style="margin: 12px 0 0 0;"><strong>Example email:</strong></p><div style="background: white; padding: 16px; border-left: 4px solid #4f46e5; margin: 8px 0; font-style: italic; color: #374151;">')
            .replace(/(<div style="background: white.*?">)([\s\S]*?)(?=(<\/div>|$|### \*\*Campaign|## \*\*|---|\*\*Want VeoGrowth))/g, (match, p1, p2) => {
                let emailContent = p2;
                // If a campaign block is ending, close the div for example email
                if (!match.endsWith('</div>')) emailContent += '</div>'; 
                return p1 + emailContent;
            })
            .replace(/### ⚠️ \*\*Note on Social Proof\*\*:/g, '</div><div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 32px 0;"><h4 style="color: #92400e; margin: 0 0 8px 0;">⚠️ Note on Social Proof:</h4>')
            .replace(/\*\*Want VeoGrowth to execute these campaigns\?\*\*/g, (match) => {
                // Ensure previous campaign email block is closed if it was open
                let prefix = '';
                if (!analysis.substring(0, analysis.indexOf(match)).endsWith('</div></div>')) { // Heuristic
                   prefix = '</div>'; // Close email content div
                }
                 // If previous element was a campaign block, it would have its own closing div.
                if (analysis.substring(0, analysis.indexOf(match)).match(/<div style="background: #f3f4f6.*?$/s) && !analysis.substring(0, analysis.indexOf(match)).endsWith('</div>')) {
                    prefix += '</div>'; // Close campaign block div
                }


                return prefix + '<h3 style="color: #1f2937; margin: 32px 0 16px 0; font-size: 22px; font-weight: 700; text-align: center;">Want VeoGrowth to execute these campaigns?</h3>';
            })
            .replace(/\[Book a Strategy Call →\]/g, '')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/---/g, '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">')
            .replace(/- ([^\n]+)/g, (match, p1) => `<li style="margin: 6px 0;">${p1.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>')}</li>`)
            .replace(/(<li.*?<\/li>\n*)+/g, (match) => `<ul style="margin: 12px 0; padding-left: 24px;">${match}</ul>`)
          }
        </div>
        <div style="margin-top: 40px; padding: 32px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; border-radius: 12px; text-align: center;">
          <h3 style="margin-bottom: 16px; font-size: 24px; font-weight: 600;">
            Ready to Execute These Campaigns?
          </h3>
          <p style="margin-bottom: 24px; font-size: 18px; opacity: 0.9;">
            VeoGrowth will implement these campaigns for you: Build targeted lists, craft hyper-personalized messages, and book qualified meetings.
          </p>
          <a href="https://calendly.com/veogrowth/strategy" 
             style="display: inline-block; background: white; color: #4f46e5; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px; transition: transform 0.2s;"
             onmouseover="this.style.transform='translateY(-2px)'"
             onmouseout="this.style.transform='translateY(0)'">
            Book a Strategy Call →
          </a>
        </div>
      </div>
    `;
    
    await sendEmailReport(email, formattedAnalysis, companyNameFromUrl);

    return Response.json({
      success: true,
      data: { company: companyNameFromUrl, positioning, analysis: formattedAnalysis }
    });

  } catch (error) {
    console.error('API Error in POST function:', error);
    return Response.json({ success: false, error: 'Failed to generate analysis. Please try again.' }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ message: 'VeoGrowth Campaign Generator API - Now with Gemini Powered Research!' });
}
