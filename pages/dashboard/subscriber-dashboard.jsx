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
    amateur_bets: "Amateur Tipster Bets",
    best_pro: "Top Pro Tipsters",
    best_amateur: "Top Amateur Tipsters",
    toggle_tables: "Show/Hide Leaderboards",
    logout: "Logout",
    search_placeholder: "Search by nickname...",
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
    amateur_bets: "Listići amaterskih tipstera",
    best_pro: "Najbolji pro tipsteri",
    best_amateur: "Najbolji amaterski tipsteri",
    toggle_tables: "Prikaži/sakrij tablice",
    logout: "Odjava",
    search_placeholder: "Pretraži po nadimku...",
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
    amateur_bets: "Listići amaterskih tipstera",
    best_pro: "Najbolji pro tipsteri",
    best_amateur: "Najbolji amaterski tipsteri",
    toggle_tables: "Prikaži/sakrij tabele",
    logout: "Odjava",
    search_placeholder: "Pretraži po nadimku...",
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
    pro_bets: "Stavke pro tipsterjev",
    amateur_bets: "Stavke amaterskih tipsterjev",
    best_pro: "Najboljši pro tipsterji",
    best_amateur: "Najboljši amaterski tipsterji",
    toggle_tables: "Pokaži/skrij lestvice",
    logout: "Odjava",
    search_placeholder: "Išči po vzdevku...",
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
  const [showAmateurBets, setShowAmateurBets] = useState(true);
  const [showTables, setShowTables] = useState(true);

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

      const subscribedUntil = new Date(profileData?.subscribed_until);
      const today = new Date();
      const isStillSubscribed = profileData?.is_subscribed && subscribedUntil > today;

      setHasSubscription(isStillSubscribed);
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

      const { data: allProfiles } = await supabase.from('profiles').select('id, nickname, role');
      const balances = {};
      betsData.forEach(bet => {
        const uid = bet.user_id;
        if (!balances[uid]) balances[uid] = 10000;
        if (bet.status === 'win') {
          balances[uid] += bet.stake * bet.total_odds;
        } else if (bet.status === 'lose') {
          balances[uid] -= bet.stake;
        }
      });
      const pro = [], amateur = [];
      allProfiles.forEach(p => {
        const saldo = balances[p.id] || 10000;
        if (p.role === 'pro_tipster') pro.push({ ...p, saldo });
        if (p.role === 'amateur_tipster') amateur.push({ ...p, saldo });
      });
      setProRankings(pro.sort((a, b) => b.saldo - a.saldo));
      setAmateurRankings(amateur.sort((a, b) => b.saldo - a.saldo));
    };

    fetchData();
  }, []);

  const handleLanguageChange = (e) => {
    const selectedLang = e.target.value;
    setLang(selectedLang);
    localStorage.setItem('language', selectedLang);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleLike = async (betId) => {
    if (!user) return;
    const alreadyLiked = likes[betId]?.includes(user.id);
    if (alreadyLiked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('bet_id', betId);
      setLikes(prev => ({
        ...prev,
        [betId]: prev[betId].filter(id => id !== user.id)
      }));
    } else {
      await supabase.from('likes').insert({ user_id: user.id, bet_id: betId });
      setLikes(prev => ({
        ...prev,
        [betId]: [...(prev[betId] || []), user.id]
      }));
    }
  };

  const handleCommentSubmit = async (betId) => {
    const text = newComments[betId]?.trim();
    if (!text) return;
    await supabase
      .from('comments')
      .insert({ user_id: user.id, bet_id: betId, content: text, nickname });
    const { data: updated } = await supabase
      .from('comments')
      .select('id, content, nickname, user_id, bet_id, created_at')
      .eq('bet_id', betId)
      .order('created_at', { ascending: true });
    setComments(prev => ({ ...prev, [betId]: updated }));
    setNewComments(prev => ({ ...prev, [betId]: '' }));
  };

  const handleCommentDelete = async (commentId, betId) => {
    await supabase.from('comments').delete().eq('id', commentId);
    const updated = (comments[betId] || []).filter(c => c.id !== commentId);
    setComments(prev => ({ ...prev, [betId]: updated }));
  };

  const filteredBets = bets.filter(bet =>
    bet.profiles?.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
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

  if (!hasSubscription) {
    return (
      <div className="p-6 text-white">
        <div className="flex justify-end mb-4 space-x-2">
          <select value={lang} onChange={handleLanguageChange} className="bg-[#2a2a2a] text-white px-3 py-1 rounded">
            <option value="en">English</option>
            <option value="hr">Hrvatski</option>
            <option value="sr">Srpski</option>
            <option value="sl">Slovenski</option>
          </select>
          <button onClick={handleLogout} className="bg-red-600 text-white px-3 py-1 rounded">{t('logout')}</button>
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
      <div className="flex justify-between mb-4">
        <div className="space-x-2">
          <button onClick={() => setShowProBets(!showProBets)} className="px-2 py-1 bg-[#2a2a2a] rounded">{t('pro_bets')}</button>
          <button onClick={() => setShowAmateurBets(!showAmateurBets)} className="px-2 py-1 bg-[#2a2a2a] rounded">{t('amateur_bets')}</button>
          <button onClick={() => setShowTables(!showTables)} className="px-2 py-1 bg-[#2a2a2a] rounded">{t('toggle_tables')}</button>
        </div>
        <div className="space-x-2 flex">
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-2 py-1 bg-[#2a2a2a] rounded text-white"
          />
          <select value={lang} onChange={handleLanguageChange} className="bg-[#2a2a2a] text-white px-2 py-1 rounded">
            <option value="en">EN</option>
            <option value="hr">HR</option>
            <option value="sr">SR</option>
            <option value="sl">SL</option>
          </select>
          <button onClick={handleLogout} className="bg-red-600 px-2 py-1 rounded text-white">{t('logout')}</button>
        </div>
      </div>

      {showTables && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold mb-2">{t('best_pro')}</h3>
            <ul className="bg-[#1a1a1a] rounded p-3 space-y-1">
              {proRankings.map((p, i) => (
                <li key={i}>{i + 1}. {p.nickname} - €{p.saldo.toFixed(2)}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">{t('best_amateur')}</h3>
            <ul className="bg-[#1a1a1a] rounded p-3 space-y-1">
              {amateurRankings.map((p, i) => (
                <li key={i}>{i + 1}. {p.nickname} - €{p.saldo.toFixed(2)}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {filteredBets.map(bet => {
        const role = bet.profiles?.role;
        if ((role === 'pro_tipster' && showProBets) || (role === 'amateur_tipster' && showAmateurBets)) {
          return renderBet(bet);
        }
        return null;
      })}
    </div>
  );
};

export default SubscriberDashboard;
