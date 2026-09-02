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

const imageMap = {
  skin_tone: {
    'Fair':'quiz-assets/skin-fair.jpg','Light':'quiz-assets/skin-light.jpg','Light Medium':'quiz-assets/skin-light-medium.jpg',
    'Medium':'quiz-assets/skin-medium.jpg','Medium Tan':'quiz-assets/skin-medium-tan.jpg','Tan':'quiz-assets/skin-tan.jpg',
    'Dark':'quiz-assets/skin-dark.jpg','Deep':'quiz-assets/skin-deep.jpg','Very Deep':'quiz-assets/skin-very-deep.jpg'
  },
  undertone: {
    'Cool':'quiz-assets/undertone-cool.jpg','Warm':'quiz-assets/undertone-warm.jpg','Neutral':'quiz-assets/undertone-neutral.jpg',
    'Olive':'quiz-assets/undertone-olive.jpg','Not sure':'quiz-assets/undertone-not-sure.jpg'
  },
  eye_color: {
    'Brown':'quiz-assets/eye-brown.jpg','Hazel':'quiz-assets/eye-hazel.jpg','Blue':'quiz-assets/eye-blue.jpg',
    'Green':'quiz-assets/eye-green.jpg','Amber':'quiz-assets/eye-amber.jpg','Gray':'quiz-assets/eye-gray.jpg'
  },
  hair_color: {
    'Black':'quiz-assets/hair-black.jpg','Dark Brown':'quiz-assets/hair-dark-brown.jpg','Light Brown':'quiz-assets/hair-light-brown.jpg',
    'Blonde':'quiz-assets/hair-blonde.jpg','Red':'quiz-assets/hair-red.jpg','Gray':'quiz-assets/hair-gray.jpg','White':'quiz-assets/hair-white.jpg'
  },
  skin_type: {
    'Dry':'quiz-assets/skin-type-dry.jpg','Oily':'quiz-assets/skin-type-oily.jpg','Combination':'quiz-assets/skin-type-combination.jpg',
    'Normal':'quiz-assets/skin-type-normal.jpg','Sensitive':'quiz-assets/skin-type-sensitive.jpg'
  },
  skin_concern: {
    'Hydration':'quiz-assets/cat-skincare.jpg','Blemishes':'quiz-assets/cat-skincare.jpg','Dark spots':'quiz-assets/cat-skincare.jpg',
    'Texture & pores':'quiz-assets/cat-skincare.jpg','Fine lines':'quiz-assets/cat-skincare.jpg','Calming':'quiz-assets/cat-skincare.jpg'
  },
  makeup_style: {
    'Natural':'quiz-assets/makeup-natural.jpg','Soft glam':'quiz-assets/makeup-soft-glam.jpg','Full glam':'quiz-assets/makeup-full-glam.jpg',
    'Trendy & experimental':'quiz-assets/makeup-trendy-experimental.jpg','Minimal':'quiz-assets/makeup-minimal.jpg'
  },
  favorite_category: {
    'Skincare':'quiz-assets/cat-skincare.jpg','Makeup':'quiz-assets/cat-makeup.jpg','Both equally':'quiz-assets/cat-both.jpg','Beauty tools':'quiz-assets/cat-tools.jpg'
  },
  lip_preference: {
    'Nudes & neutrals':'quiz-assets/lip-nudes-neutrals.jpg','Pinks & berries':'quiz-assets/lip-pinks-berries.jpg',
    'Reds & bold shades':'quiz-assets/lip-reds-bold-shades.jpg','Glosses & oils':'quiz-assets/lip-glosses-oils.jpg','Surprise me':'quiz-assets/lip-surprise-me.jpg'
  },
  hair_type: {
    'Straight':'quiz-assets/hair-type.jpg','Wavy':'quiz-assets/hair-type.jpg','Curly':'quiz-assets/hair-type.jpg','Coily':'quiz-assets/hair-type.jpg',
    'Skip hair products':'quiz-assets/hair-type.jpg'
  },
  fragrance: {
    'Love fragrance':'quiz-assets/fragrance.jpg','Light fragrance only':'quiz-assets/fragrance.jpg',
    'Fragrance-free preferred':'quiz-assets/fragrance.jpg','No preference':'quiz-assets/fragrance.jpg'
  }
};

