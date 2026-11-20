# Barcode Scanner

Simple camera barcode scanner. Scan, enter product name, shelf qty, stock qty and comment, then Save. Each save adds a timestamped row (newest on top) to a Google Sheet through an Apps Script web app (`Code.gs`).

Open `index.html` (Thomasville Chevron) or `outrun.html` (Thomasville Outrun) in Chrome/Edge, or the GitHub Pages links, and allow the camera. Both pages use the same scanner.

## ACH payment setup

`ach.html` is a separate page for Varsa Group LLC payees:

https://aqua2lab.github.io/barcode-scanner/ach.html

It does not use the inventory scanner. Bank details are not sent to the inventory sheet. The page checks the form in the browser, then posts to the web app URL in `ACH_SHEET_URL` at the top of `ach.js`. That constant is empty until you deploy `ach-apps-script.gs`. Until then, the page tells the payee the form is not connected yet.

### Connect the Google Sheet (one time)

1. Create a **new** Google Sheet named `Varsa Group ACH`. Do not use the inventory spreadsheet. Keep this sheet private to you.
2. Open **Extensions → Apps Script**. Delete the sample `Code.gs` contents and paste in the full file `ach-apps-script.gs`. Save.
3. **Deploy → New deployment → gear icon → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Authorize the script. Copy the web app URL. It ends in `/exec`.
5. Paste that URL between the quotes of `ACH_SHEET_URL` in `ach.js`. Do not paste the inventory scanner URL.
6. Merge that one-line change to `main`. GitHub Pages publishes this repo from `main`.

The script creates a tab named `ACH` and inserts each submission at the top. The timestamp uses the spreadsheet's timezone. Account, routing, and phone are stored as text so leading zeros stay put. A blank `Sheet1` in that new spreadsheet is renamed to `ACH`. Any other existing tab is left alone.

Open the `/exec` URL once after deploying. It should say `Varsa Group ACH endpoint is running.` Then submit one test from the page and confirm the row is on the ACH tab only. The thank-you message means the browser sent the form. It does not repeat the bank details.
