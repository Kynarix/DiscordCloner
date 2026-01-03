import { REST, Routes } from "discord.js";

export class DiscordService {
    private token: string;
    private rest: REST;

    constructor(token: string) {
        this.token = token;
        // User tokenler için 'Bot ' prefixi olmamalı. authPrefix: ' ' veya boş bırakıyoruz ancak discord.js bazen zorlar.
        // version: '10' ve authPrefix: '' (boş string) self-bot için kritiktir.
        this.rest = new REST({ version: '10' }).setToken(token);

        // Hack: REST instance'ında auth prefix'i manuel override edebiliriz veya request atarken dikkat edebiliriz.
        // discord.js REST class'ı setToken yapınca otomatik prefix eklemez, request atarken header'a bakar.
        // Ancak biz garantilemek için options'a bakalım.

        // @ts-ignore - Private property access if needed, bu kütüphane versiyonunda authPrefix opsiyonu constructor'da verilebiliyor.
        // Ama en temizi:
        (this.rest as any).options.authPrefix = '';
    }

    async getUser() {
        try {
            const user = await this.rest.get(Routes.user());
            return user;
        } catch (error) {
            console.error("Error fetching user:", error);
            throw error;
        }
    }

    async getGuilds() {
        try {
            const guilds = await this.rest.get(Routes.userGuilds());
            return guilds;
        } catch (error) {
            console.error("Error fetching guilds:", error);
            throw error;
        }
    }

    async getGuild(guildId: string) {
        try {
            const guild = await this.rest.get(Routes.guild(guildId));
            return guild;
        } catch (error) {
            console.error("Error fetching guild:", error);
            return null;
        }
    }

    async getGuildChannels(guildId: string) {
        try {
            // Fetches channels for the guild
            const channels = await this.rest.get(Routes.guildChannels(guildId));
            return channels;
        } catch (error) {
            // 403 Forbidden alabiliriz eğer user sunucuda yetkili değilse veya bazı endpointler kilitliyse.
            // Ancak sadece okuma (görme) yetkisi varsa user token ile genelde çekilebilir.
            console.error("Error fetching channels:", error);
            return [];
        }
    }

    async getGuildRoles(guildId: string) {
        try {
            const roles = await this.rest.get(Routes.guildRoles(guildId));
            return roles;
        } catch (error) {
            console.error("Error fetching roles:", error);
            return [];
        }
    }

    async getGuildEmojis(guildId: string) {
        try {
            const emojis = await this.rest.get(Routes.guildEmojis(guildId));
            return emojis;
        } catch (error) {
            console.error("Error fetching emojis:", error);
            return [];
        }
    }

    async getGuildMembers(guildId: string, limit: number = 1000) {
        try {
            const query = new URLSearchParams({ limit: limit.toString() });
            const members = await this.rest.get(Routes.guildMembers(guildId), { query });
            return members;
        } catch (error: any) {
            // Fallback Strategy for User Tokens / Restricted Access
            if (error.code === 50001 || error.status === 403) {
                console.log("⚠️ Standard fetch failed (Access Denied). Attempting fallbacks...");

                // Attempt 1: Search with wildcard '.'
                try {
                    const searchRoute = `/guilds/${guildId}/members/search` as any;
                    const searchResults = await this.rest.get(searchRoute, {
                        query: new URLSearchParams({ limit: '50', query: '.' })
                    });

                    if (Array.isArray(searchResults) && searchResults.length > 0) {
                        console.log("✅ Main fallback (Search) success.");
                        return searchResults;
                    }
                } catch (searchError) {
                    console.warn("failed to search members (skipping to next method):", (searchError as any).message);
                }

                // Attempt 2: Integrations (Works if user has MANAGE_GUILD)
                try {
                    console.log("🔄 Attempting to fetch bots via Integrations API...");
                    const integrationsRoute = `/guilds/${guildId}/integrations` as any;
                    const integrations = await this.rest.get(integrationsRoute);

                    if (Array.isArray(integrations)) {
                        const bots = integrations
                            .filter((i: any) => i.application && i.application.bot)
                            .map((i: any) => ({
                                user: i.application.bot,
                                roles: [],
                                joined_at: new Date().toISOString()
                            }));

                        if (bots.length > 0) {
                            console.log(`✅ Secondary fallback (Integrations) found ${bots.length} bots.`);
                            return bots;
                        }
                    }
                } catch (intError) {
                    console.warn("failed to fetch integrations:", (intError as any).message);
                }

                console.warn("⚠️ All fallback methods failed. Returning empty list.");
                return [];
            }
            console.error("Error fetching members:", error);
            return [];
        }
    }

    // --- WRITE OPERATIONS ---

    async updateGuild(guildId: string, data: { name?: string; icon?: string | null }) {
        try {
            const result = await this.rest.patch(Routes.guild(guildId), { body: data });
            return result;
        } catch (error) {
            console.error("Error updating guild:", error);
            throw error;
        }
    }

    async createRole(guildId: string, roleData: any) {
        return this.rest.post(Routes.guildRoles(guildId), { body: roleData });
    }

    async deleteRole(guildId: string, roleId: string) {
        return this.rest.delete(Routes.guildRole(guildId, roleId));
    }

    async createChannel(guildId: string, channelData: any) {
        return this.rest.post(Routes.guildChannels(guildId), { body: channelData });
    }

    async deleteChannel(channelId: string) {
        return this.rest.delete(Routes.channel(channelId));
    }

    async createEmoji(guildId: string, emojiData: { name: string, image: string, roles: string[] }) {
        return this.rest.post(Routes.guildEmojis(guildId), { body: emojiData });
    }

    async deleteEmoji(guildId: string, emojiId: string) {
        return this.rest.delete(Routes.guildEmoji(guildId, emojiId));
    }

    // --- INTERNAL / SELF-BOT OPERATIONS ---

    async addBotToGuild(botId: string, guildId: string, permissions: string = "8") {
        try {
            // This is the endpoint Discord client uses when you click "Authorize"
            // It requires the User Token (which is what we are using in this service)
            const response = await fetch(`https://discord.com/api/v9/oauth2/authorize?client_id=${botId}&scope=bot&guild_id=${guildId}&disable_guild_select=true`, {
                method: "POST",
                headers: {
                    "Authorization": this.token, // User token directly
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    authorize: true,
                    permissions: permissions, // Administrator by default (8)
                    guild_id: guildId
                })
            });

            if (response.ok) {
                // If there's a CAPTCHA, Discord might return 200 but with a captcha_key requirement in body
                // Or 400/403. Handling simple success case here.
                const data = await response.json();
                if (data.location) {
                    // Sometimes it returns a redirect URI (location), which means authorized
                    return { success: true };
                }
                // If just authorized:
                return { success: true };
            } else {
                const errorData = await response.json();
                console.error(`Failed to add bot ${botId}:`, errorData);
                return { success: false, error: errorData };
            }
        } catch (error) {
            console.error(`Error adding bot ${botId}:`, error);
            return { success: false, error };
        }
    }
}
