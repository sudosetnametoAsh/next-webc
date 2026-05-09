import { headers } from "next/headers";

export async function serverFetch(endpoint: string) {
    const headerList = await headers()
    const cookieHeader = headerList.get('cookie')


  const url = `${process.env.NEXT_PUBLIC_APP_URL}${endpoint}`;

  const header = {
    'Content-Type': 'application/json',
    ...(cookieHeader && {cookie: cookieHeader}),
  };

  return fetch(url, { headers: header });
}
