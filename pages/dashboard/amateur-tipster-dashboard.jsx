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
  const [rangLista, setRangLista] = useState([]);
  const [prolaznost, setProlaznost] = useState(0);
  const [mozeZatraziti, setMozeZatraziti] = useState(false);
  const [expandedAmateur, setExpandedAmateur] = useState(false);
  const [expandedPro, setExpandedPro] = useState(false);
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  useEffect(() => {
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

      fetchListici(user.id);
      fetchRangLista();
      fetchSviListici();
    };
    fetchUser();
  }, []);

  const fetchListici = async (id) => {
    const { data } = await supabase.from('bets').select('*').eq('user_id', id);
    if (data) {
      setMojiListici(data);
      const pogodjeni = data.filter(b => b.status === 'won').length;
      const postotak = data.length > 0 ? Math.round((pogodjeni / data.length) * 100) : 0;
      setProlaznost(postotak);
      setMozeZatraziti(postotak >= 70 && data.length >= 10);

      let currentSaldo = 10000;
      data.forEach(bet => {
        if (bet.status === 'won') currentSaldo += bet.stake * bet.total_odds;
        else if (bet.status === 'lost') currentSaldo -= bet.stake;
      });
      setSaldo(currentSaldo);
    }
  };

  const fetchRangLista = async () => {
    const { data } = await supabase.rpc('get_amateur_rang_lista');
    if (data) setRangLista(data);
  };

  const fetchSviListici = async () => {
    const { data: pro } = await supabase
      .from('bets')
      .select('*, profiles(nickname)')
      .eq('role', 'pro_tipster');

    const { data: amateur } = await supabase
      .from('bets')
      .select('*, profiles(nickname)')
      .eq('role', 'amateur_tipster');

    if (pro) setProListici(pro);
    if (amateur) setSviListici(amateur);

    const sviBetIds = [...(pro || []), ...(amateur || [])].map(b => b.id);
    if (sviBetIds.length > 0) {
      const { data: sviKomentari } = await supabase
        .from('comments')
        .select('*')
        .in('bet_id', sviBetIds);
      const grouped = sviKomentari.reduce((acc, comment) => {
        if (!acc[comment.bet_id]) acc[comment.bet_id] = [];
        acc[comment.bet_id].push(comment);
        return acc;
      }, {});
      setComments(grouped);
    }
  };

  const handleUnosListica = async () => {
    if (!userId) return alert("Niste prijavljeni.");
    const kvota = parseFloat(ukupnaKvota());
    const created_at = new Date().toISOString();

    const { error } = await supabase.from('bets').insert([{
      id: uuidv4(),
      user_id: userId,
      title: naslov,
      stake: parseFloat(ulog),
      total_odds: kvota,
      analysis: analiza,
      status,
      created_at,
      role: 'amateur_tipster',
      pairs: parovi
    }]);

    if (!error) {
      fetchListici(userId);
      fetchSviListici();
      setParovi([{ par: '', kvota: '', tip: '' }]);
      setUlog('');
      setAnaliza('');
      setStatus('pending');
      setNaslov('');
    } else {
      alert("Greška: " + error.message);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    const { error } = await supabase
      .from('bets')
      .update({ status: newStatus })
      .eq('id', id);
    if (!error) {
      fetchListici(userId);
      fetchSviListici();
    }
  };

  const handleCommentChange = (betId, value) => {
    setNewComments({ ...newComments, [betId]: value });
  };

  const handleAddComment = async (betId) => {
    if (!newComments[betId]) return;
    await supabase.from('comments').insert([{
      bet_id: betId,
      user_id: userId,
      content: newComments[betId],
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
    if (!existing.length) {
      await supabase.from('likes').insert([{ bet_id: betId, user_id: userId }]);
      fetchSviListici();
    }
  };

  const handleDodajPar = () => {
    setParovi([...parovi, { par: '', kvota: '', tip: '' }]);
  };

  const handleChangePar = (index, field, value) => {
    const noviParovi = [...parovi];
    noviParovi[index][field] = value;
    setParovi(noviParovi);
  };

  const ukupnaKvota = () => {
    return parovi.reduce((acc, p) => acc * parseFloat(p.kvota || 1), 1).toFixed(2);
  };

  const renderComments = (betId) => {
    const betComments = comments[betId] || [];
    return (
      <div className="ml-4 mt-2">
        {betComments.map(c => (
          <div key={c.id} className="flex justify-between items-center text-sm border-b border-gray-600 py-1">
            <span><strong>{c.nickname}</strong>: {c.content}</span>
            {c.user_id === userId && (
              <button onClick={() => handleDeleteComment(c.id)} className="text-red-400 text-xs ml-2">Obriši</button>
            )}
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <input
            className="p-1 bg-gray-800 text-white w-full"
            placeholder="Komentar..."
            value={newComments[betId] || ''}
            onChange={(e) => handleCommentChange(betId, e.target.value)}
          />
          <button onClick={() => handleAddComment(betId)} className="bg-blue-600 px-2 rounded">Komentiraj</button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 text-white bg-black min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Amaterski Tipster Dashboard</h1>
        <button onClick={handleLogout} className="bg-red-600 px-4 py-2 rounded">Odjava</button>
      </div>

      <p>Saldo: €{saldo.toFixed(2)}</p>
      <p>Prolaznost: {prolaznost}%</p>
      {mozeZatraziti && <button className="bg-yellow-500 p-2 rounded my-2">Zatraži PRO status</button>}

      <div className="my-6">
        <h2 className="text-xl font-bold mb-2">Rang lista amaterskih tipstera</h2>
        {rangLista.map((r, index) => (
          <p key={index}>{index + 1}. {r.nickname || r.email} - €{r.saldo.toFixed(2)}</p>
        ))}
      </div>

      <div className="my-6">
        <button onClick={() => setExpandedPro(!expandedPro)} className="bg-gray-700 p-2 rounded w-full">
          {expandedPro ? 'Sakrij PRO listiće' : 'Prikaži PRO listiće'}
        </button>
        {expandedPro && proListici.map((l) => (
          <div key={l.id} className="border-b border-gray-600 py-2">
            <p><strong>{l.profiles?.nickname || 'Nepoznat'}:</strong> {l.title}</p>
            <p>{l.pairs.map(p => `${p.par} (${p.tip}) - ${p.kvota}`).join(', ')}</p>
            <p>Kvota: {l.total_odds} - Ulog: {l.stake} - Status: {l.status}</p>
            <button onClick={() => handleLike(l.id)} className="text-sm text-green-400 mt-1">👍 Like</button>
            {renderComments(l.id)}
          </div>
        ))}
      </div>

      <div className="my-6">
        <button onClick={() => setExpandedAmateur(!expandedAmateur)} className="bg-gray-700 p-2 rounded w-full">
          {expandedAmateur ? 'Sakrij amaterske listiće' : 'Prikaži amaterske listiće'}
        </button>
        {expandedAmateur && sviListici.map((l) => (
          <div key={l.id} className="border-b border-gray-600 py-2">
            <p><strong>{l.profiles?.nickname || 'Nepoznat'}:</strong> {l.title}</p>
            <p>{l.pairs.map(p => `${p.par} (${p.tip}) - ${p.kvota}`).join(', ')}</p>
            <p>Kvota: {l.total_odds} - Ulog: {l.stake} - Status: {l.status}</p>
            <button onClick={() => handleLike(l.id)} className="text-sm text-green-400 mt-1">👍 Like</button>
            {renderComments(l.id)}
          </div>
        ))}
      </div>
    </div>
  );
}
