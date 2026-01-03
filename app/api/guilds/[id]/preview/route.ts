import { NextResponse } from 'next/server';
import { DiscordService } from '@/lib/discord-service';
import { cookies } from 'next/headers';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Next.js 15: params is a Promise
) {
    const { id } = await params;

    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('discord_token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const discordService = new DiscordService(token);

        // Parallel fetching for performance
        const [guild, channels, roles, emojis, members] = await Promise.all([
            discordService.getGuild(id),
            discordService.getGuildChannels(id),
            discordService.getGuildRoles(id),
            discordService.getGuildEmojis(id),
            discordService.getGuildMembers(id, 1000)
        ]);

        if (!guild) {
            return NextResponse.json({ error: 'Guild not found or access denied' }, { status: 404 });
        }

        // Process channels into a tree structure
        // Discord returns a flat list. We need to group by parent_id (categories)
        // Types: 4 = Category, 0 = Text, 2 = Voice, etc.

        const categories = (channels as any[]).filter(c => c.type === 4).sort((a, b) => a.position - b.position);
        const others = (channels as any[]).filter(c => c.type !== 4);

        const channelTree = categories.map(cat => {
            const children = others
                .filter(c => c.parent_id === cat.id)
                .sort((a, b) => a.position - b.position)
                .map(c => c.name);

            return {
                name: cat.name,
                type: 'category',
                children
            };
        });

        // Add orphan channels (no category)
        const orphans = others.filter(c => !c.parent_id).map(c => c.name);
        if (orphans.length > 0) {
            channelTree.unshift({
                name: 'Kategorisiz',
                type: 'category',
                children: orphans
            });
        }

        // Process Roles
        // Convert integer color to hex
        const formattedRoles = (roles as any[])
            .sort((a, b) => b.position - a.position) // High roles first
            .filter(r => r.name !== '@everyone') // Optional: hide everyone
            .map(r => ({
                name: r.name,
                color: r.color !== 0 ? `#${r.color.toString(16).padStart(6, '0')}` : '#99aab5' // Default gray
            }));

        // Process Emojis
        const formattedEmojis = (emojis as any[]).map(e => ({
            name: e.name,
            url: `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? 'gif' : 'png'}`
        }));

        // Process Bots
        const bots = (members as any[])
            .filter(m => m.user.bot)
            .map(m => ({
                id: m.user.id,
                username: m.user.username,
                avatar: m.user.avatar
                    ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png`
                    : `https://cdn.discordapp.com/embed/avatars/${parseInt(m.user.discriminator) % 5}.png`
            }));

        return NextResponse.json({
            guild: {
                id: guild.id,
                name: guild.name,
                icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null
            },
            preview: {
                channels: channelTree,
                roles: formattedRoles,
                emojis: formattedEmojis,
                bots: bots
            }
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch guild details' }, { status: 500 });
    }
}
