export const maxDuration = 60;

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// The COMPLETE metaprompt
const METAPROMPT = `You are VeoGrowth's AI strategist analyzing a company's website to generate hyper-specific B2B cold email campaign ideas.

Based on the website content provided, generate output following this EXACT structure:

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
"Hi [Name], [specific observable fact]. [Vivid pain point observation]. [Company] helped [Customer] [achieve result]. Worth exploring?"

### **Campaign 2: "[Different Catchy Name]"**
**Target**: [Different role] at [different segment]

**Example email:**
"Hi [Name], [different fact]. [Different pain point]. [Solution]. [Result]. Interested?"

### **Campaign 3: "[Another Catchy Name]"**
**Target**: [Third role] at [third segment]

**Example email:**
"Hi [Name], [third fact]. [Pain point]. [Solution]. [CTA?]"

---

### ⚠️ **Note on Social Proof**: 
*We didn't find specific customer case studies on your website. When we work together, you'll provide us with your real customer success stories.*

**Want VeoGrowth to execute these campaigns?**
We'll build targeted lists and book qualified meetings directly in your calendar.

[Book a Strategy Call →]

*Note: These campaigns would target approximately 3,000-5,000 qualified prospects.*

RULES:
- Campaign names must be creative and memorable
- Emails under 70 words
- Use vivid pain language
- Be specific and insightful`;

export async function POST(req) {
  try {
    const { email, website, positioning } = await req.json();
    
    if (!email || !website || !positioning) {
      return Response.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
    // Fetch website content
    let websiteContent = '';
    try {
      const response = await fetch(website, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const html = await response.text();
        websiteContent = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 10000);
      }
    } catch (e) {
      websiteContent = 'Could not fetch website content.';
    }
    
    // Create prompt
    const prompt = `${METAPROMPT}

Website: ${website}
Website Content: ${websiteContent.substring(0, 8000)}
User says positioning is: ${positioning === 'yes' ? 'clear' : 'unclear'}`;
    
    // Call Claude
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
    
    // Format response
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
