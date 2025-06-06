export const maxDuration = 60; // Vercel timeout limit

import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

// ============================================
// DEVELOPMENT MODE - SET TO true TO USE MOCK DATA
// ============================================
const USE_MOCK_DATA = true; // Change to false for production

// Mock data for testing (mimics real Claude output)
const MOCK_ANALYSIS = {
  positioningAssessmentOutput: "✅ CLEAR: Your positioning as an AI-powered B2B lead generation platform is crystal clear. You effectively communicate the value of hyper-personalized campaigns and qualified meeting generation.",
  idealCustomerProfile: {
    industry: "B2B SaaS, Agencies, Professional Services, Technology Companies",
    companySize: "20-500 employees",
    keyCharacteristics: [
      "Companies struggling with inconsistent pipeline and relying on referrals",
      "Sales teams spending 70% of time on prospecting instead of selling",
      "Businesses with proven product-market fit ready to scale",
      "Organizations with average deal sizes above $10K",
      "Teams lacking dedicated SDR resources or outbound expertise"
    ]
  },
  keyPersonas: [
    {
      title: "CEO/Founder",
      painPoints: "Revenue unpredictability making it hard to plan, Sales team not hitting quota consistently, Spending too much time on sales instead of strategy, Referral pipeline drying up"
    },
    {
      title: "VP Sales",
      painPoints: "Team wasting time on manual prospecting, No visibility into pipeline health, Reps sending generic emails with 0.1% reply rates, Can't scale team without predictable pipeline"
    },
    {
      title: "Head of Growth",
      painPoints: "CAC through paid ads becoming unsustainable, Content marketing plateau reached, Need new scalable acquisition channel, Pressure to deliver MQLs but quality is poor"
    }
  ],
  campaignIdeas: [
    {
      name: "The Pipeline Predictor",
      target: "CEOs at B2B SaaS companies with 20-100 employees",
      emailBody: "Hi [Name], running a 50-person SaaS company means revenue forecasting feels like reading tea leaves. When referrals are 80% of new business, one slow month creates panic. VeoGrowth built [SaaS Company] a system generating 25 qualified meetings monthly. Their pipeline became predictable for the first time. Worth exploring how we'd do this for [Company]?"
    },
    {
      name: "The SDR Alternative",
      target: "VP Sales at companies doing $2-10M ARR",
      emailBody: "Hi [Name], most VP Sales at [Company Size] companies tell me their AEs waste 60% of their time prospecting instead of closing. Hiring SDRs seems risky without proven playbooks. We helped [Customer] generate 40 SQLs monthly without hiring a single SDR. Their AEs now focus purely on closing. Interested in seeing the exact system?"
    },
    {
      name: "The Outbound Optimizer",
      target: "Sales Teams at B2B companies with underperforming cold email",
      emailBody: "Hi [Name], checked that [Company] has 12 salespeople. If they're like most teams, they're sending 100 emails to get 1 reply. We helped [Similar Company] go from 0.5% to 8% reply rates using AI personalization. That turned 1 meeting per week into 2 per day. Want to see how we'd optimize your sequences?"
    }
  ],
  socialProofNote: "",
  veoGrowthPitch: "Want VeoGrowth to execute these campaigns? We'll identify 5,000-8,000 companies struggling with pipeline predictability and show them how to build systematic outbound engines.",
  prospectTargetingNote: "Note: These campaigns would target approximately 5,000-8,000 qualified prospects - B2B companies with 20-500 employees showing signs of referral dependency and sales team efficiency challenges."
};

