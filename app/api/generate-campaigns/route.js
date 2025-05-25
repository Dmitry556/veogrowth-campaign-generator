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
    
  // Step 5: Analysis with web search
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
            1. Positioning Assessment
            2. ICP definition
            3. Key Personas
            4. 3 specific campaign ideas with example emails
            
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
      console.log('Tool use:', message.stop_reason);
      
      // Get the final text from Claude's response
      let analysis = '';
      for (const content of message.content) {
        if (content.type === 'text') {
          analysis += content.text;
        }
      }
      
      console.log('Analysis length:', analysis.length);
