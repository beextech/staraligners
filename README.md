# StarAligners website

Static site: plain HTML, CSS and JavaScript. No build step, no framework.

```
index.html              page structure and content
css/styles.css          all base styles
css/responsive.css      breakpoints (1080px, 860px, 520px) and reduced-motion rules, loaded after styles.css
js/i18n.js              Albanian copy and form messages (English lives in index.html)
js/main.js              navigation, language switch, reveals, workflow, gallery, 3D scenes
js/form.js              Request a Quote form: validation and sending
privacy-policy.html     Privacy Policy (placeholders to fill in)
terms.html              Terms of Use (placeholders to fill in)
css/legal.css, js/legal.js   styles and footer year for the two legal pages
LEGAL-CHECKLIST.md      what the site collects, what is still missing, what a lawyer should check
assets/images/          before and after photos
assets/logo/            official logo, nav logo mark, favicon
```

The 3D scenes are generated in code (js/main.js) and Three.js loads from jsDelivr, so there are no model files.

## Quote form setup (one value)

The form sends requests through FormSubmit (https://formsubmit.co), which emails them to StarAligners.
No account and no API key are needed.

1. Open `js/form.js` and find `QUOTE_ENDPOINT` near the top.
2. Replace `YOUR_STARALIGNERS_EMAIL` with the inbox that should receive requests, for example
   `'https://formsubmit.co/ajax/quotes@yourdomain.com'`.
3. Publish the site, then send one test request from the live page.
4. FormSubmit emails that inbox an "Activate Form" link. Click it. Until then the form shows its error state,
   because nothing is delivered before activation.
5. Optional: after activation FormSubmit shows a random alias string. Use it in place of the email address
   so the address is not visible in the page source.

Until step 2 is done the form never claims to send: it offers WhatsApp, email or copy instead.

## Testing locally

Run `python3 -m http.server` in this folder and open http://localhost:8000.
Submit once with empty fields (errors), then a valid request (sending, then success or error).

## Legal pages

`privacy-policy.html` and `terms.html` contain highlighted placeholders such as `[STARALIGNERS LEGAL ENTITY NAME]`
(search for `class="ph"`). Fill them in and have them reviewed before launch; see LEGAL-CHECKLIST.md.
If you add analytics, cookies, form fields or new services, update the Privacy Policy first.
