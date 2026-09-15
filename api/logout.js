import {
    createExpiredSessionCookie
} from "../lib/auth.js";

export async function GET() {
    return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Logged Out</title>
        </head>
        <body>
            <h1>Logged out</h1>
            <p>Your transcript viewer session has been cleared.</p>
            <p><a href="/">Return to the ticket site</a></p>
        </body>
        </html>
        `,
        {
            status: 200,
            headers: {
                "Content-Type":
                    "text/html; charset=utf-8",

                "Set-Cookie":
                    createExpiredSessionCookie(),

                "Cache-Control":
                    "no-store"
            }
        }
    );
}
