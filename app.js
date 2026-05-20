'use strict';

/* ── DOM references: Views & Toggles ── */
const signupView   = document.getElementById('signup-view');
const loginView    = document.getElementById('login-view');
const linkToLogin  = document.getElementById('link-to-login');
const linkToSignup = document.getElementById('link-to-signup');

/* ── DOM references: Signup Form ── */
const emailInput = document.getElementById('email');
const pwInput    = document.getElementById('password');
const cfInput    = document.getElementById('confirm');
const termsCb    = document.getElementById('terms');

const emailErr   = document.getElementById('email-err');
const pwErr      = document.getElementById('pw-err');
const cfErr      = document.getElementById('cf-err');
const termsErr   = document.getElementById('terms-err');
const matchLine  = document.getElementById('match-line');

const eyePwBtn   = document.getElementById('eye-pw');
const eyeCfBtn   = document.getElementById('eye-cf');
const eyePwOff   = document.getElementById('eye-pw-off');
const eyePwOn    = document.getElementById('eye-pw-on');
const eyeCfOff   = document.getElementById('eye-cf-off');
const eyeCfOn    = document.getElementById('eye-cf-on');

const form       = document.getElementById('signup-form');
const btnNext    = document.getElementById('btn-next');
const btnLbl     = document.getElementById('btn-lbl');
const btnSpin    = document.getElementById('btn-spin');
const formCard   = document.getElementById('form-card');

/* ── DOM references: Login Form ── */
const loginForm      = document.getElementById('login-form');
const loginEmail     = document.getElementById('login-email');
const loginPw        = document.getElementById('login-password');
const loginEmailErr  = document.getElementById('login-email-err');
const loginPwErr     = document.getElementById('login-pw-err');

const loginEyePw     = document.getElementById('login-eye-pw');
const loginEyePwOff  = document.getElementById('login-eye-pw-off');
const loginEyePwOn   = document.getElementById('login-eye-pw-on');

const loginBtnNext   = document.getElementById('login-btn-next');
const loginBtnLbl    = document.getElementById('login-btn-lbl');
const loginBtnSpin   = document.getElementById('login-btn-spin');

/* ════════════════════════════
   VIEW TOGGLING
════════════════════════════ */
linkToLogin.addEventListener('click', (e) => {
  e.preventDefault();
  signupView.classList.add('gone');
  loginView.classList.remove('gone');
});

linkToSignup.addEventListener('click', (e) => {
  e.preventDefault();
  loginView.classList.add('gone');
  signupView.classList.remove('gone');
});

/* ════════════════════════════
   EYE TOGGLE
════════════════════════════ */
function toggleEye(input, offIco, onIco) {
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  offIco.classList.toggle('gone',  show);
  onIco.classList.toggle('gone',  !show);
}

eyePwBtn.addEventListener('click', () => toggleEye(pwInput, eyePwOff, eyePwOn));
eyeCfBtn.addEventListener('click', () => toggleEye(cfInput, eyeCfOff, eyeCfOn));
loginEyePw.addEventListener('click', () => toggleEye(loginPw, loginEyePwOff, loginEyePwOn));

/* ════════════════════════════
   STATE HELPERS
════════════════════════════ */
function setErr(input, el, msg) {
  input.classList.add('err');
  input.classList.remove('ok');
  el.textContent = msg;
}

function setOk(input, el) {
  input.classList.remove('err');
  input.classList.add('ok');
  el.textContent = '';
}

function clearState(input, el) {
  input.classList.remove('err', 'ok');
  if (el) el.textContent = '';
}

/* ════════════════════════════
   VALIDATORS (Signup)
════════════════════════════ */
function validateEmail() {
  const v = emailInput.value.trim();
  if (!v)                                      { setErr(emailInput, emailErr, 'Email is required.');              return false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))  { setErr(emailInput, emailErr, 'Enter a valid email address.');   return false; }
  setOk(emailInput, emailErr);
  return true;
}

function validatePassword() {
  const v = pwInput.value;
  if (!v)           { setErr(pwInput, pwErr, 'Password is required.');                  return false; }
  if (v.length < 8) { setErr(pwInput, pwErr, 'Password must be at least 8 characters.'); return false; }
  setOk(pwInput, pwErr);
  return true;
}

function validateConfirm() {
  const pw  = pwInput.value;
  const cpw = cfInput.value;
  if (!cpw) {
    setErr(cfInput, cfErr, 'Please confirm your password.');
    matchLine.className = 'match-line';
    matchLine.textContent = '';
    return false;
  }
  if (pw !== cpw) {
    cfInput.classList.add('err');
    cfInput.classList.remove('ok');
    cfErr.textContent = '';
    matchLine.className  = 'match-line bad';
    matchLine.textContent = 'Passwords do not match.';
    return false;
  }
  setOk(cfInput, cfErr);
  matchLine.className  = 'match-line ok';
  matchLine.textContent = 'Passwords match!';
  return true;
}

