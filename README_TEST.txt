TEMPORARY SANDBOX ORDER TEST

Upload/replace in GitHub:
- purchase.html
- purchase.js
- supabase.js (only if your current one differs)

Then:
1. Log into the approved MiriBloom test account.
2. Open https://miribloom.com/purchase.html
3. Click Bloom Mini — $15 from MiriBloom, NOT directly from Stripe.
4. Use 4242 4242 4242 4242.
5. Check Stripe Sandbox webhook = 200.
6. Refresh Supabase orders.

The sandbox Bloom Mini Payment Link must have:
box_type = Bloom Mini

After testing, restore the live Bloom Mini link.
