export async function POST(req) {
  try {
    const { email, website, positioning } = await req.json();
    
    // For now, return mock data to test
    return Response.json({
      success: true,
      data: {
        company: website,
        positioning: positioning,
        analysis: `<h2>Analysis for ${website}</h2><p>This is a test response. API integration coming next!</p>`
      }
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: 'Something went wrong' 
    }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ 
    message: 'VeoGrowth API is running!' 
  });
}
