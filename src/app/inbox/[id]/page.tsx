import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import CrmLayout from "@/components/CrmLayout";
import { getInstantlyEmail } from "@/lib/instantly";
import ReplyForm from "@/components/ReplyForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EmailDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const email = await getInstantlyEmail(id);

  if (!email) notFound();

  const emailDate = new Date(email.timestamp_email);

  return (
    <CrmLayout userEmail={session.user.email || ""} isAdmin={isAdmin}>
      <div className="p-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link href="/inbox" className="text-sm text-zinc-400 hover:text-white transition-colors">
            &larr; Back to Inbox
          </Link>
        </div>

        {/* Email Header */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="border-b border-zinc-800 p-6">
            <h1 className="text-xl font-bold mb-4">{email.subject || "(no subject)"}</h1>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-zinc-500 w-16 shrink-0">From</span>
                <span className="text-zinc-200 font-medium">{email.from_address_email}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-zinc-500 w-16 shrink-0">To</span>
                <span className="text-zinc-300">
                  {email.to_address_email_list?.join(", ") || email.eaccount}
                </span>
              </div>
              {email.cc_address_email_list && email.cc_address_email_list.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-zinc-500 w-16 shrink-0">CC</span>
                  <span className="text-zinc-300">{email.cc_address_email_list.join(", ")}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="text-zinc-500 w-16 shrink-0">Date</span>
                <span className="text-zinc-400">
                  {emailDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {emailDate.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {/* Badges */}
            <div className="flex gap-2 mt-4">
              {email.is_unread === 1 && (
                <span className="rounded-md px-2 py-0.5 text-xs font-medium bg-orange-400/10 text-orange-400 ring-1 ring-inset ring-orange-400/20">
                  Unread
                </span>
              )}
              {email.is_auto_reply === 1 && (
                <span className="rounded-md px-2 py-0.5 text-xs font-medium bg-yellow-400/10 text-yellow-400 ring-1 ring-inset ring-yellow-400/20">
                  Auto-reply
                </span>
              )}
              {email.campaign_id && (
                <Link
                  href={`/campaigns/${email.campaign_id}`}
                  className="rounded-md px-2 py-0.5 text-xs font-medium bg-blue-400/10 text-blue-400 ring-1 ring-inset ring-blue-400/20 hover:bg-blue-400/20 transition-colors"
                >
                  Campaign
                </Link>
              )}
            </div>
          </div>

          {/* Email Body */}
          <div className="p-6">
            {email.body?.html ? (
              <div
                className="prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: email.body.html }}
              />
            ) : (
              <div className="whitespace-pre-wrap text-sm text-zinc-300 leading-relaxed">
                {email.body?.text || "(empty message)"}
              </div>
            )}
          </div>
        </div>

        {/* Reply Section */}
        <div className="mt-6">
          <ReplyForm
            emailId={email.id}
            eaccount={email.eaccount}
            subject={email.subject}
            fromEmail={email.from_address_email}
          />
        </div>
      </div>
    </CrmLayout>
  );
}
