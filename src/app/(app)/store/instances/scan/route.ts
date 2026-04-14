import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawInput = searchParams.get("serial");

    if (!rawInput) return new NextResponse("Serial required", { status: 400 });

    // 1. Clean the input and break it into every possible "word"
    // We split by brackets, spaces, colons, hyphens, and even newlines
    const segments = rawInput
      .replace(/[<>]/g, " ") 
      .split(/[\s\-:\n\r]+/)
      .map(s => s.trim())
      .filter(s => s.length >= 4); // Only look at segments that could be serials

    // 2. THE SMART SEARCH: 
    // We ask the database: "Give me the record where the serialNumber IS ONE OF these segments"
    const instance = await prisma.assetInstance.findFirst({
      where: {
        serialNumber: {
          in: segments, // This is the magic line. It looks for ANY segment that matches a serial.
          mode: 'insensitive'
        }
      },
      include: {
        inventoryItem: true 
      }
    });

    if (!instance) {
      // 3. Last resort: If the serial is something like "2434567" but the scanner sent "SN2434567"
      // we check if any serial in our DB is "contained" within that messy string.
      const allInstances = await prisma.assetInstance.findMany({
        include: { inventoryItem: true }
      });
      
      const foundMatch = allInstances.find(ins => 
        rawInput.toLowerCase().includes(ins.serialNumber.toLowerCase())
      );

      if (foundMatch) {
        return NextResponse.json({
          id: foundMatch.inventoryItem.id,
          name: foundMatch.inventoryItem.name,
          itemType: foundMatch.inventoryItem.itemType,
          serialNumber: foundMatch.serialNumber,
          condition: foundMatch.condition,
        });
      }

      return NextResponse.json({ 
        error: `Item not found. I checked these segments: ${segments.join(', ')}` 
      }, { status: 404 });
    }

    // 4. Success: Return the mapped parent Item Name
    return NextResponse.json({
      id: instance.inventoryItem.id,
      name: instance.inventoryItem.name,
      itemType: instance.inventoryItem.itemType,
      serialNumber: instance.serialNumber,
      condition: instance.condition,
    });

  } catch (error) {
    console.error("Scan API Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}