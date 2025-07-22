import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/customSupabaseClient';

const translations = {
  en: { login: 'Login', register: 'Register', email: 'Email', password: 'Password', role: 'Role', subscriber: 'Subscriber', amateur_tipster: 'Amateur Tipster', submit_login: 'Login', submit_register: 'Register', no_account: "Don't have an account?", have_account: "Already have an account?", switch_to_register: 'Register here', switch_to_login: 'Login here', contact_us: 'Contact Us', name: 'Name', message: 'Message', send: 'Send Message', logout: 'Logout', nickname: 'Nickname' },
  hr: { login: 'Prijava', register: 'Registracija', email: 'Email', password: 'Lozinka', role: 'Uloga', subscriber: 'Pretplatnik', amateur_tipster: 'Amaterski tipster', submit_login: 'Prijavi se', submit_register: 'Registriraj se', no_account: 'Nemaš račun?', have_account: 'Imaš račun?', switch_to_register: 'Registriraj se', switch_to_login: 'Prijavi se', contact_us: 'Kontakt', name: 'Ime', message: 'Poruka', send: 'Pošalji poruku', logout: 'Odjava', nickname: 'Nadimak' },
  srb: { login: 'Prijava', register: 'Registracija', email: 'Email', password: 'Lozinka', role: 'Uloga', subscriber: 'Pretplatnik', amateur_tipster: 'Amaterski tipster', submit_login: 'Prijavi se', submit_register: 'Registruj se', no_account: 'Nemaš nalog?', have_account: 'Imaš nalog?', switch_to_register: 'Registruj se', switch_to_login: 'Prijavi se', contact_us: 'Kontakt', name: 'Ime', message: 'Poruka', send: 'Pošalji poruku', logout: 'Odjavi se', nickname: 'Nadimak' },
  slo: { login: 'Prijava', register: 'Registracija', email: 'Email', password: 'Geslo', role: 'Vloga', subscriber: 'Naročnik', amateur_tipster: 'Amaterski tipster', submit_login: 'Prijava', submit_register: 'Registracija', no_account: 'Nimate račun?', have_account: 'Imate račun?', switch_to_register: 'Registriraj se', switch_to_login: 'Prijavi se', contact_us: 'Kontakt', name: 'Ime', message: 'Sporočilo', send: 'Pošlji sporočilo', logout: 'Odjava', nickname: 'Vzdevek' },
};

const LoginRegister = () => {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('subscriber');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [lang, setLang] = useState('en');

  const t = translations[lang];

  useEffect(() => {
    const savedLang = localStorage.getItem('language');
    if (savedLang) setLang(savedLang);
  }, []);

  const changeLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('language', newLang);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.reload();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return setError('Invalid credentials');

      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

      if (!profile?.role) return router.push('/');

      if (profile.role === 'admin') router.push('/dashboard/admin');
      else if (profile.role === 'subscriber') router.push('/dashboard/subscriber-dashboard');
      else if (profile.role === 'amateur_tipster') router.push('/dashboard/amateur-tipster-dashboard');
      else if (profile.role === 'pro_tipster') router.push('/dashboard/pro-tipster-dashboard');
      else router.push('/');
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) return setError(signUpError.message);

      const userId = data?.user?.id;
      if (userId) {
        await supabase.from('profiles').insert([{ id: userId, email, role, nickname }]);

        if (role === 'subscriber') router.push('/dashboard/subscriber-dashboard');
        else if (role === 'amateur_tipster') router.push('/dashboard/amateur-tipster-dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <div className="absolute top-4 right-4 flex gap-2">
        <select value={lang} onChange={(e) => changeLanguage(e.target.value)} className="bg-[#1a1a1a] text-white p-2 rounded">
          <option value="en">EN</option>
          <option value="hr">HR</option>
          <option value="srb">SRB</option>
          <option value="slo">SLO</option>
        </select>
        <button onClick={handleLogout} className="bg-red-600 px-3 py-2 rounded hover:bg-red-700">{t.logout}</button>
      </div>

      <div className="bg-[#1a1a1a] p-6 rounded-xl w-full max-w-md shadow-md">
        <h2 className="text-xl font-bold mb-4">{isLogin ? t.login : t.register}</h2>
        {error && <p className="text-red-500 mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder={t.email} className="w-full px-4 py-2 rounded bg-[#2a2a2a] text-white" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder={t.password} className="w-full px-4 py-2 rounded bg-[#2a2a2a] text-white" value={password} onChange={(e) => setPassword(e.target.value)} required />

          {!isLogin && (
            <>
              <input type="text" placeholder={t.nickname} className="w-full px-4 py-2 rounded bg-[#2a2a2a] text-white" value={nickname} onChange={(e) => setNickname(e.target.value)} required />
              <select className="w-full px-4 py-2 rounded bg-[#2a2a2a] text-white" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="subscriber">{t.subscriber}</option>
                <option value="amateur_tipster">{t.amateur_tipster}</option>
              </select>
            </>
          )}

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded font-semibold">
            {isLogin ? t.submit_login : t.submit_register}
          </button>
        </form>

        <p className="mt-4 text-sm text-center">
          {isLogin ? t.no_account : t.have_account}{' '}
          <button className="underline text-blue-400" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? t.switch_to_register : t.switch_to_login}
          </button>
        </p>
      </div>

      <div className="mt-10 w-full max-w-md text-center">
        <p className="text-gray-300">Contact:info@betchainchallenge.com</p>
      </div>
    </div>
  );
};

export default LoginRegister;
