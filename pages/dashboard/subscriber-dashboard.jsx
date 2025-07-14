
// SubscriberDashboard.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useRouter } from 'next/router';

const SubscriberDashboard = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [bets, setBets] = useState([]);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [lang, setLang] = useState('en');
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [proRankings, setProRankings] = useState([]);
  const [amateurRankings, setAmateurRankings] = useState([]);
  const [showProBets, setShowProBets] = useState(true);
  const [showAmateurBets, setShowAmateurBets] = useState(true);

  useEffect(() => {
    const storedLang = localStorage.getItem('language');
    if (storedLang) setLang(storedLang);

    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_subscribed')
        .eq('id', user.id)
        .single();
      setHasSubscription(profile?.is_subscribed === true);

      const { data: betsData } = await supabase
        .from('bets')
        .select('*, profiles(id, nickname, role)')
        .order('created_at', { ascending: false });
      setBets(betsData || []);

      const { data: likesData } = await supabase.from('likes').select('*');
      const likeMap = {};
      likesData?.forEach((like) => {
        if (like.user_id === user.id) {
          likeMap[like.bet_id] = true;
        }
      });
      setLikes(likeMap);

      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, profiles(nickname)')
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

  const handleLike = async (betId) => {
    if (!user) return;
    if (likes[betId]) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('bet_id', betId);
    } else {
      await supabase.from('likes').insert({ user_id: user.id, bet_id: betId });
    }
    setLikes((prev) => ({ ...prev, [betId]: !prev[betId] }));
  };

  const handleCommentSubmit = async (betId) => {
    const text = newComments[betId]?.trim();
    if (!text) return;
    const { error } = await supabase.from('comments').insert({ user_id: user.id, bet_id: betId, content: text });
    if (!error) {
      const { data: updated } = await supabase
        .from('comments')
        .select('*, profiles(nickname)')
        .eq('bet_id', betId)
        .order('created_at', { ascending: true });
      setComments(prev => ({ ...prev, [betId]: updated }));
      setNewComments(prev => ({ ...prev, [betId]: '' }));
    }
  };

  const handleCommentDelete = async (commentId, betId) => {
    await supabase.from('comments').delete().eq('id', commentId);
    const updated = (comments[betId] || []).filter(c => c.id !== commentId);
    setComments(prev => ({ ...prev, [betId]: updated }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const filteredBets = bets.filter(bet =>
    bet.profiles?.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderBet = (bet) => (
    <div key={bet.id} className="bg-[#1a1a1a] p-4 rounded-xl mt-4">
      <p className="text-sm text-gray-400">{new Date(bet.created_at).toLocaleString()}</p>
      <p className="text-lg font-bold">{bet.title}</p>
      <p className="mt-1">Autor: <span className="text-blue-400">{bet.profiles?.nickname || 'Nepoznat'}</span></p>
      <p className="mt-1">Analiza: {bet.analysis}</p>
      <p className="mt-1">Ulog: €{bet.stake} | Kvota: {bet.total_odds}</p>
      <p className="mt-1 font-semibold">Status: {bet.status}</p>
      <button onClick={() => handleLike(bet.id)} className="text-blue-400 text-sm mt-2">
        {likes[bet.id] ? '❤️ Sviđa mi se' : '🤍 Like'}
      </button>
      <div className="mt-3">
        <input
          type="text"
          value={newComments[bet.id] || ''}
          onChange={(e) => setNewComments((prev) => ({ ...prev, [bet.id]: e.target.value }))}
          placeholder="Dodaj komentar..."
          className="w-full p-2 bg-[#2a2a2a] rounded mb-2"
        />
        <button onClick={() => handleCommentSubmit(bet.id)} className="text-green-400 text-sm">Pošalji</button>
        <div className="mt-2 space-y-1">
          {(comments[bet.id] || []).map((c) => (
            <div key={c.id} className="text-sm text-gray-300 flex justify-between items-center">
              <p><strong>{c.profiles?.nickname || 'Korisnik'}:</strong> {c.content}</p>
              {c.user_id === user.id && (
                <button onClick={() => handleCommentDelete(c.id, bet.id)} className="text-red-400 text-xs ml-2">Obriši</button>
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
        <h2 className="text-lg">Nemate aktivnu pretplatu.</h2>
        <a href="https://buy.stripe.com/cNi7sL1cr9NFaka2pg9R601" target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded inline-block mt-4">
          Aktiviraj pretplatu
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-4 items-center">
          <input
            type="text"
            placeholder="Pretraži tipstera..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#1a1a1a] text-white px-2 py-1 rounded"
          />
          <button onClick={handleLogout} className="bg-red-500 px-4 py-1 rounded text-white">Odjava</button>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-2">🏆 Rang lista PRO tipstera</h2>
      {proRankings.map((p, idx) => (
        <p key={p.id}>{idx + 1}. {p.nickname} - €{p.saldo.toFixed(2)}</p>
      ))}

      <h2 className="text-xl font-semibold mt-6 mb-2">🎯 Rang lista amaterskih tipstera</h2>
      {amateurRankings.map((p, idx) => (
        <p key={p.id}>{idx + 1}. {p.nickname} - €{p.saldo.toFixed(2)}</p>
      ))}

      <div className="mt-6">
        <button onClick={() => setShowProBets(!showProBets)} className="text-lg font-semibold text-blue-400">
          📄 Listići PRO tipstera {showProBets ? '▲' : '▼'}
        </button>
        {showProBets && filteredBets.filter(b => b.profiles?.role === 'pro_tipster').map(renderBet)}
      </div>

      <div className="mt-6">
        <button onClick={() => setShowAmateurBets(!showAmateurBets)} className="text-lg font-semibold text-green-400">
          📄 Listići amaterskih tipstera {showAmateurBets ? '▲' : '▼'}
        </button>
        {showAmateurBets && filteredBets.filter(b => b.profiles?.role === 'amateur_tipster').map(renderBet)}
      </div>
    </div>
  );
};

export default SubscriberDashboard;
