"use client";

import { createClient } from "./actions";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewClientPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError("");

        const result = await createClient(formData);

        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else {
            router.push("/admin");
            router.refresh();
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <Link href="/admin" className="text-sm text-zinc-400 hover:text-white transition-colors">
                    ← Back to Clients
                </Link>
                <h1 className="mt-2 text-2xl font-bold">Add New Client</h1>
                <p className="text-zinc-400">Create a new portal account for an agency client.</p>
            </div>

            <form action={handleSubmit} className="space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
                {error && (
                    <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5" htmlFor="email">
                        Email Address
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="block w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5" htmlFor="password">
                        Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="block w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full justify-center rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                >
                    {loading ? "Creating..." : "Create Client"}
                </button>
            </form>
        </div>
    );
}
