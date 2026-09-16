import { get } from "@vercel/blob";
import { getSession, isStaffMember } from "../lib/auth.js";

export async function GET(request) {
    try {
        // Require a logged-in Discord session.
        const session = await getSession(request);

        if (!session) {
            return new Response("Unauthorized.", {
                status: 401,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            });
        }

        // Require the user to actually be staff.
        const staff = await isStaffMember(session.userId);

        if (!staff) {
            return new Response("Forbidden.", {
                status: 403,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            });
        }

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

        // Only accept Vercel private Blob URLs.
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

        // The pathname is the Blob object key.
        const pathname = decodeURIComponent(
            parsedUrl.pathname.replace(/^\/+/, "")
        );

        if (!pathname) {
            return new Response("Invalid transcript path.", {
                status: 400,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            });
        }

        // Retrieve the private Blob using the server's
        // Vercel/OIDC Blob credentials.
        const { stream, blob } = await get(pathname, {
            access: "private",
            storeId: process.env.BLOB1_STORE_ID,
            useCache: false
        });

        if (!stream) {
            return new Response("Transcript not found.", {
                status: 404,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            });
        }

        return new Response(stream, {
            status: 200,
            headers: {
                "Content-Type":
                    blob?.contentType ||
                    "text/html; charset=utf-8",

                "Content-Disposition": "inline",

                // Don't let browsers/CDNs cache staff-only transcripts.
                "Cache-Control": "private, no-store, max-age=0",

                "X-Content-Type-Options": "nosniff"
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
