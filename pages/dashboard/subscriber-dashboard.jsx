import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useRouter } from 'next/router';

const translations = {
  en: {
    dashboard: "Subscriber Dashboard",
    noSub: "You don't have an active subscription.",
    activate: "Activate your subscription",
    author: "Author",
    analysis: "Analysis",
    stake: "Stake",
    odds: "Odds",
    status: "Status",
    win: "Win",
    lose: "Lose",
    pending: "Pending",
    contact: "Contact us",
    name: "Name",
    email: "Email",
    message: "Message",
    send: "Send Message",
    logout: "Logout",
    lang: "Language"
  },
  hr: {
    dashboard: "Dashboard pretplatnika",
    noSub: "Nemate aktivnu pretplatu.",
    activate: "Aktiviraj svoju pretplatu",
    author: "Autor",
    analysis: "Analiza",
    stake: "Ulog",
    odds: "Kvota",
    status: "Status",
    win: "Dobitan",
    lose: "Gubitan",
    pending: "U tijeku",
    contact: "Kontaktirajte nas",
    name: "Ime",
    email: "Email",
    message: "Poruka",
    send: "Pošalji",
    logout: "Odjava",
    lang: "Jezik"
  },
  srb: {
    dashboard: "Dashboard pretplatnika",
    noSub: "Nemate aktivnu pretplatu.",
    activate: "Aktiviraj pretplatu",
    author: "Autor",
    analysis: "Analiza",
    stake: "Ulog",
    odds: "Kvota",
    status: "Status",
    win: "Dobitan",
    lose: "Gubitan",
    pending: "U toku",
    contact: "Kontaktirajte nas",
    name: "Ime",
    email: "Email",
    message: "Poruka",
    send: "Pošalji",
    logout: "Odjava",
    lang: "Jezik"
  },
  sl: {
    dashboard: "Nadzorna plošča naročnika",
    noSub: "Nimate aktivne naročnine.",
    activate: "Aktiviraj naročnino",
    author: "Avtor",
    analysis: "Analiza",
    stake: "Vložek",
    odds: "Kvota",
    status: "Status",
    win: "Dobitna",
    lose: "Izgubljena",
    pending: "V teku",
    contact: "Kontaktirajte nas",
    name: "Ime",
    email: "Email",
    message: "Sporočilo",
    send: "Pošlji",
    logout: "Odjava",
    lang: "Jezik"
  }
};

const SubscriberDashboard = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [bets, setBets] = useState([]);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [lang, setLang] = useState('en');

  const t = translations[lang];

  useEffect(() => {
    const storedLang = localStorage.getItem('language');
    if (storedLang) setLang(storedLang);

    const fetchUserAndSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const { data: profile } = await supabase.from('profiles').select('is_subscribed').eq('id', user.id).single();
      setHasSubscription(profile?.is_subscribed);
    };

    const fetchBets = async () => {
      const { data } = await supabase
        .from('bets')
        .select('*, profiles(nickname)')
        .order('created_at', { ascending: false });

      setBets(data);
    };

    fetchUserAndSubscription();
    fetchBets();
  }, []);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLang(newLang);
    localStorage.setItem('language', newLang);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = {
      name: form.name.value,
      email: form.email.value,
      message: form.message.value,
    };

    const response = await fetch('/api/send-contact-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      alert('Message sent!');
      form.reset();
    } else {
      alert('Error sending message.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t.dashboard}</h1>
        <div className="flex gap-4 items-center">
          <select value={lang} onChange={handleLanguageChange} className="bg-[#1a1a1a] text-white px-2 py-1 rounded">
            <option value="en">EN</option>
            <option value="hr">HR</option>
            <option value="srb">SRB</option>
            <option value="sl">SLO</option>
          </select>
          <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded">
            {t.logout}
          </button>
        </div>
      </div>

      {!hasSubscription ? (
        <div className="bg-[#1a1a1a] p-6 rounded-xl text-center">
          <p className="text-lg mb-4">{t.noSub}</p>
          <a
            href="https://buy.stripe.com/cNi7sL1cr9NFaka2pg9R601"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
          >
            {t.activate}
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {bets.map((bet) => (
            <div key={bet.id} className="bg-[#1a1a1a] p-4 rounded-xl">
              <p className="text-sm text-gray-400">{new Date(bet.created_at).toLocaleString()}</p>
              <p className="text-lg font-bold mt-1">{bet.title}</p>
              <p className="mt-1">{t.author}: <span className="text-blue-400">{bet.profiles?.nickname || 'Unknown'}</span></p>
              <p className="mt-1">{t.analysis}: {bet.analysis}</p>
              <p className="mt-1">{t.stake}: €{bet.stake} | {t.odds}: {bet.total_odds}</p>
              <ul className="mt-2 text-sm list-disc ml-4">
                {bet.pairs.map((pair, i) => (
                  <li key={i}>{pair.match} – {t.odds} {pair.odds}</li>
                ))}
              </ul>
              <p className="mt-2 font-semibold">
                {t.status}: {bet.status === 'pending' ? t.pending : bet.status === 'win' ? t.win : t.lose}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Kontakt forma */}
      <div id="kontakt" className="mt-16 bg-[#1a1a1a] p-6 rounded-xl text-white">
        <h2 className="text-xl font-semibold mb-4">{t.contact}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" name="name" placeholder={t.name} required className="w-full p-2 bg-[#2a2a2a] rounded" />
          <input type="email" name="email" placeholder={t.email} required className="w-full p-2 bg-[#2a2a2a] rounded" />
          <textarea name="message" placeholder={t.message} required className="w-full p-2 bg-[#2a2a2a] rounded"></textarea>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">{t.send}</button>
        </form>
      </div>
    </div>
  );
};

export default SubscriberDashboard;
