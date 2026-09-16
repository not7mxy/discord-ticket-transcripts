import { get } from "@vercel/blob";
import {
    getSession,
    isStaffMember
} from "../lib/auth.js";

export async function GET(request) {
    try {
        const requestUrl = new URL(request.url);

        /*
         * ==========================================
         * 1. CHECK LOGIN SESSION
         * ==========================================
         */

        const session = await getSession(request);

        if (!session) {
            const returnUrl =
                `${requestUrl.origin}${requestUrl.pathname}${requestUrl.search}`;

            const authUrl =
                new URL(
                    "/api/auth-discord",
                    requestUrl.origin
                );

            authUrl.searchParams.set(
                "return",
                returnUrl
            );

            return new Response(null, {
                status: 302,
                headers: {
                    Location: authUrl.toString(),
                    "Cache-Control": "no-store"
                }
            });
        }

        /*
         * ==========================================
         * 2. CHECK STAFF ROLE
         * ==========================================
         *
         * This is intentionally checked EVERY time
         * the transcript is opened.
         *
         * Having a session alone is NOT enough.
         */

        const staff = await isStaffMember(
            session.userId
        );

        if (!staff) {
            return new Response(
                "You do not have permission to view this transcript.",
                {
                    status: 403,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8",
                        "Cache-Control":
                            "no-store"
                    }
                }
            );
        }

        /*
         * ==========================================
         * 3. GET TRANSCRIPT URL
         * ==========================================
         */

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

        /*
         * Only allow Vercel's PRIVATE Blob URLs.
         *
         * Do NOT compare the hostname to BLOB1_STORE_ID.
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
            decodeURIComponent(
                parsedUrl.pathname.replace(
                    /^\/+/,
                    ""
                )
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

        /*
         * ==========================================
         * 4. FETCH PRIVATE BLOB SERVER-SIDE
         * ==========================================
         */

        const result = await get(
            pathname,
            {
                access: "private",
                storeId:
                    process.env.BLOB1_STORE_ID,
                useCache: false
            }
        );

        const stream = result.stream;
        const blob = result.blob;

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

        /*
         * ==========================================
         * 5. RETURN TRANSCRIPT
         * ==========================================
         */

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
