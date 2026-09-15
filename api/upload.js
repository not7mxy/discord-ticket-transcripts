export async function GET() {
    return Response.json({
        status: "online",
        message: "Vercel function is working."
    });
}

export async function POST() {
    return Response.json({
        status: "online",
        message: "POST endpoint is working."
    });
}
