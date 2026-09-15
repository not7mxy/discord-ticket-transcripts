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

    <style>
        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #111111;
            color: #ffffff;
            font-family: Arial, sans-serif;
        }

        .box {
            text-align: center;
            padding: 40px;
            border-radius: 12px;
            background: #1c1c1c;
            max-width: 500px;
        }

        a {
            color: #7289da;
        }
    </style>
</head>

<body>
    <div class="box">
        <h1>Logged out</h1>

        <p>
            Your ticket transcript viewer session
            has been cleared.
        </p>

        <p>
            <a href="/">Return to the ticket site</a>
        </p>
    </div>
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
