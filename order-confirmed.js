import { supabase } from './supabase.js';

async function loadMember() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    return;
  }

  let name = 'Member';

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profileRow?.full_name?.trim()) {
    name = profileRow.full_name.trim();
  } else if (user.user_metadata?.full_name?.trim()) {
    name = user.user_metadata.full_name.trim();
  } else if (user.user_metadata?.name?.trim()) {
    name = user.user_metadata.name.trim();
  }

  const memberName = document.getElementById('memberName');
  if (memberName) memberName.textContent = name;
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

loadMember();
