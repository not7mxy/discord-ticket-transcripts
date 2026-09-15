export async function GET() {
    try {
        const blob = await import("@vercel/blob");

        return Response.json({
            success: true,
            message: "The Blob package loaded!",
            hasPut: typeof blob.put === "function"
        });
    } catch (error) {
        return Response.json(
            {
                success: false,
                error: error instanceof Error
                    ? error.message
                    : String(error)
            },
            { status: 500 }
        );
    }
}
