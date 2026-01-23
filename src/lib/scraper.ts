import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export type AIProvider = 'anthropic' | 'openai';

export interface ScrapeResult {
  success: boolean;
  data?: string;
  error?: string;
  url: string;
  prompt: string;
  provider?: AIProvider;
}

export interface ScrapedContent {
  title: string;
  text: string;
  links: { text: string; href: string }[];
  metadata: Record<string, string>;
}

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
}

/**
 * Fetches and parses a webpage, extracting clean text content
 */
export async function fetchAndParse(url: string): Promise<ScrapedContent> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove unwanted elements
  $('script, style, noscript, iframe, svg, nav, footer, header, aside').remove();
  $('[style*="display:none"], [style*="display: none"], .hidden, [hidden]').remove();

  // Extract title
  const title = $('title').text().trim() || $('h1').first().text().trim() || '';

  // Extract metadata
  const metadata: Record<string, string> = {};
  $('meta').each((_, el) => {
    const name = $(el).attr('name') || $(el).attr('property');
    const content = $(el).attr('content');
    if (name && content) {
      metadata[name] = content;
    }
  });

  // Extract links
  const links: { text: string; href: string }[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && text && !href.startsWith('#') && !href.startsWith('javascript:')) {
      links.push({ text, href });
    }
  });

  // Extract main text content
  const text = $('body')
    .text()
    .replace(/\s+/g, ' ')
    .trim();

  return { title, text, links, metadata };
}

const SYSTEM_PROMPT = `You are an AI assistant that extracts specific information from webpage content.
You will be given the text content of a webpage and a user's request for what information to extract.
Analyze the content carefully and extract exactly what the user asks for.
If the information is not found, say so clearly.
Be concise and direct in your response.
Format your response in a clean, readable way. Use JSON format when extracting structured data.`;

function buildUserMessage(content: ScrapedContent, prompt: string): string {
  return `
## Webpage Title
${content.title}

## Webpage Metadata
${Object.entries(content.metadata).map(([k, v]) => `${k}: ${v}`).join('\n')}

## Webpage Content
${content.text.slice(0, 50000)}

## Links Found
${content.links.slice(0, 50).map(l => `- ${l.text}: ${l.href}`).join('\n')}

---

## User Request
${prompt}

Please extract the requested information from the webpage content above.`;
}

/**
 * Uses Claude AI to extract information from webpage content based on a prompt
 */
async function extractWithAnthropic(
  content: ScrapedContent,
  prompt: string,
  apiKey: string
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: buildUserMessage(content, prompt),
      },
    ],
    system: SYSTEM_PROMPT,
  });

  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock ? textBlock.text : 'No response generated';
}

/**
 * Uses OpenAI GPT-4o mini to extract information from webpage content based on a prompt
 */
async function extractWithOpenAI(
  content: ScrapedContent,
  prompt: string,
  apiKey: string
): Promise<string> {
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 4096,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: buildUserMessage(content, prompt),
      },
    ],
  });

  return response.choices[0]?.message?.content || 'No response generated';
}

/**
 * Uses AI to extract information from webpage content based on a prompt
 */
export async function extractWithAI(
  content: ScrapedContent,
  prompt: string,
  config: AIConfig
): Promise<string> {
  if (config.provider === 'openai') {
    return extractWithOpenAI(content, prompt, config.apiKey);
  }
  return extractWithAnthropic(content, prompt, config.apiKey);
}

/**
 * Main scraper function - fetches URL and extracts data using AI
 */
export async function scrapeWithAI(
  url: string,
  prompt: string,
  config: AIConfig
): Promise<ScrapeResult> {
  try {
    // Validate URL
    new URL(url);

    // Fetch and parse the webpage
    const content = await fetchAndParse(url);

    // Extract information using AI
    const data = await extractWithAI(content, prompt, config);

    return {
      success: true,
      data,
      url,
      prompt,
      provider: config.provider,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      url,
      prompt,
      provider: config.provider,
    };
  }
}
