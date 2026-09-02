import { supabase } from './supabase.js';

const accessMessage = document.getElementById('accessMessage');
const accessTitle = document.getElementById('accessTitle');
const accessText = document.getElementById('accessText');
const miniBtn = document.getElementById('miniPurchaseBtn');
const boxBtn = document.getElementById('boxPurchaseBtn');

function blockLockedClick(event) {
  event.preventDefault();
  accessMessage.scrollIntoView({ behavior:'smooth', block:'center' });
}

function setLocked(title, text) {
  accessMessage.classList.add('locked');
  accessMessage.classList.remove('unlocked');
  accessTitle.textContent = title;
  accessText.textContent = text;

  [miniBtn, boxBtn].forEach(btn => {
    btn.classList.add('disabled');
    btn.setAttribute('aria-disabled','true');
    btn.addEventListener('click', blockLockedClick);
  });
}

function setUnlocked(userId) {
  accessMessage.classList.remove('locked');
  accessMessage.classList.add('unlocked');
  accessTitle.textContent = 'Your Founding Launch access is open ♡';
  accessText.textContent = 'Choose your Bloom and continue securely to Stripe checkout.';

  [miniBtn, boxBtn].forEach(btn => {
    const stripeUrl = new URL(btn.href);
    stripeUrl.searchParams.set('client_reference_id', userId);
    btn.href = stripeUrl.toString();

    btn.classList.remove('disabled');
    btn.setAttribute('aria-disabled','false');
    btn.removeEventListener('click', blockLockedClick);
  });
}

async function checkAccess() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  if (!user) {
    setLocked('Log in to check your launch access',
      'Your Bloom purchase is connected to your MiriBloom account and Beauty Profile.');
    return;
  }

  const { data, error } = await supabase
    .from('launch_access')
    .select('is_allowed')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    setLocked('Launch access is still locked',
      'MiriBloom could not verify purchase access yet. Please try again later.');
    return;
  }

  if (data?.is_allowed === true) {
    setUnlocked(user.id);
  } else {
    setLocked('You’re on the list ♡',
      'Your account does not have purchase access yet. MiriBloom will notify you when a founding spot opens.');
  }
}

checkAccess();
