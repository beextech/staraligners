/* StarAligners: Request a Quote form
   Visitor → this form → FormSubmit (formsubmit.co) → StarAligners inbox.
   Depends on js/i18n.js (MSG) and js/main.js (window.StarAligners). */
(() => {
'use strict';

/* ══════════════ CONFIGURATION ══════════════
   Replace YOUR_STARALIGNERS_EMAIL with the inbox that should receive quote requests,
   for example: 'https://formsubmit.co/ajax/quotes@yourdomain.com'
   The first real submission makes FormSubmit email that inbox an activation link.
   Click it once; after that every request is delivered. FormSubmit then also offers
   a random alias you can put here instead of the address, so it is not visible in the page source. */
const QUOTE_ENDPOINT = 'https://formsubmit.co/ajax/YOUR_STARALIGNERS_EMAIL';
const TIMEOUT_MS = 20000;
const configured = !QUOTE_ENDPOINT.includes('YOUR_STARALIGNERS_EMAIL');

const { $, $$, reduced, copyText, getLang } = window.StarAligners;
const form = $('#quoteForm'), fields = $('#formFields'), btn = $('#qSubmit');
const WA_NUMBER = '38345821219', EMAIL = 'staraligners@gmail.com';
const val = id => ($('#q-' + id)?.value || '').trim();

/* ── Validation ── */
const rules = {
  name: () => val('name').length >= 2,
  company: () => val('company').length >= 2,
  email: () => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val('email')),
  phone: () => !val('phone') || /^[+()\d\s.-]{6,20}$/.test(val('phone')),
  country: () => val('country').length >= 2,
  interest: () => $$('input[name="interests"]:checked').length > 0
};
function validateField(key){
  if (!rules[key]) return true;
  const ok = rules[key](), wrap = $('#f-' + key), err = $('#e-' + key);
  wrap.classList.toggle('bad', !ok);
  if (err) err.textContent = ok ? '' : MSG[getLang()][key];
  const input = $('#q-' + key); if (input) input.setAttribute('aria-invalid', String(!ok));
  return ok;
}
['name','company','email','phone','country'].forEach(k => {
  const i = $('#q-' + k);
  i.addEventListener('blur', () => { if (i.value.trim()) validateField(k); });
  i.addEventListener('input', () => { if ($('#f-' + k).classList.contains('bad')) validateField(k); });
});
$$('input[name="interests"]').forEach(c => c.addEventListener('change', () => { if ($('#f-interest').classList.contains('bad')) validateField('interest'); }));
// Re-translate visible error messages when the language changes
document.addEventListener('sa:lang', () => $$('.fld.bad').forEach(f => validateField(f.id.replace('f-',''))));

/* ── Request data ── */
function collect(){
  return {
    name: val('name'), company: val('company'), email: val('email'), phone: val('phone'), country: val('country'),
    volume: ($('input[name="volume"]:checked') || {}).value || '',
    interests: $$('input[name="interests"]:checked').map(c => c.value),
    message: val('message'), lang: getLang()
  };
}
// Plain-text summary in the visitor's language (WhatsApp / email fallback)
function summary(d){
  const m = MSG[getLang()], L = m.lbl, lines = [m.reqTitle, ''];
  lines.push(`${L.name}: ${d.name}`, `${L.company}: ${d.company}`, `${L.email}: ${d.email}`);
  if (d.phone) lines.push(`${L.phone}: ${d.phone}`);
  lines.push(`${L.country}: ${d.country}`);
  if (d.volume) lines.push(`${L.volume}: ${m.vol[d.volume]}`);
  lines.push(`${L.interests}: ${d.interests.map(i => m.int[i]).join(', ')}`);
  if (d.message) lines.push('', `${L.message}:`, d.message);
  return lines.join('\n');
}
// What StarAligners receives by email: always in English, one row per field
function emailPayload(d){
  const m = MSG.en, L = m.lbl;
  const p = {
    _subject: `New quote request: ${d.company}`,
    _template: 'table',
    _captcha: 'false',
    _replyto: d.email,
    _honey: $('#q-web').value
  };
  p[L.name] = d.name;
  p[L.company] = d.company;
  p[L.email] = d.email;
  p[L.phone] = d.phone || '-';
  p[L.country] = d.country;
  p[L.volume] = d.volume ? m.vol[d.volume] : '-';
  p[L.interests] = d.interests.map(i => m.int[i]).join(', ');
  p[L.message] = d.message || '-';
  p['Website language'] = d.lang === 'al' ? 'Albanian' : 'English';
  return p;
}

/* ── States: form, handoff (not configured), success, error ── */
function showState(id){
  fields.hidden = !!id;
  ['stHandoff','stSuccess','stError'].forEach(s => $('#' + s).hidden = s !== id);
  if (id) { const st = $('#' + id); st.focus({ preventScroll:true }); const top = form.getBoundingClientRect().top + scrollY - 100; if (top < scrollY) scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' }); }
}
$$('[data-edit]').forEach(b => b.addEventListener('click', () => { showState(null); $('#q-name').focus(); }));

let sending = false, idleLabel = '';
function setBusy(on){
  const lbl = btn.querySelector('span');
  sending = on;
  btn.disabled = on;
  if (on) { idleLabel = lbl.innerHTML; btn.setAttribute('aria-busy', 'true'); lbl.textContent = MSG[getLang()].sending; }
  else { btn.removeAttribute('aria-busy'); lbl.innerHTML = idleLabel; }
}

async function send(payload){
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(QUOTE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    let body = {}; try { body = await res.json(); } catch (e) {}
    // FormSubmit answers { success: "true" } only when the message was accepted for delivery
    if (!res.ok || !(body.success === true || body.success === 'true')) throw new Error(body.message || 'HTTP ' + res.status);
  } finally { clearTimeout(timer); }
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (sending) return; // no duplicate submissions while a request is in flight
  const order = ['name','company','email','phone','country','interest'];
  const bad = order.filter(k => !validateField(k));
  $('#formSummary').textContent = bad.length ? MSG[getLang()].summary : '';
  if (bad.length) { const first = bad[0] === 'interest' ? $('#i-aligners') : $('#q-' + bad[0]); first.focus(); return; }
  if ($('#q-web').value) return; // honeypot: only bots fill the hidden field

  const data = collect();
  if (!configured) {
    // No receiving inbox set yet: never pretend it was sent, offer WhatsApp / email instead
    const text = summary(data);
    $('#reqPreview').textContent = text;
    $('#sendWa').href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
    $('#sendMail').href = `mailto:${EMAIL}?subject=${encodeURIComponent(MSG[getLang()].reqTitle)}&body=${encodeURIComponent(text)}`;
    $('#copyReq').onclick = () => copyText(text, $('#copyReq'));
    showState('stHandoff');
    return;
  }

  setBusy(true);
  try {
    await send(emailPayload(data));
    form.reset();
    showState('stSuccess');
  } catch (err) {
    console.warn('Quote request was not sent:', err.message);
    showState('stError');
  } finally { setBusy(false); }
});
})();
