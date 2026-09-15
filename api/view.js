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

        // Only allow our Vercel Blob storage domain.
        if (!parsedUrl.hostname.endsWith(".blob.vercel-storage.com")) {
            return new Response("Invalid transcript URL.", {
                status: 400,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            });
        }

        const response = await fetch(blobUrl);

        if (!response.ok) {
            return new Response("Transcript not found.", {
                status: response.status,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8"
                }
            });
        }

        const html = await response.text();

        return new Response(html, {
            status: 200,
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Content-Disposition": "inline",
                "Cache-Control": "public, max-age=60"
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
