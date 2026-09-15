export default async function handler(request) {
    try {
        const clientId = process.env.DISCORD_CLIENT_ID;
        const redirectUri = process.env.DISCORD_REDIRECT_URI;

        if (!clientId || !redirectUri) {
            return new Response(
                "Discord OAuth is not configured correctly.",
                {
                    status: 500,
                    headers: {
                        "Content-Type": "text/plain; charset=utf-8"
                    }
                }
            );
        }

        const state = crypto.randomUUID();

        const params = new URLSearchParams({
            client_id: clientId,
            response_type: "code",
            redirect_uri: redirectUri,
            scope: "identify",
            state
        });

        const discordUrl =
            `https://discord.com/oauth2/authorize?${params.toString()}`;

        return new Response(null, {
            status: 302,
            headers: {
                Location: discordUrl,

                // Temporary state cookie.
                // We'll validate this in auth-callback.js.
                "Set-Cookie":
                    `oauth_state=${encodeURIComponent(state)}; ` +
                    `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
            }
        });

    } catch (error) {
        console.error("Discord OAuth redirect error:", error);

        return new Response(
            "Unable to start Discord authentication.",
            {
                status: 500,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            }
        );
    }
}
