import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/supabase-config";
import { NextResponse } from "next/server";

const supabase = createClient()
export async function GET() {
    const payload = await getSession()

    const {data: preset, error} = await supabase
        .from("clearance_tasks_preset")
        .select(`
            task_id,
            description
        `)
        .eq("staff_id", payload.id)
    
    if (error) {
        return NextResponse.json({error: error.message}, {status: 500})
    }

    return NextResponse.json({data: preset, id: payload.id}, {status: 200})
}