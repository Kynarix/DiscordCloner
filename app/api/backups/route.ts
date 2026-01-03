import { NextResponse } from 'next/server';
import { DiscordService } from '@/lib/discord-service';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

const BACKUPS_DIR = path.join(process.cwd(), 'backups');

// Ensure backups dir exists
if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR);
}

export async function GET() {
    try {
        const files = fs.readdirSync(BACKUPS_DIR).filter(file => file.endsWith('.json'));

        const backups = files.map(file => {
            const filePath = path.join(BACKUPS_DIR, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            try {
                const json = JSON.parse(content);

                // Calculate counts
                let channelCount = 0;
                let roleCount = 0;

                if (json.data) {
                    // Channels
                    if (Array.isArray(json.data.channels)) channelCount = json.data.channels.length;
                    else if (Array.isArray(json.data.Channels)) channelCount = json.data.Channels.length;
                    else if (json.data.preview) {
                        const chans = json.data.preview.channels || json.data.preview.Channels;
                        if (Array.isArray(chans)) {
                            channelCount = chans.reduce((acc: number, item: any) => {
                                let count = 1; // Category itself
                                if (item.children && Array.isArray(item.children)) {
                                    count += item.children.length;
                                }
                                return acc + count;
                            }, 0);
                        }
                    }

                    // Roles
                    if (Array.isArray(json.data.roles)) roleCount = json.data.roles.length;
                    else if (Array.isArray(json.data.Roles)) roleCount = json.data.Roles.length;
                    else if (json.data.preview) {
                        const roles = json.data.preview.roles || json.data.preview.Roles;
                        if (Array.isArray(roles)) roleCount = roles.length;
                    }
                }

                return {
                    filename: file,
                    channelCount,
                    roleCount,
                    ...json.meta
                };
            } catch (e) {
                return null;
            }
        }).filter(Boolean).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({ backups });
    } catch (error) {
        console.error("Error reading backups:", error);
        return NextResponse.json({ error: 'Failed to list backups' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('discord_token')?.value;
        const { guildId } = await req.json();

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!guildId) {
            return NextResponse.json({ error: 'Guild ID required' }, { status: 400 });
        }

        const discordService = new DiscordService(token);
        // We reuse the preview logic or fetch everything we need
        // For a full backup, we want Channels, Roles, Emojis, maybe Server Settings?
        // Let's rely on the structure defined in `preview` route for now, but maybe we can just call the service methods directly here.

        const guild = await discordService.getGuild(guildId);
        if (!guild) return NextResponse.json({ error: 'Guild not found' }, { status: 404 });

        const channels = await discordService.getGuildChannels(guildId);
        const roles = await discordService.getGuildRoles(guildId);
        const emojis = await discordService.getGuildEmojis(guildId);

        const backupData = {
            meta: {
                name: guild.name,
                id: guild.id,
                icon: guild.icon,
                date: new Date().toISOString(),
                version: "1.0.0"
            },
            data: {
                guild,
                channels,
                roles,
                emojis
            }
        };

        const filename = `backup-${guild.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.json`;
        const filePath = path.join(BACKUPS_DIR, filename);

        fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

        return NextResponse.json({ success: true, filename, backup: backupData.meta });

    } catch (error) {
        console.error("Error creating backup:", error);
        return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
    }
}
