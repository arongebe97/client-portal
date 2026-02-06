const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

async function main() {
  const prisma = new PrismaClient();

  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.client.upsert({
    where: { email: "admin@instantly-crm.com" },
    update: {},
    create: {
      email: "admin@instantly-crm.com",
      password_hash: passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Admin user created:");
  console.log(`  Email:    ${admin.email}`);
  console.log(`  Password: admin123`);
  console.log(`  Role:     ${admin.role}`);

  await prisma.$disconnect();
}

main().catch(console.error);
