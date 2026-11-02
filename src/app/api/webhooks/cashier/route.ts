import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { dispatchReadyForSigningNotifications } from "@/lib/services/ready-for-signing-notifications";
import { invalidateServerClearanceCache } from "@/lib/services/clearance-cache";
import { invalidateServerDepartmentCache } from "@/lib/services/department-cache";
import { invalidateServerAdminCache } from "@/lib/services/admin-cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/webhooks/cashier
 * Health check & developer specifications for the Cashier Webhook integration.
 */
export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "Next-WebC Cashier Webhook Ingestion API",
    version: "2.0 (Event-Driven Direct Settlement)",
    headers: {
      "Authorization": "Bearer <CASHIER_WEBHOOK_SECRET> or 'x-cashier-secret'",
      "Content-Type": "application/json",
    },
    samplePayload: {
      userId: "02000248919",
      action: "settle",
      amountPaid: 2500.00,
      transactionRef: "OR-2026-98124",
      remarks: "Final tuition fee settlement",
    },
  });
}

/**
 * POST /api/webhooks/cashier
 * Receives payment & settlement events from the external Cashier system.
 * Directly signs the Cashier clearance record without requiring an internal balance table.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify Webhook Secret
    const webhookSecret = process.env.CASHIER_WEBHOOK_SECRET || "cashier_webhook_secret_key_2026";
    const authHeader = req.headers.get("authorization") || req.headers.get("x-cashier-secret") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();

    if (!token || token !== webhookSecret) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing webhook secret." },
        { status: 401 }
      );
    }

    // 2. Parse & Validate Payload
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request payload." },
        { status: 400 }
      );
    }

    const userId = (body.userId || body.studentId || body.student_id || body.client_id || body.user_id)?.toString().trim();
    const action = (body.action || body.status || "").toString().toLowerCase().trim();
    const rawBalance = body.balance !== undefined ? body.balance : body.remaining_balance;
    const amountPaid = body.amountPaid !== undefined ? body.amountPaid : body.amount_paid;
    const transactionRef = (body.transactionRef || body.transaction_ref || body.reference_no || body.or_number)?.toString().trim();

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: 'userId' (or 'studentId')." },
        { status: 400 }
      );
    }

    // Determine settlement outcome (supports both event actions and legacy numeric balances)
    const hasNumericBalance = rawBalance !== undefined && rawBalance !== null && !isNaN(Number(rawBalance));
    const numericBalance = hasNumericBalance ? Number(rawBalance) : null;

    const isRevoked =
      action === "revoke" ||
      action === "unsettle" ||
      action === "pending" ||
      (hasNumericBalance && numericBalance! > 0 && action !== "settle" && action !== "sign");

    const isSettled =
      !isRevoked &&
      (action === "settle" ||
        action === "sign" ||
        action === "cleared" ||
        action === "settled" ||
        body.isSettled === true ||
        (hasNumericBalance && numericBalance! <= 0) ||
        (!action && hasNumericBalance && numericBalance! <= 0));

    const adminClient = getSupabaseAdmin();

    // 3. Verify that the User exists in public.users
    const { data: userRecord, error: userFetchError } = await adminClient
      .from("users")
      .select("user_id, email")
      .eq("user_id", userId)
      .maybeSingle();

    if (userFetchError) {
      console.error("[Cashier Webhook] Error querying user:", userFetchError);
      return NextResponse.json(
        { error: "Database error verifying user identity." },
        { status: 500 }
      );
    }

    if (!userRecord) {
      return NextResponse.json(
        {
          error: `Client with ID '${userId}' is not enrolled in the clearance system.`,
        },
        { status: 404 }
      );
    }

    // 4. Idempotency Check (if transactionRef provided)
    if (transactionRef) {
      const { data: existingEvent, error: existingEventError } = await adminClient
        .from("cashier_webhook_events")
        .select("event_id, received_at, remaining_balance")
        .eq("transaction_ref", transactionRef)
        .maybeSingle();

      if (existingEventError) {
        console.warn("[Cashier Webhook] Warning querying webhook events:", existingEventError);
      }

      if (existingEvent) {
        return NextResponse.json(
          {
            success: true,
            status: "already_processed",
            message: `Transaction '${transactionRef}' has already been processed on ${existingEvent.received_at}.`,
            data: {
              userId,
              isSettled: existingEvent.remaining_balance !== null ? Number(existingEvent.remaining_balance) <= 0 : true,
            },
          },
          { status: 200 }
        );
      }

      // Record event into audit log
      const { error: eventInsertError } = await adminClient
        .from("cashier_webhook_events")
        .insert({
          user_id: userId,
          transaction_ref: transactionRef,
          amount_paid: amountPaid !== undefined && !isNaN(Number(amountPaid)) ? Number(amountPaid) : null,
          remaining_balance: numericBalance,
          payload: body,
        });

      if (eventInsertError) {
        console.warn("[Cashier Webhook] Warning recording webhook event log:", eventInsertError);
      }
    }

    // 5. Directly sign or revoke Cashier clearance in clearance_records
    const { data: cashierRecords, error: cashierQueryError } = await adminClient
      .from("clearance_records")
      .select("clearance_id, status, clearance_templates!inner(dept_id, clearance_departments!inner(dept_name))")
      .eq("user_id", userId)
      .eq("clearance_templates.clearance_departments.dept_name", "Cashier");

    if (cashierQueryError) {
      console.error("[Cashier Webhook] Error querying Cashier clearance records:", cashierQueryError);
    }

    let isCashierSigned = false;

    if (cashierRecords && cashierRecords.length > 0) {
      const targetStatus = isRevoked ? "Pending" : isSettled ? "Signed" : null;
      if (targetStatus) {
        const clearanceIds = cashierRecords.map((r: any) => r.clearance_id);
        const { error: updateError } = await adminClient
          .from("clearance_records")
          .update({
            status: targetStatus,
            signed_at: targetStatus === "Signed" ? new Date().toISOString() : null,
          })
          .in("clearance_id", clearanceIds);

        if (updateError) {
          console.error("[Cashier Webhook] Error updating clearance status:", updateError);
          return NextResponse.json(
            { error: "Failed to update Cashier clearance record." },
            { status: 500 }
          );
        }

        isCashierSigned = targetStatus === "Signed";
      }
    }

    // Invalidate server-side clearance cache & department cache & admin cache
    invalidateServerClearanceCache(userId);
    invalidateServerDepartmentCache();
    invalidateServerAdminCache();

    // 6. Dispatch in-app notification if settled
    if (isSettled && isCashierSigned) {
      try {
        await adminClient.from("notifications").insert({
          user_id: userId,
          target_role: "student",
          category: "clearance",
          title: "Cashier Clearance Settled",
          description: transactionRef
            ? `Payment verified (${transactionRef}). Your Cashier clearance requirement is now Signed.`
            : "Your account balance has been settled. Cashier clearance is now Signed.",
          type: "Success",
          ref_url: "/clearance",
          is_read: false,
          metadata: {
            transactionRef,
            amountPaid,
            settledAt: new Date().toISOString(),
          },
        });
      } catch (notifErr) {
        console.warn("[Cashier Webhook] Could not insert settlement notification:", notifErr);
      }

      // 7. Dispatch "Ready for Signing" notifications strictly to subsequent prerequisite departments (e.g. Tier 2)
      try {
        const signedTiersByUser = new Map<string, Set<number>>();
        signedTiersByUser.set(userId, new Set([1]));

        await dispatchReadyForSigningNotifications({
          signedUserIds: [userId],
          signedTiersByUser,
          adminClient,
          isSingleRecordSign: true,
        });
      } catch (readyErr) {
        console.warn("[Cashier Webhook] Could not dispatch ready for signing notifications:", readyErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: isSettled
          ? "Payment settled successfully. Cashier clearance signed."
          : isRevoked
          ? "Cashier clearance status reverted to Pending."
          : "Payment event processed successfully.",
        data: {
          userId,
          isSettled,
          cashierClearanceSigned: isCashierSigned,
          transactionRef: transactionRef || null,
          processedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Cashier Webhook] Unexpected error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
