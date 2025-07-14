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
  const [analiza, setAnaliza] = useState('');
  const [naslov, setNaslov] = useState('');
  const [status, setStatus] = useState('pending');
  const [mojiListici, setMojiListici] = useState([]);
  const [sviListici, setSviListici] = useState([]);
  const [proListici, setProListici] = useState([]);
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [expandedAmateur, setExpandedAmateur] = useState(false);
  const [expandedPro, setExpandedPro] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/');
    setUserId(user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', user.id)
      .single();
    if (profile) setNickname(profile.nickname);
  };

  const fetchListici = async () => {
    const { data } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', userId);
    if (data) setMojiListici(data);
  };

  const fetchSviListici = async () => {
    const { data: amateur } = await supabase
      .from('bets')
      .select('*, profiles(nickname)')
      .eq('role', 'amateur_tipster');
    const { data: pro } = await supabase
      .from('bets')
      .select('*, profiles(nickname)')
      .eq('role', 'pro_tipster');

    if (amateur) setSviListici(amateur);
    if (pro) setProListici(pro);

    const sviIds = [...(amateur || []), ...(pro || [])].map(b => b.id);
    const { data: allComments } = await supabase
      .from('comments')
      .select('*')
      .in('bet_id', sviIds);

    const grouped = {};
    allComments?.forEach(c => {
      if (!grouped[c.bet_id]) grouped[c.bet_id] = [];
      grouped[c.bet_id].push(c);
    });
    setComments(grouped);
  };

  useEffect(() => {
    fetchUser().then(() => {
      fetchListici();
      fetchSviListici();
    });
  }, []);

  const handleUnosListica = async () => {
    const kvota = parseFloat(
      parovi.reduce((acc, p) => acc * parseFloat(p.kvota || 1), 1).toFixed(2)
    );
    const { error } = await supabase.from('bets').insert([{
      id: uuidv4(),
      user_id: userId,
      title: naslov,
      stake: parseFloat(ulog),
      total_odds: kvota,
      analysis: analiza,
      status,
      role: 'amateur_tipster',
      created_at: new Date().toISOString(),
      pairs: parovi
    }]);
    if (!error) {
      setParovi([{ par: '', kvota: '', tip: '' }]);
      setNaslov(''); setUlog(''); setAnaliza('');
      fetchListici(); fetchSviListici();
    } else {
      alert("Greška: " + error.message);
    }
  };

  const handleCommentChange = (betId, text) => {
    setNewComments({ ...newComments, [betId]: text });
  };

  const handleAddComment = async (betId) => {
    const content = newComments[betId];
    if (!content) return;
    await supabase.from('comments').insert([{
      bet_id: betId,
      user_id: userId,
      content,
      nickname
    }]);
    setNewComments({ ...newComments, [betId]: '' });
    fetchSviListici();
  };

  const handleDeleteComment = async (commentId) => {
    await supabase.from('comments').delete().eq('id', commentId);
    fetchSviListici();
  };

  const handleLike = async (betId) => {
    const { data: existing } = await supabase
      .from('likes')
      .select('*')
      .eq('bet_id', betId)
      .eq('user_id', userId);
    if (!existing?.length) {
      await supabase.from('likes').insert([{ bet_id: betId, user_id: userId }]);
      fetchSviListici();
    }
  };

  const renderListic = (l) => (
    <div key={l.id} className="border-b border-gray-600 py-2">
      <p><strong>{l.profiles?.nickname || 'Nepoznat'}:</strong> {l.title}</p>
      <p>{l.pairs?.map(p => `${p.par} (${p.tip}) - ${p.kvota}`).join(', ')}</p>
      <p>Kvota: {l.total_odds} - Ulog: {l.stake} - Status: {l.status}</p>
      <button onClick={() => handleLike(l.id)} className="text-sm text-green-400">👍 Like</button>
      {(comments[l.id] || []).map(c => (
        <div key={c.id} className="text-sm flex justify-between items-center mt-1">
          <span><strong>{c.nickname}</strong>: {c.content}</span>
          {c.user_id === userId && (
            <button onClick={() => handleDeleteComment(c.id)} className="text-red-500 text-xs">Obriši</button>
          )}
        </div>
      ))}
      <div className="flex gap-2 mt-1">
        <input
          className="p-1 bg-gray-800 text-white w-full"
          placeholder="Komentar..."
          value={newComments[l.id] || ''}
          onChange={(e) => handleCommentChange(l.id, e.target.value)}
        />
        <button onClick={() => handleAddComment(l.id)} className="bg-blue-600 px-2 rounded">Komentiraj</button>
      </div>
    </div>
  );

  return (
    <div className="p-4 text-white bg-black min-h-screen">
      <div className="flex justify-between mb-4">
        <h1 className="text-xl font-bold">Amaterski Tipster Dashboard</h1>
        <button onClick={handleLogout} className="bg-red-600 px-3 py-1 rounded">Odjava</button>
      </div>

      <div className="my-4">
        <h2 className="font-bold mb-1">Unos novog listića</h2>
        <input placeholder="Naslov" value={naslov} onChange={e => setNaslov(e.target.value)} className="p-1 bg-gray-700 w-full mb-1" />
        <input placeholder="Analiza" value={analiza} onChange={e => setAnaliza(e.target.value)} className="p-1 bg-gray-700 w-full mb-1" />
        <input placeholder="Ulog (€)" type="number" value={ulog} onChange={e => setUlog(e.target.value)} className="p-1 bg-gray-700 w-full mb-1" />
        <select value={status} onChange={e => setStatus(e.target.value)} className="p-1 bg-gray-700 w-full mb-1">
          <option value="pending">Pending</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
        {parovi.map((p, idx) => (
          <div key={idx} className="flex gap-2 mb-1">
            <input placeholder="Par" value={p.par} onChange={e => {
              const newParovi = [...parovi]; newParovi[idx].par = e.target.value; setParovi(newParovi);
            }} className="p-1 bg-gray-700 w-full" />
            <input placeholder="Tip" value={p.tip} onChange={e => {
              const newParovi = [...parovi]; newParovi[idx].tip = e.target.value; setParovi(newParovi);
            }} className="p-1 bg-gray-700 w-full" />
            <input placeholder="Kvota" type="number" value={p.kvota} onChange={e => {
              const newParovi = [...parovi]; newParovi[idx].kvota = e.target.value; setParovi(newParovi);
            }} className="p-1 bg-gray-700 w-full" />
          </div>
        ))}
        <button onClick={() => setParovi([...parovi, { par: '', kvota: '', tip: '' }])} className="bg-gray-700 px-2 py-1 rounded my-1">Dodaj par</button>
        <button onClick={handleUnosListica} className="bg-green-600 px-4 py-2 rounded ml-2">Spremi listić</button>
      </div>

      <div className="my-4">
        <h2 className="font-bold mb-2">Moji listići</h2>
        {mojiListici.map(renderListic)}
      </div>

      <div className="my-6">
        <button onClick={() => setExpandedPro(!expandedPro)} className="bg-gray-700 p-2 rounded w-full mb-2">
          {expandedPro ? 'Sakrij PRO listiće' : 'Prikaži PRO listiće'}
        </button>
        {expandedPro && proListici.map(renderListic)}
      </div>

      <div className="my-6">
        <button onClick={() => setExpandedAmateur(!expandedAmateur)} className="bg-gray-700 p-2 rounded w-full mb-2">
          {expandedAmateur ? 'Sakrij amaterske listiće' : 'Prikaži amaterske listiće'}
        </button>
        {expandedAmateur && sviListici.map(renderListic)}
      </div>
    </div>
  );
}
