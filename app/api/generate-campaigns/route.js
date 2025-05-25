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
"Hi [Name], [specific observable fact about prospect company without "noticed" or "saw"]. [Vivid pain point observation or rhetorical question that paints a picture]. [Company] helped [Customer Name] [specific achievement]. [Another metric or outcome if available]. [Conversational CTA ending in ?]"

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
1. NEVER use personal names of customers (say "Microsoft" not "Romani Patel")
2. Campaign names must be creative and memorable (like "The False Positive Eliminator")
3. Email examples must be under 70 words
4. Use vivid, specific pain language ("Sunday nights look like Excel hell")
5. Always use periods between sentences, never dashes
6. Never use "noticed" or "saw" to start observations
7. Make observable facts specific and findable (employee count, locations, tech visible in job posts)
8. If case studies aren't found, ALWAYS add the note about providing real examples
9. Target segments must be large enough (1,000+ prospects) never just "F500 CEOs"
10. Each email must show deep understanding of that persona's world

TONE REQUIREMENTS:
- Confident but not arrogant
- Specific but not overwhelming
- Insightful but not lecturing  
- Professional but slightly casual
- Avoid corporate jargon
- Use contractions naturally
- Make it feel like insider knowledge

EXAMPLE OUTPUT 1 - Clear Positioning (IXON):

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
"Hi Sarah, supplying assembly systems to automotive plants means facilities demand NIS2 and ISO compliance for any remote access. Most VPN solutions create security nightmares. IXON provides bank-grade security that IT departments actually approve. Vapormatt implemented without a single security audit finding. Interested?"

### **Campaign 3: "First-Time Fix Rate Booster"**
**Target**: Field Service Managers with global installations

**Example email:**
"Hi Tom, managing service for CNC machines across 30 countries means constant firefighting. When technicians arrive on-site without knowing the real issue, first-time fix rates plummet. IXON's Machine Insights showed HoSt exactly what's wrong before dispatch. They say troubleshooting speed increased 10x. Want to see how?"

---

**Want VeoGrowth to execute these campaigns?**  
We'll build targeted lists, craft hyper-personalized messages, and book qualified meetings directly in your calendar.

[Book a Strategy Call →]

*Note: These campaigns would target approximately 3,000-5,000 qualified prospects across North America and Europe, with expected response rates of 8-12% based on IXON's clear value proposition and strong market fit.*

EXAMPLE OUTPUT 2 - Unclear Positioning (Tourmo):

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
"Hi Jessica, with 300 trucks running Samsara cameras, team probably reviews 50+ false hard-braking alerts daily. That's 10 hours weekly watching videos of coffee cups sliding. Tourmo's AI filters out false positives without replacing cameras. We'd insert your actual customer success here. Want to stop the alert fatigue?"

### **Campaign 2: "Hidden Fuel Theft Detector"**
**Target**: CFOs at trucking companies with 500+ vehicles

**Example email:**
"Hi Robert, managing fuel for 500 trucks across multiple card providers means ghost transactions hide easily. Most fleets lose 2-3% to fuel fraud they never catch. Tourmo identifies suspicious transactions without changing fuel cards. We'd insert your real metrics here. Interested in a fraud audit of your fuel data?"

### **Campaign 3: "Fleet Tech ROI Rescue"**
**Target**: VP Operations at companies with 3+ disconnected fleet systems

**Example email:**
"Hi David, running Geotab for tracking, Lytx for cameras, and WEX for fuel probably involves spreadsheet gymnastics. Meanwhile, the board questions why fleet tech costs $500K annually. Tourmo unifies existing systems and finally proves ROI. No hardware changes needed. Worth a conversation?"

---

### ⚠️ **Important Note**: 
*We didn't find specific customer case studies on your website, so the examples above use hypothetical scenarios. When we work together, you'll provide us with your real customer success stories, metrics, and testimonials to make these campaigns authentic and powerful.*

## **Positioning Recommendation:**
Consider leading with ONE killer use case (like "Stop drowning in false positive alerts") rather than trying to communicate all capabilities upfront. The "no rip and replace" message is gold but needs to be tied to a specific, painful problem.

**Want VeoGrowth to execute these campaigns?**  
We'll build targeted lists of fleet managers already using your competitors' systems and craft messages that resonate with their specific tech stack challenges.

[Book a Strategy Call →]

*Note: These campaigns would target approximately 5,000-8,000 qualified prospects, focusing on fleets already invested in technology but struggling to get value from it.*

EXAMPLE OUTPUT 3 - With Strong Case Studies (VoxPopMe):

Based on VoxPopMe's website analysis:

