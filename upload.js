import { put } from "@vercel/blob";

export default async function handler(req, res) {
    // Only allow POST requests.
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed."
        });
    }

    // Protect the upload endpoint.
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.UPLOAD_SECRET;

    if (!expectedToken) {
        console.error("UPLOAD_SECRET is not configured.");
        return res.status(500).json({
            error: "Server configuration error."
        });
    }

    if (authHeader !== `Bearer ${expectedToken}`) {
        return res.status(401).json({
            error: "Unauthorized."
        });
    }

    try {
        const filename = req.headers["x-transcript-filename"];

        if (!filename || typeof filename !== "string") {
            return res.status(400).json({
                error: "Missing transcript filename."
            });
        }

        const html = req.body;

        if (!html) {
            return res.status(400).json({
                error: "Missing transcript content."
            });
        }

        // Keep the filename safe.
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

        return res.status(200).json({
            success: true,
            url: blob.url,
            pathname: blob.pathname
        });

    } catch (error) {
        console.error("Transcript upload failed:", error);

        return res.status(500).json({
            error: "Failed to upload transcript."
        });
    }
}