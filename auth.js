import { supabase } from './supabase.js';
export async function signUpAndSaveProfile({name,email,password,answers}){
  const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});
  if(error) throw error;
  if(data?.user && Array.isArray(data.user.identities) && data.user.identities.length===0) throw new Error('An account already exists with this email. Please log in instead.');
  if(!data.session){localStorage.setItem('miribloom_pending_profile',JSON.stringify({name,answers}));return{requiresConfirmation:true,message:'Check your email to confirm your account, then log in to save your Beauty Profile.'};}
  await saveBeautyProfile(data.user,answers,name);return{requiresConfirmation:false,message:'Your account and Beauty Profile are saved.'};
}
export async function loginAndSaveProfile({email,password,answers}){
  const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error) throw error;
  let pending=null;try{pending=JSON.parse(localStorage.getItem('miribloom_pending_profile')||'null')}catch{}
  const finalAnswers=answers&&Object.keys(answers).length?answers:(pending?.answers||{});const name=data.user.user_metadata?.full_name||pending?.name||'';
  await saveBeautyProfile(data.user,finalAnswers,name);localStorage.removeItem('miribloom_pending_profile');return{message:'You’re logged in and your Beauty Profile has been saved.'};
}
export async function saveBeautyProfile(user,answers,fullName=''){
  if(!user?.id) throw new Error('Please log in before saving your Beauty Profile.');
  const {data:sessionData}=await supabase.auth.getSession();if(!sessionData?.session) throw new Error('Please confirm your email and log in before saving your Beauty Profile.');
  if(fullName){const {error}=await supabase.from('profiles').upsert({id:user.id,full_name:fullName},{onConflict:'id'});if(error) throw new Error('Account profile save failed: '+error.message)}
  const payload={user_id:user.id,skin_tone:answers.skinTone||null,undertone:answers.undertone||null,eye_color:answers.eyeColor||null,hair_color:answers.hairColor||null,skin_type:answers.skinType||null,skin_concern:answers.skinConcern||null,makeup_style:answers.makeupStyle||null,favorite_category:answers.favoriteCategory||null,lip_preference:answers.lipPreference||null,hair_type:answers.hairType||null,fragrance:answers.fragrance||null,updated_at:new Date().toISOString()};
  const {data,error}=await supabase.from('beauty_profiles').upsert(payload,{onConflict:'user_id'}).select().single();if(error) throw new Error('Beauty Profile save failed: '+error.message);return data;
}
