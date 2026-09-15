import { get } from "@vercel/blob";

import {
    getSession,
    isStaffMember
} from "../lib/auth.js";

export async function GET(request) {
    try {
        const requestUrl =
            new URL(request.url);

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
         * Check the login session.
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

        /*
         * Check the user's current Discord
         * staff role every time a transcript
         * is opened.
         */
        const stillStaff =
            await isStaffMember(
                session.userId
            );

        if (!stillStaff) {
            return new Response(
                "Your staff access has been removed or you are no longer a member of the server.",
                {
                    status: 403,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8",
                        "Cache-Control":
                            "private, no-store"
                    }
                }
            );
        }

        let parsedUrl;

        try {
            parsedUrl =
                new URL(blobUrl);
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
         * Only allow our private Vercel Blob
         * storage domain.
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
            parsedUrl.pathname.replace(
                /^\/+/,
                ""
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
         * Only allow transcript objects.
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
         * Read the private Blob server-side.
         *
         * The private Blob URL itself is never
         * exposed to the browser.
         */
        const result =
            await get(pathname, {
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

        return new Response(
            result.stream,
            {
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
            }
        );

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
