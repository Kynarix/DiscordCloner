import { NextRequest, NextResponse } from 'next/server';
import { DiscordService } from '@/lib/discord-service';
import { cookies } from 'next/headers';

// This is required to enable streaming with the App Router
export const runtime = 'nodejs'; // or 'edge' but nodejs is safer for discord.js rest

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const token = cookieStore.get('discord_token')?.value;

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sourceId, targetId, options } = body;

    if (!sourceId || !targetId) {
        return NextResponse.json({ error: 'Missing sourceId or targetId' }, { status: 400 });
    }

    const discord = new DiscordService(token);
    const encoder = new TextEncoder();

    // Create a streaming response
    const stream = new ReadableStream({
        async start(controller) {
            const sendLog = (msg: string, type: string = 'info') => {
                const data = JSON.stringify({ msg, type, timestamp: new Date().toLocaleTimeString('tr-TR', { hour12: false }) });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            };

            try {
                sendLog(`Kopyalama başlatılıyor... Kaynak: ${sourceId} -> Hedef: ${targetId}`, 'info');

                // 1. Fetch Source Data
                sendLog('Kaynak sunucu verileri çekiliyor...', 'process');
                const [srcChannels, srcRoles, srcEmojis] = await Promise.all([
                    discord.getGuildChannels(sourceId),
                    discord.getGuildRoles(sourceId),
                    discord.getGuildEmojis(sourceId)
                ]);
                sendLog(`Veriler alındı: ${Array.isArray(srcChannels) ? srcChannels.length : 0} kanal, ${Array.isArray(srcRoles) ? srcRoles.length : 0} rol.`, 'success');


                // 2. Clear Target (Granular)
                if (options.deleteExisting) {
                    const specifics = options.deleteSpecifics || { channels: true, roles: true, emojis: true };

                    sendLog('Hedef sunucu temizleniyor...', 'warning');

                    // Delete Channels
                    if (specifics.channels) {
                        sendLog('Kanallar siliniyor...', 'process');
                        const targetChannels = await discord.getGuildChannels(targetId) as any[];
                        for (const channel of targetChannels) {
                            try {
                                await discord.deleteChannel(channel.id);
                            } catch (e) { }
                            await new Promise(r => setTimeout(r, 50)); // prevent rate limit
                        }
                    }

                    // Delete Roles
                    if (specifics.roles) {
                        sendLog('Roller siliniyor...', 'process');
                        const targetRoles = await discord.getGuildRoles(targetId) as any[];
                        for (const role of targetRoles) {
                            if (role.name !== '@everyone' && !role.managed) {
                                try {
                                    await discord.deleteRole(targetId, role.id);
                                } catch (e) { }
                                await new Promise(r => setTimeout(r, 50));
                            }
                        }
                    }

                    // Delete Emojis
                    if (specifics.emojis) {
                        sendLog('Emojiler siliniyor...', 'process');
                        const targetEmojis = await discord.getGuildEmojis(targetId) as any[];
                        for (const emoji of targetEmojis) {
                            try {
                                await discord.deleteEmoji(targetId, emoji.id);
                            } catch (e) { }
                            await new Promise(r => setTimeout(r, 50));
                        }
                    }

                    sendLog('Temizlik tamamlandı.', 'success');
                }

                const roleMap = new Map<string, string>(); // OldID -> NewID

                // 3. Clone Roles
                if (options.roles && Array.isArray(srcRoles)) {
                    sendLog('Roller kopyalanıyor...', 'process');
                    // Sort High to Low because new roles are inserted at position 1 (above everyone)
                    // If we create High first: [High, Ev] -> Create Low -> [Low, High, Ev]
                    // Result: High is above Low. This is correct.
                    const sortedRoles = [...srcRoles]
                        .sort((a: any, b: any) => b.position - a.position)
                        .filter((r: any) => r.name !== '@everyone' && !r.managed);

                    const roleMapTemp = new Map<string, string>(); // Local role map

                    for (const role of sortedRoles) {
                        try {
                            const newRole: any = await discord.createRole(targetId, {
                                name: role.name,
                                color: role.color,
                                hoist: role.hoist,
                                permissions: role.permissions,
                                mentionable: role.mentionable
                            });
                            if (newRole && newRole.id) {
                                roleMapTemp.set(role.id, newRole.id);
                                roleMap.set(role.id, newRole.id);
                            }
                        } catch (e: any) {
                            sendLog(`Rol hatası (${role.name}): ${e.message}`, 'error');
                        }
                        // Küçük gecikme
                        await new Promise(r => setTimeout(r, 100));
                    }
                    sendLog('Roller tamamlandı.', 'success');
                }

                // 4. Clone Channels (Categories first, then channels)
                if (options.channels && Array.isArray(srcChannels)) {
                    sendLog('Kategoriler ve kanallar kopyalanıyor...', 'process');
                    const categories = srcChannels.filter((c: any) => c.type === 4).sort((a: any, b: any) => a.position - b.position);
                    const others = srcChannels.filter((c: any) => c.type !== 4).sort((a: any, b: any) => a.position - b.position);

                    const categoryMap = new Map<string, string>(); // OldID -> NewID

                    // Create Categories
                    for (const cat of categories) {
                        try {
                            const newCat: any = await discord.createChannel(targetId, {
                                name: cat.name,
                                type: 4, // GUILD_CATEGORY
                                position: cat.position,
                                // Permission rewrites can be complex, skipping for now or use roleMap if implemented
                            });
                            categoryMap.set(cat.id, newCat.id);
                        } catch (e: any) {
                            sendLog(`Kategori hatası (${cat.name}): ${e.message}`, 'error');
                        }
                        await new Promise(r => setTimeout(r, 100));
                    }

                    // Create Channels
                    for (const channel of others) {
                        try {
                            const parentId = channel.parent_id ? categoryMap.get(channel.parent_id) : null;
                            await discord.createChannel(targetId, {
                                name: channel.name,
                                type: channel.type,
                                parent_id: parentId,
                                position: channel.position,
                                topic: channel.topic,
                                nsfw: channel.nsfw,
                                bitrate: channel.bitrate,
                                user_limit: channel.user_limit,
                            });
                        } catch (e: any) {
                            sendLog(`Kanal hatası (${channel.name}): ${e.message}`, 'error');
                        }
                        await new Promise(r => setTimeout(r, 100));
                    }
                    sendLog('Kanallar tamamlandı.', 'success');
                }

                // 5. Clone Emojis
                if (options.emojis && Array.isArray(srcEmojis)) {
                    sendLog(`Emojiler kopyalanıyor (${srcEmojis.length} adet)...`, 'process');
                    for (const emoji of srcEmojis) {
                        try {
                            const url = `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`;
                            const imageRes = await fetch(url);
                            const blob = await imageRes.blob();
                            const arrayBuffer = await blob.arrayBuffer();
                            const buffer = Buffer.from(arrayBuffer);
                            const base64 = `data:${blob.type};base64,${buffer.toString('base64')}`;

                            await discord.createEmoji(targetId, {
                                name: emoji.name,
                                image: base64,
                                roles: [] // roles mapping is hard
                            });
                        } catch (e: any) {
                            // Emojis often hit rate limits or size limits from discord
                            // sendLog(`Emoji hatası (${emoji.name}): ${e.message}`, 'warning');
                        }
                    }
                    sendLog('Emojiler tamamlandı.', 'success');
                }

                // 6. Bot Auto-Add (Direct Auth)
                if (options.bots && body.selectedBots && Array.isArray(body.selectedBots)) {
                    const selectedBotIds = body.selectedBots;

                    if (selectedBotIds.length > 0) {
                        sendLog(`Botlar hedef sunucuya ekleniyor (${selectedBotIds.length} adet)...`, 'process');

                        let successCount = 0;
                        for (const botId of selectedBotIds) {
                            try {
                                sendLog(`Bot ekleniyor: ${botId}...`, 'info');
                                // Try adding with Administrator (8) permissions
                                const result = await discord.addBotToGuild(botId, targetId, "8");

                                if (result.success) {
                                    sendLog(`✅ Bot (${botId}) başarıyla eklendi!`, 'success');
                                    successCount++;
                                } else {
                                    // If direct add fails, log the error and provide a link as backup
                                    const errorMsg = result.error?.message || result.error?.code || 'Bilinmeyen Hata';
                                    sendLog(`❌ Bot eklenemedi (${errorMsg}).`, 'error');

                                    const link = `https://discord.com/oauth2/authorize?client_id=${botId}&permissions=8&scope=bot`;
                                    sendLog(`   Manuel link: ${link}`, 'info');
                                }
                            } catch (botError: any) {
                                sendLog(`❌ Bot işlem hatası: ${botError.message}`, 'error');
                            }
                            // Small delay to be safe
                            await new Promise(r => setTimeout(r, 500));
                        }

                        if (successCount > 0) {
                            sendLog(`${successCount} bot sunucuya eklendi.`, 'success');
                        }
                    } else {
                        sendLog('Seçili bot bulunamadı.', 'warning');
                    }
                }


                sendLog('İşlem Başarıyla Tamamlandı!', 'finish'); // Special type to signal end
                controller.close();

            } catch (error: any) {
                console.error(error);
                sendLog(`KRİTİK HATA: ${error.message}`, 'error');
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
}
