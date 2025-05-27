export const maxDuration = 60;

import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import OpenAI from 'openai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper function to search and fetch with GPT-4.1 Mini
async function performWebResearch(website, promptText) { // Renamed 'prompt' to 'promptText' for clarity
  try {
    // Initial messages to send to OpenAI
    const initialMessages = [
      {
        role: "system",
        content: "You are a web research assistant. Use the provided tools to search and fetch information."
      },
      {
        role: "user",
        content: promptText.replace('{website}', website).replace('{domain}', website.replace(/https?:\/\//, '').replace('www.', ''))
      }
    ];

    // First call to OpenAI, asking it to decide on tools
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: initialMessages,
      tools: [
        {
          type: "function",
          function: {
            name: "web_search",
            description: "Search the web for information",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "Search query" }
              },
              required: ["query"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "fetch_url",
            description: "Fetch content from a specific URL",
            parameters: {
              type: "object",
              properties: {
                url: { type: "string", description: "URL to fetch" }
              },
              required: ["url"]
            }
          }
        }
      ],
      tool_choice: "auto",
      max_tokens: 2000, // Max tokens for the response that might include tool calls
      temperature: 0.3
    });

    const message = completion.choices[0].message; // Assistant's first response

    // If the AI decided to use tools
    if (message.tool_calls) {
      const toolOutputs = [];

      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        let toolResult = "";

        if (functionName === "web_search") {
          // Simulate web search - in production, use actual search API
          toolResult = `Search results for "${functionArgs.query}": [Simulated search results - implement actual search]`;
          console.log(`Simulated web search for: ${functionArgs.query}`);
        } else if (functionName === "fetch_url") {
          // Fetch actual URL content
          try {
            console.log(`Fetching URL: ${functionArgs.url}`);
            const response = await fetch(functionArgs.url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              },
              signal: AbortSignal.timeout(15000) // Increased timeout slightly
            });

            if (response.ok) {
              const html = await response.text();
              toolResult = html.substring(0, 15000); // Limit content, slightly increased
              console.log(`Fetched content successfully from ${functionArgs.url} (first 100 chars): ${toolResult.substring(0,100)}`);
            } else {
              toolResult = `Failed to fetch URL ${functionArgs.url}. Status: ${response.status}`;
              console.error(`Failed to fetch URL ${functionArgs.url}. Status: ${response.status}`);
            }
          } catch (e) {
            toolResult = `Failed to fetch URL ${functionArgs.url}. Error: ${e.message}`;
            console.error(`Error fetching URL ${functionArgs.url}:`, e);
          }
        }

        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: toolResult // This is the content for the tool message
        });
      }

      // Second call to OpenAI, providing tool results to get the final summary
      const finalResponse = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          ...initialMessages, // Original system and user messages
          message, // Assistant's response that included the tool_calls
          // Map each toolOutput to a message with role: "tool"
          ...toolOutputs.map(tOut => {
            const originalToolCall = message.tool_calls.find(tc => tc.id === tOut.tool_call_id);
            return {
              role: "tool",
              tool_call_id: tOut.tool_call_id,
              name: originalToolCall ? originalToolCall.function.name : undefined,
              content: String(tOut.output) // Ensure content is a string
            };
          })
        ],
        max_tokens: 2000 // Max tokens for the summarized research result
      });

      return finalResponse.choices[0].message.content;
    }

    // If no tool calls were made in the first response, return its content directly
    return message.content;

  } catch (error) {
    // Log more details for debugging
    console.error(`Research error during performWebResearch for website "${website}" with prompt starting with "${promptText.substring(0, 50)}...":`, error);
    return null; // Return null if any error occurs during research
  }
}

