"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function createClient(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Email and password are required" };
    }

    try {
        const existingUser = await prisma.client.findUnique({
            where: { email },
        });

        if (existingUser) {
            return { error: "User with this email already exists" };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.client.create({
            data: {
                email,
                password_hash: hashedPassword,
                role: "CLIENT",
            },
        });

        revalidatePath("/admin");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { error: "Failed to create client" };
    }
}
