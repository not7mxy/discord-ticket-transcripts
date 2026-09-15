import { get } from "@vercel/blob";

import {
    getSession
} from "../lib/auth.js";

export async function GET(request) {
    try {
        const requestUrl = new URL(request.url);
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

        /*
         * Check the staff session BEFORE touching
         * the private Blob.
         */
        const session =
            getSession(request);

        if (!session) {
            const loginUrl =
                `/api/auth-discord?return=${encodeURIComponent(
                    requestUrl.pathname +
                    requestUrl.search
                )}`;

            return new Response(null, {
                status: 302,
                headers: {
                    Location: loginUrl
                }
            });
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

        /*
         * Only allow Vercel private Blob storage.
         */
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
            parsedUrl.pathname.replace(/^\/+/, "");

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

        /*
         * Ticket transcripts uploaded by our bot are
         * stored underneath tickets/.
         */
        if (!pathname.startsWith("tickets/")) {
            return new Response(
                "Invalid transcript path.",
                {
                    status: 403,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    }
                }
            );
        }

        /*
         * Read directly from PRIVATE Blob storage.
         *
         * The browser never receives the private Blob URL.
         */
        const result = await get(pathname, {
            access: "private",
            useCache: false
        });

        if (!result) {
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

        return new Response(result.stream, {
            status: 200,
            headers: {
                "Content-Type":
                    result.blob.contentType ||
                    "text/html; charset=utf-8",

                "Content-Disposition":
                    "inline",

                "X-Content-Type-Options":
                    "nosniff",

                "Cache-Control":
                    "private, no-store"
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
