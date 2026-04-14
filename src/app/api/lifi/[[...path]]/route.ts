import { NextRequest, NextResponse } from 'next/server';

const LIFI_EARN_API_URL = 'https://earn.li.fi/v1';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ path?: string[] }> }
) {
  const params = await props.params;
  const path = params.path || [];
  const searchParams = new URL(request.url).searchParams;
  
  // Construct the target sub-path
  // Earn API calls come in as /earn/vaults, /earn/portfolio/... etc.
  // → strip 'earn' prefix and forward to earn.li.fi/v1
  // All other calls go to li.quest/v1
  let targetBaseUrl: string;
  let subPath: string;

  if (path[0] === 'earn') {
    targetBaseUrl = 'https://earn.li.fi/v1';
    subPath = path.slice(1).join('/'); // Strip 'earn' prefix
  } else {
    targetBaseUrl = 'https://li.quest/v1';
    subPath = path.join('/');
  }

  searchParams.set('integrator', 'stashflow');
  const queryString = searchParams.toString();
  const url = `${targetBaseUrl}/${subPath}${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(url, {
      headers: {
        'x-lifi-api-key': process.env.LIFI_API_KEY || '',
        'accept': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        ...data,
        targetUrl: url,
        proxyStatus: response.status
      }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('LI.FI Proxy Error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error', error: error.message, targetUrl: url },
      { status: 500 }
    );
  }
}