## **Positioning Assessment: ✅ CLEAR & STRONG**
VoxPopMe has excellent positioning as a centralized qualitative insights platform with AI-powered analysis. Clear metrics (60x faster, 3% cost) backed by enterprise customers like Microsoft, Mars, Clorox, and Alaska Airlines.

---

## **Your ICP appears to be:**
- **Industry**: Consumer brands (CPG, retail, entertainment, airlines, automotive)
- **Company size**: Enterprise (1,000+ employees) with dedicated insights teams
- **Key characteristics**:
  - Running 20+ qual research projects annually
  - Using agencies that charge $30K+ per study
  - Drowning in video/interview analysis (80+ hours per project)
  - Multiple brands/products requiring consumer insights
  - Global operations needing multi-market research
  - Pressure to deliver insights faster with shrinking budgets

## **Key Personas to Target:**

**1. VP/Director of Consumer Insights**
- Pain points: Agency dependency, slow turnaround times, budget pressure, stakeholder demands

**2. Insights Manager/Research Manager**
- Pain points: Manual analysis bottlenecks, video transcription nightmares, creating compelling presentations

**3. Brand Insights Lead**
- Pain points: Socializing insights across teams, proving ROI, managing multiple research vendors

---

## **Campaign Ideas for VoxPopMe:**

### **Campaign 1: "The Agency Fee Eliminator"**
**Target**: VP Insights at CPG companies using multiple research agencies

**Example email:**
"Hi Lauren, managing insights for 15 product lines probably means juggling 5+ research agencies charging $30K per study. Mars runs 1,500 projects in-house with VoxPopMe. They cut analysis time from hours to 30 minutes. Clorox uses us across Glad, Burt's Bees, and Kingsford. Want to see how?"

### **Campaign 2: "The 80-Hour Analysis Crusher"**
**Target**: Research Managers drowning in qual data analysis

**Example email:**
"Hi Marcus, launching 20+ innovations yearly means each qual study probably takes 80 hours watching interviews and coding themes. Mars achieved 97% efficiency gains with our AI. What took their team days now takes 30 minutes. Microsoft calls it 'astonishing speed.' Worth exploring?"

### **Campaign 3: "Research Democratization Engine"**
**Target**: Insights Directors at companies with distributed brand teams

**Example email:**
"Hi Sarah, with 8 brand teams across 3 continents, getting everyone aligned on consumer insights must feel like herding cats. Alaska Airlines uses VoxPopMe to create empathy across stakeholders. Video stories finally get executives to 'pay attention to customer data.' Interested in making insights impossible to ignore?"

---

**Want VeoGrowth to execute these campaigns?**  
We'll identify enterprise insights teams struggling with traditional qual methods and show them how Mars, Microsoft, and Clorox transformed their research.

[Book a Strategy Call →]

*Note: These campaigns would target approximately 3,000-4,000 qualified prospects at Fortune 1000 companies with established insights functions, focusing on those showing signs of agency fatigue or analysis bottlenecks.*

