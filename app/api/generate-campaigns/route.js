// Filename: app/api/generate-campaigns/route.js

export const maxDuration = 60; // Vercel Free Tier timeout

import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

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
    console.error(`safeJsonParse for ${stepName} failed: ${e.message}. Snippet:`, textToParse.substring(0, 500));
    return { error: `Failed to parse JSON for ${stepName}. Details: ${e.message}`, original_snippet: textToParse.substring(0, 500) };
  }
}

// --- THE FULL METAPROMPT for Claude Sonnet (with 3 examples) ---
const FINAL_METAPROMPT_FOR_CLAUDE_SONNET = `You are VeoGrowth's elite AI strategist creating world-class B2B cold email campaigns that are so insightful, prospects think "How do they know EXACTLY what I'm dealing with?"

CONTEXT: VeoGrowth is an AI-powered B2B lead generation agency that creates hyper-personalized cold email campaigns. We help companies book qualified meetings by understanding their prospects deeply and crafting messages that resonate at scale.

INPUTS PROVIDED:
- Company Website: {website}
- Positioning Clear?: {positioning}

[FOR TESTING: website = "elevenlabs.io", positioning = "yes"]

YOUR MISSION: Create campaigns that would take a human strategist hours of research to match. Every campaign must demonstrate profound understanding of the prospect's specific situation. This is a CUTTING-EDGE tool that should stun users with its quality.

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

TARGETING PHILOSOPHY (THIS IS CRUCIAL):

VeoGrowth needs campaigns that can reach 30,000+ prospects. Focus on operational characteristics, not growth signals.

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
1. Observable on their website/LinkedIn/public data
2. Directly related to why they need the solution
3. Stable (won't change month to month)
4. Creates a large addressable market

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

COMPLETE QUALITY EXAMPLES:

EXAMPLE 1 - SaaS with Clear Positioning (IXON):
What we found: Industrial IoT platform for machine builders, clear value props around remote access, case study showing Repak reduced service visits 70%

{
  "positioningAssessmentOutput": "✅ CLEAR: IXON excellently positions as an Industrial IoT platform specifically for machine builders, with clear value props around secure remote access, machine insights, and service efficiency.",
  
  "idealCustomerProfile": {
    "industry": "Machine Builders, OEMs, Industrial Equipment Manufacturers",
    "companySize": "50-500 employees",
    "keyCharacteristics": [
      "Build complex machines requiring field service",
      "Have customers across multiple geographic locations",
      "Service technicians traveling to customer sites",
      "Machines at customer sites need monitoring/updates",
      "Pressure to reduce service costs while improving uptime"
    ]
  },
  
  "keyPersonas": [
    {
      "title": "VP of Service",
      "painPoints": "High travel costs eating 40% of service budget, slow response times to customer issues, technician productivity concerns, customer satisfaction with machine downtime"
    },
    {
      "title": "Service Manager",
      "painPoints": "Scheduling technician visits efficiently, first-time fix rates below 70%, inability to diagnose issues remotely, managing distributed service teams"
    },
    {
      "title": "Head of Engineering",
      "painPoints": "Building competitive advantage through digital services, collecting machine performance data, security concerns with remote access, compliance requirements"
    }
  ],
  
  "campaignIdeas": [
    {
      "name": "The Travel Cost Crusher",
      "target": "VP of Service at machine builders with 10+ field technicians",
      "emailBody": "Hi Mark, [Company] manufactures packaging equipment installed across North America. With 15 field technicians covering that territory, travel probably eats 40% of your service budget. IXON helped Repak cut on-site visits by 70% through secure remote access. Their technicians fix issues without leaving the office. Worth exploring?"
    },
    {
      "name": "The 3AM Machine Down Crisis",
      "target": "Service Managers at OEMs with 100+ machines in the field",
      "emailBody": "Hi Sarah, managing service for 200 CNC machines across 30 customer sites means constant firefighting. When customers call at 3AM about a down machine, blind troubleshooting wastes hours. IXON provides instant remote access to see exactly what's wrong. Repak's first-time fix rate jumped to 85%. Interested?"
    },
    {
      "name": "The Compliance Without Complexity",
      "target": "CTOs at machine builders selling to automotive/pharma",
      "emailBody": "Hi David, [Company] supplies assembly systems to pharmaceutical plants. Those facilities demand NIS2 compliance for any remote access. Most VPN solutions create IT nightmares. IXON provides bank-grade security that IT departments actually approve. HoSt implemented without a single audit finding. Want to see how?"
    }
  ],
  
  "socialProofNote": "",
  
  "veoGrowthPitch": "Want VeoGrowth to execute these campaigns? We'll identify 3,000-5,000 machine builders struggling with service costs and craft hyper-personalized messages about their specific equipment and challenges.",
  
  "prospectTargetingNote": "Note: These campaigns would target approximately 3,000-5,000 qualified prospects - machine builders and OEMs with 50+ employees who have equipment at customer sites requiring regular service."
}

EXAMPLE 2 - SaaS with Unclear Positioning (Tourmo):
What we found: AI fleet management trying to do everything, no clear focus, no quantified case studies

{
  "positioningAssessmentOutput": "⚠️ MODERATELY CLEAR: Tourmo positions as an AI fleet management platform, but the messaging covers too many features without a clear primary value. The 'no rip and replace' angle is strong but gets lost among 20+ different capabilities.",
  
  "idealCustomerProfile": {
    "industry": "Transportation, Logistics, Delivery, Field Service",
    "companySize": "50-500 employees",
    "keyCharacteristics": [
      "Operating 50-500 commercial vehicles",
      "Already have telematics but poor adoption/ROI",
      "Multiple disconnected fleet systems",
      "Struggling with driver safety scores",
      "Manual processes eating up manager time"
    ]
  },
  
  "keyPersonas": [
    {
      "title": "Fleet Manager",
      "painPoints": "Drowning in false positive alerts, spending 10 hours weekly on reports, managing 5+ different systems, no time for actual driver coaching"
    },
    {
      "title": "VP Operations",
      "painPoints": "Can't prove ROI on $500K fleet tech spend, data in silos across systems, insurance costs rising 20% annually, board questioning technology investments"
    },
    {
      "title": "Safety Director",
      "painPoints": "80% of alerts are false positives, reactive instead of proactive coaching, insurance premiums increasing, DOT compliance reporting nightmares"
    }
  ],
  
  "campaignIdeas": [
    {
      "name": "The False Positive Eliminator",
      "target": "Fleet Managers at companies with 100+ vehicles using telematics",
      "emailBody": "Hi Tom, managing 150 trucks with Samsara cameras means reviewing 50+ false hard-braking alerts daily. That's 10 hours weekly watching videos of coffee cups sliding. Tourmo's AI filters out 89% of false positives. [Your Customer Case Study Here]* freed up 3 managers for actual coaching. Want to stop the alert fatigue?"
    },
    {
      "name": "The Hidden Fuel Theft Detector",
      "target": "CFOs at trucking companies with 200+ vehicles",
      "emailBody": "Hi Jessica, tracking fuel across 300 trucks with multiple card providers means ghost transactions hide easily. Most fleets lose 2-3% to fraud they never catch. Tourmo identifies suspicious patterns your cards miss. [Your Customer Case Study Here]* recovered $180K last quarter. Interested in a fuel audit?"
    },
    {
      "name": "The Fleet Tech ROI Rescue",
      "target": "VP Operations at companies with 3+ fleet management systems",
      "emailBody": "Hi Robert, running Geotab for tracking, Lytx for cameras, and WEX for fuel means spreadsheet gymnastics. Meanwhile, the board questions why fleet tech costs $500K annually. Tourmo unifies existing systems and proves ROI. [Your Customer Case Study Here]* finally justified their tech spend. Worth a conversation?"
    }
  ],
  
  "socialProofNote": "We found no specific customer case studies with quantifiable results on your website. When we work together, you'll provide real customer success stories, metrics, and testimonials to strengthen these campaigns.",
  
  "veoGrowthPitch": "Want VeoGrowth to execute these campaigns? We'll identify 8,000-12,000 fleet managers already using telematics but struggling to get value, and show them how to maximize their existing investments.",
  
  "prospectTargetingNote": "Note: These campaigns would target approximately 8,000-12,000 qualified prospects - logistics and fleet companies with 50-500 vehicles who already have telematics systems but struggle with data overload and poor ROI."
}

EXAMPLE 3 - Agency Example (Advanced Client):
What we found: B2B GTM agency with clear case studies (UnlimitedViralIdeas: $192k in 1 month, 43 responses, 13 meetings)

{
  "positioningAssessmentOutput": "✅ CLEAR: Advanced Client has excellent positioning as a B2B GTM agency that builds predictable outbound systems, with strong proof points and specific revenue metrics.",
  
  "idealCustomerProfile": {
    "industry": "B2B Agencies, SaaS, Professional Services",
    "companySize": "20-200 employees",
    "keyCharacteristics": [
      "Currently $500K-$5M annual revenue",
      "Relying primarily on referrals and word-of-mouth",
      "Feast or famine revenue cycles",
      "Founder still involved in sales",
      "No systematic outbound process"
    ]
  },
  
  "keyPersonas": [
    {
      "title": "Agency CEO/Founder",
      "painPoints": "Unpredictable monthly revenue, can't hire sales team due to inconsistency, 100 leads one month then crickets, wearing too many hats"
    },
    {
      "title": "VP Sales",
      "painPoints": "No predictable pipeline, team doing manual prospecting, inconsistent messaging across reps, can't forecast accurately"
    },
    {
      "title": "Head of Growth",
      "painPoints": "Referrals drying up, content marketing plateau, paid ads too expensive, need new revenue channel"
    }
  ],
  
  "campaignIdeas": [
    {
      "name": "The Feast or Famine Killer",
      "target": "Agency CEOs with 20-50 employees",
      "emailBody": "Hi Michael, running a 30-person agency means some months you're turning away work while others you're scrambling. Advanced Client built UnlimitedViralIdeas a system generating $192K in one month. 43 responses, 13 meetings, 4 closed deals. Want predictable pipeline?"
    },
    {
      "name": "The Referral Dependency Cure",
      "target": "Founders at B2B service companies doing $1-3M annually",
      "emailBody": "Hi Sarah, most consultancies at $2M revenue rely 80% on referrals. When those dry up, panic sets in. Advanced Client helped Z Media go from 100 leads one month to zero the next, to 200 consistent responses. Ready to control your growth?"
    },
    {
      "name": "The Sales Team Enabler",
      "target": "VP Sales at 50-200 person services firms",
      "emailBody": "Hi David, managing SDRs who spend 70% of time on admin instead of selling? Advanced Client's system freed up dataplor's team to actually do outreach. Their SDR manager says it transformed their productivity. Want your team selling, not spreadsheet wrestling?"
    }
  ],
  
  "socialProofNote": "",
  
  "veoGrowthPitch": "Want VeoGrowth to execute these campaigns? We'll identify 5,000-7,000 B2B service companies trapped in feast-or-famine cycles and show them how to build predictable revenue engines.",
  
  "prospectTargetingNote": "Note: These campaigns would target approximately 5,000-7,000 qualified prospects - B2B agencies and service companies with 20-200 employees showing signs of referral dependency and inconsistent pipeline."
}

CRITICAL QUALITY CHECKS BEFORE SUBMITTING:
1. Count words in each email - are they under 70?
2. Did you avoid "noticed/saw" openings?
3. Are campaign names memorable and specific?
4. Do targets use operational qualifiers enabling 5,000+ prospects?
5. Would a prospect think "How do they know exactly what I'm dealing with?"
6. Did you use placeholders if no case studies found?
7. Is the socialProofNote included ONLY when needed?
8. Are all customer names companies, not individuals?

Remember: This tool creates CUTTING-EDGE campaigns that should stun users with their insight and relevance. Every campaign must feel like it required hours of human research to achieve this level of understanding.

FINAL REMINDER: Output ONLY the JSON object. No explanations, no markdown formatting, no additional text. Just the pure JSON.
\`;

// --- Function to send email with analysis (Reading from HTML file) ---
async function sendEmailReport(email, companyName, claudeAnalysisJson) {
  let templatePath; // Declare here to be accessible in catch block for ENOENT
  try {
    const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return '';
        return unsafe
             .replace(/&/g, "&")
             .replace(/</g, "<")
             .replace(/>/g, ">")
             .replace(/"/g, """)
             .replace(/'/g, "'");
    };

    // Path to the email template.
    // THIS IS THE CORRECT PATH ASSUMING 'route.js' and 'email-template.html'
    // are both in 'app/api/generate-campaigns/' AND there is NO 'src' folder at the project root for 'app'.
    templatePath = path.join(process.cwd(), 'app', 'api', 'generate-campaigns', 'email-template.html');
    
    // --- UNCOMMENT AND USE THIS IF YOUR 'app' FOLDER IS INSIDE 'src' (i.e., src/app/api/...) ---
    // templatePath = path.join(process.cwd(), 'src', 'app', 'api', 'generate-campaigns', 'email-template.html');

    let htmlTemplateString;
    try {
        console.log(`Attempting to read email template from: ${templatePath}`);
        htmlTemplateString = fs.readFileSync(templatePath, 'utf-8');
        console.log(`Successfully read email template.`);
    } catch (fileError) {
        console.error(`Error reading email template file at ${templatePath}:`, fileError);
        // This specific error should ideally be caught and handled before sending to Resend,
        // but Resend itself will also fail if html content is missing/problematic.
        return { success: false, error: `Email template file not found or unreadable. Server configuration issue. Path attempted: ${templatePath}` };
    }

    // Replace placeholders
    let finalHtml = htmlTemplateString.replace(/{{COMPANY_NAME}}/g, escapeHtml(companyName));
    finalHtml = finalHtml.replace(/{{CURRENT_YEAR}}/g, new Date().getFullYear().toString());

    let positioningAssessmentBlock = '';
    if (claudeAnalysisJson.positioningAssessmentOutput) {
        if (claudeAnalysisJson.positioningAssessmentOutput.toLowerCase().includes("error") || claudeAnalysisJson.positioningAssessmentOutput.toLowerCase().includes("failed")) {
            positioningAssessmentBlock = `<div class="error-message"><h4>Issue with Positioning Assessment:</h4><p>${escapeHtml(claudeAnalysisJson.positioningAssessmentOutput)}</p></div>`;
        } else {
            positioningAssessmentBlock = `<div><h2>Positioning Assessment</h2><p>${escapeHtml(claudeAnalysisJson.positioningAssessmentOutput)}</p></div>`;
        }
    } else {
        positioningAssessmentBlock = `<div><h2>Positioning Assessment</h2><p>Assessment not available.</p></div>`;
    }
    finalHtml = finalHtml.replace('<!-- POSITIONING_ASSESSMENT_BLOCK -->', positioningAssessmentBlock);

    let icpBlock = '<h2>Ideal Customer Profile</h2><p>Ideal Customer Profile data not available.</p>';
    if (claudeAnalysisJson.idealCustomerProfile) {
        let characteristicsHtml = '<p>Key characteristics not available.</p>';
        if (claudeAnalysisJson.idealCustomerProfile.keyCharacteristics && claudeAnalysisJson.idealCustomerProfile.keyCharacteristics.length > 0) {
            characteristicsHtml = `
                <p><strong>Key Characteristics:</strong></p>
                <ul>${claudeAnalysisJson.idealCustomerProfile.keyCharacteristics.map(char => `<li>${escapeHtml(char)}</li>`).join('')}</ul>`;
        }
        icpBlock = `
            <div>
              <h2>Ideal Customer Profile</h2>
              <p><strong>Industry:</strong> ${escapeHtml(claudeAnalysisJson.idealCustomerProfile.industry) || 'N/A'}</p>
              <p><strong>Company Size:</strong> ${escapeHtml(claudeAnalysisJson.idealCustomerProfile.companySize) || 'N/A'}</p>
              ${characteristicsHtml}
            </div>`;
    }
    finalHtml = finalHtml.replace('<!-- IDEAL_CUSTOMER_PROFILE_BLOCK -->', icpBlock);
    
    let personasBlock = '<h2>Key Personas</h2><p>Key personas not available.</p>';
    if (claudeAnalysisJson.keyPersonas && claudeAnalysisJson.keyPersonas.length > 0) {
        personasBlock = `
            <div>
              <h2>Key Personas</h2>
              ${claudeAnalysisJson.keyPersonas.map(persona => `
                <div class="campaign-card" style="background-color:#eef2ff; border-left: 4px solid #6366f1;">
                  <h4>${escapeHtml(persona.title) || 'N/A'}</h4>
                  <p><strong>Pain Points:</strong> ${escapeHtml(persona.painPoints) || 'N/A'}</p>
                </div>`).join('')}
            </div>`;
    }
    finalHtml = finalHtml.replace('<!-- KEY_PERSONAS_BLOCK -->', personasBlock);

    let campaignsBlock = '<h2>Campaign Ideas</h2><p>Campaign ideas not available.</p>';
    if (claudeAnalysisJson.campaignIdeas && claudeAnalysisJson.campaignIdeas.length > 0) {
        campaignsBlock = `
            <div>
              <h2>Campaign Ideas</h2>
              ${claudeAnalysisJson.campaignIdeas.map(campaign => `
                <div class="campaign-card">
                  <h3>${escapeHtml(campaign.name) || 'N/A'}</h3>
                  <p><strong>Target:</strong> ${escapeHtml(campaign.target) || 'N/A'}</p>
                  <p><strong>Example Email:</strong></p>
                  <div class="email-body">${(campaign.emailBody || 'N/A').replace(/\\n/g, '<br>')}</div>
                </div>`).join('')}
            </div>`;
    }
    finalHtml = finalHtml.replace('<!-- CAMPAIGN_IDEAS_BLOCK -->', campaignsBlock);

    let socialProofBlock = '';
    if (claudeAnalysisJson.socialProofNote && claudeAnalysisJson.socialProofNote.trim() !== "") {
        socialProofBlock = `
            <div class="note">
              <h4>⚠️ Note on Social Proof</h4>
              <p>${escapeHtml(claudeAnalysisJson.socialProofNote)}</p>
            </div>`;
    }
    finalHtml = finalHtml.replace('<!-- SOCIAL_PROOF_NOTE_BLOCK -->', socialProofBlock);

    finalHtml = finalHtml.replace(/{{VEOGROWTH_PITCH}}/g, escapeHtml(claudeAnalysisJson.veoGrowthPitch || 'VeoGrowth pitch details were not generated for this analysis.'));
    finalHtml = finalHtml.replace(/{{PROSPECT_TARGETING_NOTE}}/g, escapeHtml(claudeAnalysisJson.prospectTargetingNote || 'Prospect targeting details were not generated for this analysis.'));


    const { data, error } = await resend.emails.send({
      from: 'VeoGrowth <campaigns@veogrowth.com>',
      to: email,
      subject: `Your B2B Campaign Analysis for ${companyName}`,
      html: finalHtml,
      replyTo: 'dmitry@veogrowth.com'
    });

    if (error) {
      console.error('Resend Email send error:', JSON.stringify(error, null, 2));
      return { success: false, error: error.message || 'Failed to send email' };
    }
    console.log('Email sent successfully to:', email, 'Resend ID:', data?.id);
    return { success: true, data };

  } catch (error) {
    console.error('Exception in sendEmailReport:', error);
    let errorMessage = 'An unexpected error occurred while preparing the email';
    // Check if templatePath was defined (meaning fs.readFileSync might have been the issue)
    if (error.code === 'ENOENT' && templatePath) { 
        errorMessage = `Email template file not found. Server configuration error.`; 
        console.error(`Critical: Email template file not found. Path attempted: ${templatePath}`);
    } else if (error.message) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

// --- MAIN API ROUTE FUNCTION (POST) ---
export async function POST(req) {
  let companyNameFromUrl = "your company"; 
  let userEmailForErrorReporting = "support@veogrowth.com"; 

  try {
    const { email, website, positioning } = await req.json();
    userEmailForErrorReporting = email; 

    const freeEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'mail.com', 'protonmail.com', 'icloud.com', 'gmx.com', 'zoho.com'];
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (freeEmailDomains.includes(emailDomain)) {
      console.warn('Blocked free email attempt:', email);
      return Response.json({ success: false, error: 'Please enter a work email address.' }, { status: 400 });
    }
    if (!email || !website || !positioning) {
      return Response.json({ success: false, error: 'Missing required fields: email, website, or positioning.' }, { status: 400 });
    }
    if (!website.includes('.') || website.length < 4) {
        return Response.json({ success: false, error: 'Invalid website format.' }, { status: 400 });
    }

    companyNameFromUrl = website.replace(/https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    console.log('New lead received:', { email, website, companyName: companyNameFromUrl, positioning, timestamp: new Date().toISOString() });

    if (!process.env.ANTHROPIC_API_KEY) {
        console.error("CRITICAL: ANTHROPIC_API_KEY not configured. Aborting AI task.");
        return Response.json({ success: false, error: 'AI module not configured on server (API Key missing).' }, { status: 500 });
    }
     if (!process.env.RESEND_API_KEY) {
        console.error("CRITICAL: RESEND_API_KEY not configured. Email sending will fail.");
        // Decide if this is a fatal error or just a warning. For now, let AI proceed.
    }
    
    const populatedPromptForClaude = FINAL_METAPROMPT_FOR_CLAUDE_SONNET
      .replace(/{website}/g, website) 
      .replace(/{company}/g, companyNameFromUrl) 
      .replace(/{positioning}/g, positioning); 
      
    console.log(`Starting Claude Sonnet task for ${companyNameFromUrl} (${website})...`);
    console.time("ClaudeFullProcessTime");

    const claudeThinkingBudget = 5000; 
    const claudeSonnetCallOptions = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 20000,
      temperature: 1.0,
      messages: [{ role: 'user', content: populatedPromptForClaude }],
      tools: [{ "type": "web_search_20250305", "name": "web_search", "max_uses": 1 }],
      thinking: { "type": "enabled", "budget_tokens": claudeThinkingBudget },
      betas: ["web-search-2025-03-05"]
    };
    
    console.log(`Claude Call Options: Model=${claudeSonnetCallOptions.model}, MaxTokens=${claudeSonnetCallOptions.max_tokens}, Temp=${claudeSonnetCallOptions.temperature}, ThinkingBudget=${claudeSonnetCallOptions.thinking.budget_tokens}, WebSearchMaxUses=${claudeSonnetCallOptions.tools[0].max_uses}, Betas=${JSON.stringify(claudeSonnetCallOptions.betas)}`);
    
    const claudeResponse = await anthropicClient.messages.create(claudeSonnetCallOptions);
    console.timeEnd("ClaudeFullProcessTime");

    const claudeOutputText = (claudeResponse.content && claudeResponse.content.length > 0 && typeof claudeResponse.content[0].text === 'string') ? claudeResponse.content[0].text : '';
    
    if (!claudeOutputText) {
        console.error("Claude Sonnet returned no text output. Full response content:", JSON.stringify(claudeResponse.content, null, 2));
        const errorDetail = `AI returned no text output. This could be a temporary issue with the AI service. Please try again. Response from AI (technical): ${JSON.stringify(claudeResponse.content, null, 2).substring(0, 500)}`;
        await sendEmailReport(userEmailForErrorReporting, companyNameFromUrl, { 
            positioningAssessmentOutput: `Analysis Generation Failed: ${errorDetail}`, 
            idealCustomerProfile: null, keyPersonas: [], campaignIdeas: [],
            socialProofNote: "Error: Could not generate detailed analysis due to an AI output issue (no text).",
            veoGrowthPitch: "Please try again or contact support if the issue persists.",
            prospectTargetingNote: ""
        });
        return Response.json({ success: false, error: "AI returned no text output. Please try again or check server logs if the issue persists.", debug_info: "No text in response content." }, { status: 500 });
    }
    console.log("Raw Claude Sonnet output (first 300 chars):", claudeOutputText.substring(0,300));
    
    let finalAnalysisJson = safeJsonParse(claudeOutputText, "ClaudeSonnetOutput");

    if (finalAnalysisJson.error) {
        console.error("Claude Sonnet did not return valid JSON. Raw output snippet (up to 1000 chars):", claudeOutputText.substring(0, 1000));
        const errorDescription = `Our AI generated a response, but we could not parse it as valid JSON (Error: ${finalAnalysisJson.error}). This is a technical issue on our end that we'll investigate. We apologize for the inconvenience.`;
        
        await sendEmailReport(userEmailForErrorReporting, companyNameFromUrl, { 
            positioningAssessmentOutput: errorDescription,
            idealCustomerProfile: null, keyPersonas: [], campaignIdeas: [],
            socialProofNote: `Error: Could not process AI analysis due to an output formatting issue. Details: ${finalAnalysisJson.error}`,
            veoGrowthPitch: "Please try again or contact support if the issue persists.",
            prospectTargetingNote: ""
        });
        return Response.json({ success: false, error: "Failed to parse final analysis from AI. Our team has been notified.", debug_output_snippet: claudeOutputText.substring(0, 1000), parse_error: finalAnalysisJson.error }, { status: 500 });
    }
    
    console.log('SUCCESS: Final structured JSON from Claude Sonnet parsed successfully.');

    const emailResult = await sendEmailReport(userEmailForErrorReporting, companyNameFromUrl, finalAnalysisJson);
    if (!emailResult.success) {
        console.warn("AI analysis generated successfully, but email sending failed.", emailResult.error);
        return Response.json({
          success: true, 
          message: `Analysis generated, but email sending failed: ${emailResult.error}. Please check your inbox or contact support if not received.`,
          data: { companyName: companyNameFromUrl, website: website, positioningInput: positioning, analysis: finalAnalysisJson },
          email_error: emailResult.error
        });
    }

    return Response.json({
      success: true,
      data: { companyName: companyNameFromUrl, website: website, positioningInput: positioning, analysis: finalAnalysisJson }
    });

  } catch (error) {
    console.error('FATAL API Error in POST function:', error);
    let errorResponseMessage = 'Failed to generate analysis due to a server error. Please try again.';
    let errorDetailsForLog = error.message || "Unknown error structure";

    if (error.response && error.response.data) { 
        console.error('Anthropic API Error Details:', JSON.stringify(error.response.data, null, 2));
        errorDetailsForLog = JSON.stringify(error.response.data);
        if(error.response.data.error && error.response.data.error.message) {
            errorResponseMessage = `AI Error: ${error.response.data.error.message}`;
        }
    } else if (error.status && error.message) { 
        console.error(`API Call Error: Status ${error.status}, Message: ${error.message}`);
        errorDetailsForLog = `Status: ${error.status}, Message: ${error.message}`;
        errorResponseMessage = `AI Service Error: ${error.message}`;
    } else if (error.name === 'TimeoutError') {
        console.error('API call timed out:', error.message);
        errorResponseMessage = 'The request to our AI service timed out. This can happen during peak load. Please try again in a moment.';
        errorDetailsForLog = 'TimeoutError - The AI took too long to respond.';
    }
    
    // Attempt to send an error email only if we have an email address for the user
    if (userEmailForErrorReporting && userEmailForErrorReporting !== "support@veogrowth.com") {
        await sendEmailReport(userEmailForErrorReporting, companyNameFromUrl, { 
            positioningAssessmentOutput: `A critical server error occurred during analysis generation: ${errorResponseMessage}. Our team has been notified.`,
            idealCustomerProfile: null, keyPersonas: [], campaignIdeas: [],
            socialProofNote: `Critical Error (for our team): ${errorDetailsForLog}`,
            veoGrowthPitch: "We apologize for the inconvenience. Please try again later or contact support.",
            prospectTargetingNote: ""
        });
    } else {
        console.error("Could not send error email to user as email address was not available or was default support address.");
    }

    return Response.json({ success: false, error: errorResponseMessage, debug_details: errorDetailsForLog }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ message: 'VeoGrowth AI Campaign Generator API - Claude Sonnet Powered (Single Call Strategy with External HTML Template)' });
}
