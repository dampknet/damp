/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Sites (your list)
 */
const sites = [
  { name: "Adjangote", regMFreq: "25/506", power: 5000, transmitterType: "LIQUID" },
  { name: "Agona Swedru", regMFreq: "26/514", power: 1140, transmitterType: "AIR" },
  { name: "Akatsi", regMFreq: "26/514", power: 2300, transmitterType: "LIQUID" },
  { name: "Akim Oda", regMFreq: "29/538", power: 600, transmitterType: "AIR" },
  { name: "Akosombo", regMFreq: "29/538", power: 600, transmitterType: "AIR" },
  { name: "Amedzofe", regMFreq: "26/514", power: 5000, transmitterType: "LIQUID" },
  { name: "Assin Fosu", regMFreq: "26/514", power: 5000, transmitterType: "LIQUID" },
  { name: "Atebubu", regMFreq: "22/482", power: 2300, transmitterType: "LIQUID" },
  { name: "Axim", regMFreq: "25/506", power: 1140, transmitterType: "AIR" },
  { name: "Bawku", regMFreq: "26/514", power: 1140, transmitterType: "AIR" },
  { name: "Bimbilla", regMFreq: "24/498", power: 2300, transmitterType: "LIQUID" },
  { name: "Bole", regMFreq: "24/498", power: 2300, transmitterType: "LIQUID" },
  { name: "Bolgatanga", regMFreq: "26/514", power: 2300, transmitterType: "LIQUID" },
  { name: "Damongo", regMFreq: "24/498", power: 2300, transmitterType: "LIQUID" },
  { name: "Dormaa", regMFreq: "22/482", power: 600, transmitterType: "AIR" },
  { name: "Drobo", regMFreq: "22/482", power: 600, transmitterType: "AIR" },
  { name: "Dunkwa", regMFreq: "26/514", power: 1140, transmitterType: "AIR" },
  { name: "Essam", regMFreq: "25/506", power: 600, transmitterType: "AIR" },
  { name: "Gambaga", regMFreq: "24/498", power: 2300, transmitterType: "LIQUID" },
  { name: "Hain", regMFreq: "22/482", power: 2300, transmitterType: "LIQUID" },
  { name: "Ho", regMFreq: "26/514", power: 600, transmitterType: "AIR" },
  { name: "Jamasi", regMFreq: "24/498", power: 2300, transmitterType: "LIQUID" },
  { name: "Juabeso", regMFreq: "25/506", power: 600, transmitterType: "AIR" },
  { name: "Kete Krachi", regMFreq: "26/514", power: 5000, transmitterType: "LIQUID" },
  { name: "Kintampo", regMFreq: "22/482", power: 5000, transmitterType: "LIQUID" },
  { name: "Kissi", regMFreq: "26/514", power: 5000, transmitterType: "LIQUID" },
  { name: "Koforidua", regMFreq: "29/538", power: 2300, transmitterType: "LIQUID" },
  { name: "Kumasi", regMFreq: "24/498", power: 5000, transmitterType: "LIQUID" },
  { name: "Mpraeso", regMFreq: "29/538", power: 2300, transmitterType: "LIQUID" },
  { name: "Obuasi", regMFreq: "24/498", power: 1140, transmitterType: "LIQUID" },
  { name: "Salaga", regMFreq: "24/498", power: 2300, transmitterType: "LIQUID" },
  { name: "Sefwi Wiawso", regMFreq: "25/506", power: 2300, transmitterType: "LIQUID" },
  { name: "Sekondi", regMFreq: "25/506", power: 2300, transmitterType: "LIQUID" },
  { name: "Sunyani", regMFreq: "22/482", power: 5000, transmitterType: "LIQUID" },
  { name: "Tamale", regMFreq: "24/498", power: 5000, transmitterType: "LIQUID" },
  { name: "Tarkwa", regMFreq: "25/506", power: 2300, transmitterType: "LIQUID" },
  { name: "Techiman", regMFreq: "22/482", power: 1140, transmitterType: "AIR" },
  { name: "Tema", regMFreq: "25/506", power: 600, transmitterType: "AIR" },
  { name: "Tumu", regMFreq: "22/482", power: 1140, transmitterType: "AIR" },
  { name: "Wa", regMFreq: "22/482", power: 2300, transmitterType: "AIR" },
  { name: "Weija", regMFreq: "25/506", power: 600, transmitterType: "AIR" },
  { name: "Yendi", regMFreq: "24/498", power: 5000, transmitterType: "LIQUID" },
];

/**
 * Enensys is ONLY in these sites
 */
const ENENSYS_SITES = new Set([
  "Adjangote",
  "Agona Swedru",
  "Akatsi",
  "Amedzofe",
  "Assin Fosu",
  "Ho",
  "Jamasi",
  "Kete Krachi",
  "Kissi",
]);

