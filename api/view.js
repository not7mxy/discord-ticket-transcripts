import { get } from "@vercel/blob";
import { getSession, isStaffMember } from "../lib/auth.js";

export async function GET(request) {
    try {
        /*
         * ------------------------------------------------------------
         * AUTHENTICATION
         * ------------------------------------------------------------
         */

        const session = await getSession(request);

        if (!session) {
            const currentUrl = new URL(request.url);

            const returnUrl =
                currentUrl.pathname +
                currentUrl.search;

            const loginUrl =
                `/api/auth-discord?return=${encodeURIComponent(returnUrl)}`;

            return Response.redirect(
                new URL(loginUrl, request.url),
                302
            );
        }

        /*
         * ------------------------------------------------------------
         * STAFF CHECK
         * ------------------------------------------------------------
         */

        const stillStaff = await isStaffMember(session.userId);

        if (!stillStaff) {
            return new Response(
                "You no longer have permission to view transcripts.",
                {
                    status: 403,
                    headers: {
                        "Content-Type": "text/plain; charset=utf-8"
                    }
                }
            );
        }

        /*
         * ------------------------------------------------------------
         * GET TRANSCRIPT URL
         * ------------------------------------------------------------
         */

        const { searchParams } = new URL(request.url);
        const blobUrl = searchParams.get("url");

        if (!blobUrl) {
            return new Response("Missing transcript URL.", {
                status: 400,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            });
        }

        /*
         * ------------------------------------------------------------
         * VALIDATE BLOB URL
         * ------------------------------------------------------------
         */

        let parsedUrl;

        try {
            parsedUrl = new URL(blobUrl);
        } catch {
            return new Response("Invalid transcript URL.", {
                status: 400,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            });
        }

        /*
         * Only accept Vercel private Blob URLs.
         */

        if (
            !parsedUrl.hostname.endsWith(
                ".private.blob.vercel-storage.com"
            )
        ) {
            return new Response("Invalid transcript URL.", {
                status: 400,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            });
        }

        /*
         * ------------------------------------------------------------
         * GET PRIVATE BLOB
         * ------------------------------------------------------------
         *
         * We intentionally do NOT trust the store contained in the
         * supplied URL.
         *
         * The pathname is extracted from the URL, while the actual
         * store is explicitly forced to our configured private store.
         *
         * OIDC authentication is provided automatically by Vercel.
         */

        const expectedStoreId = process.env.BLOB1_STORE_ID;

        if (!expectedStoreId) {
            console.error(
                "BLOB1_STORE_ID is not configured."
            );

            return new Response(
                "Transcript storage is not configured.",
                {
                    status: 500,
                    headers: {
                        "Content-Type": "text/plain; charset=utf-8"
                    }
                }
            );
        }

        const pathname = decodeURIComponent(
            parsedUrl.pathname.replace(/^\/+/, "")
        );

        /*
         * Transcripts uploaded by the bot should always live inside
         * the tickets/ directory.
         */

        if (!pathname.startsWith("tickets/")) {
            return new Response("Invalid transcript path.", {
                status: 400,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            });
        }

        const result = await get(pathname, {
            access: "private",
            storeId: expectedStoreId,
            useCache: false
        });

        /*
         * ------------------------------------------------------------
         * RETURN TRANSCRIPT
         * ------------------------------------------------------------
         */

        if (!result) {
            return new Response("Transcript not found.", {
                status: 404,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            });
        }

        return new Response(result.stream, {
            status: 200,
            headers: {
                "Content-Type":
                    result.blob?.contentType ||
                    "text/html; charset=utf-8",

                "Content-Disposition": "inline",

                "Cache-Control":
                    "private, no-store, max-age=0"
            }
        });

    } catch (error) {
        console.error("Transcript viewer error:", error);

        return new Response(
            "Unable to load transcript.",
            {
                status: 500,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            }
        );
    }
}
