
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
        }

        if (!file.name.endsWith(".json")) {
            return NextResponse.json({ error: "Sadece JSON dosyaları yüklenebilir." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const jsonContent = buffer.toString("utf-8");

        // Validate JSON Structure
        try {
            const parsed = JSON.parse(jsonContent);
            if (!parsed.meta || !parsed.data) {
                return NextResponse.json({ error: "Geçersiz yedek dosyası formatı." }, { status: 400 });
            }

            // Debug logging
            console.log("Importing backup:", parsed.meta.name);
            console.log("Channels count:", parsed.data.channels?.length);
            console.log("Roles count:", parsed.data.roles?.length);

        } catch (e) {
            return NextResponse.json({ error: "Geçersiz JSON formatı." }, { status: 400 });
        }

        // Generate a safe unique filename avoiding collisions
        // We preserve the original name but prepend a timestamp or ID if needed.
        // Or cleaner: use the meta ID + timestamp.
        const timestamp = Date.now();
        const safeName = `imported-${timestamp}-${uuidv4().slice(0, 8)}.json`;
        const backupPath = path.join(process.cwd(), "backups", safeName);

        // Ensure backups dir exists
        if (!fs.existsSync(path.dirname(backupPath))) {
            fs.mkdirSync(path.dirname(backupPath), { recursive: true });
        }

        fs.writeFileSync(backupPath, jsonContent);

        return NextResponse.json({ success: true, filename: safeName });

    } catch (error) {
        console.error("Backup import error:", error);
        return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
    }
}
