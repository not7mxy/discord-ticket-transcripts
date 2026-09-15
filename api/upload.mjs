export async function GET() {
    try {
        const blob = await import("@vercel/blob");

        return Response.json({
            status: "success",
            message: "The Vercel Blob SDK loaded successfully.",
            blob_sdk_loaded: !!blob.put,
            has_blob_token: !!process.env.BLOB_READ_WRITE_TOKEN,
            has_oidc: !!process.env.VERCEL_OIDC_TOKEN
        });
    } catch (error) {
        return Response.json(
            {
                status: "error",
                message: "The Vercel Blob SDK failed to load.",
                error: error instanceof Error
                    ? error.message
                    : String(error)
            },
            { status: 500 }
        );
    }
}
