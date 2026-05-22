import { makeGetSchedule } from "@/composition/staff/make-get-schedule";
import { makeSetSchedule } from "@/composition/staff/make-set-schedule";
import { getSession } from "@/lib/auth/get-session";
import { NotFoundError } from "@/modules/staff/application/error";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { user_id } = await getSession();

  // const useCase = new GetSchedule(new StaffRepository());
  const use_case = makeGetSchedule()

  try {
    const response = await use_case.execute(user_id);

    return NextResponse.json(
      {
        data: response,
      },
      { status: 200 },
    );
  } catch (error) {

    if (error instanceof NotFoundError) {
      // Return empty schedule instead of 404 to avoid frontend crash/error
      return NextResponse.json(
        { data: { time_in: null, time_out: null } },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const { user_id, user_name } = await getSession();
  const { time_in, time_out } = await req.json();

  // const useCase = new SetSchedule(new StaffRepository());
  const use_case = makeSetSchedule()

  try {
    await use_case.execute(user_id, time_in, time_out, user_name);

    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
