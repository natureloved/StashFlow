import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ path?: string[] }> }
) {
  const params = await props.params;
  const path = params.path || [];
  const searchParams = new URL(request.url).searchParams;
  const subPath = path.join('/');
  
  // Determination of best upstream LI.FI domain
  let targetBaseUrl = 'https://li.quest/v1';
  let mappedPath = subPath;

  if (subPath.startsWith('earn/')) {
    const earnResource = subPath.replace(/^earn\//, '');
    
    // Check if it's a portfolio request (with or without sub-segments like address)
    if (earnResource === 'vaults' || earnResource.startsWith('vaults/') || earnResource === 'portfolio' || earnResource.startsWith('portfolio/')) {
      targetBaseUrl = 'https://earn.li.fi/v1';
      mappedPath = earnResource;
    } else {
      // Quotes and execution logic should use the li.quest unified composer
      targetBaseUrl = 'https://li.quest/v1';
      mappedPath = subPath; // Keep the 'earn/' prefix as li.quest understands it
    }
  }

  const targetUrl = new URL(`${targetBaseUrl}/${mappedPath}`);
  searchParams.forEach((v, k) => targetUrl.searchParams.set(k, v));
  
  // Set default integrator if not already present
  if (!searchParams.has('integrator')) {
    targetUrl.searchParams.set('integrator', 'stashflow');
  }

  const apiKey = process.env.LIFI_API_KEY || process.env.VITE_LIFI_API_KEY || '';

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'accept': 'application/json',
        'x-lifi-api-key': apiKey,
      },
      // Short cache for production performance
      next: { revalidate: 30 } 
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429) {
        console.error('LI.FI Rate Limit Hit - Missing or Invalid API Key');
      }
      return NextResponse.json({
        ...data,
        targetUrl: targetUrl.toString(),
        proxyStatus: response.status,
        apiKeyPresent: !!apiKey
      }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('LI.FI Proxy Error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error', error: error.message, targetUrl: targetUrl.toString() },
      { status: 500 }
    );
  }
}
