import { NextRequest, NextResponse } from 'next/server';

const LIFI_COMPOSER_BASE_URL = 'https://li.quest/v1';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Accept standard Composer params
  const fromChain = searchParams.get('fromChain');
  const toChain = searchParams.get('toChain');
  const fromToken = searchParams.get('fromToken');
  const toToken = searchParams.get('toToken');
  const fromAddress = searchParams.get('fromAddress');
  const toAddress = searchParams.get('toAddress');
  const fromAmount = searchParams.get('fromAmount');

  if (!fromChain || !toChain || !fromToken || !toToken || !fromAddress || !toAddress || !fromAmount) {
    return NextResponse.json(
      { message: 'Missing required query parameters' },
      { status: 400 }
    );
  }

  const queryString = searchParams.toString();
  const url = `${LIFI_COMPOSER_BASE_URL}/quote?${queryString}`;

  try {
    const response = await fetch(url, {
      headers: {
        'x-lifi-api-key': process.env.LIFI_API_KEY || '',
        'accept': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Composer API Error', ...data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('LI.FI Quote Proxy Error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error', error: error.message },
      { status: 500 }
    );
  }
}
