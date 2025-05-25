import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req) {
  console.log('=== API CALLED ===');
  
  try {
    const body = await req.json();
    console.log('Request body:', body);
    const { email, website, positioning } = body;
    
    if (!email || !website || !positioning) {
      console.error('Missing fields');
      return Response.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
    console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY);
    console.log('API Key first 10 chars:', process.env.ANTHROPIC_API_KEY?.substring(0, 10));
    
    // Test basic Claude first
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
      console.log('Basic Claude test SUCCESS');
    } catch (testError) {
      console.error('Basic Claude test FAILED:', testError);
      return Response.json({ 
        success: false, 
        error: `Claude API test failed: ${testError.message}` 
      }, { status: 500 });
    }
    
    // Now try with web search
    console.log('Generating analysis with web search...');
    
    try {
      const message = await anthropic.messages.create({
        model: 'claude-opus-4-20250514',
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: `Use web search to analyze ${website} and create a detailed B2B cold email campaign analysis. 
            
            First, search for and analyze their website. Then search for "${website.replace(/https?:\/\//, '').replace('www.', '')} case studies" or testimonials.
            
            Create a comprehensive analysis with:
            1. Positioning Assessment (Clear/Unclear/Moderately Clear)
            2. ICP definition (industry, company size, characteristics)
            3. Key Personas to target
            4. 3 specific campaign ideas with example emails under 70 words each
            
            Format the response in clean HTML with proper headings.
            
            The user indicated their positioning is: ${positioning === 'yes' ? 'clear' : positioning === 'no' ? 'unclear' : 'unsure'}`
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
      
      console.log('Claude response received');
      console.log('Stop reason:', message.stop_reason);
      console.log('Content blocks:', message.content.length);
      
      // Extract text from response
      let analysis = '';
      for (const content of message.content) {
        if (content.type === 'text') {
          analysis += content.text;
        }
      }
      
      console.log('Analysis length:', analysis.length);
      
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
          analysis: `<div class="prose max-w-none">${analysis}</div>`
        }
      });
      
    } catch (claudeError) {
      console.error('Claude web search FAILED:', claudeError);
      console.error('Error details:', claudeError.message);
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
    message: 'VeoGrowth API is running with web search!' 
  });
}
