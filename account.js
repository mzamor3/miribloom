import { supabase } from './supabase.js';

const ids = {
  skin_tone: ['vSkinTone','eSkinTone'],
  undertone: ['vUndertone','eUndertone'],
  eye_color: ['vEyeColor','eEyeColor'],
  hair_color: ['vHairColor','eHairColor'],
  skin_type: ['vSkinType','eSkinType'],
  skin_concern: ['vSkinConcern','eSkinConcern'],
  makeup_style: ['vMakeupStyle','eMakeupStyle'],
  favorite_category: ['vFavoriteCategory','eFavoriteCategory'],
  lip_preference: ['vLipPreference','eLipPreference'],
  hair_type: ['vHairType','eHairType'],
  fragrance: ['vFragrance','eFragrance']
};

let currentUser = null;
let currentProfile = null;

function showMessage(text) {
  const el = document.getElementById('profileMessage');
  el.style.display = 'block';
  el.textContent = text;
}

function setProfile(profile) {
  currentProfile = profile;

  const updated = document.getElementById('profileUpdated');
  if (updated && profile?.updated_at) {
    const d = new Date(profile.updated_at);
    updated.textContent = `Last updated: ${d.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})}`;
  }

  Object.entries(ids).forEach(([column,[displayId,editId]]) => {
    const value = profile?.[column] || '—';
    const display = document.getElementById(displayId);
    if (display) display.textContent = value;

    const edit = editId ? document.getElementById(editId) : null;
    if (edit && profile?.[column]) edit.value = profile[column];
  });

  const slug = s => String(s || '')
    .toLowerCase()
    .replace(/&/g,'and')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-|-$/g,'');

  const eyeImg = document.getElementById('savedEyeImage');
  const hairImg = document.getElementById('savedHairImage');

  if (eyeImg && profile?.eye_color) {
    eyeImg.src = `quiz-assets/eye-${slug(profile.eye_color)}.jpg`;
  }
  if (hairImg && profile?.hair_color) {
    hairImg.src = `quiz-assets/hair-${slug(profile.hair_color)}.jpg`;
  }
}

async function loadAccount() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = userData.user;

  let name = currentUser.user_metadata?.full_name || '';

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (profileRow?.full_name) name = profileRow.full_name;
  if (!name) name = (currentUser.email || 'Bloom Member').split('@')[0];

  document.getElementById('memberName').textContent = name;
  document.getElementById('heroName').textContent = name;

  const { data: beauty, error: beautyError } = await supabase
    .from('beauty_profiles')
    .select('*')
    .eq('user_id', currentUser.id)
    .maybeSingle();

  if (beautyError) {
    showMessage('Could not load your Beauty Profile: ' + beautyError.message);
    return;
  }

  if (!beauty) {
    showMessage('No Beauty Profile is saved yet. Take the Beauty Quiz first.');
    return;
  }

  setProfile(beauty);
}

document.getElementById('memberTrigger').addEventListener('click', () => {
  document.getElementById('memberDropdown').classList.toggle('open');
});

document.addEventListener('click', e => {
  const wrap = document.querySelector('.member-menu-wrap');
  if (!wrap.contains(e.target)) {
    document.getElementById('memberDropdown').classList.remove('open');
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
});

document.getElementById('editProfileBtn').addEventListener('click', () => {
  document.getElementById('profileDisplay').classList.add('hidden');
  document.getElementById('profileEditPanel').classList.remove('hidden');
});

document.getElementById('cancelEditBtn').addEventListener('click', () => {
  document.getElementById('profileEditPanel').classList.add('hidden');
  document.getElementById('profileDisplay').classList.remove('hidden');
  setProfile(currentProfile);
});

document.getElementById('saveProfileBtn').addEventListener('click', async () => {
  if (!currentUser) return;

  const payload = {
    user_id: currentUser.id,
    skin_tone: document.getElementById('eSkinTone').value,
    undertone: document.getElementById('eUndertone').value,
    eye_color: document.getElementById('eEyeColor').value,
    hair_color: document.getElementById('eHairColor').value,
    skin_type: document.getElementById('eSkinType').value,
    skin_concern: document.getElementById('eSkinConcern').value,
    makeup_style: document.getElementById('eMakeupStyle').value,
    favorite_category: document.getElementById('eFavoriteCategory').value,
    lip_preference: document.getElementById('eLipPreference').value,
    hair_type: document.getElementById('eHairType').value,
    fragrance: document.getElementById('eFragrance').value,
    updated_at: new Date().toISOString()
  };

  showMessage('Saving your Beauty Profile...');

  const { data, error } = await supabase
    .from('beauty_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    showMessage('Could not save: ' + error.message);
    return;
  }

  setProfile(data);
  document.getElementById('profileEditPanel').classList.add('hidden');
  document.getElementById('profileDisplay').classList.remove('hidden');
  showMessage('Your Beauty Profile has been updated ♡');
});

loadAccount();




const deleteBtn = document.getElementById('deleteAccountBtn');
const deletePanel = document.getElementById('deleteConfirmPanel');
const confirmDeleteBtn = document.getElementById('confirmDeleteAccountBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteAccountBtn');
const deleteMessage = document.getElementById('deleteAccountMessage');

deleteBtn?.addEventListener('click', () => {
  deletePanel?.classList.remove('hidden');
  deleteBtn.classList.add('hidden');
});

cancelDeleteBtn?.addEventListener('click', () => {
  deletePanel?.classList.add('hidden');
  deleteBtn?.classList.remove('hidden');
});

confirmDeleteBtn?.addEventListener('click', async () => {
  if (!currentUser) return;

  if (deleteMessage) {
    deleteMessage.style.display = 'block';
    deleteMessage.textContent = 'Deleting your account...';
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    if (deleteMessage) deleteMessage.textContent = 'Please log in again before deleting your account.';
    return;
  }

  try {
    const { data, error } = await supabase.functions.invoke('delete-account', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (error) throw error;

    await supabase.auth.signOut();
    window.location.href = 'index.html?account=deleted';
  } catch (err) {
    if (deleteMessage) {
      deleteMessage.textContent = 'Could not delete account: ' + (err.message || 'Unknown error');
    }
  }
});
