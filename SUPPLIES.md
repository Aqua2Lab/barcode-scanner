# Office Supply Tracker

https://aqua2lab.github.io/barcode-scanner/supplies.html

Simple count app for Thomasville Chevron and Thomasville OutRun. Each save writes one row per item to the Google Sheet **Varsa Group - Office Supply Tracker**.

Sheet: https://docs.google.com/spreadsheets/d/1dw60YyEb_rs8VhmDB-oQTxtY4FglLCcj0W4g8b_rloY/edit

## Connect the Google Sheet (one time)

1. Open the spreadsheet above. Confirm the timezone is America/Chicago and that it has tabs named Counts, Items, and Current.
2. Open **Extensions → Apps Script**. Delete the sample `Code.gs` contents and paste in the full file `supplies-apps-script.gs`. Save. Confirm the runtime is V8.
3. **Deploy → New deployment → gear icon → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Authorize the script. Copy the web app URL. It ends in `/exec`.
5. Paste that URL between the quotes of `SHEET_ENDPOINT` in `supplies.html`. Do not paste the inventory, ACH, onboarding, or direct-deposit URLs.
6. Merge that change to `main`. GitHub Pages publishes this repo from `main`.

"Anyone" lets the public page submit. It does not share the spreadsheet. Leave the spreadsheet private.

Open the `/exec` URL once after deploying. It should say `Varsa Group office supply tracker endpoint is running.` Then save one test count from the page and confirm the rows landed on the Counts tab only. Delete those test rows when you are done.

If the sheet is still in My Drive, move it into the Varsa Group LLC Drive folder. The tracker app could create the file but could not move it into that existing folder.
