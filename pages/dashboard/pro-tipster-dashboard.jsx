
// /pages/dashboard/amateur-tipster-dashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';

export default function AmateurTipsterDashboard() {
  const [userId, setUserId] = useState(null);
  const [nickname, setNickname] = useState('');
  const [saldo, setSaldo] = useState(10000);
  const [parovi, setParovi] = useState([{ par: '', kvota: '', tip: '' }]);
  const [ulog, setUlog] = useState('');
  const [naslov, setNaslov] = useState('');
  const [analiza, setAnaliza] = useState('');
  const [status, setStatus] = useState('pending');
  const [mojiListici, setMojiListici] = useState([]);
  const [sviListici, setSviListici] = useState([]);
  const [proListici, setProListici] = useState([]);
  const [comments, setComments] = useState({});
  const [likes, setLikes] = useState({});
  const [newComments, setNewComments] = useState({});
  const [expandedPro, setExpandedPro] = useState(true);
  const [expandedAmateur, setExpandedAmateur] = useState(true);
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/');
      setUserId(user.id);

      const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).single();
      if (profile) setNickname(profile.nickname);

      await fetchListici(user.id);
      await fetchSviListici();
    };
    fetchData();
  }, []);

  const fetchListici = async (id) => {
    const { data } = await supabase.from('bets').select('*').eq('user_id', id);
    if (data) {
      setMojiListici(data);
      updateSaldo(data);
    }
  };

  const fetchSviListici = async () => {
    const { data: pro } = await supabase.from('bets').select('*, profiles(nickname)').eq('role', 'pro_tipster');
    const { data: amateur } = await supabase.from('bets').select('*, profiles(nickname)').eq('role', 'amateur_tipster');

    setProListici(pro || []);
    setSviListici(amateur || []);

    const allBets = [...(pro || []), ...(amateur || [])];
    const betIds = allBets.map(b => b.id);

    const { data: komentarData } = await supabase.from('comments').select('*').in('bet_id', betIds);
    const { data: likeData } = await supabase.from('likes').select('*').in('bet_id', betIds);

    const groupedComments = {};
    komentarData?.forEach(c => {
      if (!groupedComments[c.bet_id]) groupedComments[c.bet_id] = [];
      groupedComments[c.bet_id].push(c);
    });
    setComments(groupedComments);

    const groupedLikes = {};
    likeData?.forEach(l => {
      if (!groupedLikes[l.bet_id]) groupedLikes[l.bet_id] = [];
      groupedLikes[l.bet_id].push(l);
    });
    setLikes(groupedLikes);
  };

  const updateSaldo = (listici) => {
    let saldoTemp = 10000;
    listici.forEach(bet => {
      if (bet.status === 'won') saldoTemp += bet.stake * bet.total_odds;
      else if (bet.status === 'lost') saldoTemp -= bet.stake;
    });
    setSaldo(saldoTemp);
  };

  const handleCommentChange = (betId, val) => {
    setNewComments({ ...newComments, [betId]: val });
  };

  const handleAddComment = async (betId) => {
    const content = newComments[betId];
    if (!content) return;
    await supabase.from('comments').insert([{ bet_id: betId, user_id: userId, content, nickname }]);
    setNewComments({ ...newComments, [betId]: '' });
    fetchSviListici();
  };

  const handleDeleteComment = async (id) => {
    await supabase.from('comments').delete().eq('id', id);
    fetchSviListici();
  };

  const handleLike = async (betId) => {
    const existing = await supabase.from('likes').select('*').eq('bet_id', betId).eq('user_id', userId);
    if (!existing.data.length) {
      await supabase.from('likes').insert([{ bet_id: betId, user_id: userId }]);
      fetchSviListici();
    }
  };

  const handleChangePar = (i, f, v) => {
    const novi = [...parovi];
    novi[i][f] = v;
    setParovi(novi);
  };

  const handleDodajPar = () => setParovi([...parovi, { par: '', kvota: '', tip: '' }]);

  const ukupnaKvota = () => parovi.reduce((acc, p) => acc * parseFloat(p.kvota || 1), 1).toFixed(2);

  const handleUnosListica = async () => {
    if (!naslov || !ulog || !parovi.length) return alert("Popunite sve podatke!");
    const kvota = parseFloat(ukupnaKvota());
    const { error } = await supabase.from('bets').insert([{
      id: uuidv4(),
      user_id: userId,
      title: naslov,
      stake: parseFloat(ulog),
      total_odds: kvota,
      analysis: analiza,
      status,
      role: 'amateur_tipster',
      pairs: parovi,
      created_at: new Date().toISOString()
    }]);
    if (!error) {
      setNaslov(''); setUlog(''); setAnaliza('');
      setParovi([{ par: '', kvota: '', tip: '' }]); setStatus('pending');
      fetchListici(userId); fetchSviListici();
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    await supabase.from('bets').update({ status: newStatus }).eq('id', id);
    fetchListici(userId);
    fetchSviListici();
  };

  const renderComments = (betId) => {
    const betComments = comments[betId] || [];
    return (
      <div className="ml-4 mt-2">
        {betComments.map(c => (
          <div key={c.id} className="flex justify-between text-sm border-b border-gray-600 py-1">
            <span><strong>{c.nickname}</strong>: {c.content}</span>
            {c.user_id === userId && (
              <button onClick={() => handleDeleteComment(c.id)} className="text-red-400 text-xs ml-2">Obriši</button>
            )}
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <input className="p-1 bg-gray-800 text-white w-full" placeholder="Komentar..." value={newComments[betId] || ''}
            onChange={(e) => handleCommentChange(betId, e.target.value)} />
          <button onClick={() => handleAddComment(betId)} className="bg-blue-600 px-2 rounded">Komentiraj</button>
        </div>
      </div>
    );
  };

  const renderListic = (l) => (
    <div key={l.id} className="border-b border-gray-600 py-2">
      <p><strong>{l.profiles?.nickname || 'Nepoznat'}:</strong> {l.title}</p>
      <p>{l.pairs.map(p => `${p.par} (${p.tip}) - ${p.kvota}`).join(', ')}</p>
      <p>Kvota: {l.total_odds} - Ulog: {l.stake} - Status: {l.status}</p>
      <p>Analiza: {l.analysis}</p>
      <p>👍 {likes[l.id]?.length || 0}</p>
      <button onClick={() => handleLike(l.id)} className="text-green-400 text-sm">Lajkaj</button>
      {l.user_id === userId && l.status === 'pending' && (
        <div className="flex gap-2 mt-2">
          <button onClick={() => handleStatusUpdate(l.id, 'won')} className="bg-green-700 px-2 rounded">Označi kao dobitan</button>
          <button onClick={() => handleStatusUpdate(l.id, 'lost')} className="bg-red-700 px-2 rounded">Označi kao gubitan</button>
        </div>
      )}
      {renderComments(l.id)}
    </div>
  );

  return (
    <div className="p-4 text-white bg-black min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Amaterski Tipster Dashboard</h1>
        <button onClick={handleLogout} className="bg-red-600 px-4 py-2 rounded">Odjava</button>
      </div>
      <p className="mb-2">Saldo: €{saldo.toFixed(2)}</p>

      <h2 className="text-xl font-bold mb-2">Unesi novi listić</h2>
      <input value={naslov} onChange={e => setNaslov(e.target.value)} className="mb-1 p-1 w-full bg-gray-800" placeholder="Naslov" />
      <input value={ulog} onChange={e => setUlog(e.target.value)} className="mb-1 p-1 w-full bg-gray-800" placeholder="Ulog (€)" />