const imageIds = {
  skin_tone:'imgSkinTone',
  undertone:'imgUndertone',
  eye_color:'imgEyeColor',
  hair_color:'imgHairColor',
  skin_type:'imgSkinType',
  skin_concern:'imgSkinConcern',
  makeup_style:'imgMakeupStyle',
  favorite_category:'imgFavoriteCategory',
  lip_preference:'imgLipPreference',
  hair_type:'imgHairType',
  fragrance:'imgFragrance'
};

let currentUser = null;
let currentProfile = null;

function showMessage(text) {
  const el = document.getElementById('profileMessage');
  if (!el) return;
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

    const edit = document.getElementById(editId);
    if (edit && profile?.[column]) edit.value = profile[column];

    const imageId = imageIds[column];
    const img = imageId ? document.getElementById(imageId) : null;
    const src = imageMap[column]?.[profile?.[column]];
    if (img && src) img.src = src;
  });
}

async function loadAccount() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = userData.user;

  let name =
    currentUser.user_metadata?.full_name ||
    currentUser.user_metadata?.name ||
    '';

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (profileRow?.full_name) name = profileRow.full_name;
  if (!name) name = (currentUser.email || 'Member').split('@')[0];

  const memberName = document.getElementById('memberName');
  const heroName = document.getElementById('heroName');
  if (memberName) memberName.textContent = name;
  if (heroName) heroName.textContent = name;

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

document.getElementById('memberTrigger')?.addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('memberDropdown')?.classList.toggle('open');
});

document.addEventListener('click', () => {
  document.getElementById('memberDropdown')?.classList.remove('open');
});

document.getElementById('memberDropdown')?.addEventListener('click', e => e.stopPropagation());

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
});

document.getElementById('editProfileBtn')?.addEventListener('click', () => {
  document.getElementById('profileDisplay')?.classList.add('hidden');
  document.getElementById('profileEditPanel')?.classList.remove('hidden');
});

document.getElementById('cancelEditBtn')?.addEventListener('click', () => {
  document.getElementById('profileEditPanel')?.classList.add('hidden');
  document.getElementById('profileDisplay')?.classList.remove('hidden');
  if (currentProfile) setProfile(currentProfile);
});

document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
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
    .upsert(payload, { onConflict:'user_id' })
    .select()
    .single();

  if (error) {
    showMessage('Could not save: ' + error.message);
    return;
  }

  setProfile(data);
  document.getElementById('profileEditPanel')?.classList.add('hidden');
  document.getElementById('profileDisplay')?.classList.remove('hidden');
  showMessage('Your Beauty Profile has been updated ♡');
});

/* Account Settings */
const settingsModal = document.getElementById('accountSettingsModal');
const openSettingsBtn = document.getElementById('openAccountSettings');
const closeSettingsBtn = document.getElementById('closeAccountSettings');

openSettingsBtn?.addEventListener('click', () => {
  document.getElementById('memberDropdown')?.classList.remove('open');
  settingsModal?.classList.remove('hidden');
});

closeSettingsBtn?.addEventListener('click', () => {
  settingsModal?.classList.add('hidden');
});

settingsModal?.addEventListener('click', e => {
  if (e.target === settingsModal) settingsModal.classList.add('hidden');
});

/* Delete Account */
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
    const { error } = await supabase.functions.invoke('delete-account', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (error) throw error;

    await supabase.auth.signOut();
    window.location.href = 'index.html?account=deleted';
  } catch (err) {
    if (deleteMessage) deleteMessage.textContent = 'Could not delete account: ' + (err.message || 'Unknown error');
  }
});

loadAccount();
