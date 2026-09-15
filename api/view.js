import { get } from "@vercel/blob";

export async function GET(request) {
    try {
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

        const parsedUrl = new URL(blobUrl);

        // Only allow Vercel private Blob URLs.
        if (
            !parsedUrl.hostname.endsWith(".private.blob.vercel-storage.com") &&
            !parsedUrl.hostname.endsWith(".blob.vercel-storage.com")
        ) {
            return new Response("Invalid transcript URL.", {
                status: 400,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            });
        }

        // Extract the pathname from the Blob URL.
        const pathname = parsedUrl.pathname.replace(/^\/+/, "");

        if (!pathname) {
            return new Response("Invalid transcript path.", {
                status: 400,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            });
        }

        /*
         * AUTHENTICATION WILL GO HERE.
         *
         * We will check the user's Discord login + staff role
         * before allowing this private Blob to be read.
         */

        const result = await get(pathname, {
            access: "private"
        });

        if (!result || result.statusCode !== 200) {
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
                "Content-Type": result.blob.contentType || "text/html; charset=utf-8",
                "Content-Disposition": "inline",
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": "private, no-store"
            }
        });

    } catch (error) {
        console.error("Transcript viewer error:", error);

        return new Response("Unable to load transcript.", {
            status: 500,
            headers: {
                "Content-Type": "text/plain; charset=utf-8"
            }
        });
    }
}
