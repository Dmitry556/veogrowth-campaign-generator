import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Main API handler
export async function POST(req) {
  try {
    const { email, website, positioning } = await req.json();
    
    // For testing, let's first make sure Anthropic is working
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Test: Analyze ${website} for B2B positioning. Is it clear? ${positioning}`
        }
      ]
    });
    
    return Response.json({
      success: true,
      data: {
        company: website,
        positioning: positioning,
        analysis: `<div>
          <h2>AI Analysis Test</h2>
          <p><strong>Response from Claude:</strong></p>
          <p>${message.content[0].text}</p>
        </div>`
      }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ 
      success: false, 
      error: 'Failed to analyze. Please check your API key.' 
    }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ 
    message: 'VeoGrowth API is running with Claude!' 
  });
}
