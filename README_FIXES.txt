MiriBloom fixes in this package

1) Quiz wording
- "What is your top skincare goal?" is now "What is your main skincare concern?"
- Eye Color and Hair Color stay inside Take the Beauty Quiz.

2) Eye/Hair values
- Run ADD_EYE_HAIR_COLUMNS.sql in Supabase SQL Editor.
- Replace quiz.js, app.js, auth.js, account.html, account.js, style.css, index.html in GitHub.
- Retake the Beauty Quiz and save. eye_color and hair_color will now save to beauty_profiles.

3) Edit Beauty Profile
- Eye Color and Hair Color are now editable in My Account.

4) Delete Account
- A Delete Account section was added to My Account.
- For secure deletion, deploy the included Supabase Edge Function:
  supabase-functions/delete-account/index.ts
- In Supabase Edge Functions, create/deploy a function named exactly:
  delete-account
- The function uses Supabase's built-in SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY environment values server-side.
- NEVER place the service role key in GitHub or browser JavaScript.

After deploying, test with a disposable account first.
