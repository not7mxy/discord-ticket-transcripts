import { put } from "@vercel/blob";

export async function POST(request) {
    try {
        const authHeader = request.headers.get("authorization");
        const uploadSecret = process.env.UPLOAD_SECRET;

        if (!uploadSecret) {
            return Response.json(
                {
                    success: false,
                    error: "UPLOAD_SECRET is not configured."
                },
                { status: 500 }
            );
        }

        if (authHeader !== `Bearer ${uploadSecret}`) {
            return Response.json(
                {
                    success: false,
                    error: "Unauthorized."
                },
                { status: 401 }
            );
        }

        const body = await request.arrayBuffer();

        if (!body || body.byteLength === 0) {
            return Response.json(
                {
                    success: false,
                    error: "Empty request body."
                },
                { status: 400 }
            );
        }

        let filename =
            request.headers.get("x-transcript-filename") ||
            `transcript-${Date.now()}.html`;

        filename = filename
            .replace(/\\/g, "/")
            .replace(/[^a-zA-Z0-9._/-]/g, "_")
            .replace(/^\/+/, "");

        if (!filename.endsWith(".html")) {
            filename += ".html";
        }

        const blob = await put(filename, body, {
            access: "public",
            contentType: "text/html; charset=utf-8",
            addRandomSuffix: true
        });

        // Create a URL that goes through our Vercel viewer.
        // This makes the browser render the HTML instead of downloading it.
        const origin = new URL(request.url).origin;

        const viewUrl =
            `${origin}/api/view?url=${encodeURIComponent(blob.url)}`;

        return Response.json({
            success: true,
            url: blob.url,
            viewUrl: viewUrl
        });

    } catch (error) {
        console.error("Blob upload error:", error);

        return Response.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : String(error)
            },
            { status: 500 }
        );
    }
}
