import { NextResponse } from 'next/server';
import { DiscordService } from '@/lib/discord-service';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

// Helper to send SSE data
function sendSSE(controller: ReadableStreamDefaultController, data: any) {
    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(req: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get('discord_token')?.value;

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { filename, targetGuildId, options } = await req.json();

        // 1. Validate Input
        if (!filename || !targetGuildId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const backupsDir = path.join(process.cwd(), 'backups');
        const filePath = path.join(backupsDir, filename);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
        }

        // 2. Read Backup Data
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const backup = JSON.parse(fileContent);

        // 3. Initialize Service
        const discordService = new DiscordService(token);

        // 4. Start Streaming Response
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    sendSSE(controller, { type: 'log', message: `Yedek okunuyor: ${backup.meta.name}` });
                    sendSSE(controller, { type: 'log', message: `Hedef Sunucu: ${targetGuildId}` });
                    sendSSE(controller, { type: 'log', message: `İşlem Başlatıldı...` });

                    // --- 0. CLEANUP (If selected) ---
                    if (options.includes('clean')) {
                        sendSSE(controller, { type: 'log', message: `⚠️ Temizlik işlemi başlatılıyor...` });

                        // 1. Delete Channels
                        const currentChannels: any[] = await discordService.getGuildChannels(targetGuildId) as any[];
                        for (const channel of currentChannels) {
                            try {
                                await discordService.deleteChannel(channel.id);
                                // Fast delete, little delay
                                await new Promise(r => setTimeout(r, 100));
                            } catch (e) { }
                        }
                        sendSSE(controller, { type: 'log', message: `🗑️ Kanallar temizlendi.` });

                        // 2. Delete Roles (except managed and everyone)
                        const currentRoles: any[] = await discordService.getGuildRoles(targetGuildId) as any[];
                        for (const role of currentRoles) {
                            if (!role.managed && role.name !== '@everyone') {
                                try {
                                    await discordService.deleteRole(targetGuildId, role.id);
                                    await new Promise(r => setTimeout(r, 100));
                                } catch (e) { }
                            }
                        }
                        sendSSE(controller, { type: 'log', message: `🗑️ Roller temizlendi.` });
                    }

                    // --- 1. SETTINGS RESTORE ---
                    if (options.includes('settings')) {
                        sendSSE(controller, { type: 'log', message: `⚙️ Sunucu ayarları güncelleniyor...` });
                        try {
                            await discordService.updateGuild(targetGuildId, {
                                name: backup.meta.name,
                                // Icon logic is complex (needs base64), skipping for MVP to avoid errors unless we have the base64 or url
                                // For now, let's just update the name.
                            });
                            sendSSE(controller, { type: 'log', message: `✅ Sunucu ismi güncellendi.` });
                        } catch (e) {
                            sendSSE(controller, { type: 'log', message: `❌ Sunucu ayarları güncellenemedi.` });
                        }
                    } else {
                        sendSSE(controller, { type: 'log', message: `ℹ️ Sunucu ayarları atlanıyor (seçilmedi).` });
                    }

                    const roleMap = new Map<string, string>(); // OldID -> NewID


                    // --- 2. ROLES RESTORE ---
                    if (options.includes('roles')) {
                        sendSSE(controller, { type: 'log', message: `🛡️ Roller ve izinler yükleniyor...` });

                        // Handle data structure variations
                        const roles = backup.data.roles || backup.data.Roles || (backup.data.preview && (backup.data.preview.roles || backup.data.preview.Roles)) || [];

                        // Fetch target guild roles to find @everyone
                        const targetRoles: any[] = await discordService.getGuildRoles(targetGuildId) as any[];
                        const targetEveryone = targetRoles.find(r => r.name === '@everyone');
                        const sourceEveryone = roles.find((r: any) => r.name === '@everyone');

                        if (targetEveryone && sourceEveryone) {
                            roleMap.set(sourceEveryone.id, targetEveryone.id);
                            // Optionally update @everyone permissions here if the API supported it easily
                            // For now we focus on creating new roles
                        }

                        let createdCount = 0;
                        // Sort roles by position ASC (Low to High) to create from bottom up
                        // This ensures that when a higher role is created later, it stacks correctly (mostly)
                        // Sort roles by position High to Low
                        // Explanation: When a new role is created, it is inserted at position 1 (above @everyone).
                        // To get [High, Low, Everyone], we must create High first ([High, Ev]), then Low ([Low, High, Ev]).
                        const rolesToCreate = roles
                            .filter((r: any) => r.name !== '@everyone' && !r.managed)
                            .sort((a: any, b: any) => b.position - a.position);

                        for (const role of rolesToCreate) {
                            try {
                                const newRole: any = await discordService.createRole(targetGuildId, {
                                    name: role.name,
                                    color: role.color,
                                    hoist: role.hoist,
                                    permissions: role.permissions,
                                    mentionable: role.mentionable
                                });

                                if (newRole && newRole.id) {
                                    roleMap.set(role.id, newRole.id);
                                    createdCount++;
                                }
                                // Slight delay to avoid hammering API
                                await new Promise(r => setTimeout(r, 200));
                            } catch (e) {
                                // proceed
                            }
                        }
                        sendSSE(controller, { type: 'log', message: `✅ ${createdCount} rol oluşturuldu.` });

                    } else {
                        sendSSE(controller, { type: 'log', message: `ℹ️ Roller atlanıyor (seçilmedi).` });
                    }

                    // --- 3. CHANNELS RESTORE ---
                    if (options.includes('channels')) {
                        sendSSE(controller, { type: 'log', message: `💬 Kanallar ve kategoriler oluşturuluyor...` });
                        // Handle data structure variations
                        const channels = backup.data.channels || backup.data.Channels || (backup.data.preview && (backup.data.preview.channels || backup.data.preview.Channels)) || [];

                        // Function to map permissions
                        const resolveOverwrites = (overwrites: any[]) => {
                            if (!overwrites) return [];
                            return overwrites.map(o => {
                                if (o.type === 0 && roleMap.has(o.id)) { // Role Type
                                    return {
                                        id: roleMap.get(o.id),
                                        type: 0,
                                        allow: o.allow,
                                        deny: o.deny
                                    };
                                }
                                // User overwrites (type 1) or unmapped roles are skipped for safety
                                // unless we want to try keeping user IDs (which stay same globally)
                                if (o.type === 1) {
                                    return {
                                        id: o.id,
                                        type: 1,
                                        allow: o.allow,
                                        deny: o.deny
                                    };
                                }
                                return null;
                            }).filter(Boolean);
                        };

                        // We need to create Categories first, then channels inside them.
                        // 1. Find categories
                        const categories = channels.filter((c: any) => c.type === 4); // 4 = GUILD_CATEGORY
                        const textVoiceChannels = channels.filter((c: any) => c.type !== 4);

                        const categoryMap = new Map<string, string>(); // OldID -> NewID

                        // Create Channels
                        let channelCount = 0;

                        // Create Categories first
                        for (const cat of categories) {
                            try {
                                const newCat: any = await discordService.createChannel(targetGuildId, {
                                    name: cat.name,
                                    type: 4,
                                    position: cat.position,
                                    permission_overwrites: resolveOverwrites(cat.permission_overwrites)
                                });
                                if (newCat && newCat.id) {
                                    categoryMap.set(cat.id, newCat.id);
                                    channelCount++;
                                }
                                await new Promise(r => setTimeout(r, 200));
                            } catch (e) { }
                        }

                        for (const chan of textVoiceChannels) {
                            try {
                                const payload: any = {
                                    name: chan.name,
                                    type: chan.type,
                                    topic: chan.topic,
                                    nsfw: chan.nsfw,
                                    bitrate: chan.bitrate,
                                    user_limit: chan.user_limit,
                                    position: chan.position,
                                    rate_limit_per_user: chan.rate_limit_per_user,
                                    permission_overwrites: resolveOverwrites(chan.permission_overwrites)
                                };
                                if (chan.parent_id && categoryMap.has(chan.parent_id)) {
                                    payload.parent_id = categoryMap.get(chan.parent_id);
                                }

                                await discordService.createChannel(targetGuildId, payload);
                                channelCount++;
                                await new Promise(r => setTimeout(r, 200));
                            } catch (e) { }
                        }
                        sendSSE(controller, { type: 'log', message: `✅ ${channelCount} kanal oluşturuldu.` });

                    } else {
                        sendSSE(controller, { type: 'log', message: `ℹ️ Kanallar atlanıyor (seçilmedi).` });
                    }

                    // --- 4. EMOJIS RESTORE ---
                    if (options.includes('emojis')) {
                        sendSSE(controller, { type: 'log', message: `😀 Emojiler yükleniyor...` });
                        // Emojis require base64 image data to create. 
                        // Our backup 'preview' might currently save URLs.
                        // If we only have URLs, we need to fetch them, convert to base64, then send.
                        // This is heavy. Let's check what we have.

                        // For now, we will log a warning if we can't do it, or attempt it if we can.
                        // Assuming we skip for this iteration to ensure stability unless user explicitly asked for heavy lifting.
                        // Let's print a message that this might take a while.

                        const emojis = backup.data.emojis || [];
                        let emojiCount = 0;
                        // ... implementation would go here ...
                        sendSSE(controller, { type: 'log', message: `⚠️ Emojiler için resim indirme/yükleme henüz aktif değil (V2).` });

                    } else {
                        sendSSE(controller, { type: 'log', message: `ℹ️ Emojiler atlanıyor (seçilmedi).` });
                    }


                    sendSSE(controller, { type: 'done', message: 'Geri yükleme tamamlandı.' });
                    controller.close();

                } catch (error) {
                    console.error(error);
                    sendSSE(controller, { type: 'error', message: 'Beklenmeyen bir hata oluştu.' });
                    controller.close();
                }
            }
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error("Restore error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
