export const maxDuration = 60; // Vercel timeout limit

import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

// Initialize API clients
const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to safely escape HTML - this was causing issues before
function escapeHtml(unsafe) {
  // First check if the input is a string
  if (typeof unsafe !== 'string') return '';
  
  // Replace dangerous characters with HTML entities
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Safe JSON parser that handles markdown wrappers and other formatting issues
function safeJsonParse(jsonString, stepName = "AIOutput") {
  // Check if input is valid
  if (typeof jsonString !== 'string' || !jsonString.trim()) {
    console.warn(`safeJsonParse for ${stepName}: Input is not a non-empty string.`);
    return { error: `Input for ${stepName} was not a non-empty string.` };
  }

  let textToParse = jsonString.trim();
  
  // Remove markdown JSON wrapper if present
  const markdownJsonRegex = /^```json\s*([\s\S]*?)\s*```$/;
  const match = textToParse.match(markdownJsonRegex);
  if (match && match[1]) {
    textToParse = match[1].trim();
    console.log(`Stripped markdown wrapper for ${stepName}.`);
  }

  try {
    return JSON.parse(textToParse);
  } catch (e) {
    console.error(`safeJsonParse for ${stepName} failed: ${e.message}. Snippet:`, textToParse.substring(0, 200));
    return { 
      error: `Failed to parse JSON for ${stepName}. Details: ${e.message}`, 
      original_snippet: textToParse.substring(0, 500) 
    };
  }
}

// The complete metaprompt for Claude
const CLAUDE_METAPROMPT = `You are VeoGrowth's elite AI strategist creating world-class B2B cold email campaigns that are so insightful, prospects think "How do they know EXACTLY what I'm dealing with?"

CONTEXT: VeoGrowth is an AI-powered B2B lead generation agency that creates hyper-personalized cold email campaigns. We help companies book qualified meetings by understanding their prospects deeply and crafting messages that resonate at scale.

INPUTS PROVIDED:
Company Website: {website}
Positioning Clear?: {positioning}

YOUR MISSION: Create campaigns that would take a human strategist hours of research to match. Every campaign must demonstrate profound understanding of the prospect's specific situation.

RESEARCH PHASE:
Use ONE strategic web search to gather comprehensive intelligence.
Search query: "{company} product features case studies"

This single search will return multiple pages that you'll read in FULL, including:
- Their homepage content (product features, positioning, target market)
- Case studies pages (customer names, specific results)
- About pages (company size, founding, mission)
- Blog posts about customers
- External mentions (reviews, comparisons)
- Testimonial pages

From these FULL PAGES of content, extract:
- EXACTLY what they do (not generic - the specific product/mechanism)
- WHO they serve (specific job titles, company types, industries)
- Customer company names and quantified results
- Their unique angle vs competitors
- Pricing model if mentioned
- Common use cases and pain points they solve

CRITICAL RULES (NEVER VIOLATE THESE):
1. NEVER use personal names from testimonials
   ❌ "John from Microsoft says..."
   ✅ "Microsoft reduced costs by 70%"

2. Email length is 50-70 words MAXIMUM (count every word)

3. Always use periods between sentences, never dashes
   ❌ "Hi Sarah - noticed your company..."
   ✅ "Hi Sarah. Your company..."

4. Never start observations with "noticed" or "saw"
   ❌ "Hi Mark, noticed your company has 200 trucks..."
   ✅ "Hi Mark, [Company] operates 200 trucks across 5 states..."

5. If NO quantified case studies found, use placeholders
   Example: "We helped [Your Customer Case Study Here]* achieve [specific result]"
   Then add socialProofNote explaining what's needed

6. Target segments must enable 5,000+ prospects minimum
   ❌ "Fortune 500 CFOs" (only 500 possible)
   ✅ "Finance leaders at logistics companies with 50+ trucks" (10,000+ possible)

7. Use vivid imagery ONLY when hyper-relevant
   ✅ "Sunday nights look like Excel hell" (for bookkeeping pain)
   ✅ "10 hours watching videos of coffee cups sliding" (for false positive alerts)
   ❌ Forced metaphors that don't fit

8. Reference only publicly observable facts
   ✅ "With 150 developers across 8 countries" (from job postings)
   ❌ "Your team is probably struggling with..." (assumption)

TARGETING PHILOSOPHY:
Focus on operational characteristics, not growth signals.

GOOD Operational Qualifiers:
- "Logistics companies with 200+ trucks"
- "E-commerce brands selling on 3+ channels"
- "Agencies with 15+ active clients"
- "Manufacturers with 2+ production facilities"
- "SaaS companies with users in 10+ countries"
- "Retailers with 5+ physical locations"
- "E-learning platforms with 50+ courses"
- "Media companies producing 10+ podcasts weekly"

BAD Growth Signals (NEVER USE):
- "Recently raised Series A"
- "Just hired new CMO"
- "Growing fast"
- "Hiring SDRs"
- "Expanding internationally"
- "Digital transformation initiative"

The qualifier must be:
- Observable on their website/LinkedIn/public data
- Directly related to why they need the solution
- Stable (won't change month to month)
- Creates a large addressable market

Target their ACTUAL customers (who they really sell to), not their aspirational ones (logos on their website).

POSITIONING ASSESSMENT RULES:
If positioning is CLEAR:
- Reinforce what's working
- Create campaigns aligned with their current message
- Use ✅ CLEAR in assessment

If positioning is MODERATELY CLEAR:
- Note what works and what doesn't
- Suggest minor improvements
- Use ⚠️ MODERATELY CLEAR

If positioning is UNCLEAR:
- Diagnose the specific problem
- Recommend a focused positioning
- Create campaigns for the RECOMMENDED positioning, not their mess
- Explain why the recommendation would work
- Use ❌ UNCLEAR

CASE STUDY HANDLING:
Scenario 1: Found quantified case studies
- Use exact customer names and metrics
- "Helped Repak reduce service visits by 70%"
- No socialProofNote needed

Scenario 2: Found testimonials but no metrics
- Use customer names with general benefits
- "Helped Microsoft streamline their process"
- No socialProofNote needed

Scenario 3: No case studies found
- Use placeholders in EVERY email
- "[Your Customer Case Study Here]*"
- Include detailed socialProofNote

OUTPUT STRUCTURE (JSON ONLY - NO OTHER TEXT):
{
  "positioningAssessmentOutput": "[EMOJI] [CLEAR/MODERATELY CLEAR/UNCLEAR]: [1-2 sentences explaining why. Be specific about what's clear or confusing]",
  "idealCustomerProfile": {
    "industry": "[Specific verticals from research, not generic 'B2B']",
    "companySize": "[Include 20-500 employee range unless product literally cannot serve them]",
    "keyCharacteristics": [
      "[Operational characteristic that indicates need for this solution]",
      "[Specific business model or setup that creates the pain]",
      "[Observable attribute that correlates with being a good fit]",
      "[Technology, process, or structure indicator]",
      "[Market position or business challenge they face]"
    ]
  },
  "keyPersonas": [
    {
      "title": "[Specific title that would exist at target companies]",
      "painPoints": "[Pain 1], [Pain 2], [Pain 3], [Pain 4]"
    },
    {
      "title": "[Different title - operational, not aspirational]",
      "painPoints": "[Role-specific pains, not generic business challenges]"
    },
    {
      "title": "[Third title that represents different angle]",
      "painPoints": "[Pains specific to this persona's responsibilities]"
    }
  ],
  "campaignIdeas": [
    {
      "name": "[Memorable, specific name like 'The 3AM Warehouse Crisis' or 'The Excel Hell Eliminator']",
      "target": "[Specific role] at [companies with operational qualifier creating 5,000+ prospects]",
      "emailBody": "Hi [Name], [operational observation without 'noticed']. [specific pain point with vivid detail if relevant]. {company} helped [Customer name OR placeholder*] [specific measurable result]. [Conversational CTA ending with ?]"
    },
    {
      "name": "[Different angle campaign name, equally memorable]",
      "target": "[Different role] at [different operational segment still 5,000+]",
      "emailBody": "Hi [Name], [different operational fact]. [different pain point or challenge question]. {company}'s [specific mechanism/feature] [enables/eliminates/reduces something specific]. [Customer OR placeholder*] [achieved result]. [Different conversational CTA?]"
    },
    {
      "name": "[Third unique angle campaign name]",
      "target": "[Third role] at [third operational segment meeting volume requirement]",
      "emailBody": "Hi [Name], [third operational observation]. [third pain or challenge]. [How solution addresses it]. [Customer result OR placeholder*]. [Third style of CTA?]"
    }
  ],
  "socialProofNote": "[ONLY include if no case studies found. Must say: 'We found no specific customer case studies with quantifiable results on your website. When we work together, you'll provide real customer success stories, metrics, and testimonials to strengthen these campaigns.']",
  "veoGrowthPitch": "Want VeoGrowth to execute these campaigns? We'll identify [specific number range] [specific type of companies with operational qualifier] and craft hyper-personalized messages that resonate with their [specific challenge].",
  "prospectTargetingNote": "Note: These campaigns would target approximately [X,000-Y,000] qualified prospects - [description of who they are and why this volume is realistic based on operational qualifiers]."
}

QUALITY EXAMPLES: [Include full examples from the metaprompt document]

CRITICAL QUALITY CHECKS:
- Count words in each email - are they under 70?
- Did you avoid "noticed/saw" openings?
- Are campaign names memorable and specific?
- Do targets use operational qualifiers enabling 5,000+ prospects?
- Would a prospect think "How do they know exactly what I'm dealing with?"
- Did you use placeholders if no case studies found?
- Is the socialProofNote included ONLY when needed?
- Are all customer names companies, not individuals?

FINAL REMINDER: Output ONLY the JSON object. No explanations, no markdown formatting, no additional text. Just the pure JSON.`;

// Function to send email with the analysis results
async function sendEmailReport(email, companyName, claudeAnalysisJson) {
  try {
    // Build the email HTML using the escapeHtml function
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
    <p style="color: #4b5563;">Thank you for using VeoGrowth! Here's your AI-generated analysis:</p>
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
        <div class="email-body">${escapeHtml(campaign.emailBody) || 'N/A'}</div>
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
</html>`;

    // Send the email using Resend
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

// Main API route handler
export async function POST(req) {
  try {
    // Parse the request body
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

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("Critical: ANTHROPIC_API_KEY not configured. Aborting.");
      return Response.json({ success: false, error: 'AI module not configured (API Key missing).' }, { status: 500 });
    }

    // Extract company name from URL
    const companyNameFromUrl = website.replace(/https?:\/\//, '').replace('www.', '').split('/')[0];

    // Prepare the prompt by replacing placeholders
    const finalPrompt = CLAUDE_METAPROMPT
      .replace(/{website}/g, website)
      .replace(/{company}/g, companyNameFromUrl)
      .replace(/{positioning}/g, positioning);
    
    console.log(`Starting Claude Sonnet 4 task for ${website} with web search...`);
    console.time("ClaudeFullProcess");

    // Call Claude using the exact format specified by the user
    const claudeResponse = await anthropicClient.beta.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 20000,
      temperature: 1,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: finalPrompt
            }
          ]
        }
      ],
      tools: [
        {
          name: "web_search",
          type: "web_search_20250305",
          max_uses: 1
        }
      ],
      thinking: {
        type: "enabled",
        budget_tokens: 5000
      },
      betas: ["web-search-2025-03-05"]
    });

    console.timeEnd("ClaudeFullProcess");

    // Extract the response text
    const claudeOutputText = claudeResponse.content?.[0]?.text || '';
    console.log("Raw Claude output (first 300 chars):", claudeOutputText.substring(0, 300));

    // Parse the JSON response
    let finalAnalysisJson = safeJsonParse(claudeOutputText, "ClaudeOutput");

    // Handle parsing errors
    if (finalAnalysisJson.error) {
      console.error("Claude did not return valid JSON. Raw output snippet:", claudeOutputText.substring(0, 1000));
      
      // Send error email with fallback content
      await sendEmailReport(email, companyNameFromUrl, { 
        positioningAssessmentOutput: "Analysis generation encountered an error. Please try again.", 
        idealCustomerProfile: { 
          industry: "N/A", 
          companySize: "N/A", 
          keyCharacteristics: ["Error in analysis."]
        }, 
        keyPersonas: [], 
        campaignIdeas: [],
        socialProofNote: "Error: Could not generate detailed analysis due to an AI output issue.",
        veoGrowthPitch: "Please try again or contact support at dmitry@veogrowth.com",
        prospectTargetingNote: ""
      });
      
      return Response.json({ 
        success: false, 
        error: "Failed to parse AI response. Email sent with error notification.", 
        debug_output_snippet: claudeOutputText.substring(0, 1000) 
      }, { status: 500 });
    }

    console.log('FINAL STRUCTURED JSON:', JSON.stringify(finalAnalysisJson, null, 2));

    // Send the email with the analysis
    await sendEmailReport(email, companyNameFromUrl, finalAnalysisJson);

    // Return success response with the data
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
    
    // Log detailed error information
    if (error.response?.data) {
      console.error('Anthropic API Error Details:', JSON.stringify(error.response.data, null, 2));
    } else if (error.status && error.message) {
      console.error(`API Call Error: ${error.status} ${error.message}`);
    }
    
    return Response.json({ 
      success: false, 
      error: 'Failed to generate analysis. Please try again.' 
    }, { status: 500 });
  }
}

// GET endpoint for testing
export async function GET() {
  return Response.json({ 
    message: 'VeoGrowth Campaign Generator API - Claude Sonnet 4 Powered', 
    status: 'operational' 
  });
}
