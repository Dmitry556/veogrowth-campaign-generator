export const maxDuration = 60; // Vercel timeout

import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

// Initialize Anthropic Client
const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Resend Client
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to safely parse JSON from AI outputs (Opus will output JSON)
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

// --- RESEARCH PROMPTS for Claude Haiku (to output text summaries) ---
const HAIKU_RESEARCH_PROMPTS = {
  homepage: {
    promptName: "HaikuHomepageAnalysis",
    content: `You are an AI research assistant. Your task is to analyze the homepage of {website} for the company {company}.
Use your web_search tool to understand the company and its offerings from their homepage.
Provide a concise text summary covering:
- The company's official name.
- Their main product/service.
- 3-5 key features.
- 3-5 keywords describing their target audience or industries.
Present this as a readable paragraph or bullet points. Do not output JSON. Ensure your summary is well-structured and easy to understand.`
  },
  caseStudies: {
    promptName: "HaikuCaseStudySearch",
    content: `You are an AI research assistant. Find **up to 2** concise customer case studies or success story summaries for {company} ({website}).
Use your web_search tool. Focus on finding mentions of customer names and quantifiable results or specific benefits.
For each case study (max 2), provide a brief text summary including:
- Customer's company name.
- A short description of the key result or benefit.
If no clear case studies are found, clearly state that in your summary.
Present this as readable paragraphs or bullet points. Do not output JSON. Ensure your summary is well-structured.`
  },
  marketContext: {
    promptName: "HaikuMarketContextSearch",
    content: `You are an AI research assistant. Provide a brief market context summary for {company} ({website}).
Use your web_search tool to identify:
- 1-2 main competitors.
- 1-2 key differentiators for {company}.
Present this as a readable paragraph or bullet points. Do not output JSON. Ensure your summary is well-structured.`
  }
};

