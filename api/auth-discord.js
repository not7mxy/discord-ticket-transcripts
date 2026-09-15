import crypto from "crypto";

import {
    createStateCookie,
    isValidReturnPath
} from "../lib/auth.js";

export async function GET(request) {
    try {
        const clientId =
            process.env.DISCORD_CLIENT_ID;

        const redirectUri =
            process.env.DISCORD_REDIRECT_URI;

        if (!clientId || !redirectUri) {
            return new Response(
                "Discord OAuth is not configured correctly.",
                {
                    status: 500,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    }
                }
            );
        }

        const requestUrl =
            new URL(request.url);

        const requestedReturn =
            requestUrl.searchParams.get("return");

        const returnPath =
            requestedReturn &&
            isValidReturnPath(requestedReturn)
                ? requestedReturn
                : "/";

        const state =
            crypto.randomUUID();

        const stateData =
            Buffer.from(
                JSON.stringify({
                    state,
                    returnPath
                })
            ).toString("base64url");

        const params =
            new URLSearchParams({
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
                "Set-Cookie":
                    createStateCookie(stateData)
            }
        });

    } catch (error) {
        console.error(
            "Discord OAuth redirect error:",
            error
        );

        return new Response(
            "Unable to start Discord authentication.",
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
