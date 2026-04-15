import { NextRequest, NextResponse } from 'next/server';

const LIFI_EARN_API_URL = 'https://earn.li.fi/v1';
const LIFI_COMPOSER_BASE_URL = 'https://li.quest/v1';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ path?: string[] }> }
) {
  const params = await props.params;
  const path = params.path || [];
  const searchParams = new URL(request.url).searchParams;
  const subPath = path.join('/');
  const isEarnPath = subPath.startsWith('earn');

  if (!isEarnPath) {
    // Use 'lifi' integrator for non-earn paths such as balances / quote routing.
    searchParams.set('integrator', 'lifi');
  }

  const targetBaseUrl = isEarnPath ? LIFI_EARN_API_URL : LIFI_COMPOSER_BASE_URL;
  const queryString = searchParams.toString();
  const url = `${targetBaseUrl}/${subPath}${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(url, {
      headers: {
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
