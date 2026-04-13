import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = process.argv[2];

if (!email) {
  console.error("Usage: npx ts-node scripts/make-admin.ts <email>");
  process.exit(1);
}

async function main() {
  const user = await prisma.user.update({
    where: { email },
    data: { role: "admin" },
  });

  console.log(`✓ ${user.email} is now admin`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
