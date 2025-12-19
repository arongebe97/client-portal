const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const user = await prisma.client.findUnique({
        where: { email: 'aron@tomorrowlab.digital' }
    });
    console.log('USER_INFO:', JSON.stringify(user, null, 2));
}

check().finally(() => prisma.$disconnect());