// Initialize API clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultHeaders: {
    'anthropic-beta': 'web-search-2025-03-05'
  }
});

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple in-memory cache for email verifications (resets on each deployment)
const emailVerificationCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// LeadMagic Email Verification
async function verifyEmailWithLeadMagic(email) {
  // Check cache first
  const cached = emailVerificationCache.get(email);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Using cached verification for:', email);
    return cached.result;
  }

  // Skip verification if no API key (for testing)
  if (!process.env.LEADMAGIC_API_KEY) {
    console.log('LeadMagic API key not configured, skipping verification');
    return { isValid: true, status: 'skipped' };
  }

  try {
    const response = await fetch('https://api.leadmagic.io/email-validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.LEADMAGIC_API_KEY
      },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      console.error('LeadMagic API error:', response.status);
      // If LeadMagic is down, allow the email through
      return { isValid: true, status: 'api_error' };
    }

    const data = await response.json();
    console.log('LeadMagic verification result:', data);

    // LeadMagic uses 'email_status' not 'status'
    const status = data.email_status || data.status || data.result;
    
    // Accept valid, valid_catch_all, AND catch_all statuses
    const validStatuses = ['valid', 'valid_catch_all', 'catch_all'];
    const isValid = validStatuses.includes(status);

    const result = {
      isValid,
      status: status,
      company: data.company_name || data.company || null,
      companyDetails: data.company_name ? {
        name: data.company_name,
        industry: data.company_industry,
        size: data.company_size,
        founded: data.company_founded,
        linkedin: data.company_linkedin_url
      } : null,
      message: getVerificationMessage(status)
    };

    // Cache the result
    emailVerificationCache.set(email, {
      result,
      timestamp: Date.now()
    });

    // Clean up old cache entries if cache gets too large
    if (emailVerificationCache.size > 1000) {
      const entriesToDelete = [];
      for (const [key, value] of emailVerificationCache.entries()) {
        if (Date.now() - value.timestamp > CACHE_DURATION) {
          entriesToDelete.push(key);
        }
      }
      entriesToDelete.forEach(key => emailVerificationCache.delete(key));
    }

    return result;
  } catch (error) {
    console.error('LeadMagic verification error:', error);
    // If verification fails, allow the email through
    return { isValid: true, status: 'error' };
  }
}

function getVerificationMessage(status) {
  const messages = {
    'valid': 'Email verified successfully',
    'valid_catch_all': 'Email verified (catch-all domain)',
    'catch_all': 'Email accepted (catch-all domain)',
    'unknown': 'Unable to verify this email address',
    'invalid': 'This email address appears to be invalid',
    'api_error': 'Verification service temporarily unavailable',
    'error': 'Verification failed - proceeding anyway',
    'skipped': 'Email verification skipped'
  };
  return messages[status] || 'Unknown verification status';
}

