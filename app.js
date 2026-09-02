import { supabase } from './supabase.js';
import { quizQuestions,renderQuestion } from './quiz.js?v=20260901-profilefix';
import { signUpAndSaveProfile,loginAndSaveProfile } from './auth.js';
const modal=document.getElementById('quizModal'),closeBtn=document.getElementById('quizClose'),steps=document.getElementById('quizSteps'),progress=document.getElementById('quizProgress'),backBtn=document.getElementById('quizBack'),nextBtn=document.getElementById('quizNext'),nav=document.getElementById('quizNav'),result=document.getElementById('quizResult'),summary=document.getElementById('profileSummary');let current=0,answers={};
function openQuiz(){modal.classList.add('open');modal.setAttribute('aria-hidden','false');current=0;result.classList.remove('show');nav.style.display='flex';showQuestion()}
function closeQuiz(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true')}
function showQuestion(){
  const q=quizQuestions[current];
  renderQuestion(steps,q,answers[q.key]);
  backBtn.style.visibility=current===0?'hidden':'visible';
  nextBtn.textContent=current===quizQuestions.length-1?'See My Profile':'Next';
  progress.style.width=`${current/quizQuestions.length*100}%`;
}
function showProfile(){steps.innerHTML='';nav.style.display='none';progress.style.width='100%';const labels={skinTone:'Skin tone',undertone:'Undertone',
    eyeColor:'Eye color',
    hairColor:'Hair color',skinType:'Skin type',skinConcern:'Top concern',makeupStyle:'Makeup style',favoriteCategory:'Beauty preference',lipPreference:'Lip preference',hairType:'Hair type',fragrance:'Fragrance preference'};summary.innerHTML=Object.entries(answers).map(([k,v])=>`<div class="profile-item"><span>${labels[k]||k}</span><strong>${v}</strong></div>`).join('');localStorage.setItem('miribloom_beauty_profile',JSON.stringify(answers));result.classList.add('show')}

// Robust delegated selection handler for both text and visual quiz choices.
steps.addEventListener('click', (event) => {
  const option = event.target.closest('.visual-option, .quiz-option');
  if (!option || !steps.contains(option)) return;

  event.preventDefault();

  const question = quizQuestions[current];
  if (!question) return;

  steps.querySelectorAll('.visual-option, .quiz-option').forEach(el => {
    el.classList.remove('selected');
    el.setAttribute('aria-pressed', 'false');
  });

  option.classList.add('selected');
  option.setAttribute('aria-pressed', 'true');
  answers[question.key] = option.dataset.value;

  console.log('MiriBloom quiz selected:', question.key, option.dataset.value);
});

document.querySelectorAll('[data-open-quiz]').forEach(b=>b.addEventListener('click',openQuiz));closeBtn.addEventListener('click',closeQuiz);modal.addEventListener('click',e=>{if(e.target===modal)closeQuiz()});backBtn.addEventListener('click',()=>{if(current>0){current--;showQuestion()}});nextBtn.addEventListener('click',()=>{const key=quizQuestions[current].key;if(!answers[key]){alert('Choose an option before continuing.');return}if(current<quizQuestions.length-1){current++;showQuestion()}else showProfile()});
document.querySelectorAll('[data-auth-tab]').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('[data-auth-tab]').forEach(t=>t.classList.remove('active'));tab.classList.add('active');const signup=tab.dataset.authTab==='signup';document.getElementById('signupForm').classList.toggle('hidden',!signup);document.getElementById('loginForm').classList.toggle('hidden',signup)}));
function setAuthMessage(m){const el=document.getElementById('authMessage');el.style.display='block';el.textContent=m}
document.getElementById('signupForm').addEventListener('submit',async e=>{e.preventDefault();try{setAuthMessage('Creating your account...');const r=await signUpAndSaveProfile({name:document.getElementById('signupName').value.trim(),email:document.getElementById('signupEmail').value.trim(),password:document.getElementById('signupPassword').value,answers});setAuthMessage(r.message);if(r.requiresConfirmation)document.querySelector('[data-auth-tab="login"]').click()}catch(err){setAuthMessage(err.message||'Could not create account.')}});
document.getElementById('loginForm').addEventListener('submit',async e=>{e.preventDefault();try{setAuthMessage('Logging you in...');const r=await loginAndSaveProfile({email:document.getElementById('loginEmail').value.trim(),password:document.getElementById('loginPassword').value,answers});setAuthMessage(r.message)}catch(err){setAuthMessage(err.message||'Could not log in.')}});
document.getElementById('waitlistForm').addEventListener('submit',async e=>{e.preventDefault();const email=document.getElementById('waitlistEmail').value.trim(),message=document.getElementById('waitlistMessage');message.style.display='block';message.textContent='Adding you to the Bloom List...';const {error}=await supabase.from('waitlist').insert({email,source:'website'});if(!error||error.code==='23505'){if(!error){try{await supabase.functions.invoke('send-bloom-welcome',{body:{email}})}catch(err){console.error(err)}}message.innerHTML='<strong>You’re on the Bloom List ♡</strong><br>Bloom Mini $15 · Bloom Full $29<br>We’ll email you when the 10 founding spots open.'}else message.textContent=error.message});
async function refreshSpots(){
  const {data,error}=await supabase.from('launch_spot_count').select('*').single();
  const el=document.getElementById('spotsRemaining');
  if(!error&&data&&el) el.textContent=String(data.remaining_spots);
}
refreshSpots();


async function updateHeaderAccount(){
  const link = document.getElementById('headerAccountLink');
  if(!link) return;

  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user;

  if(!user){
    link.textContent = 'Log In';
    link.href = 'login.html';
    return;
  }

  let name = user.user_metadata?.full_name || '';
  try{
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();
    if(profile?.full_name) name = profile.full_name;
  }catch(e){}

  if(!name) name = (user.email || 'Account').split('@')[0];

  link.textContent = name;
  link.href = 'account.html';
}

updateHeaderAccount();

supabase.auth.onAuthStateChange(() => {
  updateHeaderAccount();
});
