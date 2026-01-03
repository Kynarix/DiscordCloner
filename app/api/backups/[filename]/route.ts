import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    try {
        const filename = (await params).filename;

        // Security check: prevent directory traversal
        if (!filename || filename.includes('..') || !filename.endsWith('.json')) {
            return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
        }

        const backupsDir = path.join(process.cwd(), 'backups');
        const filePath = path.join(backupsDir, filename);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(fileContent);

        return NextResponse.json(json);
    } catch (error) {
        console.error("Error reading backup file:", error);
        return NextResponse.json({ error: 'Failed to read backup' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    try {
        const filename = (await params).filename;

        if (!filename || filename.includes('..') || !filename.endsWith('.json')) {
            return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
        }

        const backupsDir = path.join(process.cwd(), 'backups');
        const filePath = path.join(backupsDir, filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
        }
    } catch (error) {
        console.error("Error deleting backup:", error);
        return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 });
    }
}
