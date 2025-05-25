export const maxDuration = 60;

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Simplified but effective metaprompt
const METAPROMPT = `You are VeoGrowth's AI strategist analyzing a company's website to generate B2B cold email campaign ideas.

Based on the website content provided, generate:

## **Positioning Assessment: [✅ CLEAR / ⚠️ UNCLEAR]**
[1 sentence explanation]

## **ICP (Ideal Customer Profile):**
- **Industry**: [Specific verticals]
- **Company size**: [Employee range]
- **Key pain points**: [2-3 specific challenges]

## **Campaign Ideas:**

### **Campaign 1: "[Catchy Name]"**
**Target**: [Specific role] at [company type]
**Email**: "Hi [Name], [observable fact]. [Pain point question or observation]. [Company] helped [Customer type] [achieve result]. Worth exploring?"

### **Campaign 2: "[Different Catchy Name]"**
**Target**: [Different role] at [company type]
**Email**: "Hi [Name], [different fact]. [Different pain point]. [Solution connection]. [Result]. Interested?"

Keep emails under 60 words each. Be specific and insightful.`;

export async function POST(req) {
  try {
    const { email, website, positioning } = await req.json();
    
    if (!email || !website || !positioning) {
      return Response.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
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
    const prompt = `${METAPROMPT}

Website: ${website}
Website Content: ${websiteContent.substring(0, 5000)}
User says positioning is: ${positioning === 'yes' ? 'clear' : 'unclear'}

Generate the analysis now:`;
    
    // Call Claude Opus
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 1500,
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
