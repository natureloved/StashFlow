import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const address = searchParams.get('address')
    const chains = searchParams.get('chains')

    if (!address || !chains) {
      return NextResponse.json(
        { error: 'Missing address or chains parameter' },
        { status: 400 }
      )
    }

    const chainList = chains.split(',').filter(Boolean)

    // Fetch native + token balances per chain in parallel
    const results = await Promise.allSettled(
      chainList.map(async (chainId) => {
        const res = await fetch(
          `https://li.fi/v1/balances/${address}?chains=${chainId}`,
          {
            headers: {
              'x-lifi-api-key': process.env.LIFI_API_KEY || '',
            },
          }
        )
        if (!res.ok) return { chainId, balances: [] }
        const data = await res.json()
        // The API returns an object with chainId as key
        return { chainId, balances: data[chainId] || [] }
      })
    )

    const balances: Record<string, any[]> = {}
    results.forEach((result, i) => {
      const chainId = chainList[i]
      if (result.status === 'fulfilled') {
        balances[chainId] = result.value.balances || []
      } else {
        balances[chainId] = []
      }
    })

    return NextResponse.json({ balances })
  } catch (error) {
    console.error('Balances route error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch balances' },
      { status: 500 }
    )
  }
}
