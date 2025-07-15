'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useRouter } from 'next/router';

const ProTipsterDashboard = () => {
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState('');
  const [bets, setBets] = useState([]);
  const [stake, setStake] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [totalOdds, setTotalOdds] = useState('');
  const [title, setTitle] = useState('');
  const [pair, setPair] = useState('');
  const [pick, setPick] = useState('');
  const [status, setStatus] = useState('pending');
  const [balance, setBalance] = useState(10000);
  const [proRankings, setProRankings] = useState([]);
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [filter, setFilter] = useState('all');

  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/');
      setUser(user);

      const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).single();
      setNickname(profile?.nickname || '');

      const { data: allBets } = await supabase
        .from('bets')
        .select('*, profiles(id, nickname, role)')
        .order('created_at', { ascending: false });

      setBets(allBets || []);

      const userBets = (allBets || []).filter((b) => b.user_id === user.id);
      let bal = 10000;
      userBets.forEach(bet => {
        if (bet.status === 'win') {
          bal += bet.stake * bet.total_odds;
        } else if (bet.status === 'lose') {
          bal -= bet.stake;
        }
      });
      setBalance(bal);

      const { data: allProfiles } = await supabase.from('profiles').select('id, nickname, role');
      const saldoMap = {};
      allBets.forEach(bet => {
        const uid = bet.user_id;
        if (!saldoMap[uid]) saldoMap[uid] = 10000;
        if (bet.status === 'win') {
          saldoMap[uid] += bet.stake * bet.total_odds;
        } else if (bet.status === 'lose') {
          saldoMap[uid] -= bet.stake;
        }
      });
      const pros = allProfiles
        .filter(p => p.role === 'pro_tipster')
        .map(p => ({ ...p, saldo: saldoMap[p.id] || 10000 }))
        .sort((a, b) => b.saldo - a.saldo);
      setProRankings(pros);

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
        .select('*, profiles!comments_user_id_fkey(nickname)')
        .order('created_at', { ascending: true });

      const commentMap = {};
      commentsData?.forEach((c) => {
        if (!commentMap[c.bet_id]) commentMap[c.bet_id] = [];
        commentMap[c.bet_id].push(c);
      });
      setComments(commentMap);
    };

    fetchUserData();
  }, []);

  const handleAddBet = async () => {
    if (!title || !analysis || !stake || !totalOdds || !pair || !pick) return;

    const { error } = await supabase.from('bets').insert({
      user_id: user.id,
      title,
      analysis,
      stake: parseFloat(stake),
      total_odds: parseFloat(totalOdds),
      status,
      pair,
      pick,
    });

    if (!error) {
      setTitle('');
      setAnalysis('');
      setStake('');
      setTotalOdds('');
      setPair('');
      setPick('');
      setStatus('pending');
      const { data: updated } = await supabase
        .from('bets')
        .select('*, profiles(id, nickname, role)')
        .order('created_at', { ascending: false });
      setBets(updated || []);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    await supabase.from('bets').update({ status: newStatus }).eq('id', id);
    const { data: updated } = await supabase
      .from('bets')
      .select('*, profiles(id, nickname, role)')
      .order('created_at', { ascending: false });
    setBets(updated || []);
  };

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
    const { error } = await supabase.from('comments').insert({
      user_id: user.id,
      bet_id: betId,
      content: text,
    });
    if (!error) {
      const { data: updated } = await supabase
        .from('comments')
        .select('*, profiles!comments_user_id_fkey(nickname)')
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

  const renderBet = (bet) => (
    <div key={bet.id} className="bg-[#1f1f1f] p-4 rounded-lg mt-4">
      <p className="text-sm text-gray-400">{new Date(bet.created_at).toLocaleString()}</p>
      <p className="text-xl font-bold">{bet.title}</p>
      <p className="text-md">Autor: <span className="text-blue-400">{bet.profiles?.nickname || 'Nepoznat'}</span></p>
      <p>Par: <strong>{bet.pair}</strong> | Tip: <strong>{bet.pick}</strong></p>
      <p>Analiza: {bet.analysis}</p>
      <p>Ulog: €{bet.stake} | Kvota: {bet.total_odds}</p>
      <p>Status: {bet.status}</p>
      {bet.user_id === user.id && (
        <div className="space-x-2 mt-2">
          <button onClick={() => handleStatusChange(bet.id, 'win')} className="text-green-400">✅ Dobitan</button>
          <button onClick={() => handleStatusChange(bet.id, 'lose')} className="text-red-400">❌ Gubitni</button>
        </div>
      )}
      <button onClick={() => handleLike(bet.id)} className="text-blue-400 mt-2 block">
        {likes[bet.id] ? '❤️ Sviđa mi se' : '🤍 Like'}
      </button>
      <div className="mt-3">
        <input
          type="text"
          value={newComments[bet.id] || ''}
          onChange={(e) => setNewComments(prev => ({ ...prev, [bet.id]: e.target.value }))}
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

  const filteredBets = bets.filter(b => {
    if (filter === 'pro') return b.profiles?.role === 'pro_tipster';
    if (filter === 'amateur') return b.profiles?.role !== 'pro_tipster';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">PRO Tipster Dashboard</h1>
        <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded">Odjava</button>
      </div>

      <h2 className="text-xl font-semibold mb-2">Tvoj saldo: €{balance.toFixed(2)}</h2>

      <div className="bg-[#1a1a1a] p-4 rounded mb-6">
        <h2 className="text-lg font-bold mb-2">Unesi novi listić</h2>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Naslov" className="w-full mb-2 p-2 bg-[#2a2a2a] rounded" />
        <input value={pair} onChange={e => setPair(e.target.value)} placeholder="Par (npr. Dinamo - Hajduk)" className="w-full mb-2 p-2 bg-[#2a2a2a] rounded" />
        <input value={pick} onChange={e => setPick(e.target.value)} placeholder="Tip (npr. 1, X2, Over 2.5)" className="w-full mb-2 p-2 bg-[#2a2a2a] rounded" />
        <textarea value={analysis} onChange={e => setAnalysis(e.target.value)} placeholder="Analiza" className="w-full mb-2 p-2 bg-[#2a2a2a] rounded" />
        <input value={stake} onChange={e => setStake(e.target.value)} placeholder="Ulog (€)" type="number" className="w-full mb-2 p-2 bg-[#2a2a2a] rounded" />
        <input value={totalOdds} onChange={e => setTotalOdds(e.target.value)} placeholder="Kvota" type="number" step="0.01" className="w-full mb-2 p-2 bg-[#2a2a2a] rounded" />
        <button onClick={handleAddBet} className="bg-green-600 px-4 py-2 rounded">Dodaj listić</button>
      </div>

      <h2 className="text-xl font-semibold mb-4">🏆 Rang lista PRO tipstera</h2>
      {proRankings.map((p, idx) => (
        <p key={p.id}>{idx + 1}. {p.nickname} - €{p.saldo.toFixed(2)}</p>
      ))}

      <div className="mt-6">
        <select onChange={e => setFilter(e.target.value)} value={filter} className="mb-4 bg-[#2a2a2a] p-2 rounded">
          <option value="all">Prikaži sve listiće</option>
          <option value="pro">Samo PRO tipsteri</option>
          <option value="amateur">Samo amateri</option>
        </select>
        {filteredBets.map(renderBet)}
      </div>
    </div>
  );
};

export default ProTipsterDashboard;
