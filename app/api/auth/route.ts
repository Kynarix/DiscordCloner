import { NextResponse } from 'next/server';
import { DiscordService } from '@/lib/discord-service';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        const discordService = new DiscordService(token);
        const user = await discordService.getUser();

        // Token geçerliyse cookie'ye kaydedelim (Güvenlik notu: HttpOnly olmalı normalde ama demo için basit tutuyoruz)
        // User bilgilerini de döndürelim.

        // Next.js App Router'da cookie set etmek için:
        const cookieStore = await cookies();
        cookieStore.set('discord_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

        return NextResponse.json({ user });
    } catch (error) {
        return NextResponse.json({ error: 'Invalid token or discord API error' }, { status: 401 });
    }
}