const KNET_TOWER_SITES = new Set([
  "Agona Swedru",
  "Akim Oda",
  "Akosombo",
  "Atebubu",
  "Axim",
  "Bawku",
  "Bole",
  "Dormaa",
  "Dunkwa",
  "Essam",
  "Juabeso",
  "Mpraeso",
  "Tarkwa",
  "Techiman",
  "Tumu",
]);

function towerTypeFor(siteName) {
  return KNET_TOWER_SITES.has(siteName) ? "KNET" : "GBC";
}

/**
 * Categories (standalone devices)
 */
const DEVICE_CATEGORIES = [
  "Genset",
  "AVR",
  "Fuel Tank",
  "ISO Transformer",
  "Solar",
  "Transmitter",
  "Equipment Rack",
];

/**
 * Transmitter subcategories
 */
const TX_SUBCATEGORIES = [
  "Transmitter System",
  "Exciter",
  "Exciter/System Control",
  "Amplifier",
  "Pump",
  "Channel Combiner",
  "Heat Exchanger",
  "Humidifier",
  "System Control",
];

/**
 * Rack subcategories
 */
const RACK_SUBCATEGORIES = [
  "Harmonic (PVR)",
  "Enensys",
  "Modem",
  "Mikrotik Routerboard",
];

function txAmpCounts(power) {
  // mux 1/2: 5000→10, 2300→4, 1140→4, 600→2
  // mux 3:   5000→4,  2300→2, 1140→1, 600→1
  if (power === 5000) return { mux12: 10, mux3: 4 };
  if (power === 2300) return { mux12: 4, mux3: 2 };
  if (power === 1140) return { mux12: 4, mux3: 1 };
  if (power === 600) return { mux12: 2, mux3: 1 };
  return { mux12: 0, mux3: 0 };
}

