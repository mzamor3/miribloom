import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const resendFromEmail =
      Deno.env.get("RESEND_FROM_EMAIL") || "orders@miribloom.com";

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    /*
     * Verify the caller is a logged-in MiriBloom user.
     */
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ error: "Invalid session" }, 401);
    }

    /*
     * Verify that user is actually a MiriBloom admin.
     */
    const { data: adminRow, error: adminError } = await userClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminError || !adminRow) {
      return json({ error: "Admin access required" }, 403);
    }

    const body = await req.json();
    const orderId = body?.order_id;

    if (!orderId) {
      return json({ error: "Missing order_id" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    /*
     * Load the order server-side.
     * The browser does not provide recipient/name values.
     */
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select(`
        id,
        box_type,
        amount,
        fulfillment_status,
        customer_name,
        customer_email
      `)
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return json({ error: "Order not found" }, 404);
    }

    if (order.fulfillment_status !== "shipped") {
      return json(
        { error: "Order must be marked shipped before sending this email" },
        400
      );
    }

    if (!order.customer_email) {
      return json({ error: "This order has no customer email" }, 400);
    }

    const firstName =
      order.customer_name?.trim()?.split(" ")[0] || "there";

    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(order.amount || 0));

    const html = `
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#fffaf5;font-family:Arial,sans-serif;color:#26372b">
  <div style="max-width:620px;margin:0 auto;padding:40px 20px">
    <div style="background:#fff;border:1px solid #e4ded6;border-radius:22px;overflow:hidden">

      <div style="background:#edf3e8;text-align:center;padding:30px">
        <div style="font-family:Georgia,serif;font-size:34px;font-weight:bold;color:#2f6138">
          MiriBloom
        </div>
        <div style="font-size:12px;color:#687168;margin-top:7px">
          Beauty that blooms with you.
        </div>
      </div>

      <div style="padding:38px 34px;text-align:center">
        <div style="font-size:38px;color:#e07c78;margin-bottom:10px">♡</div>

        <h1 style="font-family:Georgia,serif;color:#294b34;margin:0 0 14px;font-size:32px">
          Your Bloom has shipped!
        </h1>

        <p style="color:#687168;line-height:1.6;margin:0 0 28px">
          Hi ${escapeHtml(firstName)}, your ${escapeHtml(order.box_type)}
          is officially on its way.
        </p>

        <div style="background:#f5f8f1;border-radius:16px;padding:22px;margin-bottom:28px;text-align:left">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:8px 0;color:#788279">Order</td>
              <td style="padding:8px 0;text-align:right;font-weight:bold;color:#294b34">
                ${escapeHtml(order.box_type)}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#788279">Amount</td>
              <td style="padding:8px 0;text-align:right;font-weight:bold;color:#294b34">
                ${formattedAmount}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#788279">Status</td>
              <td style="padding:8px 0;text-align:right;font-weight:bold;color:#4f764e">
                Shipped ✓
              </td>
            </tr>
          </table>
        </div>

        <a href="https://miribloom.com/orders.html"
           style="display:inline-block;background:#4f764e;color:#fff;text-decoration:none;padding:14px 28px;border-radius:9px;font-weight:bold">
          View My Orders
        </a>

        <p style="margin:30px 0 0;color:#7b847c;font-size:13px;line-height:1.6">
          You can check your latest MiriBloom order status anytime from your account.
        </p>
      </div>

      <div style="text-align:center;padding:20px;background:#fff6f1;color:#7b847c;font-size:11px">
        MiriBloom · Beauty that blooms with you.
      </div>
    </div>
  </div>
</body>
</html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `MiriBloom <${resendFromEmail}>`,
        to: [order.customer_email],
        subject: `Your ${order.box_type} has shipped ♡`,
        html,
      }),
    });

    const resendBody = await resendResponse.text();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendResponse.status, resendBody);
      return json(
        { error: "Shipping email failed", details: resendBody },
        500
      );
    }

    console.log("Shipping email sent for order:", order.id);

    return json({ success: true }, 200);
  } catch (error) {
    console.error("send-shipping-email error:", error);
    return json(
      { error: error?.message || "Server error" },
      500
    );
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
