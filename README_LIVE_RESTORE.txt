MiriBloom LIVE purchase flow restored.

LIVE Stripe links:
Bloom Mini — $15
https://buy.stripe.com/28E14ncW6duY5V9bv5aZi02

Bloom Box — $29
https://buy.stripe.com/00w5kDcW62Qk1ET6aLaZi01

Upload/replace in GitHub:
- purchase.html
- purchase.js
- supabase.js only if your current supabase.js differs

IMPORTANT SUPABASE STEP:
Your STRIPE_WEBHOOK_SECRET is currently using the SANDBOX webhook signing secret from testing.
Before accepting real payments, replace STRIPE_WEBHOOK_SECRET with the LIVE MiriBloom Stripe webhook signing secret.

Then redeploy stripe-webhook.

The live Stripe webhook destination should point to:
https://kpyhtvymgfsrrhijyyjs.supabase.co/functions/v1/stripe-webhook

The live Payment Links should keep metadata:
Bloom Mini: box_type = Bloom Mini
Bloom Box: box_type = Bloom Box

Keep Verify JWT OFF for stripe-webhook.

The client_reference_id logic remains enabled, so live MiriBloom purchases can be tied to the logged-in Supabase user and inserted into orders.
