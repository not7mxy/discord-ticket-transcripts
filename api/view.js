import { get } from "@vercel/blob";

import {
    getSession,
    isStaffMember
} from "../lib/auth.js";

export async function GET(request) {
    try {
        const requestUrl = new URL(request.url);

        // Require a logged-in Discord session.
        const session = await getSession(request);

        if (!session) {
            const authUrl = new URL(
                "/api/auth-discord",
                requestUrl.origin
            );

            authUrl.searchParams.set(
                "return",
                `${requestUrl.origin}${requestUrl.pathname}${requestUrl.search}`
            );

            return new Response(null, {
                status: 302,
                headers: {
                    Location: authUrl.toString(),
                    "Cache-Control": "no-store"
                }
            });
        }

        // Require the user to actually have the staff role.
        const staff = await isStaffMember(session.userId);

        if (!staff) {
            return new Response(
                "You do not have permission to view this transcript.",
                {
                    status: 403,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    }
                }
            );
        }

        const blobUrl =
            requestUrl.searchParams.get("url");

        if (!blobUrl) {
            return new Response(
                "Missing transcript URL.",
                {
                    status: 400,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    }
                }
            );
        }

        let parsedUrl;

        try {
            parsedUrl = new URL(blobUrl);
        } catch {
            return new Response(
                "Invalid transcript URL.",
                {
                    status: 400,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    }
                }
            );
        }

        // Only allow private Vercel Blob URLs.
        if (
            !parsedUrl.hostname.endsWith(
                ".private.blob.vercel-storage.com"
            )
        ) {
            return new Response(
                "Invalid transcript URL.",
                {
                    status: 400,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    }
                }
            );
        }

        const pathname =
            decodeURIComponent(
                parsedUrl.pathname.replace(/^\/+/, "")
            );

        if (!pathname) {
            return new Response(
                "Invalid transcript path.",
                {
                    status: 400,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    }
                }
            );
        }

        const { stream, blob } = await get(
            pathname,
            {
                access: "private",
                storeId: process.env.BLOB1_STORE_ID,
                useCache: false
            }
        );

        if (!stream) {
            return new Response(
                "Transcript not found.",
                {
                    status: 404,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    }
                }
            );
        }

        return new Response(stream, {
            status: 200,
            headers: {
                "Content-Type":
                    blob?.contentType ||
                    "text/html; charset=utf-8",
                "Content-Disposition":
                    "inline",
                "Cache-Control":
                    "private, no-store, max-age=0",
                "X-Content-Type-Options":
                    "nosniff"
            }
        });

    } catch (error) {
        console.error(
            "Transcript viewer error:",
            error
        );

        return new Response(
            "Unable to load transcript.",
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
