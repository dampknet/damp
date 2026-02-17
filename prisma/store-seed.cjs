/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const items = [
    {
      itemNo: 1,
      description: `001 - THU9 5kW PUMP
NEW pump unit NMT MAX II
Initial pump NMT MAX C 40/120-F250 - 2500.6058.00 was discontinued from the supplier.
Successor is the pump NMT MAX II 40/120-F250 - 2500.6958.00. 
When replacing to the MAX II it is recommended to 
exchange both pumps in the pump unit.
See therefore the SC 17537
PUMP NMT MAX II C 40/120-F250 - 2500.6958.00 QTY=10
SEALING 49X85X2 FOR PUMP - 2102.3917.00 QTY=20
Warranty: 12 months`,
      quantity: 10,
      status: "RECEIVED",
    },

    {
      itemNo: 2,
      description: `THU9 2.3kW PUMP
PUMP NMT SMART C40/100F - 2500.6041.00
SEALING 49X85X2 FOR PUMP - 2102.3917.00
Warranty: 12 months`,
      quantity: 5,
      status: "RECEIVED",
    },

    {
      itemNo: 3,
      description: `3KW Power Supply PMU901
PN: 2600.1334.00 - PMU901 power supply without heatsink
Warranty: 12 months`,
      quantity: 10,
      status: "RECEIVED",
    },

    {
      itemNo: 4,
      description: `BLF888A UHF Power Transistor Bent
PN: 2501.7529.00`,
      quantity: 10,
      status: "RECEIVED",
    },

    {
      itemNo: 5,
      description: `BLF888B UHF Power Transistor Bent
PN: 2109.1049.00`,
      quantity: 10,
      status: "RECEIVED",
    },

    {
      itemNo: 6,
      description: `Power sensor/GD900Z3 TEST SYSTEM
PN: 2108.4809.40
Warranty: 12 months`,
      quantity: 5,
      status: "RECEIVED",
    },

    {
      itemNo: 7,
      description: `TCE900-M3 RF Board
PN: 2109.2597.02
Warranty: 12 months`,
      quantity: 5,
      status: "RECEIVED",
    },

    {
      itemNo: 8,
      description: `TCE900-M2 Coder Board
PN: 2109.2397.03
Warranty: 12 months`,
      quantity: 20,
      status: "RECEIVED",
    },

    {
      itemNo: 9,
      description: `Fuse 20A FF
PN: 3584.7211.00`,
      quantity: 20,
      status: "RECEIVED",
    },

    {
      itemNo: 10,
      description: `Fuse 40A FF
PN: 2109.1084.00`,
      quantity: 20,
      status: "RECEIVED",
    },

    {
      itemNo: 11,
      description: `PHU902 Amplifier
UHF amplifier band IV/V, liquid cooled COFDM: 1.15 kW rms,
Doherty B6 3-phase
Warranty: 12 months`,
      quantity: 6,
      status: "NOT_RECEIVED",
    },

    {
      itemNo: 12,
      description: `PMU901 amplifier
UHF amplifier band IV/V for TMU9
UHF amplifier band IV/V, air cooled DTV: 300 W rms single phase`,
      quantity: 3,
      status: "NOT_RECEIVED",
    },

    {
      itemNo: 13,
      description: `GPS Antenna
PN: 2080.5459.00
Warranty: 12 months`,
      quantity: 10,
      status: "NOT_RECEIVED",
    },

    {
      itemNo: 14,
      description: `GPS Surge Protector gas Capsule
PN: 2104.2282.00 - GAS CAPSULES FOR LIGHTNING PROTEC
Warranty: 12 months`,
      quantity: 20,
      status: "RECEIVED",
    },

    {
      itemNo: 15,
      description: `Exciter Switch9 3XRF
PN: 2500.0450.02
Warranty: 12 months`,
      quantity: 5,
      status: "RECEIVED",
    },

    {
      itemNo: 16,
      description: `TDU Display Unit
PN: 2109.4754.00
Warranty: 12 months`,
      quantity: 4,
      status: "RECEIVED",
    },

    {
      itemNo: 17,
      description: `MSATA Cards
Preprogrammed with image v24.0.0`,
      quantity: 100,
      status: "RECEIVED",
    },

    {
      itemNo: 18,
      description: `LNB SAT 3/VSAT
Model: NJR2836H with F-Type connector`,
      quantity: 26,
      status: "RECEIVED",
    },

    {
      itemNo: 19,
      description: `ETL L Band Splitter
Single 16-way Dextra L-band Splitter, 1U 19 shelf.
Dual redundant amplifiers and power supplies.
Remote control via RJ45 Ethernet with SNMP.
Warranty: 12 months`,
      quantity: 15,
      status: "NOT_RECEIVED",
    },

    {
      itemNo: 20,
      description: `PHU902 Power Supply 2109.1003.00`,
      quantity: 9,
      status: "RECEIVED",
    },

    {
      itemNo: 21,
      description: `Mains Distribution Board (MDB) 5KW TX
2109.4202.02`,
      quantity: 2,
      status: "RECEIVED",
    },

    {
      itemNo: 22,
      description: `Mains Distribution Board (MDB) 2.3KW TX
2109.4202.02`,
      quantity: 2,
      status: "RECEIVED",
    },

    {
      itemNo: 23,
      description: `TCE900 Power Supply 3586.5180.00`,
      quantity: 10,
      status: "RECEIVED",
    },

    {
      itemNo: 24,
      description: `System Connection Board 2109.2300.02`,
      quantity: 3,
      status: "RECEIVED",
    },

    {
      itemNo: 25,
      description: `TCE900 - M4 CIF (Cooling Interface) 2109.2697.02`,
      quantity: 2,
      status: "RECEIVED",
    },

    {
      itemNo: 26,
      description: `IPS Board 1206.3300.00`,
      quantity: 5,
      status: "RECEIVED",
    },

    {
      itemNo: 27,
      description: `Axial fan D500 for TH9-C2
3588.7900.00`,
      quantity: 2,
      status: "RECEIVED",
    },

    {
      itemNo: 28,
      description: `FAN 250MM RADIAL
3588.7900.00`,
      quantity: 5,
      status: "RECEIVED",
    },

    {
      itemNo: 29,
      description: `FAN 127X127X38
2104.9129.00`,
      quantity: 10,
      status: "RECEIVED",
    },

    {
      itemNo: 30,
      description: `Absorber Load 2109.8850.00`,
      quantity: 5,
      status: "RECEIVED",
    },
  ];

  for (const item of items) {
    await prisma.storeItem.upsert({
      where: { itemNo: item.itemNo },
      update: {
        description: item.description,
        quantity: item.quantity,
        status: item.status,
      },
      create: item,
    });
  }

  console.log("✅ Store items seeded successfully");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