// Three specialized research prompts
const RESEARCH_PROMPTS = {
  homepage: `<homepage_analysis_task>
Fetch and analyze the homepage of {website} to understand their product and positioning.

<tools>
Use fetch_url to get the main website homepage content
</tools>

<extraction_requirements>
<product_details>
- Exact company name
- Primary product/service (what they sell)
- How it works (the mechanism/technology)
- Key features (top 5-10)
- Unique selling propositions
</product_details>

<positioning_analysis>
- Headline/tagline
- Main value propositions (verbatim from site)
- Hero section messaging
- Call-to-action text
- Trust indicators (certifications, security, compliance)
</positioning_analysis>

<target_identification>
- Who they explicitly say they serve
- Industries mentioned
- Company sizes referenced
- Job titles/departments targeted
- Use cases described
</target_identification>
</extraction_requirements>

<output_instructions>
Return as JSON with these exact keys:
{
  "company_name": "",
  "product": "",
  "mechanism": "",
  "features": [],
  "value_props": [],
  "target_audience": {},
  "positioning_strength": "clear/moderate/unclear"
}

Extract actual text from the website, don't paraphrase.
</output_instructions>
</homepage_analysis_task>`,

  caseStudies: `<case_study_search_task>
Find all customer success stories, case studies, and testimonials for {website}.

<search_strategy>
1. Search: "{domain} case studies customer success stories"
2. Search: "{domain} testimonials results ROI"
3. Search: "site:{domain} customers clients"
4. Fetch any case study or customer pages found
</search_strategy>

<extraction_focus>
<customer_evidence>
- Every customer name mentioned
- Specific results/metrics per customer
- Industry of each customer
- Size of customer company if mentioned
- Direct quotes (company attribution only, no personal names)
</customer_evidence>

<success_metrics>
- Percentage improvements
- Time savings
- Cost reductions
- ROI figures
- User/revenue growth
- Efficiency gains
</success_metrics>

<testimonial_themes>
- Most common praise points
- Problems solved
- Implementation timeframe
- Comparison to alternatives
</testimonial_themes>
</extraction_focus>

<output_format>
{
  "customers_found": ["company1", "company2"],
  "case_studies": [
    {
      "customer": "",
      "industry": "",
      "results": "",
      "quote": ""
    }
  ],
  "metrics": {
    "common_improvements": [],
    "roi_claims": []
  },
  "evidence_quality": "strong/moderate/weak/none"
}

If no case studies found, return evidence_quality as "none" with empty arrays.
</output_format>
</case_study_search_task>`,

  marketContext: `<market_context_task>
Analyze {website}'s market positioning and competitive landscape.

<research_approach>
1. Search: "{company} vs competitors alternatives"
2. Search: "{company} reviews comparisons"  
3. Analyze website for competitor mentions
4. Identify pain points they claim to solve
</research_approach>

<analysis_targets>
<competitive_positioning>
- Direct competitors mentioned
- "Unlike [competitor]" statements
- Comparison pages or content
- Differentiators claimed
- Market category they claim
</competitive_positioning>

<pain_point_extraction>
- Problems they say they solve
- "Before/after" scenarios
- Customer struggles mentioned
- Status quo they're disrupting
- Cost/time/risk issues addressed
</pain_point_extraction>

<market_signals>
- Pricing model/transparency
- Company size indicators
- Growth claims
- Market opportunity mentioned
- Industry trends referenced
</market_signals>
</analysis_targets>

<output_specification>
{
  "main_competitors": [],
  "key_differentiators": [],
  "pain_points_addressed": [
    {
      "pain": "",
      "impact": "",
      "solution": ""
    }
  ],
  "market_position": "leader/challenger/disruptor/niche",
  "pricing_model": "",
  "market_maturity": "emerging/growing/mature"
}

Focus on extractable facts, not interpretation.
</output_specification>
</market_context_task>`
};

