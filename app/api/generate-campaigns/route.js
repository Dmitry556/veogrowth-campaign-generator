// /app/api/generate-campaigns/route.js
// Next.js 14 App Router API Route

import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

// Initialize services
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const resend = new Resend(process.env.RESEND_API_KEY);

// The complete metaprompt with all examples and instructions
const METAPROMPT = `You are VeoGrowth's AI strategist analyzing a company's website to generate hyper-specific B2B cold email campaign ideas. You will produce EXACTLY the same format and quality as shown in the examples, with zero deviation.

INPUTS:
- Website URL: {website}
- Positioning Clear?: {positioning}

STEP 1: Fetch and analyze the website using web_fetch tool. Look for:
- What they do (product/service)
- Target customers  
- Value propositions
- Case studies/testimonials
- Pricing model
- Company size indicators

STEP 2: Search for additional information:
- Use web_search for "site:[domain] case studies OR testimonials OR customers"
- Try to find their About page, customer stories, or success metrics
- Note: If you can't find case studies, you MUST mention this in output

STEP 3: Generate output following this EXACT structure:

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
*We didn't find specific customer case studies on your website. When we work together, you'll provide us with your real customer success stories, metrics, and testimonials to make these campaigns authentic and powerful.*

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

// Helper function to save lead to database
async function saveLeadToDatabase(email, website, positioning) {
  // In production, save to your database
  // For now, just log it
  console.log('Saving lead:', { email, website, positioning, timestamp: new Date() });
  
  // Example with Supabase:
  // await supabase.from('leads').insert({ email, website, positioning })
}

// Helper function to send email with results
async function sendEmailReport(email, analysis, company) {
  try {
    await resend.emails.send({
      from: 'VeoGrowth <campaigns@veogrowth.com>',
      to: email,
      subject: `Your B2B Cold Email Campaigns for ${company}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1f2937;">Your Personalized Campaign Analysis</h1>
          <p>Hi there,</p>
          <p>Thanks for using VeoGrowth's AI Campaign Generator! Here's your complete analysis:</p>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${analysis}
          </div>
          
          <h2 style="color: #1f2937;">Ready to Execute These Campaigns?</h2>
          <p>VeoGrowth can implement these campaigns for you:</p>
          <ul>
            <li>Build targeted prospect lists (3,000-5,000 contacts)</li>
            <li>Craft hyper-personalized messages for each prospect</li>
            <li>Book qualified meetings directly in your calendar</li>
            <li>Only pay for meetings that show up</li>
          </ul>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="https://calendly.com/veogrowth/strategy" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Book a Free Strategy Call
            </a>
          </p>
          
          <p style="color: #6b7280; font-size: 14px;">
            Best regards,<br>
            Dmitry Pinchuk<br>
            Founder, VeoGrowth
          </p>
        </div>
      `
    });
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

// Main API handler
export async function POST(req) {
  try {
    const { email, website, positioning } = await req.json();
    
    // Validate inputs
    if (!email || !website || !positioning) {
      return Response.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
    // Save lead to database
    await saveLeadToDatabase(email, website, positioning);
    
    // Prepare the prompt with actual values
    const prompt = METAPROMPT
      .replace('{website}', website)
      .replace('{positioning}', positioning);
    
    // Call Claude API with web access
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 4000,
      temperature: 0.7,
      system: "You have access to web_search and web_fetch tools to analyze websites.",
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
     tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5
        }
      ]
    });
    
// Extract the analysis from Claude's response
let analysis = '';

// Check if Claude used tools
if (message.stop_reason === 'tool_use') {
  // Claude needs to continue after using tools
  const toolResults = message.content.filter(c => c.type === 'tool_use').map(toolUse => ({
    tool_use_id: toolUse.id,
    content: 'Tool executed successfully'
  }));
  
  // Continue the conversation to get final response
  const finalMessage = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 4000,
    temperature: 0.7,
    messages: [
      { role: 'user', content: prompt },
      { role: 'assistant', content: message.content },
      { role: 'user', content: toolResults }
    ]
  });
  
  analysis = finalMessage.content[0].text;
} else {
  analysis = message.content[0].text;
}
    
    // Extract company name from URL
    const company = website
      .replace(/https?:\/\//, '')
      .replace('www.', '')
      .split('/')[0];
    
    // Send email with results
    await sendEmailReport(email, analysis, company);
    
    // Return success with analysis
    return Response.json({
      success: true,
      data: {
        company,
        positioning,
        analysis
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

// Optional: GET endpoint for testing
export async function GET() {
  return Response.json({ 
    message: 'VeoGrowth Campaign Generator API is running' 
  });
}
