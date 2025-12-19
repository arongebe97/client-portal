import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import SignOutButton from "@/components/SignOutButton";
import Link from "next/link";

export default async function AdminLayout({
    children,
}: {
    children: ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50">
            <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-blue-600"></div>
                        <span className="font-bold">Admin Portal</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/" className="text-sm font-medium text-orange-400 hover:text-orange-300">
                            View Stats
                        </Link>
                        <span className="text-sm text-zinc-400">{session.user.email}</span>
                        <SignOutButton />
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