// Function to send email with analysis
async function sendEmailReport(email, analysis, company) {
  try {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #1f2937; margin: 0;">VeoGrowth</h1>
          <p style="color: #6b7280; margin-top: 5px;">AI-Powered B2B Lead Generation</p>
        </div>

        <div style="background: #f9fafb; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-top: 0;">Your Campaign Analysis for ${company}</h2>
          <p style="color: #4b5563;">Thank you for using VeoGrowth's Campaign Generator! We've analyzed your website and created three hyper-personalized cold email campaigns targeting your ideal customers.</p>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 10px; margin-bottom: 30px;">
          ${analysis}
        </div>

        <div style="background: #4f46e5; color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h2 style="margin-top: 0; margin-bottom: 15px;">Ready to Execute These Campaigns?</h2>
          <p style="margin-bottom: 20px; opacity: 0.9;">VeoGrowth will implement these campaigns for you:</p>
          <ul style="text-align: left; max-width: 400px; margin: 0 auto 25px; padding-left: 20px;">
            <li style="margin-bottom: 10px;">Build targeted lists (3,000-5,000 prospects)</li>
            <li style="margin-bottom: 10px;">Craft hyper-personalized messages for each</li>
            <li style="margin-bottom: 10px;">Book qualified meetings in your calendar</li>
            <li>Only pay for meetings that show up</li>
          </ul>
          <a href="https://calendly.com/veogrowth/strategy" style="display: inline-block; background: white; color: #4f46e5; padding: 15px 35px; border-radius: 5px; text-decoration: none; font-weight: bold;">Book Your Strategy Call</a>
        </div>

        <div style="text-align: center; color: #6b7280; font-size: 14px;">
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
      subject: `Your B2B Cold Email Campaigns for ${company}`,
      html: emailHtml,
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

// The COMPLETE enhanced metaprompt with all examples and rules
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
6. If no case studies found, ALWAYS add the warning note
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
[1-2 sentences explaining why, mentioning specific strengths or gaps]

---

## **Your ICP appears to be:**
- **Industry**: [Specific verticals they serve]
- **Company size**: [Employee count and/or revenue range]
- **Key characteristics**:
  - [Specific pain point or situation]
  - [Specific pain point or situation]
  - [Specific pain point or situation]
  - [Specific pain point or situation]
  - [Specific pain point or situation]

## **Key Personas to Target:**

**1. [Specific Title]**
- Pain points: [Comma-separated list of 3-4 specific challenges]

**2. [Different Title]**
- Pain points: [Comma-separated list of 3-4 specific challenges]

**3. [Another Title]**
- Pain points: [Comma-separated list of 3-4 specific challenges]

---

## **Campaign Ideas for [Company]:**

### **Campaign 1: "[Descriptive Name]"**
**Target**: [Specific role] at [specific company type with observable characteristic]

**Example email:**
"Hi [Name], [specific observable fact about prospect company]. [Natural insight or vivid pain point that flows from that fact]. [Company] helped [Customer Name] [specific achievement]. [Optional: Another metric or simple mechanism]. [Conversational CTA ending in ?]"

### **Campaign 2: "[Different Name]"**
**Target**: [Different specific role] at [different segment]

**Example email:**
"Hi [Name], [different observable fact]. [Different insight or pain point]. [Company]'s [simple mechanism explanation] [achieves outcome]. [Customer] [achieved result]. [Different conversational CTA?]"

### **Campaign 3: "[Another Name]"**
**Target**: [Third role] at [third segment]

**Example email:**
"Hi [Name], [third observable fact]. [Third insight or pain point]. [Solution connection]. [Customer result]. [Third CTA?]"

---

[IF NO CASE STUDIES FOUND, ADD THIS:]
### ⚠️ **Note on Social Proof**: 
*We didn't find specific customer case studies on your website, so the examples above use hypothetical scenarios. When we work together, you'll provide us with your real customer success stories, metrics, and testimonials to make these campaigns authentic and powerful.*

**Want VeoGrowth to execute these campaigns?**  
We'll [specific action related to their ICP] and [specific outcome related to their value prop].

[Book a Strategy Call →]

*Note: These campaigns would target approximately [X,000-Y,000] qualified prospects [specific description of who and why they're qualified].*

---

EXAMPLE 1 - SaaS with Clear Positioning (IXON):

Based on IXON's website analysis:

## **Positioning Assessment: ✅ CLEAR**
IXON has excellent positioning as an Industrial IoT platform specifically for machine builders, with clear value props around secure remote access, machine insights, and service efficiency.

---

## **Your ICP appears to be:**
- **Industry**: Machine builders/OEMs (industrial equipment manufacturers)
- **Company size**: 50-500 employees (mid-market manufacturers)
- **Key characteristics**:
  - Build complex industrial machines requiring remote support
  - Have field service teams traveling to customer sites
  - Face pressure to reduce service costs and improve uptime
  - Need to comply with security standards (ISO, IEC, NIS2)
  - Expanding globally with machines in multiple countries

## **Key Personas to Target:**

**1. VP of Service / Service Manager**
- Pain points: High travel costs, slow response times, technician productivity, customer satisfaction

**2. CTO / Head of Engineering**
- Pain points: Security compliance, data collection from machines, building competitive advantages

**3. Field Service Manager**
- Pain points: Managing distributed technicians, reducing truck rolls, first-time fix rates

---

## **Campaign Ideas for IXON:**

### **Campaign 1: "Travel Cost Crusher"**
**Target**: VP of Service at machine builders with 10+ field technicians

**Example email:**
"Hi Mark, manufacturing packaging equipment with 15 field techs covering North America means travel probably eats 40% of service budget. IXON's secure remote access lets technicians fix issues from their desk. Repak cut on-site visits by 70%. Worth exploring?"

### **Campaign 2: "Compliance Without Complexity"**
**Target**: CTOs at machine builders selling to automotive/pharma

**Example email:**
"Hi Sarah, supplying assembly systems to automotive plants means facilities demand NIS2 and ISO compliance for any remote access. Most VPN solutions create security nightmares. IXON provides bank-grade security that IT departments actually approve. Vapormatt implemented without a single security audit finding. Interested?"

### **Campaign 3: "First-Time Fix Rate Booster"**
**Target**: Field Service Managers with global installations

**Example email:**
"Hi Tom, managing service for CNC machines across 30 countries means constant firefighting. When technicians arrive on-site without knowing the real issue, first-time fix rates plummet. IXON's Machine Insights showed HoSt exactly what's wrong before dispatch. They say troubleshooting speed increased 10x. Want to see how?"

---

**Want VeoGrowth to execute these campaigns?**  
We'll build targeted lists of machine builders struggling with service costs and craft messages that resonate with their specific challenges.

[Book a Strategy Call →]

*Note: These campaigns would target approximately 3,000-5,000 qualified prospects across North America and Europe, focusing on mid-market manufacturers with distributed equipment.*

EXAMPLE 2 - SaaS with Unclear Positioning (Tourmo):

Based on Tourmo.ai's website analysis:

## **Positioning Assessment: ⚠️ MODERATELY CLEAR**
Tourmo positions as an AI fleet management platform that integrates with existing systems, but the messaging covers many features without a single compelling focus. The "no rip and replace" angle is strong but gets lost among numerous capabilities.

---

## **Your ICP appears to be:**
- **Industry**: Transportation, logistics, delivery, field service companies
- **Company size**: 100-1000+ vehicle fleets
- **Key characteristics**:
  - Already invested in telematics/cameras but getting poor ROI
  - Multiple disconnected fleet systems (fuel cards, cameras, telematics)
  - Struggling with driver safety scores and false positives
  - Manual processes eating up manager time
  - Pressure to reduce accidents, fuel costs, and insurance premiums

## **Key Personas to Target:**

**1. VP of Fleet Operations**
- Pain points: Too many systems to manage, poor data quality, can't prove ROI on fleet tech investments

**2. Director of Safety**
- Pain points: False positive alerts, reactive vs proactive coaching, insurance costs rising

**3. Fleet Manager**
- Pain points: Drowning in alerts, manual tasks, no time for strategic work

---

## **Campaign Ideas for Tourmo.ai:**

### **Campaign 1: "The False Positive Eliminator"**
**Target**: Fleet Safety Directors at companies with 200+ vehicles using Samsara/Motive

**Example email:**
"Hi Jessica, with 300 trucks running Samsara cameras, team probably reviews 50+ false hard-braking alerts daily. That's 10 hours weekly watching videos of coffee cups sliding. Tourmo's AI filters out 89% of false positives without replacing cameras. One logistics fleet freed up 3 safety managers for actual coaching. Want to stop the alert fatigue?"

### **Campaign 2: "Hidden Fuel Theft Detector"**
**Target**: CFOs at trucking companies with 500+ vehicles

**Example email:**
"Hi Robert, managing fuel for 500 trucks across multiple card providers means ghost transactions hide easily. Most fleets lose 2-3% to fuel fraud they never catch. Tourmo identifies suspicious transactions without changing fuel cards. [We'd insert your real customer metric here]. Interested in a fraud audit of your fuel data?"

### **Campaign 3: "Fleet Tech ROI Rescue"**
**Target**: VP Operations at companies with 3+ disconnected fleet systems

**Example email:**
"Hi David, running Geotab for tracking, Lytx for cameras, and WEX for fuel probably involves spreadsheet gymnastics every Monday. Meanwhile, the board questions why fleet tech costs $500K annually. Tourmo unifies existing systems and finally proves ROI. No hardware changes needed. Worth a conversation?"

---

### ⚠️ **Note on Social Proof**: 
*We didn't find specific customer case studies on your website, so the examples above use hypothetical scenarios. When we work together, you'll provide us with your real customer success stories, metrics, and testimonials to make these campaigns authentic and powerful.*

## **Positioning Recommendation:**
Consider leading with ONE killer use case (like "Stop drowning in false positive alerts") rather than trying to communicate all capabilities upfront. The "no rip and replace" message is gold but needs to be tied to a specific, painful problem.

**Want VeoGrowth to execute these campaigns?**  
We'll build targeted lists of fleet managers already using your competitors' systems and craft messages that resonate with their specific tech stack challenges.

[Book a Strategy Call →]

*Note: These campaigns would target approximately 5,000-8,000 qualified prospects, focusing on fleets already invested in technology but struggling to get value from it.*

EXAMPLE 3 - Agency with Hyper-Personalization:

Based on ConversionLab's website analysis:

## **Positioning Assessment: ✅ CLEAR**
ConversionLab has strong positioning as a CRO agency for ecommerce brands, with clear case studies showing specific conversion lifts and revenue gains for DTC brands.

---

## **Your ICP appears to be:**
- **Industry**: Direct-to-consumer ecommerce brands
- **Company size**: $5M-$50M annual revenue
- **Key characteristics**:
  - Decent traffic but conversion rates below 3%
  - Selling on Shopify or similar platforms
  - Have product-market fit but struggling to scale profitably
  - Spending heavily on ads with rising CAC
  - Know they need CRO but unsure where to start

## **Key Personas to Target:**

**1. Founder/CEO**
- Pain points: Conversion rate plateaued, CAC rising, need to improve unit economics before raising

**2. Head of Ecommerce/Digital**
- Pain points: Pressure to hit revenue targets, too many optimization ideas, no clear testing roadmap

**3. CMO/VP Marketing**
- Pain points: Justifying ad spend, improving ROAS, competing priorities between acquisition and conversion

---

## **Campaign Ideas for ConversionLab:**

### **Campaign 1: "The Conversion Audit Special"**
**Target**: Ecommerce founders doing $10M+ with sub-3% conversion rates

**Example email:**
"Hi Mike, [Brand] converting at 2.3% with that beautiful product photography and story. Spent 20 minutes on your site - love how you showcase the sustainability angle. Few quick wins I spotted: your reviews sit below the fold (usually +15% moving them up), cart abandonment popup triggers too late (10 seconds vs optimal 3), and your size guide hides in footer (floating button typically +8% on apparel). Gymshark went from 2.1% to 3.8% with similar fixes. Want us to do a full 50-point audit video walking through every opportunity? Takes us 2 hours, completely free, you keep it forever. Interested?"

### **Campaign 2: "The Holiday Revenue Maximizer"**
**Target**: CMOs at DTC brands approaching Q4

**Example email:**
"Hi Sarah, [Brand]'s BFCM landing page from last year had smart countdown timers but checkout still took 4 steps. Noticed you're testing new bundles - smart move. For Black Friday, we'd suggest: single-page checkout (usually +22% conversion), exit intent with SMS capture (Glossier added $1.2M this way), and dynamic bundles based on cart value. We helped 12 brands average 47% more revenue last BFCM. Happy to share our exact 21-day pre-launch checklist and walk through how we'd customize it for [Brand]'s specific situation?"

### **Campaign 3: "The Mobile Conversion Fix"**
**Target**: Heads of Ecommerce seeing 70%+ mobile traffic

**Example email:**
"Hi Tom, [Brand]'s mobile experience actually loads fast (nice job on the 2.1s speed). But that sticky add-to-cart button disappears on your bestsellers page, and the image zoom makes products blurry on iPhone. Your competitor Allbirds fixed these exact issues and went from 1.8% to 3.2% mobile conversion. We've got a whole mobile playbook - thumb-friendly buttons, smart quick-buy options, Apple Pay optimization. Want to see a Loom video showing exactly what we'd fix on [Brand]'s mobile experience and expected conversion lift for each change?"

---

**Want VeoGrowth to execute these campaigns?**  
We'll identify ecommerce brands with traffic but poor conversion and show them exactly how to turn more visitors into customers.

[Book a Strategy Call →]

*Note: These campaigns would target approximately 4,000-6,000 qualified DTC brands doing $5M+ revenue, focusing on those with conversion optimization opportunities.*

EXAMPLE 4 - SEO Agency with Specific Execution:

Based on RankRise's website analysis:

## **Positioning Assessment: ✅ CLEAR**
RankRise specializes in SEO for B2B SaaS companies, with strong case studies showing organic traffic growth and pipeline attribution.

---

## **Your ICP appears to be:**
- **Industry**: B2B SaaS companies
- **Company size**: Series A to Series C (20-200 employees)
- **Key characteristics**:
  - Creating good content but not ranking
  - Competitors dominating search results
  - No clear SEO strategy beyond "write more blogs"
  - Marketing team stretched thin
  - Need to show organic pipeline contribution

## **Key Personas to Target:**

**1. VP/Director of Marketing**
- Pain points: SEO takes forever to show results, hard to justify investment, competing priorities

**2. Head of Content/Demand Gen**
- Pain points: Great content buried on page 3, no technical SEO knowledge, keyword research guesswork

**3. Founder/CEO (smaller companies)**
- Pain points: Losing deals to competitors who rank, organic as sustainable growth channel, limited budget

---

## **Campaign Ideas for RankRise:**

### **Campaign 1: "The Competitor Gap Analysis"**
**Target**: Marketing directors at B2B SaaS losing organic traffic to competitors

**Example email:**
"Hi Sarah, Ahrefs shows [Competitor] ranking for 847 keywords that [Company] could own. They're getting ~12K visitors monthly from terms like "employee scheduling software" and "shift planning tools." Your blog content is actually deeper - especially that piece on schedule optimization. You're missing: dedicated comparison pages (/vs-when-i-work), a glossary section for definition searches, and integration pages for your top 10 partners. Scheduling software company Homebase built these exact pages and went from position 19 to top 3 in 4 months. Want me to run a full gap analysis showing which 20 pages would capture the most traffic from [Competitor]?"

### **Campaign 2: "The Technical SEO Quick Wins"**
**Target**: SaaS companies with 100+ blog posts but poor rankings

**Example email:**
"Hi Mark, [Company] has 200+ quality blog posts but Screaming Frog shows 1,400 technical issues holding you back. The big ones: 89 pages with duplicate titles (confusing Google), your /resources section isn't in the sitemap (invisible to crawlers), and load time hits 4.8 seconds on mobile. ProjectManagement.com fixed similar issues and saw 67% more organic traffic in 60 days without writing a single new post. I recorded a Loom showing your top 10 technical fixes in priority order - each with expected impact. Want to see it?"

### **Campaign 3: "The Link Velocity Builder"**
**Target**: Series B SaaS companies with good content but weak domain authority

**Example email:**
"Hi Jessica, [Company]'s product marketing content is solid but you're stuck at DR 42 while competitors average DR 65. Majestic shows you getting 2-3 backlinks monthly while [Competitor] gets 45+. They're doing digital PR - turning product updates into TechCrunch mentions. Your recent AI feature launch was perfect for this but only got 3 links. We helped Lattice go from DR 38 to 71 in 18 months using our journalist database and proven pitch templates. Want to see exactly which 15 publications would likely cover [Company]'s next feature launch?"

---

**Want VeoGrowth to execute these campaigns?**  
We'll find B2B SaaS companies creating content but losing the SEO war and show them exactly how to outrank their competitors.

[Book a Strategy Call →]

*Note: These campaigns would target approximately 5,000-7,000 qualified B2B SaaS companies with content marketing efforts but poor organic visibility.*

EXAMPLE 5 - Email Marketing Agency with Deep Personalization:

Based on FlowMasters' website analysis:

## **Positioning Assessment: ✅ CLEAR**
FlowMasters positions as the email marketing agency for ecommerce brands looking to scale revenue through automation and segmentation.

---

## **Your ICP appears to be:**
- **Industry**: Ecommerce brands (fashion, beauty, lifestyle)
- **Company size**: $2M-$20M annual revenue
- **Key characteristics**:
  - Email list of 10K+ but low engagement
  - Using basic Klaviyo/Mailchimp features only
  - Email revenue under 20% of total
  - One welcome email then blast campaigns
  - Know email could do more but lack expertise/time

## **Key Personas to Target:**

**1. Ecommerce Founder/Owner**
- Pain points: Email feels like constant work for little return, leaving money on table, competitors doing it better

**2. Email Marketing Manager**
- Pain points: Stuck doing daily campaigns, no time for strategy, don't know advanced features

**3. Head of Ecommerce**
- Pain points: Email attribution unclear, revenue per recipient declining, list growth stalled

---

## **Campaign Ideas for FlowMasters:**

### **Campaign 1: "The Revenue Recovery Sequence"**
**Target**: DTC brands with 20K+ email list but under 15% email revenue

**Example email:**
"Hi Lauren, [Brand]'s welcome email with the founder story about your rescue dog sanctuary is perfect - that authentic voice really connects. But then subscribers get nothing for 2 weeks until your next sale. Brands with similar AOV to yours ($85) typically see 29% more revenue with a 5-email welcome series: expand the rescue story, showcase your eco-friendly process, customer transformation stories, behind-the-scenes of your Denver workshop, then soft discount. Chubbies built their $100M business perfecting this flow. Want me to map out the exact 5-email sequence we'd build for [Brand] with subject lines and preview text?"

### **Campaign 2: "The Segmentation Gold Mine"**
**Target**: Beauty/skincare brands sending batch-and-blast campaigns

**Example email:**
"Hi Ashley, [Brand] has 45K subscribers but your last campaign shows 2,200 Gmail clips. That means 43K people didn't even see it. Noticed you sell both anti-aging and acne products - but everyone gets the same emails? Your Shopify data is a goldmine: segment by skin concern, purchase history, AOV. Glossier sends 27 different versions of each campaign. Their acne-prone segment gets ingredient education, mature skin gets routine tips. Opens went from 18% to 34%. I can show you exactly how to segment your list based on your specific product lines - want to see the strategy?"

### **Campaign 3: "The Win-Back Automation"**
**Target**: Subscription box companies with high churn

**Example email:**
"Hi Chris, [Brand]'s subscription model is smart but Recharge shows 68% churn after month 3. Your cancellation email just says "sorry to see you go" - missing huge opportunity. FabFitFun wins back 23% of cancellations with a 4-email sequence: survey why they left, address that specific concern, show new products they missed, special "come back" offer. Your tea subscription could do: flavor preferences survey, limited edition blend announcement, customer story about finding their perfect tea, 30% off return offer. Want the exact automation flow we'd build with timing and triggers mapped out?"

---

**Want VeoGrowth to execute these campaigns?**  
We'll identify ecommerce brands underutilizing email and show them exactly how to turn their list into a revenue engine.

[Book a Strategy Call →]

*Note: These campaigns would target approximately 6,000-8,000 qualified ecommerce brands with established email lists but poor email revenue contribution.*

Remember: The quality bar is EXTREMELY high. Every campaign idea must feel like it required hours of research and deep industry knowledge. The prospect should think "how do they know exactly what I'm dealing with?"

For agencies especially: ALWAYS include specific things found on their site, exact execution plans, and valuable free offers.`;

export async function POST(req) {
  try {
    const { email, website, positioning } = await req.json();

    // Validate work email (block free providers)
    const freeEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'mail.com', 'protonmail.com', 'icloud.com'];
    const emailDomain = email.split('@')[1]?.toLowerCase();
    
    if (freeEmailDomains.includes(emailDomain)) {
      return Response.json({ 
        success: false, 
        error: 'Please enter a work email address' 
      }, { status: 400 });
    }

    if (!email || !website || !positioning) {
      return Response.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Log the lead
    console.log('New lead:', { email, website, positioning, timestamp: new Date() });

    // Run three research prompts in parallel with GPT-4.1 Mini
    const [homepageData, caseStudyData, marketData] = await Promise.all([
      performWebResearch(website, RESEARCH_PROMPTS.homepage),
      performWebResearch(website, RESEARCH_PROMPTS.caseStudies),
      performWebResearch(website, RESEARCH_PROMPTS.marketContext)
    ]);

    // Combine research results
    const combinedResearch = {
      homepage: homepageData ? JSON.parse(homepageData) : {},
      caseStudies: caseStudyData ? JSON.parse(caseStudyData) : {},
      marketContext: marketData ? JSON.parse(marketData) : {},
      website: website
    };

    // Determine positioning clarity
    const positioningAssessment = positioning === 'yes' ? 'clear' : positioning === 'no' ? 'unclear' : 'moderate';

    // Prepare the prompt with research data
    const prompt = METAPROMPT
      .replace('{research}', JSON.stringify(combinedResearch))
      .replace('{website}', website)
      .replace('{positioning}', positioningAssessment);

    // Call Claude Opus 4 for campaign generation
    const message = await anthropic.messages.create({
      model: 'claude-4-opus-20250514', // Ensure this is the correct model identifier if you change it
      max_tokens: 4000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract the analysis from Claude's response
    const analysis = message.content[0].text;

    // Extract company name from URL
    const company = website
      .replace(/https?:\/\//, '')
      .replace('www.', '')
      .split('/')[0];

    // Format the response nicely with proper HTML
    const formattedAnalysis = `
      <div style="max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <h2 style="color: #1f2937; margin-bottom: 32px; font-size: 28px; font-weight: 700;">
          Campaign Analysis for ${company}
        </h2>

        <div style="background: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          ${analysis
            .replace(/## \*\*Positioning Assessment:/g, '<h3 style="color: #4f46e5; margin: 24px 0 16px 0; font-size: 20px; font-weight: 600;">Positioning Assessment:')
            .replace(/## \*\*Your ICP appears to be:\*\*/g, '<h3 style="color: #4f46e5; margin: 32px 0 16px 0; font-size: 20px; font-weight: 600;">Your ICP appears to be:</h3>')
            .replace(/## \*\*Key Personas to Target:\*\*/g, '<h3 style="color: #4f46e5; margin: 32px 0 16px 0; font-size: 20px; font-weight: 600;">Key Personas to Target:</h3>')
            .replace(/## \*\*Campaign Ideas for.*?:\*\*/g, '<h3 style="color: #4f46e5; margin: 32px 0 16px 0; font-size: 20px; font-weight: 600;">Campaign Ideas:</h3>')
            .replace(/### \*\*Campaign \d+: "(.*?)"\*\*/g, '<div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;"><h4 style="color: #1f2937; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">$1</h4>')
            .replace(/\*\*Target\*\*:/g, '<p style="margin: 8px 0;"><strong>Target:</strong>')
            .replace(/\*\*Example email:\*\*/g, '<p style="margin: 12px 0 0 0;"><strong>Example email:</strong></p><p style="background: white; padding: 16px; border-left: 4px solid #4f46e5; margin: 8px 0; font-style: italic; color: #374151;">')
            .replace(/### ⚠️ \*\*Note on Social Proof\*\*:/g, '<div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 32px 0;"><h4 style="color: #92400e; margin: 0 0 8px 0;">⚠️ Note on Social Proof:</h4>')
            .replace(/\*\*Want VeoGrowth to execute these campaigns\?\*\*/g, '</div><h3 style="color: #1f2937; margin: 32px 0 16px 0; font-size: 22px; font-weight: 700; text-align: center;">Want VeoGrowth to execute these campaigns?</h3>')
            .replace(/\[Book a Strategy Call →\]/g, '')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/---/g, '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">')
            .replace(/- ([^\n]+)/g, '<li style="margin: 6px 0;">$1</li>')
            .replace(/(<li.*?<\/li>\n?)(<li)/g, '$1$2')
            .replace(/(<li.*?<\/li>)(?!\s*<li)/g, '<ul style="margin: 12px 0; padding-left: 24px;">$1</ul>')
            .replace(/"Hi \[Name\],([^"]+)"/g, '<span style="background: white; padding: 16px; display: block; border-left: 4px solid #4f46e5; margin: 8px 0; font-style: italic; color: #374151;">"Hi [Name],$1"</span></div>')
          }
        </div>

        <div style="margin-top: 40px; padding: 32px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; border-radius: 12px; text-align: center;">
          <h3 style="margin-bottom: 16px; font-size: 24px; font-weight: 600;">
            Want VeoGrowth to execute these campaigns?
          </h3>
          <p style="margin-bottom: 24px; font-size: 18px; opacity: 0.9;">
            We'll build targeted lists, craft hyper-personalized messages, and book qualified meetings directly in your calendar.
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

    // Send email with results
    await sendEmailReport(email, formattedAnalysis, company);

    // Return success with analysis
    return Response.json({
      success: true,
      data: {
        company,
        positioning,
        analysis: formattedAnalysis
      }
    });

  } catch (error) {
    console.error('API Error:', error);

    return Response.json({ 
      success: false, 
      error: 'Failed to generate analysis. Please try again.' 
    }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ 
    message: 'VeoGrowth Campaign Generator API v2.0 - Now with GPT-4.1 Mini research and Claude Opus 4 generation!' 
  });
}
