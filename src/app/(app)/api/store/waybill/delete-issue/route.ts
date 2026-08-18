import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "EDITOR")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { issueId, lineId } = await req.json();
    if (!issueId) {
      return NextResponse.json({ error: "issueId required" }, { status: 400 });
    }

    const issue = await prisma.warehouseIssue.findUnique({
      where:  { id: issueId },
      select: {
        id:              true,
        quantityTaken:   true,
        inventoryItemId: true,
        inventoryItem:   { select: { uncountable: true } },
        lines: {
          select: {
            id:            true,
            assetInstance: { select: { id: true } },
          },
        },
      },
    });

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      if (lineId && issue.lines.length > 0) {
        // ── TRACKED: delete just this one line ──────────────────────────────
        const line = issue.lines.find((l) => l.id === lineId);
        if (!line) throw new Error("Line not found");

        // Restore this entity to AVAILABLE
        await tx.assetInstance.update({
          where: { id: line.assetInstance.id },
          data:  { status: "AVAILABLE" },
        });

        // Delete just this line
        await tx.warehouseIssueLine.delete({ where: { id: lineId } });

        // Decrement qty by 1
        if (!issue.inventoryItem.uncountable) {
          await tx.inventoryItem.update({
            where: { id: issue.inventoryItemId },
            data:  { quantity: { increment: 1 } },
          });
        }

        // If no lines remain, delete the parent issue too
        const remainingLines = issue.lines.filter((l) => l.id !== lineId);
        if (remainingLines.length === 0) {
          await tx.warehouseIssue.delete({ where: { id: issueId } });
        }
      } else {
        // ── BULK: delete the whole issue ────────────────────────────────────
        await tx.warehouseIssueLine.deleteMany({ where: { warehouseIssueId: issueId } });

        if (!issue.inventoryItem.uncountable) {
          await tx.inventoryItem.update({
            where: { id: issue.inventoryItemId },
            data:  { quantity: { increment: issue.quantityTaken } },
          });
        }

        await tx.warehouseIssue.delete({ where: { id: issueId } });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE_ISSUE]", e);
    return NextResponse.json({ error: "Failed to remove issue" }, { status: 500 });
  }
}