Remember: The quality bar is EXTREMELY high. Every campaign idea must feel like it required hours of research and deep industry knowledge. The prospect should think "how do they know exactly what I'm dealing with?"`;

export async function POST(req) {
  try {
    const { email, website, positioning } = await req.json();
    
    if (!email || !website || !positioning) {
      return Response.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
    // Log the lead (in production, save to database)
    console.log('New lead:', { email, website, positioning, timestamp: new Date() });
    
    // Fetch website content directly
    let websiteContent = '';
    try {
      const response = await fetch(website, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (response.ok) {
        const html = await response.text();
        // Extract visible text by removing scripts, styles, and HTML tags
        websiteContent = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 15000); // Get more content for better analysis
      }
    } catch (e) {
      console.error('Failed to fetch website:', e);
      websiteContent = 'Could not fetch website content directly. The site may have anti-bot protection.';
    }
    
    // Prepare the prompt with actual values
    const prompt = METAPROMPT
      .replace('{website}', website)
      .replace('{positioning}', positioning === 'yes' ? 'clear' : positioning === 'no' ? 'unclear' : 'unsure')
      .replace('{content}', websiteContent.substring(0, 12000)); // Use more content
    
    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
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
    
    // Format the response with clean HTML
    let cleanAnalysis = analysis
      // Remove all asterisks first
      .replace(/\*\*/g, '')
      // Convert headers
      .replace(/## Positioning Assessment: (.+)/g, '<div class="positioning-section"><h3>Positioning Assessment: $1</h3></div>')
      .replace(/## Your ICP appears to be:/g, '<div class="icp-section"><h3>Your ICP appears to be:</h3>')
      .replace(/## Key Personas to Target:/g, '</div><div class="personas-section"><h3>Key Personas to Target:</h3>')
      .replace(/## Campaign Ideas for .+:/g, '</div><div class="campaigns-section"><h3>Campaign Ideas:</h3>')
      // Convert campaign cards
      .replace(/### Campaign (\d+): "(.+)"/g, function(match, num, name) {
        return `</div><div class="campaign-card"><h4>Campaign ${num}: "${name}"</h4>`;
      })
      // Convert Target and Example email
      .replace(/Target: (.+)/g, '<p class="target"><strong>Target:</strong> $1</p>')
      .replace(/Example email:/g, '<p class="email-label"><strong>Example email:</strong></p>')
      // Convert email content
      .replace(/"([^"]+)"/g, '<div class="email-example">"$1"</div>')
      // Convert lists
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/---/g, '<hr>')
      // Handle social proof note
      .replace(/### ⚠️ Note on Social Proof:/g, '</div><div class="warning-note"><h4>⚠️ Note on Social Proof:</h4>')
      .replace(/Want VeoGrowth to execute these campaigns\?/g, '</div><div class="final-cta"><h3>Want VeoGrowth to execute these campaigns?</h3>');
    
    // Wrap lists in ul tags
    cleanAnalysis = cleanAnalysis.replace(/(<li>.*<\/li>\s*)+/g, function(match) {
      return '<ul>' + match + '</ul>';
    });
    
    // Close any open divs
    cleanAnalysis += '</div>';
    
    const formattedAnalysis = `
      <style>
        .campaign-analysis {
          max-width: 900px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #1f2937;
        }
        .campaign-analysis h2 {
          color: #1f2937;
          margin-bottom: 2rem;
          font-size: 2rem;
          font-weight: 700;
          text-align: center;
        }
        .campaign-analysis h3 {
          color: #4f46e5;
          margin: 2rem 0 1rem 0;
          font-size: 1.5rem;
          font-weight: 600;
        }
        .campaign-analysis h4 {
          color: #1f2937;
          margin: 1.5rem 0 1rem 0;
          font-size: 1.25rem;
          font-weight: 600;
        }
        .content-wrapper {
          background: #ffffff;
          padding: 2.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
        }
        .positioning-section {
          background: #f0f9ff;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          border-left: 4px solid #3b82f6;
        }
        .positioning-section h3 {
          margin-top: 0;
        }
        .icp-section, .personas-section {
          margin: 2rem 0;
        }
        .campaign-card {
          background: #f9fafb;
          padding: 1.5rem;
          border-radius: 8px;
          margin: 1.5rem 0;
          border: 1px solid #e5e7eb;
        }
        .campaign-card h4 {
          margin-top: 0;
          color: #7c3aed;
        }
        .target {
          margin: 1rem 0 0.5rem 0;
          font-size: 0.95rem;
        }
        .email-label {
          margin: 1rem 0 0.5rem 0;
          font-weight: 600;
        }
        .email-example {
          background: #ffffff;
          padding: 1.25rem;
          border-left: 4px solid #4f46e5;
          margin: 0.5rem 0;
          font-style: italic;
          color: #4b5563;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .campaign-analysis ul {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }
        .campaign-analysis li {
          margin: 0.5rem 0;
          color: #4b5563;
        }
        .campaign-analysis hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 2rem 0;
        }
        .warning-note {
          background: #fef3c7;
          border: 1px solid #fbbf24;
          padding: 1.5rem;
          border-radius: 8px;
          margin: 2rem 0;
        }
        .warning-note h4 {
          color: #92400e;
          margin-top: 0;
        }
        .final-cta {
          margin-top: 2rem;
          text-align: center;
        }
        .cta-box {
          margin-top: 3rem;
          padding: 2.5rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border-radius: 12px;
          text-align: center;
        }
        .cta-box h3 {
          color: white;
          margin-bottom: 1rem;
          font-size: 1.75rem;
        }
        .cta-box p {
          margin-bottom: 1.5rem;
          font-size: 1.1rem;
          opacity: 0.95;
        }
        .cta-button {
          display: inline-block;
          background: white;
          color: #4f46e5;
          padding: 1rem 2.5rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 1.1rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        }
      </style>
      
      <div class="campaign-analysis">
        <h2>Campaign Analysis for ${company}</h2>
        
        <div class="content-wrapper">
          ${cleanAnalysis}
        </div>
        
        <div class="cta-box">
          <h3>Want VeoGrowth to execute these campaigns?</h3>
          <p>We'll build targeted lists, craft hyper-personalized messages, and book qualified meetings directly in your calendar.</p>
          <a href="https://calendly.com/veogrowth/strategy" class="cta-button">
            Book a Strategy Call →
          </a>
        </div>
      </div>
    `;
    
    // TODO: Send email with results using Resend
    // await sendEmailReport(email, analysis, company);
    
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
    message: 'VeoGrowth Campaign Generator API is running!' 
  });
}