// Function to perform research with Claude Haiku + Web Search (returns text summary)
async function performClaudeHaikuResearch(website, researchObjective) {
  const companyNameFromUrl = website.replace(/https?:\/\//, "").replace("www.", "").split("/")[0];
  const prompt = researchObjective.content
    .replace("{website}", website)
    .replace(/{company}/g, companyNameFromUrl);

  console.log(`Starting Haiku research: ${researchObjective.promptName} for ${website}`);
  console.time(researchObjective.promptName);
  let researchTextSummary = ""; 

  try {
    const response = await anthropicClient.messages.create({
      model: "claude-3-5-haiku-latest", 
      max_tokens: 1500, 
      messages: [{ role: "user", content: prompt }],
      tools: [{
        "type": "web_search_20250305",
        "name": "web_search",
        "max_uses": 3 
      }]
    });
    
    if (response && response.content && response.content.length > 0) {
      // Concatenate all text parts, as Haiku might return multiple text blocks after tool use
      response.content.forEach(block => {
        if (block.type === 'text' && typeof block.text === 'string') {
          researchTextSummary += block.text + "\n"; 
        }
      });
      researchTextSummary = researchTextSummary.trim();

      if (researchTextSummary) {
        console.log(`Haiku research ${researchObjective.promptName} - text summary (first 100): ${researchTextSummary.substring(0, 100)}`);
      } else {
        console.warn(`Haiku research ${researchObjective.promptName} for ${website} did not produce any text output after tool use. Content:`, JSON.stringify(response.content.slice(-2), null, 2)); 
        researchTextSummary = `Error: Haiku did not produce text output for ${researchObjective.promptName}.`;
      }
    } else {
      console.warn(`Haiku research ${researchObjective.promptName} for ${website} returned no content array or empty content. Response:`, JSON.stringify(response, null, 2));
      researchTextSummary = `Error: Haiku returned no content for ${researchObjective.promptName}.`;
    }
    
    console.timeEnd(researchObjective.promptName);
    return researchTextSummary; // Return the raw text summary

  } catch (error) {
    console.timeEnd(researchObjective.promptName); 
    console.error(`Error during Haiku research (${researchObjective.promptName}) for ${website}:`, error);
    return `Error: Failed Haiku research for ${researchObjective.promptName}. Details: ${error.message}`;
  }
}

// --- CLAUDE OPUS METAPROMPT for Campaign Generation (using text research from Haiku) ---
const CLAUDE_OPUS_GENERATION_METAPROMPT = `You are VeoGrowth's AI strategist analyzing a company's website to generate hyper-specific B2B cold email campaign ideas. You will produce EXACTLY the same format and quality as shown in the examples, with zero deviation in the final JSON output structure.

CRITICAL CONTEXT: VeoGrowth is an AI-powered lead generation agency that creates hyper-personalized cold email campaigns. We help companies book qualified meetings by understanding their prospects deeply and crafting messages that resonate.

INPUTS PROVIDED TO YOU:
- Raw Research Summaries ({research_summaries_text}): This is a block of text containing up to three sections, each starting with a clear header:
  1.  "HOMEPAGE ANALYSIS SUMMARY:" followed by a text summary about the company's homepage (name, product, features, target audience).
  2.  "CASE STUDY SEARCH SUMMARY:" followed by text summarizing any found case studies (customer names, key benefits) or stating if none were found.
  3.  "MARKET CONTEXT SUMMARY:" followed by text about competitors and differentiators.
  You need to carefully read, parse, and understand these text summaries to extract the necessary information for your final JSON output.
- Website URL: {website}
- User's Positioning Assessment: {positioning_input}

NEVER FORGET RULES:
1. NEVER use personal names from testimonials (use company names like "Mars" or generic descriptions like "a leading CPG company").
2. Email examples must be concise, ideally under 70 words.
3. Always use periods between sentences. Never use dashes as sentence separators.
4. Never start observations with "noticed" or "saw". Jump straight to the fact.
5. Make every observable fact specific and publicly findable (or clearly derivable from the provided Raw Research Summaries).
6. If the "CASE STUDY SEARCH SUMMARY" section in {research_summaries_text} indicates no clear case studies were found or if it's missing, ALWAYS include the "socialProofNote" in your JSON output.
7. Target segments must be substantial (1,000+ prospects minimum).
8. When appropriate for personalization, use natural vivid imagery relevant to the prospect's pain.
9. For agencies: ALWAYS include specific execution details and valuable offers in the "veoGrowthPitch".
10. Show, don't tell: Demonstrate understanding through specifics synthesized from the Raw Research Summaries.

VIVID IMAGERY GUIDELINES:
- Use ONLY when it naturally fits and is hyper-relevant to the problem.
- Examples: "Sunday nights look like Excel hell", "10 hours watching videos of coffee cups sliding".
- Don't force it. Clarity is paramount.

<output_instructions>
Your *ENTIRE RESPONSE* MUST be a single, minified JSON object. Do NOT include any text, explanations, or Markdown formatting (like \`\`\`json) before or after the JSON object.
The JSON object must have the following top-level keys:
"positioningAssessmentOutput": A string containing your 1-2 sentence positioning assessment, informed by the "HOMEPAGE ANALYSIS SUMMARY" and the user's {positioning_input}.
"idealCustomerProfile": An object with keys: "industry" (string, derived from "HOMEPAGE ANALYSIS SUMMARY"), "companySize" (string, e.g., "SMBs, Mid-Market, Enterprise" - infer if not explicit), "keyCharacteristics" (array of 3-5 strings, synthesized from all research summaries).
"keyPersonas": An array of 2-3 objects, each with "title" (string) and "painPoints" (string, comma-separated list of 3-4 pain points relevant to the company's offerings).
"campaignIdeas": An array of 3 objects, each with "name" (string, descriptive campaign name), "target" (string), and "emailBody" (string, the example email).
"socialProofNote": A string for the social proof note if applicable (see rule 6), otherwise an empty string or null.
"veoGrowthPitch": A string for the VeoGrowth pitch.
"prospectTargetingNote": A string for the note about prospect targeting numbers.

To populate this JSON, you must carefully read and interpret the information within the "HOMEPAGE ANALYSIS SUMMARY", "CASE STUDY SEARCH SUMMARY", and "MARKET CONTEXT SUMMARY" sections of the {research_summaries_text} input.
Example of the overall JSON structure (content will vary based on your interpretation of the research summaries):
{
  "positioningAssessmentOutput": "✅ CLEAR: {website} clearly communicates its value as [main product from Homepage Summary] for [target audience keywords from Homepage Summary].",
  "idealCustomerProfile": {
    "industry": "[Main industry from Homepage Summary's target_audience_keywords]",
    "companySize": "Small to Large Businesses (inferred)",
    "keyCharacteristics": [
      "Seeking solutions for [problem related to product in Homepage Summary]",
      "Could benefit from [key feature from Homepage Summary]",
      "Likely aware of competitors such as [competitor from Market Context Summary, if any]",
      "Values benefits like [differentiator from Market Context Summary, if any]",
      "Aims for outcomes similar to [customer benefit from Case Study Summary, if any, otherwise a general product benefit]"
    ]
  },
  "keyPersonas": [
    { "title": "[Common job title for target audience in Homepage Summary]", "painPoints": "Pain A, Pain B, Pain C (relevant to product)" },
    { "title": "[Another relevant job title]", "painPoints": "Challenge X, Challenge Y, Challenge Z (relevant to product)" }
  ],
  "campaignIdeas": [
    {
      "name": "[Descriptive Campaign Name 1]",
      "target": "[Target persona 1] at [company type based on Homepage Summary]",
      "emailBody": "Hi [Name], [Observable fact related to company's product from Homepage Summary]. [Vivid pain point]. {company} helped [IF Case Study Summary mentions a customer, use that customer_name, ELSE 'companies like yours'] achieve [IF Case Study Summary mentions a key_result_or_benefit, use that, ELSE a general benefit of the product from Homepage Summary]. [CTA?]"
    }
    // ... (2 more campaign ideas, varying how they use the research summaries)
  ],
  "socialProofNote": "[Generate if rule 6 applies, informed by the Case Study Summary, else empty string]",
  "veoGrowthPitch": "Want VeoGrowth to execute these campaigns? We'll leverage insights about their [product from Homepage Summary] to connect with ideal clients.",
  "prospectTargetingNote": "Note: These campaigns would target approximately [X,000-Y,000] qualified prospects in [target industries from Homepage Summary]."
}
Ensure all string values in your JSON output are properly escaped.
The examples below (EXAMPLE 1, EXAMPLE 2, etc.) are for style and content guidance for each section of *your* JSON output. Do not just copy them; adapt their content quality and specificity by interpreting the {research_summaries_text} provided.
</output_instructions>

---
EXAMPLE 1 - SaaS with Clear Positioning (IXON):
If the {research_summaries_text} for {website} contained these summaries (condensed for brevity):
HOMEPAGE ANALYSIS SUMMARY: IXON, IIoT platform for machine builders. Features: Remote Access, Data Logging. Target: Machine Builders, OEMs.
CASE STUDY SEARCH SUMMARY: Customer: Repak, Benefit: Cut on-site visits by 70%. Found 1 strong case study.
MARKET CONTEXT SUMMARY: Competitors: HMS eWON. Differentiators: All-in-one platform.

Your JSON output's "positioningAssessmentOutput" string would be: "✅ CLEAR. IXON clearly positions its IIoT platform for Machine Builders and OEMs, emphasizing remote access and data logging."
The "idealCustomerProfile" object would be:
{
  "industry": "Machine Builders, OEMs",
  "companySize": "50-500 employees (inferred)",
  "keyCharacteristics": ["Build complex industrial machines", "Need remote access & data logging", "Value all-in-one IIoT solutions"]
}
// ... (rest of the example structured as per the JSON output schema, using the summarized text research) ...
The "campaignIdeas" array's first item:
{
  "name": "Travel Cost Crusher",
  "target": "VP of Service at Machine Builders with 10+ field technicians",
  "emailBody": "Hi Mark, many Machine Builders struggle with high travel costs for service calls. IXON's IIoT platform helped Repak cut on-site visits by 70% through secure remote access. Worth exploring how you can achieve similar savings?"
}
The "socialProofNote" would be an empty string.

---
EXAMPLE 2 - SaaS with Unclear Positioning (Tourmo):
If {research_summaries_text} for Tourmo indicated unclear positioning and no strong case studies:
// ... (populate JSON based on this interpretation) ...
"socialProofNote": "Our AI research (via Claude Haiku) found limited specific case studies for Tourmo. The Haiku research notes: '[Content of search_summary_note from Haiku for Tourmo]'. The examples use hypothetical scenarios."

---
// ... (Include your other original examples: EXAMPLE 3, 4, 5, adapting them slightly to show how Opus would derive its JSON content from hypothetical text summaries for ConversionLab, RankRise, FlowMasters) ...

Remember: The quality bar is EXTREMELY high. Your entire output MUST be only the single JSON object.
`;

// --- Function to send email with analysis (uses final Claude Opus JSON) ---
async function sendEmailReport(email, companyName, claudeAnalysisJson) {
  try {
    const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return '';
        let safe = unsafe;
        safe = safe.replace(/&/g, "\u0026amp;"); // Ampersand
        safe = safe.replace(/</g, "\u0026lt;");  // Less than
        safe = safe.replace(/>/g, "\u0026gt;");  // Greater than
        safe = safe.replace(/"/g, "\u0026quot;"); // Double quote
        safe = safe.replace(/'/g, "\u0026#039;"); // Single quote (apostrophe)
        return safe;
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
    const [homepageSummary, caseStudySummary, marketSummary] = await Promise.all([
      performClaudeHaikuResearch(website, HAIKU_RESEARCH_PROMPTS.homepage),
      performClaudeHaikuResearch(website, HAIKU_RESEARCH_PROMPTS.caseStudies),
      performClaudeHaikuResearch(website, HAIKU_RESEARCH_PROMPTS.marketContext)
    ]);
    console.timeEnd("HaikuResearchTotal");
    console.log(`All PARALLEL Haiku research completed for ${website}.`);

    // Construct a single text block from Haiku's research summaries for Opus
    const researchSummariesTextForOpus = `
HOMEPAGE ANALYSIS SUMMARY:
${homepageSummary.error ? `Error: ${homepageSummary.details}` : homepageSummary}

CASE STUDY SEARCH SUMMARY:
${caseStudySummary.error ? `Error: ${caseStudySummary.details}` : caseStudySummary}

MARKET CONTEXT SUMMARY:
${marketSummary.error ? `Error: ${marketSummary.details}` : marketSummary}
    `;
    console.log('TEXT SUMMARIES FROM HAIKU (to be passed to Opus):', researchSummariesTextForOpus);

    // Step 2: Generate Campaigns with Claude Opus, using Haiku's text research
    const finalPromptForOpus = CLAUDE_OPUS_GENERATION_METAPROMPT
      .replace('{research_summaries_text}', researchSummariesTextForOpus) // Inject Haiku's text research
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
        const errorEmailHtml = `<h1>Analysis Generation Failed</h1><p>Could not parse the AI's response. Raw output snippet:</p><pre>${escapeHtml(opusOutputText.substring(0,2000))}</pre>`;
        // Send a simplified error object if claude's output is not the expected campaign JSON
        await sendEmailReport(email, companyNameFromUrl, { 
            positioningAssessmentOutput: errorEmailHtml, 
            idealCustomerProfile: {}, 
            keyPersonas: [], 
            campaignIdeas: [],
            socialProofNote: "Error: Could not generate analysis.",
            veoGrowthPitch: "",
            prospectTargetingNote: ""
        });
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
  return Response.json({ message: 'VeoGrowth Campaign Generator API - Haiku Research (Text) + Opus Campaigns (JSON)!' });
}
