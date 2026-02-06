"use client";

import { useState } from "react";

interface ReplyFormProps {
  emailId: string;
  eaccount: string;
  subject: string;
  fromEmail: string;
}

export default function ReplyForm({ emailId, eaccount, subject, fromEmail }: ReplyFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!replyText.trim()) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/instantly/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply_to_uuid: emailId,
          eaccount,
          subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
          body: { text: replyText },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send reply");
      }

      setSent(true);
      setReplyText("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-xl border border-green-800 bg-green-900/20 p-6 text-center">
        <svg className="mx-auto h-8 w-8 text-green-400 mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <p className="text-green-400 font-medium">Reply sent successfully</p>
        <button
          onClick={() => { setSent(false); setIsOpen(false); }}
          className="mt-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Send another reply
        </button>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-left hover:bg-zinc-900 hover:border-zinc-700 transition-all group"
      >
        <div className="flex items-center gap-3 text-zinc-400 group-hover:text-zinc-200 transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
          </svg>
          <span className="text-sm font-medium">Reply to {fromEmail}</span>
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
          </svg>
          <span className="text-zinc-400">Replying to</span>
          <span className="text-zinc-200 font-medium">{fromEmail}</span>
        </div>
        <span className="text-xs text-zinc-500">from: {eaccount}</span>
      </div>

      <div className="p-4">
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Write your reply..."
          rows={6}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 resize-none"
          autoFocus
        />

        {error && (
          <div className="mt-2 rounded-lg bg-red-900/20 border border-red-800 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => { setIsOpen(false); setReplyText(""); setError(null); }}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !replyText.trim()}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {sending ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
                Send Reply
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
