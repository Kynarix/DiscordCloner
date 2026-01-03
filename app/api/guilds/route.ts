import { NextResponse } from 'next/server';
import { DiscordService } from '@/lib/discord-service';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('discord_token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const discordService = new DiscordService(token);
        const guilds = await discordService.getGuilds();

        return NextResponse.json({ guilds });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch guilds' }, { status: 500 });
    }
}
