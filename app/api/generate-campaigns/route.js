export const maxDuration = 60;

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// The COMPLETE metaprompt with all examples and instructions
const METAPROMPT = `You are VeoGrowth's AI strategist analyzing a company's website to generate hyper-specific B2B cold email campaign ideas. You will produce EXACTLY the same format and quality as shown in the examples, with zero deviation.

INPUTS:
- Website URL: {website}
- Positioning Clear?: {positioning}
- Website Content: {content}

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

### **Campaign 1: "[Catchy Campaign Name]"**
**Target**: [Specific role] at [specific company type with observable characteristic]

**Example email:**
"Hi [Name], [specific observable fact about prospect company]. [Vivid pain point observation or rhetorical question that paints a picture]. [Company] helped [Customer Name] [specific achievement]. [Another metric or outcome if available]. [Conversational CTA ending in ?]"

### **Campaign 2: "[Different Catchy Name]"**
**Target**: [Different specific role] at [different segment]

**Example email:**
"Hi [Name], [different observable fact]. [Different vivid pain point with colorful language]. [Company]'s [mechanism/solution] [helps achieve outcome]. [Customer] [achieved result]. [Different conversational CTA?]"

### **Campaign 3: "[Another Catchy Name]"**
**Target**: [Third role] at [third segment]

**Example email:**
"Hi [Name], [third observable fact]. [Third pain point with specific imagery]. [Solution connection]. [Customer result]. [Third CTA?]"

---

[IF NO CASE STUDIES FOUND, ADD THIS:]
### ⚠️ **Note on Social Proof**: 
*We didn't find specific customer case studies on your website, so the examples above use hypothetical scenarios. When we work together, you'll provide us with your real customer success stories, metrics, and testimonials to make these campaigns authentic and powerful.*

**Want VeoGrowth to execute these campaigns?**
We'll [specific action related to their ICP] and [specific outcome related to their value prop].

[Book a Strategy Call →]

*Note: These campaigns would target approximately [X,000-Y,000] qualified prospects [specific description of who and why they're qualified].*

CRITICAL RULES:
1. Campaign names must be creative and memorable (like "The False Positive Eliminator")
2. Email examples must be under 70 words
3. Use vivid, specific pain language ("Sunday nights look like Excel hell")
4. Always use periods between sentences, never dashes
5. Make observable facts specific and findable (employee count, locations, tech visible in job posts)
6. Target segments must be large enough (1,000+ prospects)
7. Each email must show deep understanding of that persona's world

EXAMPLE OUTPUT (follow this quality level):

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
"Hi Mark, manufacturing packaging equipment installed across North America with 15 field technicians means travel costs probably eat 40%+ of service budget. IXON helped Repak cut on-site visits by 70% through secure remote access. Their technicians fix most issues without leaving office. Worth exploring?"

### **Campaign 2: "Compliance Without Complexity"**
**Target**: CTOs at machine builders selling to automotive/pharma

**Example email:**
"Hi Sarah, supplying assembly systems to automotive plants means facilities demand NIS2 and ISO compliance for any remote access. Most VPN solutions create security nightmares. IXON provides bank-grade security that IT departments actually approve. Vapormatt implemented without a single security audit finding. Interested?"`;
### **Campaign 3: "First-Time Fix Rate Booster"**
**Target**: Field Service Managers with global installations

**Example email:**
"Hi Tom, managing service for CNC machines across 30 countries means constant firefighting. When technicians arrive on-site without knowing the real issue, first-time fix rates plummet. IXON's Machine Insights showed HoSt exactly what's wrong before dispatch. They say troubleshooting speed increased 10x. Want to see how?"

---

**Want VeoGrowth to execute these campaigns?**
We'll build targeted lists, craft hyper-personalized messages, and book qualified meetings directly in your calendar.

[Book a Strategy Call →]

*Note: These campaigns would target approximately 3,000-5,000 qualified prospects across North America and Europe, with expected response rates of 8-12% based on IXON's clear value proposition and strong market fit.*`;
    
    // Fetch website content directly (faster than web search)
    let websiteContent = '';
    try {
      const response = await fetch(website, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        const html = await response.text();
        // Extract visible text
        websiteContent = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 10000); // Get more content
      }
    } catch (e) {
      websiteContent = 'Could not fetch website content directly.';
    }
    
    // Create the prompt
    const prompt = METAPROMPT
  .replace('{website}', website)
  .replace('{positioning}', positioning === 'yes' ? 'clear' : 'unclear')
  .replace('{content}', websiteContent.substring(0, 8000));

Generate the analysis now:`;
    
    // Call Claude Opus
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 3000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    const analysis = message.content[0].text;
    const company = website.replace(/https?:\/\//, '').replace('www.', '').split('/')[0];
    
    // Format the response nicely
    const formattedAnalysis = `
      <div style="max-width: 800px; margin: 0 auto;">
        <h2 style="color: #1f2937; margin-bottom: 24px;">
          Campaign Analysis for ${company}
        </h2>
        <div style="background: #f9fafb; padding: 24px; border-radius: 8px;">
          ${analysis.replace(/##/g, '<h3 style="color: #4f46e5; margin: 16px 0;">').replace(/\*\*/g, '')}
        </div>
        <div style="margin-top: 32px; padding: 24px; background: #4f46e5; color: white; border-radius: 8px; text-align: center;">
          <h3 style="margin-bottom: 16px;">Want VeoGrowth to execute these campaigns?</h3>
          <p style="margin-bottom: 16px;">We'll build targeted lists and book qualified meetings directly in your calendar.</p>
          <a href="https://calendly.com/dmitry-veogrowth/30min" style="display: inline-block; background: white; color: #4f46e5; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Book a Strategy Call →
          </a>
        </div>
      </div>
    `;
    
    return Response.json({
      success: true,
      data: {
        company,
        positioning,
        analysis: formattedAnalysis
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ 
      success: false, 
      error: 'Failed to generate analysis. Please try again.' 
    }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ 
    message: 'VeoGrowth Campaign Generator API is running!' 
  });
}
