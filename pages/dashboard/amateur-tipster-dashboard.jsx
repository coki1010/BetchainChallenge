// pages/dashboard/amateur-tipster-dashboard.jsx

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useRouter } from 'next/router';

const AmateurTipsterDashboard = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [bets, setBets] = useState([]);
  const [nickname, setNickname] = useState('');
  const [title, setTitle] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [pairs, setPairs] = useState([{ par: '', tip: '', kvota: '' }]);
  const [stake, setStake] = useState(0);
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [successRate, setSuccessRate] = useState(null);
  const [showRequest, setShowRequest] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).single();
      setNickname(profile?.nickname || '');

      const { data: betsData } = await supabase.from('bets').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setBets(betsData);

      const wins = betsData.filter(b => b.status === 'win').length;
      const total = betsData.length;
      if (total >= 10 && (wins / total) >= 0.7) setShowRequest(true);

      const { data: likesData } = await supabase.from('likes').select('*');
      const likeMap = {};
      likesData?.forEach(like => {
        if (!likeMap[like.bet_id]) likeMap[like.bet_id] = 0;
        likeMap[like.bet_id] += 1;
      });
      setLikes(likeMap);

      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, profiles:profiles!comments_user_id_fkey(nickname)')
        .order('created_at', { ascending: true });

      const commentMap = {};
      commentsData?.forEach(c => {
        if (!commentMap[c.bet_id]) commentMap[c.bet_id] = [];
        commentMap[c.bet_id].push(c);
      });
      setComments(commentMap);
    };
    fetchData();
  }, []);

  const handleAddPair = () => {
    setPairs([...pairs, { par: '', tip: '', kvota: '' }]);
  };

  const handlePostBet = async () => {
    const total_odds = pairs.reduce((acc, p) => acc * parseFloat(p.kvota || 1), 1);
    const { error } = await supabase.from('bets').insert({
      title,
      analysis,
      stake,
      pairs,
      total_odds,
      status: 'pending',
      user_id: user.id
    });
    if (!error) window.location.reload();
  };

  const handleCommentSubmit = async (betId) => {
    const text = newComments[betId]?.trim();
    if (!text) return;
    const { error } = await supabase.from('comments').insert({ user_id: user.id, bet_id: betId, content: text });
    if (!error) {
      const { data: updated } = await supabase
        .from('comments')
        .select('*, profiles:profiles!comments_user_id_fkey(nickname)')
        .eq('bet_id', betId);
      setComments(prev => ({ ...prev, [betId]: updated }));
      setNewComments(prev => ({ ...prev, [betId]: '' }));
    }
  };

  const handleRequestProStatus = async () => {
    await supabase.from('pro_requests').insert({ user_id: user.id, requested_at: new Date() });
    setShowRequest(false);
    alert('Zahtjev poslan adminu.');
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Amaterski Tipster Dashboard</h1>

      <input type="text" placeholder="Naslov listića" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 bg-[#1a1a1a] mb-2" />
      <textarea placeholder="Analiza" value={analysis} onChange={e => setAnalysis(e.target.value)} className="w-full p-2 bg-[#1a1a1a] mb-2"></textarea>
      {pairs.map((p, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <input value={p.par} placeholder="Par" onChange={e => {
            const newPairs = [...pairs];
            newPairs[i].par = e.target.value;
            setPairs(newPairs);
          }} className="flex-1 p-2 bg-[#1a1a1a]" />
          <input value={p.tip} placeholder="Tip" onChange={e => {
            const newPairs = [...pairs];
            newPairs[i].tip = e.target.value;
            setPairs(newPairs);
          }} className="flex-1 p-2 bg-[#1a1a1a]" />
          <input value={p.kvota} placeholder="Kvota" onChange={e => {
            const newPairs = [...pairs];
            newPairs[i].kvota = e.target.value;
            setPairs(newPairs);
          }} className="w-20 p-2 bg-[#1a1a1a]" />
        </div>
      ))}
      <button onClick={handleAddPair} className="bg-blue-500 px-4 py-2 rounded mb-2">Dodaj par</button>
      <input type="number" placeholder="Ulog" value={stake} onChange={e => setStake(parseInt(e.target.value))} className="w-full p-2 bg-[#1a1a1a] mb-4" />
      <button onClick={handlePostBet} className="bg-green-600 px-6 py-2 rounded">Objavi listić</button>

      {showRequest && (
        <button onClick={handleRequestProStatus} className="bg-yellow-500 text-black px-4 py-2 mt-4 rounded">Zatraži PRO status</button>
      )}

      <h2 className="text-xl font-bold mt-8 mb-2">🎯 Amaterski listići</h2>
      {bets.map(b => (
        <div key={b.id} className="bg-[#1a1a1a] p-4 rounded-xl mt-4">
          <p className="text-sm text-gray-400">{new Date(b.created_at).toLocaleString()}</p>
          <p className="text-lg font-bold">{b.title}</p>
          <p className="italic">Analiza: {b.analysis}</p>
          <p className="mt-1">{b.pairs.map(p => `${p.par} (${p.tip}) - ${p.kvota}`).join(', ')}</p>
          <p className="mt-1">Kvota: {b.total_odds} - Ulog: {b.stake} - Status: {b.status}</p>
          <p className="mt-1">👍 {likes[b.id] || 0}</p>
          <div className="mt-3">
            <input
              type="text"
              value={newComments[b.id] || ''}
              onChange={(e) => setNewComments(prev => ({ ...prev, [b.id]: e.target.value }))}
              placeholder="Komentar..."
              className="w-full p-2 bg-[#2a2a2a] rounded mb-2"
            />
            <button onClick={() => handleCommentSubmit(b.id)} className="text-green-400 text-sm">Komentiraj</button>
            <div className="mt-2 space-y-1">
              {(comments[b.id] || []).map(c => (
                <div key={c.id} className="text-sm text-gray-300">
                  <p><strong>{c.profiles?.nickname || 'Korisnik'}:</strong> {c.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AmateurTipsterDashboard;
