import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  let dataDump: string
  try {
    const body = await req.json()
    dataDump = body.dataDump
    if (!dataDump) throw new Error('missing dataDump')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const prompt = `You are a personal finance optimization AI analyzing a UK taxi driver's monthly cash flow simulation.

${dataDump}

Your job: generate exactly 3 distinct proposals to optimize this person's finances.
Each proposal should use a DIFFERENT strategy (e.g. one focuses on bill spreading, one on income targets, one on savings structure).

For each proposal:
- Give a short punchy title (max 5 words)
- Write exactly 2 sentences describing the strategy and why it helps
- Specify bill day changes as { "bill-id": newDayNumber } — only change bills where moving them makes a meaningful difference to cash flow. Use the exact bill IDs from the data above.
- Specify slider changes as { "normalDayRate": X, "billsPerDay": X, "savingsOnExtra": X, "offDaySplit": X } — only include sliders you're actually changing
- For endPots: estimate the end-of-month bills pot for each month in the simulation (Apr through Dec 2026), as an array of numbers
- redDayCount: how many days would have a negative bills pot under this proposal
- totalSavings: estimated total savings accumulated over the simulation period

Rules:
- Bill days must be 1–28 (keep away from weekends where possible for direct debits)
- The payday is the 8th — bills clustering around 8–10 strain the pot; spreading them helps
- Don't suggest impossible changes (can't move housing bills, can't extend debt end dates)
- Be realistic — don't just max out income sliders

Output ONLY a valid JSON array. No explanation, no markdown, no code fences. Just the raw JSON array:

[
  {
    "id": "prop-1",
    "title": "...",
    "description": "...",
    "sliders": {},
    "billDayOverrides": {},
    "endPots": [0,0,0,0,0,0,0,0,0],
    "redDayCount": 0,
    "totalSavings": 0
  },
  ...
]`

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) {
      return NextResponse.json({ error: 'Claude did not return valid JSON', raw: text }, { status: 500 })
    }

    const proposals = JSON.parse(match[0])
    if (!Array.isArray(proposals)) {
      return NextResponse.json({ error: 'Response was not an array', raw: text }, { status: 500 })
    }

    // Stamp with IDs and timestamps
    const stamped = proposals.map((p: Record<string, unknown>, i: number) => ({
      ...p,
      id: `prop-${Date.now()}-${i}`,
      createdAt: new Date().toISOString(),
    }))

    return NextResponse.json({ proposals: stamped })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
