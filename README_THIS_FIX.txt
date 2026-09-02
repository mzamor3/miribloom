Why NULL:
The columns existed, but auth.js was still building the Supabase payload without eye_color and hair_color. This package adds:
eye_color: answers.eyeColor
hair_color: answers.hairColor

After uploading, retake the quiz and save it again while logged in.

Delete Account was moved from the bottom of the page into:
Hi, [name] -> Account Settings -> Delete Account
