/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  const categories = [
    "Gensets",
    "Fuel Tanks",
    "ISO Transformers",
    "AVR",
    "Solar",
    "Transmitters",
    "Equipment Rack",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const transmitterSubs = [
    "Exciters",
    "Amplifiers",
    "Pumps",
    "Channel Combiners",
    "Heat Exchangers",
    "Humidifiers",
  ];

  const rackSubs = ["Harmonic", "Enensys", "Modems", "Mikrotik Router Board"];

  const transmitters = await prisma.category.findUnique({
    where: { name: "Transmitters" },
  });

  const rack = await prisma.category.findUnique({
    where: { name: "Equipment Rack" },
  });

  if (transmitters) {
    for (const name of transmitterSubs) {
      await prisma.subcategory.upsert({
        where: { categoryId_name: { categoryId: transmitters.id, name } },
        update: {},
        create: { name, categoryId: transmitters.id },
      });
    }
  }

  if (rack) {
    for (const name of rackSubs) {
      await prisma.subcategory.upsert({
        where: { categoryId_name: { categoryId: rack.id, name } },
        update: {},
        create: { name, categoryId: rack.id },
      });
    }
  }

  console.log("Seeding finished ✅");
}

main()
  .catch((e) => {
    console.error("Seeding failed ❌", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