async function upsertCategory(name) {
  return prisma.category.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function upsertSubcategory(categoryId, name) {
  return prisma.subcategory.upsert({
    where: { categoryId_name: { categoryId, name } },
    update: {},
    create: { categoryId, name },
  });
}

/**
 * Ensure asset exists; update non-destructively if already exists.
 */
async function ensureAsset({
  siteId,
  categoryId,
  subcategoryId = null,
  assetName,
  serialNumber = null,
  partNumber = null,
  status = "ACTIVE",
  specs = {},
}) {
  const existing = await prisma.asset.findFirst({
    where: { siteId, categoryId, subcategoryId, assetName },
    select: { id: true, specs: true, serialNumber: true, partNumber: true, status: true },
  });

  if (existing) {
    const mergedSpecs = { ...(existing.specs || {}), ...(specs || {}) };

    return prisma.asset.update({
      where: { id: existing.id },
      data: {
        serialNumber: existing.serialNumber ?? serialNumber,
        partNumber: existing.partNumber ?? partNumber,
        status: existing.status ?? status,
        specs: mergedSpecs,
      },
      select: { id: true },
    });
  }

  return prisma.asset.create({
    data: {
      siteId,
      categoryId,
      subcategoryId,
      assetName,
      serialNumber,
      partNumber,
      status,
      specs,
    },
    select: { id: true },
  });
}

async function seedSiteAssets(siteRow, ids) {
  const { siteId, siteName, power } = siteRow;

  // Standalone devices
  await ensureAsset({ siteId, categoryId: ids.category.Genset, assetName: "Genset", specs: { deviceType: "GENSET" } });
  await ensureAsset({ siteId, categoryId: ids.category.AVR, assetName: "AVR", specs: { deviceType: "AVR" } });
  await ensureAsset({ siteId, categoryId: ids.category["Fuel Tank"], assetName: "Fuel Tank", specs: { deviceType: "FUEL_TANK" } });
  await ensureAsset({ siteId, categoryId: ids.category["ISO Transformer"], assetName: "ISO Transformer", specs: { deviceType: "ISO_TRANSFORMER" } });
  await ensureAsset({ siteId, categoryId: ids.category.Solar, assetName: "Solar", specs: { deviceType: "SOLAR" } });

  // Rack system + components
  await ensureAsset({
    siteId,
    categoryId: ids.category["Equipment Rack"],
    assetName: "Equipment Rack",
    specs: { deviceType: "EQUIPMENT_RACK" },
  });

  const harmonicSerial =
    siteName === "Akatsi" ? "311615135" :siteName === "Akosombo" ? "56481818" :siteName === "Axim" ? "56472805" :siteName === "Bawku" ? "311618193" : null;
  const harmonicPart = siteName === "Akatsi" ? "099-0580-251" : null;

  await ensureAsset({
    siteId,
    categoryId: ids.category["Equipment Rack"],
    subcategoryId: ids.rackSub["Harmonic (PVR)"],
    assetName: "Harmonic (PVR)",
    serialNumber: harmonicSerial,
    partNumber: harmonicPart,
    specs: { rackComponent: "HARMONIC_PVR" },
  });

  if (ENENSYS_SITES.has(siteName)) {
    await ensureAsset({
      siteId,
      categoryId: ids.category["Equipment Rack"],
      subcategoryId: ids.rackSub.Enensys,
      assetName: "Enensys",
      specs: { rackComponent: "ENENSYS" },
    });
  }

  await ensureAsset({
    siteId,
    categoryId: ids.category["Equipment Rack"],
    subcategoryId: ids.rackSub.Modem,
    assetName: "Modem",
    specs: { rackComponent: "MODEM" },
  });

  await ensureAsset({
    siteId,
    categoryId: ids.category["Equipment Rack"],
    subcategoryId: ids.rackSub["Mikrotik Routerboard"],
    assetName: "Mikrotik Routerboard",
    specs: { rackComponent: "MIKROTIK_ROUTERBOARD" },
  });

  // ----- TRANSMITTER -----

  // Always ensure system card exists (do not delete it)
  const txSystemSpecs = { deviceType: "TRANSMITTER" };
  if (siteName === "Adjangote") {
    txSystemSpecs.partNumber = "099-0580-251";
    txSystemSpecs.serial = "311618187-";
  }

  await ensureAsset({
    siteId,
    categoryId: ids.category.Transmitter,
    subcategoryId: ids.txSub["Transmitter System"],
    assetName: "Transmitter System",
    serialNumber: txSystemSpecs.serial ?? null,
    partNumber: txSystemSpecs.partNumber ?? null,
    specs: txSystemSpecs,
  });

  // ✅ IMPORTANT: wipe old transmitter COMPONENTS so counts become correct
  await prisma.asset.deleteMany({
    where: {
      siteId,
      categoryId: ids.category.Transmitter,
      // keep only the "Transmitter System" row
      NOT: { subcategoryId: ids.txSub["Transmitter System"] },
    },
  });

  // Helper to create N items in a mux group
  async function createMany(subName, mux, count) {
    for (let i = 1; i <= count; i++) {
      const assetName = count === 1 ? subName : `${subName} ${i}`;
      await prisma.asset.create({
        data: {
          siteId,
          categoryId: ids.category.Transmitter,
          subcategoryId: ids.txSub[subName],
          assetName,
          serialNumber: null,
          partNumber: null,
          status: "ACTIVE",
          specs: { mux },
        },
        select: { id: true },
      });
    }
  }

  const amps = txAmpCounts(power ?? 0);

  // ===== MUX 1/2 (exactly ONE of each component except amps) =====
  await createMany("Exciter", "TX_MUX_1_2", 1);
  await createMany("Amplifier", "TX_MUX_1_2", amps.mux12);
  await createMany("Pump", "TX_MUX_1_2", 1);
  await createMany("Channel Combiner", "TX_MUX_1_2", 1);
  await createMany("Heat Exchanger", "TX_MUX_1_2", 1);
  await createMany("Humidifier", "TX_MUX_1_2", 1);
  await createMany("System Control", "TX_MUX_1_2", 1);

  // ===== MUX 3 (as you described) =====
  await createMany("Exciter/System Control", "TX_MUX_3", 1);
  await createMany("Amplifier", "TX_MUX_3", amps.mux3);
  await createMany("Pump", "TX_MUX_3", 1);
  await createMany("Channel Combiner", "TX_MUX_3", 1);
  await createMany("Heat Exchanger", "TX_MUX_3", 1);
  await createMany("Humidifier", "TX_MUX_3", 1);
}

async function main() {
  console.log(`Seeding ${sites.length} sites + device structure...`);

  // Categories
  const categoryRecords = {};
  for (const name of DEVICE_CATEGORIES) {
    const c = await upsertCategory(name);
    categoryRecords[name] = c.id;
  }

  // Tx subcategories
  const txSub = {};
  for (const sub of TX_SUBCATEGORIES) {
    const sc = await upsertSubcategory(categoryRecords.Transmitter, sub);
    txSub[sub] = sc.id;
  }

  // Rack subcategories
  const rackSub = {};
  for (const sub of RACK_SUBCATEGORIES) {
    const sc = await upsertSubcategory(categoryRecords["Equipment Rack"], sub);
    rackSub[sub] = sc.id;
  }

  const ids = { category: categoryRecords, txSub, rackSub };

  // Upsert sites + seed assets
for (const s of sites) {
  const site = await prisma.site.upsert({
    where: { name: s.name },
    update: {
      regMFreq: s.regMFreq,
      power: s.power,
      transmitterType: s.transmitterType,
      status: "ACTIVE",

      // ✅ NEW
      towerType: towerTypeFor(s.name),
      towerHeight: null,
      gps: null,
    },
    create: {
      ...s,
      status: "ACTIVE",

      // ✅ NEW
      towerType: towerTypeFor(s.name),
      towerHeight: null,
      gps: null,
    },
    select: { id: true, name: true, power: true },
  });

  await seedSiteAssets({ siteId: site.id, siteName: site.name, power: site.power }, ids);
}

  console.log("✅ Sites + devices seeded successfully");
}

main()
  .catch((e) => {
    console.error("Seeding failed ❌", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