// Helper function to safely escape HTML
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return '';
  
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Safe JSON parser
function safeJsonParse(jsonString, stepName = "AIOutput") {
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

// The COMPLETE metaprompt with ALL examples
const CLAUDE_METAPROMPT = `You are VeoGrowth's elite AI strategist creating world-class B2B cold email campaigns that are so insightful, prospects think "How do they know EXACTLY what I'm dealing with?"

CONTEXT: VeoGrowth is an AI-powered B2B lead generation agency that creates hyper-personalized cold email campaigns. We help companies book qualified meetings by understanding their prospects deeply and crafting messages that resonate at scale.

INPUTS PROVIDED:
Company Website: {website}
Positioning Clear?: {positioning}

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
- Count words in each email - are they under 70?
- Did you avoid "noticed/saw" openings?
- Are campaign names memorable and specific?
- Do targets use operational qualifiers enabling 5,000+ prospects?
- Would a prospect think "How do they know exactly what I'm dealing with?"
- Did you use placeholders if no case studies found?
- Is the socialProofNote included ONLY when needed?
- Are all customer names companies, not individuals?

Remember: This tool creates CUTTING-EDGE campaigns that should stun users with their insight and relevance. Every campaign must feel like it required hours of human research to achieve this level of understanding.

FINAL REMINDER: Output ONLY the JSON object. No explanations, no markdown formatting, no additional text. Just the pure JSON.`;

// Function to send email with the analysis results
async function sendEmailReport(email, companyName, claudeAnalysisJson) {
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

    // Validate and normalize website URL
    let normalizedWebsite = website.trim();
    
    // Remove trailing slash
    normalizedWebsite = normalizedWebsite.replace(/\/$/, '');
    
    // Add https:// if no protocol is specified
    if (!normalizedWebsite.match(/^https?:\/\//i)) {
      normalizedWebsite = 'https://' + normalizedWebsite;
    }
    
    // Validate URL format
    try {
      new URL(normalizedWebsite);
    } catch (err) {
      return Response.json({ success: false, error: 'Invalid website URL format' }, { status: 400 });
    }

    console.log('New lead:', { email, website: normalizedWebsite, positioning, timestamp: new Date() });

    // Verify email with LeadMagic
    console.log('Verifying email with LeadMagic...');
    const verificationResult = await verifyEmailWithLeadMagic(email);
    
    if (!verificationResult.isValid) {
      console.log('Email verification failed:', verificationResult);
      return Response.json({ 
        success: false, 
        error: 'Invalid email address', 
        details: 'It seems like you entered an invalid email. Could you please double-check and enter the correct one?',
        verificationStatus: verificationResult.status
      }, { status: 400 });
    }

    console.log('Email verified successfully:', {
      status: verificationResult.status,
      company: verificationResult.company,
      isValid: verificationResult.isValid
    });

    // Extract company name from URL (domain part only, lowercase)
    const companyNameFromUrl = normalizedWebsite.toLowerCase().replace(/https?:\/\//, '').replace('www.', '').split('/')[0];

    let finalAnalysisJson;

    if (USE_MOCK_DATA) {
      // ========================================
      // USING MOCK DATA FOR DEVELOPMENT
      // ========================================
      console.log('🚨 DEVELOPMENT MODE: Using mock data instead of Claude API');
      console.log('To use real API, set USE_MOCK_DATA = false');
      
      finalAnalysisJson = MOCK_ANALYSIS;
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } else {
      // ========================================
      // PRODUCTION MODE: REAL CLAUDE API CALL
      // ========================================
      if (!process.env.ANTHROPIC_API_KEY) {
        console.error("Critical: ANTHROPIC_API_KEY not configured. Aborting.");
        return Response.json({ success: false, error: 'AI module not configured (API Key missing).' }, { status: 500 });
      }

      // Prepare the prompt
      const finalPrompt = CLAUDE_METAPROMPT
        .replace(/{website}/g, normalizedWebsite)
        .replace(/{company}/g, companyNameFromUrl)
        .replace(/{positioning}/g, positioning);
      
      console.log(`Starting Claude 4 Sonnet task for ${normalizedWebsite} with web search...`);
      console.time("ClaudeFullProcess");

      // Call Claude 4 Sonnet with web search
      let claudeResponse;
      try {
        console.log('Calling Claude with web search...');
        
        // Check if beta namespace exists first
        if (anthropic.beta && typeof anthropic.beta.messages === 'object') {
          console.log('Found beta namespace, using beta.messages.create...');
          claudeResponse = await anthropic.beta.messages.create({
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
        } else {
          console.log('No beta namespace, trying regular messages.create...');
          // Try without beta namespace
          claudeResponse = await anthropic.messages.create({
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
            }
          });
        }
        
        console.log('Claude response received:', {
          id: claudeResponse.id,
          type: claudeResponse.type,
          role: claudeResponse.role,
          model: claudeResponse.model,
          usage: claudeResponse.usage
        });
        
      } catch (error) {
        console.error('Claude 4 API call failed:', error);
        throw error;
      }

      console.timeEnd("ClaudeFullProcess");

      // Extract the response text
      let claudeOutputText = '';
      
      if (claudeResponse.content && Array.isArray(claudeResponse.content)) {
        for (const content of claudeResponse.content) {
          if (content.type === 'text' && content.text) {
            claudeOutputText = content.text;
            break;
          }
        }
      } else if (typeof claudeResponse.content === 'string') {
        claudeOutputText = claudeResponse.content;
      }
      
      console.log("Raw Claude output (first 300 chars):", claudeOutputText.substring(0, 300));

      // Parse the JSON response
      if (!claudeOutputText) {
        console.error("Claude returned empty response!");
        finalAnalysisJson = { error: "Empty response from Claude" };
      } else {
        finalAnalysisJson = safeJsonParse(claudeOutputText, "ClaudeOutput");
      }

      // Handle parsing errors
      if (finalAnalysisJson.error) {
        console.error("Claude did not return valid JSON.");
        return Response.json({ 
          success: false, 
          error: "Failed to parse AI response", 
          debug_output_snippet: claudeOutputText.substring(0, 1000) 
        }, { status: 500 });
      }
    }

    console.log('FINAL STRUCTURED JSON:', JSON.stringify(finalAnalysisJson, null, 2));

    // Send the email with the analysis
    await sendEmailReport(email, companyNameFromUrl, finalAnalysisJson);

    // Return success response with the data
    return Response.json({
      success: true,
      data: { 
        companyName: companyNameFromUrl, 
        website: normalizedWebsite,
        positioningInput: positioning,
        analysis: finalAnalysisJson,
        emailVerification: {
          status: verificationResult.status,
          company: verificationResult.company,
          companyDetails: verificationResult.companyDetails
        }
      }
    });

  } catch (error) {
    console.error('API Error in POST function:', error);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    return Response.json({ 
      success: false, 
      error: 'Failed to generate analysis. Please check the logs for details.' 
    }, { status: 500 });
  }
}

// GET endpoint for testing
export async function GET() {
  return Response.json({ 
    message: 'VeoGrowth Campaign Generator API - Claude 4 Sonnet Powered', 
    status: 'operational',
    model: 'claude-sonnet-4-20250514',
    features: ['web_search', 'thinking'],
    mock_mode: USE_MOCK_DATA ? 'ENABLED' : 'DISABLED'
  });
}
