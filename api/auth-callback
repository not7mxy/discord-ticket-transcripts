import crypto from "crypto";

export default async function handler(request) {
    try {
        const requestUrl = new URL(request.url);
        const code = requestUrl.searchParams.get("code");
        const state = requestUrl.searchParams.get("state");

        if (!code || !state) {
            return new Response("Invalid Discord authentication response.", {
                status: 400,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            });
        }

        // Read the OAuth state cookie.
        const cookieHeader = request.headers.get("cookie") || "";

        const stateCookie = cookieHeader
            .split(";")
            .map(cookie => cookie.trim())
            .find(cookie => cookie.startsWith("oauth_state="));

        if (!stateCookie) {
            return new Response(
                "Authentication session expired. Please try again.",
                {
                    status: 400,
                    headers: {
                        "Content-Type": "text/plain; charset=utf-8"
                    }
                }
            );
        }

        const savedState = decodeURIComponent(
            stateCookie.substring("oauth_state=".length)
        );

        // Prevent OAuth CSRF attacks.
        if (
            !crypto.timingSafeEqual(
                Buffer.from(state),
                Buffer.from(savedState)
            )
        ) {
            return new Response("Invalid authentication state.", {
                status: 403,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            });
        }

        const clientId = process.env.DISCORD_CLIENT_ID;
        const clientSecret = process.env.DISCORD_CLIENT_SECRET;
        const redirectUri = process.env.DISCORD_REDIRECT_URI;

        if (!clientId || !clientSecret || !redirectUri) {
            console.error("Discord OAuth environment variables are missing.");

            return new Response(
                "Discord authentication is not configured correctly.",
                {
                    status: 500,
                    headers: {
                        "Content-Type": "text/plain; charset=utf-8"
                    }
                }
            );
        }

        // Exchange the authorization code for an OAuth access token.
        const tokenResponse = await fetch(
            "https://discord.com/api/oauth2/token",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
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
            const errorText = await tokenResponse.text();

            console.error(
                "Discord token exchange failed:",
                errorText
            );

            return new Response(
                "Unable to authenticate with Discord.",
                {
                    status: 502,
                    headers: {
                        "Content-Type": "text/plain; charset=utf-8"
                    }
                }
            );
        }

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            return new Response(
                "Discord did not provide an access token.",
                {
                    status: 502,
                    headers: {
                        "Content-Type": "text/plain; charset=utf-8"
                    }
                }
            );
        }

        // Get the Discord account associated with the OAuth token.
        const userResponse = await fetch(
            "https://discord.com/api/users/@me",
            {
                headers: {
                    Authorization: `Bearer ${tokenData.access_token}`
                }
            }
        );

        if (!userResponse.ok) {
            return new Response(
                "Unable to retrieve your Discord account.",
                {
                    status: 502,
                    headers: {
                        "Content-Type": "text/plain; charset=utf-8"
                    }
                }
            );
        }

        const user = await userResponse.json();

        /*
         * At this point we know which Discord account authenticated.
         *
         * We are NOT granting transcript access yet.
         *
         * The next system will check:
         *
         * 1. Is this user in your Discord server?
         * 2. Does this user have the configured staff role?
         *
         * Only then will we create the authenticated session.
         */

        console.log(
            `Discord OAuth successful for user ${user.id}`
        );

        return new Response(
            `Discord authentication successful for ${user.username}.`,
            {
                status: 200,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            }
        );

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
                    "Content-Type": "text/plain; charset=utf-8"
                }
            }
        );
    }
}
