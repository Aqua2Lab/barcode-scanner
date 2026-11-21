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

## Employee onboarding

`onboarding.html` is a separate page for new hires at Varsa Group LLC (Thomasville Chevron and Thomasville Outrun):

https://aqua2lab.github.io/barcode-scanner/onboarding.html

It does not use the inventory scanner or the ACH page. Social Security numbers, Form W-4 answers, Form I-9 Section 1, and document photos are not sent to those sheets. The page checks the form in the browser, fills the official 2026 Form W-4 and USCIS Form I-9 (Edition 01/20/25) for the employee to download, then posts to the web app URL in `ONBOARDING_SHEET_URL` at the top of `onboarding.js`. That constant is empty until you deploy `onboarding-apps-script.gs`. Until then, the page tells the employee the form is not connected yet.

The bundled forms are `forms/fw4-2026.pdf` (from irs.gov) and `forms/i-9.pdf` (from uscis.gov). See `forms/SOURCE.txt`.

### Connect the Google Sheet (one time)

1. Create a **new** Google Sheet named `Varsa Group Onboarding`. Do not use the inventory spreadsheet or the ACH spreadsheet. Keep this sheet private to you.
2. Open **Extensions → Apps Script**. Confirm the runtime is V8. Delete the sample `Code.gs` contents and paste in the full file `onboarding-apps-script.gs`. Save.
3. **Deploy → New deployment → gear icon → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Authorize the script. It needs the spreadsheet and Google Drive (document photos are saved in a private Drive folder named `Varsa Group Onboarding`). Copy the web app URL. It ends in `/exec`.
5. Paste that URL between the quotes of `ONBOARDING_SHEET_URL` in `onboarding.js`. Do not paste the inventory scanner URL or the ACH URL.
6. Merge that one-line change to `main`. GitHub Pages publishes this repo from `main`.

"Anyone" lets the public page submit. It does not share the spreadsheet or the Drive folder. Leave both private. Do not turn on Apps Script logging that records the request body.

The script creates a tab named `Onboarding` and inserts each submission at the top. A blank `Sheet1` in that new spreadsheet is renamed to `Onboarding`. Any other existing tab is left alone. Social Security numbers, phone numbers, and ZIP codes are stored as text. Each hire gets a subfolder of photos inside `Varsa Group Onboarding`. The folder name is the date and the legal name, not the Social Security number.

Open the `/exec` URL once after deploying. It should say `Varsa Group onboarding endpoint is running.` Then submit one test from the page and confirm the row is on the Onboarding tab only, and the photos are in that Drive folder. The thank-you page does not repeat the Social Security number. Download the filled W-4 and I-9 from that page and check the boxes.

The page is the electronic Form W-4: it shows the same steps as the 2026 paper form, including the perjury statement, and the typed name is the last entry. USCIS says the official fillable Form I-9 is not itself an electronic I-9 system, so a manager may also need a handwritten signature on a printed copy. The typed name is still stored and placed on the downloaded copy. Serve the page only over HTTPS. GitHub Pages already does.
