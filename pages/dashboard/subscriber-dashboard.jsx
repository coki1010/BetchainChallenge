// subscriber-dashboard.jsx

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useRouter } from 'next/router';

const translations = {
  en: {
    no_subscription: "You do not have an active subscription.",
    activate: "Activate Subscription",
    author: "Author",
    analysis: "Analysis",
    stake: "Stake",
    odds: "Odds",
    status: "Status",
    like: "🤍 Like",
    unlike: "❤️ Unlike",
    add_comment: "Add a comment...",
    send: "Send",
    delete: "Delete",
    unknown: "Unknown",
    pro_bets: "Pro Tipster Bets",
    am_bets: "Amateur Tipster Bets",
    pro_table: "Top Pro Tipsters",
    am_table: "Top Amateur Tipsters",
    search_placeholder: "Search by nickname..."
  },
  hr: {
    no_subscription: "Nemate aktivnu pretplatu.",
    activate: "Aktiviraj pretplatu",
    author: "Autor",
    analysis: "Analiza",
    stake: "Ulog",
    odds: "Kvota",
    status: "Status",
    like: "🤍 Lajkaj",
    unlike: "❤️ Makni lajk",
    add_comment: "Dodaj komentar...",
    send: "Pošalji",
    delete: "Obriši",
    unknown: "Nepoznat",
    pro_bets: "Listići pro tipstera",
    am_bets: "Listići amaterskih tipstera",
    pro_table: "Najbolji pro tipsteri",
    am_table: "Najbolji amaterski tipsteri",
    search_placeholder: "Pretraži po nadimku..."
  },
  sr: {
    no_subscription: "Nemate aktivnu pretplatu.",
    activate: "Aktiviraj pretplatu",
    author: "Autor",
    analysis: "Analiza",
    stake: "Ulog",
    odds: "Kvota",
    status: "Status",
    like: "🤍 Lajkuj",
    unlike: "❤️ Ukloni lajk",
    add_comment: "Dodaj komentar...",
    send: "Pošalji",
    delete: "Obriši",
    unknown: "Nepoznat",
    pro_bets: "Listići pro tipstera",
    am_bets: "Listići amaterskih tipstera",
    pro_table: "Najbolji pro tipsteri",
    am_table: "Najbolji amaterski tipsteri",
    search_placeholder: "Pretraga po nadimku..."
  },
  sl: {
    no_subscription: "Nimate aktivne naročnine.",
    activate: "Aktiviraj naročnino",
    author: "Avtor",
    analysis: "Analiza",
    stake: "Vložek",
    odds: "Kvota",
    status: "Status",
    like: "🤍 Všečkaj",
    unlike: "❤️ Odstrani všeček",
    add_comment: "Dodaj komentar...",
    send: "Pošlji",
    delete: "Izbriši",
    unknown: "Neznano",
    pro_bets: "Listki pro tipsterjev",
    am_bets: "Listki amaterskih tipsterjev",
    pro_table: "Najboljši pro tipsterji",
    am_table: "Najboljši amaterski tipsterji",
    search_placeholder: "Išči po vzdevku..."
  },
};

