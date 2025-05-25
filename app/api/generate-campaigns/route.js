import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Simple metaprompt for testing
const METAPROMPT = `You are VeoGrowth's AI strategist. Analyze the website and provide campaign ideas.`;

export async function POST(req) {
  console.log('=== API CALLED ===');
  
  try {
    // Step 1: Parse request
    const body = await req.json();
    console.log('Request body:', body);
    const { email, website, positioning } = body;
    
    // Step 2: Validate
    if (!email || !website || !positioning) {
      console.error('Missing fields:', { email: !!email, website: !!website, positioning: !!positioning });
      return Response.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
    // Step 3: Check API key
    console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY);
    console.log('API Key first 10 chars:', process.env.ANTHROPIC_API_KEY?.substring(0, 10));
    
    // Step 4: Test basic Claude call first
    console.log('Testing basic Claude call...');
    try {
      const testMessage = await anthropic.messages.create({
        model: 'claude-opus-4-20250514',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Say hello'
          }
        ]
      });
      console.log('Basic Claude test SUCCESS:', testMessage.content[0].text);
    } catch (testError) {
      console.error('Basic Claude test FAILED:', testError);
      return Response.json({ 
        success: false, 
        error: `Claude API test failed: ${testError.message}` 
      }, { status: 500 });
    }
    
    // Step 5: Simple analysis for now
    console.log('Generating simple analysis...');
    
    try {
      const message = await anthropic.messages.create({
        model: 'claude-opus-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Analyze ${website} and suggest B2B cold email campaigns. They say their positioning is: ${positioning}`
          }
        ]
      });
      
      console.log('Claude response received');
      const analysis = message.content[0].text;
      
      // Extract company name
      const company = website
        .replace(/https?:\/\//, '')
        .replace('www.', '')
        .split('/')[0];
      
      console.log('SUCCESS - returning analysis');
      
      return Response.json({
        success: true,
        data: {
          company,
          positioning,
          analysis: `<div class="prose max-w-none">
            <h2>Analysis for ${company}</h2>
            ${analysis}
          </div>`
        }
      });
      
    } catch (claudeError) {
      console.error('Claude call FAILED:', claudeError);
      return Response.json({ 
        success: false, 
        error: `Claude error: ${claudeError.message}` 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return Response.json({ 
      success: false, 
      error: `Unexpected error: ${error.message}` 
    }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ 
    message: 'VeoGrowth API is running!' 
  });
}