function validateTerms() {
  if (!termsCb.checked) {
    termsErr.textContent = 'You must agree to continue.';
    return false;
  }
  termsErr.textContent = '';
  return true;
}

/* ════════════════════════════
   VALIDATORS (Login)
════════════════════════════ */
function validateLoginEmail() {
  const v = loginEmail.value.trim();
  if (!v) { setErr(loginEmail, loginEmailErr, 'Email is required.'); return false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setErr(loginEmail, loginEmailErr, 'Enter a valid email address.'); return false; }
  setOk(loginEmail, loginEmailErr);
  return true;
}

function validateLoginPassword() {
  const v = loginPw.value;
  if (!v) { setErr(loginPw, loginPwErr, 'Password is required.'); return false; }
  setOk(loginPw, loginPwErr);
  return true;
}

/* ════════════════════════════
   LIVE LISTENERS (Signup)
════════════════════════════ */
emailInput.addEventListener('blur',  validateEmail);
emailInput.addEventListener('input', () => {
  if (emailInput.classList.contains('err')) validateEmail();
});

pwInput.addEventListener('blur', validatePassword);
pwInput.addEventListener('input', () => {
  if (pwInput.classList.contains('err')) validatePassword();
  if (cfInput.value.length > 0) liveMatch();
});

cfInput.addEventListener('input', liveMatch);
cfInput.addEventListener('blur',  validateConfirm);

function liveMatch() {
  const pw  = pwInput.value;
  const cpw = cfInput.value;
  if (!cpw) {
    matchLine.className  = 'match-line';
    matchLine.textContent = '';
    clearState(cfInput, cfErr);
    return;
  }
  if (pw === cpw) {
    matchLine.className  = 'match-line ok';
    matchLine.textContent = 'Passwords match!';
    setOk(cfInput, cfErr);
  } else {
    matchLine.className  = 'match-line bad';
    matchLine.textContent = 'Passwords do not match.';
    clearState(cfInput, cfErr);
  }
}

termsCb.addEventListener('change', validateTerms);

/* ════════════════════════════
   LIVE LISTENERS (Login)
════════════════════════════ */
loginEmail.addEventListener('blur', validateLoginEmail);
loginEmail.addEventListener('input', () => {
  if (loginEmail.classList.contains('err')) validateLoginEmail();
});

loginPw.addEventListener('blur', validateLoginPassword);
loginPw.addEventListener('input', () => {
  if (loginPw.classList.contains('err')) validateLoginPassword();
});

/* ════════════════════════════
   FORM SHAKE HELPER
════════════════════════════ */
function shakeFirstErr(container) {
  const bad = container.querySelector('.err');
  if (bad) {
    bad.classList.remove('shake');
    void bad.offsetWidth;          // force reflow
    bad.classList.add('shake');
    bad.addEventListener('animationend', () => bad.classList.remove('shake'), { once: true });
  }
}

/* ════════════════════════════
   FORM SUBMIT (Signup)
════════════════════════════ */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const ok = [validateEmail(), validatePassword(), validateConfirm(), validateTerms()].every(Boolean);
  if (!ok) {
    shakeFirstErr(form);
    return;
  }

  /* Loading state */
  btnNext.disabled = true;
  btnLbl.classList.add('gone');
  btnSpin.classList.remove('gone');

  /* Simulate async API call */
  await new Promise(r => setTimeout(r, 1500));

  /* Success */
  btnNext.disabled = false;
  btnLbl.classList.remove('gone');
  btnSpin.classList.add('gone');
  formCard.classList.add('done');

  console.log('[Nextun] Signup success →', emailInput.value);
});

/* ════════════════════════════
   FORM SUBMIT (Login)
════════════════════════════ */
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const ok = [validateLoginEmail(), validateLoginPassword()].every(Boolean);
  if (!ok) {
    shakeFirstErr(loginForm);
    return;
  }

  loginBtnNext.disabled = true;
  loginBtnLbl.classList.add('gone');
  loginBtnSpin.classList.remove('gone');

  await new Promise(r => setTimeout(r, 1500));

  loginBtnNext.disabled = false;
  loginBtnLbl.classList.remove('gone');
  loginBtnSpin.classList.add('gone');
  formCard.classList.add('done');

  console.log('[Nextun] Login success →', loginEmail.value);
});

/* ════════════════════════════
   GOOGLE BUTTON (stub)
════════════════════════════ */
document.querySelectorAll('.btn-google').forEach(btn => {
  btn.addEventListener('click', () => {
    console.log('[Nextun] Continue with Google');
  });
});