const SubscriberDashboard = () => {
  const router = useRouter();
  const [lang, setLang] = useState('en');
  const t = (key) => translations[lang][key] || key;

  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState('');
  const [bets, setBets] = useState([]);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [proRankings, setProRankings] = useState([]);
  const [amateurRankings, setAmateurRankings] = useState([]);
  const [showProBets, setShowProBets] = useState(true);
  const [showAmBets, setShowAmBets] = useState(true);
  const [showProTable, setShowProTable] = useState(true);
  const [showAmTable, setShowAmTable] = useState(true);

  useEffect(() => {
    const storedLang = localStorage.getItem('language') || 'en';
    setLang(storedLang);

    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_subscribed, subscribed_until, nickname')
        .eq('id', user.id)
        .single();

      const isSub = profileData?.is_subscribed &&
        new Date(profileData.subscribed_until) > new Date();
      setHasSubscription(isSub);
      setNickname(profileData?.nickname || '');

      const { data: betsData } = await supabase
        .from('bets')
        .select('*, profiles(id, nickname, role)')
        .order('created_at', { ascending: false });

      setBets(betsData || []);

      const { data: likesData } = await supabase.from('likes').select('*');
      const likeMap = {};
      likesData?.forEach((like) => {
        if (!likeMap[like.bet_id]) likeMap[like.bet_id] = [];
        likeMap[like.bet_id].push(like.user_id);
      });
      setLikes(likeMap);

      const { data: commentsData } = await supabase
        .from('comments')
        .select('id, content, nickname, user_id, bet_id, created_at')
        .order('created_at', { ascending: true });

      const commentMap = {};
      commentsData?.forEach((c) => {
        if (!commentMap[c.bet_id]) commentMap[c.bet_id] = [];
        commentMap[c.bet_id].push(c);
      });
      setComments(commentMap);

      const { data: profiles } = await supabase.from('profiles').select('id, nickname, role');
      const balances = {};
      betsData.forEach((b) => {
        const id = b.user_id;
        if (!balances[id]) balances[id] = 10000;
        if (b.status === 'win') balances[id] += b.stake * b.total_odds;
        if (b.status === 'lose') balances[id] -= b.stake;
      });

      const pro = [], am = [];
      profiles.forEach(p => {
        const saldo = balances[p.id] || 10000;
        if (p.role === 'pro_tipster') pro.push({ ...p, saldo });
        if (p.role === 'amateur_tipster') am.push({ ...p, saldo });
      });

      setProRankings(pro.sort((a, b) => b.saldo - a.saldo));
      setAmateurRankings(am.sort((a, b) => b.saldo - a.saldo));
    };

    fetchData();
  }, []);

  const handleLanguageChange = (e) => {
    const selected = e.target.value;
    setLang(selected);
    localStorage.setItem('language', selected);
  };

  const filteredBets = bets.filter(b =>
    b.profiles?.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) &&
    ((showProBets && b.profiles?.role === 'pro_tipster') ||
     (showAmBets && b.profiles?.role === 'amateur_tipster'))
  );

  const renderBet = (bet) => (
    <div key={bet.id} className="bg-[#1a1a1a] p-4 rounded-xl mt-4">
      <p className="text-sm text-gray-400">{new Date(bet.created_at).toLocaleString()}</p>
      <p className="text-lg font-bold">{bet.title}</p>
      <p className="mt-1">{t('author')}: <span className="text-blue-400">{bet.profiles?.nickname || t('unknown')}</span></p>
      <p className="mt-1 italic text-gray-300">{t('analysis')}: {bet.analysis}</p>
      <p className="mt-1">{t('stake')}: €{bet.stake} | {t('odds')}: {bet.total_odds}</p>
      <p className="mt-1 font-semibold">{t('status')}: {bet.status}</p>
      <button onClick={() => handleLike(bet.id)} className="text-blue-400 text-sm mt-2">
        {likes[bet.id]?.includes(user.id) ? t('unlike') : t('like')} ({likes[bet.id]?.length || 0})
      </button>
      <div className="mt-3">
        <input
          type="text"
          value={newComments[bet.id] || ''}
          onChange={(e) => setNewComments((prev) => ({ ...prev, [bet.id]: e.target.value }))}
          placeholder={t('add_comment')}
          className="w-full p-2 bg-[#2a2a2a] rounded mb-2"
        />
        <button onClick={() => handleCommentSubmit(bet.id)} className="text-green-400 text-sm">{t('send')}</button>
        <div className="mt-2 space-y-1">
          {(comments[bet.id] || []).map((c) => (
            <div key={c.id} className="text-sm text-gray-300 flex justify-between items-center">
              <p><strong>{c.nickname || t('unknown')}:</strong> {c.content}</p>
              {c.user_id === user.id && (
                <button onClick={() => handleCommentDelete(c.id, bet.id)} className="text-red-400 text-xs ml-2">{t('delete')}</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const handleCommentSubmit = async (betId) => {
    const text = newComments[betId]?.trim();
    if (!text) return;
    const { error } = await supabase.from('comments').insert({ user_id: user.id, bet_id: betId, content: text, nickname });
    if (!error) {
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('bet_id', betId)
        .order('created_at', { ascending: true });
      setComments(prev => ({ ...prev, [betId]: data }));
      setNewComments(prev => ({ ...prev, [betId]: '' }));
    }
  };

  const handleCommentDelete = async (commentId, betId) => {
    await supabase.from('comments').delete().eq('id', commentId);
    const updated = (comments[betId] || []).filter(c => c.id !== commentId);
    setComments(prev => ({ ...prev, [betId]: updated }));
  };

  if (!hasSubscription) {
    return (
      <div className="p-6 text-white">
        <div className="flex justify-end mb-4">
          <select value={lang} onChange={handleLanguageChange} className="bg-[#2a2a2a] text-white px-3 py-1 rounded">
            <option value="en">English</option>
            <option value="hr">Hrvatski</option>
            <option value="sr">Srpski</option>
            <option value="sl">Slovenski</option>
          </select>
        </div>
        <h2 className="text-lg">{t('no_subscription')}</h2>
        <a
          href="https://buy.stripe.com/cNi7sL1cr9NFaka2pg9R601"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded inline-block mt-4"
        >
          {t('activate')}
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-6">
      <div className="flex justify-between items-center mb-4">
        <select value={lang} onChange={handleLanguageChange} className="bg-[#2a2a2a] text-white px-3 py-1 rounded">
          <option value="en">English</option>
          <option value="hr">Hrvatski</option>
          <option value="sr">Srpski</option>
          <option value="sl">Slovenski</option>
        </select>
        <input
          type="text"
          placeholder={t('search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-[#2a2a2a] text-white px-3 py-1 rounded ml-4"
        />
      </div>

      <div className="mb-4 space-x-2">
        <button onClick={() => setShowProBets(!showProBets)} className="bg-blue-700 px-4 py-1 rounded">
          {t('pro_bets')}
        </button>
        <button onClick={() => setShowAmBets(!showAmBets)} className="bg-green-700 px-4 py-1 rounded">
          {t('am_bets')}
        </button>
        <button onClick={() => setShowProTable(!showProTable)} className="bg-purple-700 px-4 py-1 rounded">
          {t('pro_table')}
        </button>
        <button onClick={() => setShowAmTable(!showAmTable)} className="bg-yellow-700 px-4 py-1 rounded">
          {t('am_table')}
        </button>
      </div>

      {showProTable && (
        <div className="mb-4">
          <h3 className="font-bold">{t('pro_table')}</h3>
          <ul className="text-sm">
            {proRankings.map((p, i) => (
              <li key={i}>{i + 1}. {p.nickname} – €{p.saldo.toFixed(2)}</li>
            ))}
          </ul>
        </div>
      )}

      {showAmTable && (
        <div className="mb-4">
          <h3 className="font-bold">{t('am_table')}</h3>
          <ul className="text-sm">
            {amateurRankings.map((p, i) => (
              <li key={i}>{i + 1}. {p.nickname} – €{p.saldo.toFixed(2)}</li>
            ))}
          </ul>
        </div>
      )}

      {filteredBets.map(renderBet)}
    </div>
  );
};

export default SubscriberDashboard;
