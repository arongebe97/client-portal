import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminPage() {
    let clients = [];
    let error = null;

    try {
        clients = await prisma.client.findMany({
            where: { role: "CLIENT" },
            orderBy: { created_at: "desc" },
            include: {
                campaigns: true
            }
        });
    } catch (e: any) {
        error = e.message;
        console.error("Database error:", e);
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Clients</h1>
                    <p className="text-zinc-400">Manage access and assigned campaigns</p>
                </div>
                <Link
                    href="/admin/clients/new"
                    className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 transition-colors"
                >
                    Add Client
                </Link>
            </div>

            {error && (
                <div className="rounded-xl border border-red-800 bg-red-900/20 p-6 text-red-400">
                    <strong>Database Error:</strong> {error}
                    <p className="mt-2 text-sm text-red-300">Please check that DATABASE_URL is set correctly in Vercel environment variables.</p>
                </div>
            )}

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800 text-zinc-400">
                                <th className="px-6 py-4 font-medium">Email</th>
                                <th className="px-6 py-4 font-medium">Assigned Campaigns</th>
                                <th className="px-6 py-4 font-medium">Created</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {clients.map((client) => (
                                <tr key={client.id} className="group hover:bg-zinc-900/80 transition-colors">
                                    <td className="px-6 py-4 font-medium text-zinc-200">
                                        {client.email}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-400">
                                        {client.campaigns.length > 0 ? (
                                            <span className="inline-flex items-center rounded-md bg-blue-400/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-400/20">
                                                {client.campaigns.length} Campaigns
                                            </span>
                                        ) : (
                                            <span className="text-zinc-600">None</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-500">
                                        {new Date(client.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/admin/clients/${client.id}`}
                                            className="text-indigo-400 hover:text-indigo-300"
                                        >
                                            Manage
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {clients.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                                        No clients found. Create one to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
