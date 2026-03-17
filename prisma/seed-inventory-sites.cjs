require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function main() {
  const sites = [
    { name: "Kanda", location: "Kanda" },
    { name: "Baatsona", location: "Baatsona" },
    { name: "Tse Addo", location: "Tse Addo" },
  ];

  for (const site of sites) {
    await prisma.inventorySite.upsert({
      where: { name: site.name },
      update: {
        location: site.location,
      },
      create: site,
    });
  }

  console.log("Inventory sites seeded successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });