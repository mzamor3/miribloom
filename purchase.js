import { supabase } from './supabase.js';

const accessMessage = document.getElementById('accessMessage');
const accessTitle = document.getElementById('accessTitle');
const accessText = document.getElementById('accessText');
const miniBtn = document.getElementById('miniPurchaseBtn');
const boxBtn = document.getElementById('boxPurchaseBtn');

let currentUser = null;
let purchaseUnlocked = false;

function blockLockedClick(event) {
  event.preventDefault();
  accessMessage.scrollIntoView({ behavior:'smooth', block:'center' });
}

function setButtonsBusy(isBusy) {
  [miniBtn, boxBtn].forEach(btn => {
    if (!btn) return;
    btn.disabled = isBusy || !purchaseUnlocked;
  });
}

function setLocked(title, text) {
  purchaseUnlocked = false;

  accessMessage.classList.add('locked');
  accessMessage.classList.remove('unlocked');
  accessTitle.textContent = title;
  accessText.textContent = text;

  [miniBtn, boxBtn].forEach(btn => {
    btn.classList.add('disabled');
    btn.setAttribute('aria-disabled','true');
    btn.disabled = true;
    btn.addEventListener('click', blockLockedClick);
  });
}

function setUnlocked(user) {
  currentUser = user;
  purchaseUnlocked = true;

  accessMessage.classList.remove('locked');
  accessMessage.classList.add('unlocked');
  accessTitle.textContent = 'Your Founding Launch access is open ♡';
  accessText.textContent =
    'Choose your monthly Bloom and continue securely to Stripe checkout.';

  [miniBtn, boxBtn].forEach(btn => {
    btn.classList.remove('disabled');
    btn.setAttribute('aria-disabled','false');
    btn.disabled = false;
    btn.removeEventListener('click', blockLockedClick);
  });
}

async function startSubscription(plan) {
  if (!purchaseUnlocked || !currentUser) {
    blockLockedClick(new Event('click'));
    return;
  }

  setButtonsBusy(true);

  const originalMini = miniBtn.textContent;
  const originalBox = boxBtn.textContent;

  if (plan === 'mini') {
    miniBtn.textContent = 'Opening secure checkout...';
  } else {
    boxBtn.textContent = 'Opening secure checkout...';
  }

  try {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      throw new Error('Could not read your MiriBloom session.');
    }

    const token = sessionData?.session?.access_token;

    if (!token) {
      throw new Error('Please log in again before subscribing.');
    }

    const response = await fetch(
      'https://kpyhtvymgfsrrhijyyjs.supabase.co/functions/v1/create-subscription-checkout',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan,
          access_token: token
        })
      }
    );

    const text = await response.text();
    let result = {};

    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      result = { message: text };
    }

    if (!response.ok) {
      throw new Error(
        result?.error ||
        result?.message ||
        `Checkout could not be created (${response.status})`
      );
    }

    if (!result?.url) {
      throw new Error('Stripe checkout URL was not returned.');
    }

    window.location.href = result.url;

  } catch (error) {
    console.error(error);

    accessMessage.classList.add('locked');
    accessTitle.textContent = 'Checkout could not open';
    accessText.textContent =
      error?.message || 'Please try again in a moment.';

    setButtonsBusy(false);
    miniBtn.textContent = originalMini;
    boxBtn.textContent = originalBox;
  }
}

miniBtn?.addEventListener('click', () => {
  if (purchaseUnlocked) startSubscription('mini');
});

boxBtn?.addEventListener('click', () => {
  if (purchaseUnlocked) startSubscription('box');
});

async function checkAccess() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  if (!user) {
    setLocked(
      'Log in to check your launch access',
      'Your Bloom subscription is connected to your MiriBloom account and Beauty Profile.'
    );
    return;
  }

  const { data, error } = await supabase
    .from('launch_access')
    .select('is_allowed')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error(error);

    setLocked(
      'Launch access is still locked',
      'MiriBloom could not verify subscription access yet. Please try again later.'
    );
    return;
  }

  if (data?.is_allowed === true) {
    setUnlocked(user);
  } else {
    setLocked(
      'You’re on the list ♡',
      'Your account does not have subscription access yet. MiriBloom will notify you when a founding spot opens.'
    );
  }
}

checkAccess();
