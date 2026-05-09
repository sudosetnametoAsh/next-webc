import { makeGetLogOutUrl } from "@/composition/auth/make-get-log-out-url";
import { NextResponse } from "next/server";

export async function GET() {

    const get_log_out_url = makeGetLogOutUrl();

    const log_out_url = await get_log_out_url.execute()

    return NextResponse.redirect(log_out_url)

}
