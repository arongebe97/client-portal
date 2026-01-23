'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import SignOutButton from '@/components/SignOutButton';

interface ScrapeResponse {
  success: boolean;
  data?: string;
  error?: string;
  url?: string;
}

export default function ScraperPage() {
  const { data: session, status } = useSession();
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResponse | null>(null);
  const [history, setHistory] = useState<Array<{ url: string; prompt: string; result: string }>>([]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!session) {
    redirect('/login');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !prompt) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, prompt }),
      });

      const data: ScrapeResponse = await response.json();
      setResult(data);

      if (data.success && data.data) {
        setHistory(prev => [
          { url, prompt, result: data.data! },
          ...prev.slice(0, 9),
        ]);
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to connect to the server',
      });
    } finally {
      setLoading(false);
    }
  };

  const examplePrompts = [
    { label: 'Company Info', prompt: 'Extract the company name, description, and what they do' },
    { label: 'Contact Details', prompt: 'Find all contact information: emails, phone numbers, and addresses' },
    { label: 'Team Members', prompt: 'List all team members with their names, titles, and LinkedIn profiles if available' },
    { label: 'Pricing', prompt: 'Extract all pricing information, plans, and features' },
    { label: 'Products', prompt: 'List all products or services offered with their descriptions' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-orange-500"></div>
            <span className="font-bold">Client Portal</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-zinc-400 hover:text-white">
              Dashboard
            </Link>
            <Link href="/campaigns" className="text-sm font-medium text-zinc-400 hover:text-white">
              Campaigns
            </Link>
            {session.user.role === 'ADMIN' && (
              <Link href="/admin" className="text-sm font-medium text-blue-400 hover:text-blue-300">
                Admin Area
              </Link>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">AI Web Scraper</h1>
          <p className="text-zinc-400 mt-2">
            Enter a URL and describe what data you want to extract. The AI will analyze the page and return the information.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-zinc-300 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-zinc-300 mb-2">
                  What do you want to extract?
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Find the CEO's name and email address, or extract all product prices..."
                  required
                  rows={4}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                />
              </div>

              {/* Quick Prompts */}
              <div>
                <p className="text-sm text-zinc-400 mb-3">Quick prompts:</p>
                <div className="flex flex-wrap gap-2">
                  {examplePrompts.map((ep) => (
                    <button
                      key={ep.label}
                      type="button"
                      onClick={() => setPrompt(ep.prompt)}
                      className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                    >
                      {ep.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !url || !prompt}
                className="w-full rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing page...
                  </span>
                ) : (
                  'Extract Data'
                )}
              </button>
            </form>

            {/* Result */}
            {result && (
              <div className="mt-8">
                <h2 className="text-xl font-bold mb-4">Result</h2>
                <div className={`rounded-xl border p-6 ${
                  result.success
                    ? 'border-zinc-700 bg-zinc-800/50'
                    : 'border-red-800 bg-red-900/20'
                }`}>
                  {result.success ? (
                    <pre className="whitespace-pre-wrap text-zinc-300 font-mono text-sm overflow-x-auto">
                      {result.data}
                    </pre>
                  ) : (
                    <p className="text-red-400">{result.error}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - History */}
          <div>
            <h2 className="text-xl font-bold mb-4">Recent Extractions</h2>
            {history.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center text-zinc-500">
                No extractions yet
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 cursor-pointer hover:border-zinc-600 transition-colors"
                    onClick={() => {
                      setUrl(item.url);
                      setPrompt(item.prompt);
                      setResult({ success: true, data: item.result });
                    }}
                  >
                    <p className="text-sm text-zinc-400 truncate">{item.url}</p>
                    <p className="text-sm text-white mt-1 line-clamp-2">{item.prompt}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
