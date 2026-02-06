import { cookies } from "next/headers";

export async function serverFetch(endpoint: string) {
    const cookie = await cookies();
    const token = cookie.get("session_token")?.value

    const url = `${process.env.NEXT_PUBLIC_APP_URL}${endpoint}`

    const headers = {
        'Content-Type': 'application/json',
        'Cookie': `session_token=${token}`
    }

    return fetch(url, { headers })
}
