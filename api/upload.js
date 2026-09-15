import { put } from "@vercel/blob";

export async function POST(request) {
    try {
        const authHeader = request.headers.get("authorization");
        const expectedToken = process.env.UPLOAD_SECRET;

        if (!expectedToken) {
            console.error("UPLOAD_SECRET is not configured.");
            return Response.json(
                { error: "Server configuration error." },
                { status: 500 }
            );
        }

        if (authHeader !== `Bearer ${expectedToken}`) {
            return Response.json(
                { error: "Unauthorized." },
                { status: 401 }
            );
        }

        const filename = request.headers.get("x-transcript-filename");

        if (!filename) {
            return Response.json(
                { error: "Missing transcript filename." },
                { status: 400 }
            );
        }

        const html = await request.text();

        if (!html) {
            return Response.json(
                { error: "Missing transcript content." },
                { status: 400 }
            );
        }

        const safeFilename = filename
            .replace(/[^a-zA-Z0-9._/-]/g, "-")
            .replace(/\/+/g, "/");

        const blob = await put(
            safeFilename,
            html,
            {
                access: "public",
                contentType: "text/html; charset=utf-8",
                addRandomSuffix: false
            }
        );

        return Response.json({
            success: true,
            url: blob.url,
            pathname: blob.pathname
        });

    } catch (error) {
        console.error("Transcript upload failed:", error);

        return Response.json(
            {
                error: "Failed to upload transcript.",
                details: error instanceof Error
                    ? error.message
                    : String(error)
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    return Response.json(
        {
            status: "online",
            message: "Transcript upload API is running."
        },
        { status: 200 }
    );
}
