import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { scrapeWithAI, AIProvider } from '@/lib/scraper';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { url, prompt, provider = 'anthropic' } = body;

    // Validate inputs
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Validate provider
    if (provider !== 'anthropic' && provider !== 'openai') {
      return NextResponse.json(
        { error: 'Invalid provider. Use "anthropic" or "openai"' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Get API key based on provider
    const apiKey = provider === 'openai'
      ? process.env.OPENAI_API_KEY
      : process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: `${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key not configured` },
        { status: 500 }
      );
    }

    // Perform the scrape
    const result = await scrapeWithAI(url, prompt, {
      provider: provider as AIProvider,
      apiKey,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        url: result.url,
        provider: result.provider,
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Scrape API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
