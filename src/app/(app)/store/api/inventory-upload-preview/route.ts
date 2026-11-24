import { storeEditor } from "@/lib/access";
import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseInventoryFile } from "@/lib/inventory-upload";

export async function POST(req: Request) {
  try {
    const profile  = await getCurrentProfile();
    const role     = profile?.role ?? "VIEWER";
    const canEdit  = role === "ADMIN" || role === "EDITOR";

    if (!canEdit) {
      return NextResponse.json(
        { error: "You are not allowed to upload inventory files" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file     = formData.get("file");
    const siteId   = String(formData.get("siteId") ?? "").trim();

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    if (!(await storeEditor(siteId))) {
      return NextResponse.json({ error: "You don't have edit access to this warehouse" }, { status: 403 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please choose an Excel file" }, { status: 400 });
    }

    const { preview, validRows, missing, codeHints } = await parseInventoryFile({ file, siteId });

    return NextResponse.json({ ok: true, preview, validRows, missing, codeHints });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to preview uploaded file";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}