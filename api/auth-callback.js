import crypto from "crypto";

import {
    getCookie,
    createSession,
    createSessionCookie,
    STATE_COOKIE
} from "../lib/auth.js";

function unauthorized(message) {
    return new Response(message, {
        status: 403,
        headers: {
            "Content-Type":
                "text/plain; charset=utf-8"
        }
    });
}

export async function GET(request) {
    try {
        const requestUrl = new URL(request.url);

        const code =
            requestUrl.searchParams.get("code");

        const returnedState =
            requestUrl.searchParams.get("state");

        if (!code || !returnedState) {
            return new Response(
                "Invalid Discord authentication response.",
                {
                    status: 400,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    }
                }
            );
        }

        const stateCookie =
            getCookie(request, STATE_COOKIE);

        if (!stateCookie) {
            return new Response(
                "Authentication session expired. Please try again.",
                {
                    status: 400,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    }
                }
            );
        }

        let stateData;

        try {
            stateData = JSON.parse(
                Buffer.from(
                    stateCookie,
                    "base64url"
                ).toString("utf8")
            );
        } catch {
            return unauthorized(
                "Invalid authentication state."
            );
        }

        if (
            !stateData.state ||
            stateData.state !== returnedState
        ) {
            return unauthorized(
                "Invalid authentication state."
            );
        }

        const clientId =
            process.env.DISCORD_CLIENT_ID;

        const clientSecret =
            process.env.DISCORD_CLIENT_SECRET;

        const redirectUri =
            process.env.DISCORD_REDIRECT_URI;

        const guildId =
            process.env.DISCORD_GUILD_ID;

        const botToken =
            process.env.DISCORD_BOT_TOKEN;

        const staffRoleId =
            process.env.STAFF_ROLE_ID;

        if (
            !clientId ||
            !clientSecret ||
            !redirectUri ||
            !guildId ||
            !botToken ||
            !staffRoleId
        ) {
            console.error(
                "Missing Discord authentication environment variables."
            );

            return new Response(
                "Discord authentication is not configured correctly.",
                {
                    status: 500,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    }
                }
            );
        }

        /*
         * Exchange OAuth code for an access token.
         */
        const tokenResponse = await fetch(
            "https://discord.com/api/oauth2/token",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: "authorization_code",
                    code,
                    redirect_uri: redirectUri
                })
            }
        );

        if (!tokenResponse.ok) {
            console.error(
                "Discord token exchange failed:",
                await tokenResponse.text()
            );

            return new Response(
                "Unable to authenticate with Discord.",
                {
                    status: 502,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    }
                }
            );
        }

        const tokenData =
            await tokenResponse.json();

        if (!tokenData.access_token) {
            return new Response(
                "Discord did not provide an access token.",
                {
                    status: 502,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    }
                }
            );
        }

        /*
         * Get the Discord user.
         */
        const userResponse = await fetch(
            "https://discord.com/api/users/@me",
            {
                headers: {
                    Authorization:
                        `Bearer ${tokenData.access_token}`
                }
            }
        );

        if (!userResponse.ok) {
            return new Response(
                "Unable to retrieve your Discord account.",
                {
                    status: 502,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    }
                }
            );
        }

        const user =
            await userResponse.json();

        /*
         * Ask Discord's bot API for this member's
         * guild information and roles.
         */
        const memberResponse = await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/members/${user.id}`,
            {
                headers: {
                    Authorization:
                        `Bot ${botToken}`
                }
            }
        );

        if (memberResponse.status === 404) {
            return unauthorized(
                "You must be a member of the Discord server to view ticket transcripts."
            );
        }

        if (!memberResponse.ok) {
            console.error(
                "Discord guild member lookup failed:",
                await memberResponse.text()
            );

            return new Response(
                "Unable to verify your Discord server membership.",
                {
                    status: 502,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    }
                }
            );
        }

        const member =
            await memberResponse.json();

        /*
         * Check the configured staff role.
         */
        const hasStaffRole =
            Array.isArray(member.roles) &&
            member.roles.includes(staffRoleId);

        if (!hasStaffRole) {
            return unauthorized(
                "You are not authorized to view ticket transcripts."
            );
        }

        /*
         * Create our own signed session.
         *
         * The Discord OAuth access token is NOT stored
         * in the browser session.
         */
        const session =
            createSession(user.id);

        const returnPath =
            typeof stateData.returnPath === "string"
                ? stateData.returnPath
                : "/";

        return new Response(null, {
            status: 302,
            headers: {
                Location: returnPath,
                "Set-Cookie":
                    createSessionCookie(session)
            }
        });

    } catch (error) {
        console.error(
            "Discord OAuth callback error:",
            error
        );

        return new Response(
            "Unable to complete Discord authentication.",
            {
                status: 500,
                headers: {
                    "Content-Type":
                        "text/plain; charset=utf-8"
                }
            }
        );
    }
}
