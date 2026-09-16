import crypto from "crypto";

const SESSION_COOKIE = "ticket_staff_session";
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours
const STATE_COOKIE = "oauth_state";

function base64urlEncode(value) {
    return Buffer.from(value)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function base64urlDecode(value) {
    value = value
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    while (value.length % 4) {
        value += "=";
    }

    return Buffer.from(value, "base64").toString("utf8");
}

function getSessionSecret() {
    const secret = process.env.SESSION_SECRET;

    if (!secret) {
        throw new Error("SESSION_SECRET is not configured.");
    }

    return secret;
}

function sign(value) {
    return crypto
        .createHmac("sha256", getSessionSecret())
        .update(value)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

export function createSession(userId) {
    const payload = {
        userId: String(userId),
        expiresAt: Date.now() + SESSION_DURATION
    };

    const encoded = base64urlEncode(
        JSON.stringify(payload)
    );

    const signature = sign(encoded);

    return `${encoded}.${signature}`;
}

export function verifySession(session) {
    try {
        if (!session || !session.includes(".")) {
            return null;
        }

        const [encoded, providedSignature] =
            session.split(".");

        if (!encoded || !providedSignature) {
            return null;
        }

        const expectedSignature = sign(encoded);

        const providedBuffer =
            Buffer.from(providedSignature);

        const expectedBuffer =
            Buffer.from(expectedSignature);

        if (
            providedBuffer.length !== expectedBuffer.length ||
            !crypto.timingSafeEqual(
                providedBuffer,
                expectedBuffer
            )
        ) {
            return null;
        }

        const payload = JSON.parse(
            base64urlDecode(encoded)
        );

        if (
            !payload.userId ||
            !payload.expiresAt ||
            Date.now() >= payload.expiresAt
        ) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

export function getCookie(request, name) {
    const cookieHeader =
        request.headers.get("cookie") || "";

    const cookie = cookieHeader
        .split(";")
        .map(value => value.trim())
        .find(
            value => value.startsWith(`${name}=`)
        );

    if (!cookie) {
        return null;
    }

    return decodeURIComponent(
        cookie.substring(name.length + 1)
    );
}

export function createSessionCookie(session) {
    return [
        `${SESSION_COOKIE}=${encodeURIComponent(session)}`,
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
        "Path=/",
        `Max-Age=${SESSION_DURATION / 1000}`
    ].join("; ");
}

export function createExpiredSessionCookie() {
    return [
        `${SESSION_COOKIE}=`,
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
        "Path=/",
        "Max-Age=0"
    ].join("; ");
}

export function createStateCookie(state) {
    return [
        `${STATE_COOKIE}=${encodeURIComponent(state)}`,
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
        "Path=/",
        "Max-Age=600"
    ].join("; ");
}

export function getSession(request) {
    const session =
        getCookie(request, SESSION_COOKIE);

    return verifySession(session);
}

export function isValidReturnPath(value) {
    if (!value) {
        return false;
    }

    try {
        const parsed = new URL(
            value,
            "https://chessinc-tickets.vercel.app"
        );

        return (
            parsed.origin ===
                "https://chessinc-tickets.vercel.app" &&
            parsed.pathname === "/api/view" &&
            parsed.searchParams.has("url")
        );
    } catch {
        return false;
    }
}

export async function isStaffMember(userId) {
    const guildId =
        process.env.DISCORD_GUILD_ID;

    const botToken =
        process.env.DISCORD_BOT_TOKEN;

    const staffRoleId =
        process.env.STAFF_ROLE_ID;

    if (
        !guildId ||
        !botToken ||
        !staffRoleId
    ) {
        throw new Error(
            "Discord staff authorization is not configured."
        );
    }

    const response = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
        {
            headers: {
                Authorization:
                    `Bot ${botToken}`
            }
        }
    );

    if (response.status === 404) {
        return false;
    }

    if (!response.ok) {
        console.error(
            "Discord staff verification failed:",
            await response.text()
        );

        throw new Error(
            "Unable to verify Discord staff status."
        );
    }

    const member =
        await response.json();

    return (
        Array.isArray(member.roles) &&
        member.roles.includes(staffRoleId)
    );
}

export {
    SESSION_COOKIE,
    STATE_COOKIE
};
