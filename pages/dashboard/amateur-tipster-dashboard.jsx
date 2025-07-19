import { useState, useEffect } from 'react';
import { supabase } from '../../lib/customSupabaseClient';
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
  const [proListici, setProListici] = useState([]);
  const [amateurListici, setAmateurListici] = useState([]);
  const [comments, setComments] = useState({});
  const [likes, setLikes] = useState({});
  const [newComments, setNewComments] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [expandedPro, setExpandedPro] = useState(true);
  const [expandedAmateur, setExpandedAmateur] = useState(true);
  const [showProRequest, setShowProRequest] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/');
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, is_subscribed')
        .eq('id', user.id)
        .single();

      if (!profile?.is_subscribed) return router.push('/');
      if (profile) setNickname(profile.nickname);

      await fetchListici(user.id);
      await fetchSviListici();
    };
    fetchData();
  }, []);

  const fetchListici = async (id) => {
    const { data } = await supabase.from('bets').select('*').eq('user_id', id);
    if (data) {
      let saldoTemp = 10000;
      let win = 0, total = 0;
      data.forEach(bet => {
        if (bet.status === 'win') {
          saldoTemp += bet.stake * bet.total_odds;
          win++;
          total++;
        } else if (bet.status === 'lose') {
          saldoTemp -= bet.stake;
          total++;
        }
      });
      setSaldo(saldoTemp);

      if (total >= 10 && (win / total) >= 0.7) {
        setShowProRequest(true);
      }
    }
  };

  const fetchSviListici = async () => {
    const { data: pro } = await supabase.from('bets').select('*, profiles(nickname)').eq('role', 'pro_tipster').order('created_at', { ascending: false });
    const { data: amateur } = await supabase.from('bets').select('*, profiles(nickname)').eq('role', 'amateur_tipster').order('created_at', { ascending: false });
    setProListici(pro || []);
    setAmateurListici(amateur || []);

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

  const handleUnosListica = async () => {
    const newBet = {
      id: uuidv4(),
      user_id: userId,
      title: naslov,
      analysis: analiza,
      pairs: parovi,
      stake: parseFloat(ulog),
      total_odds: parseFloat(ukupnaKvota()),
      status: 'pending',
      role: 'amateur_tipster',
      created_at: new Date().toISOString()
    };
    await supabase.from('bets').insert(newBet);
    await fetchSviListici();
    await fetchListici(userId);
    setParovi([{ par: '', kvota: '', tip: '' }]);
    setUlog('');
    setNaslov('');
    setAnaliza('');
  };

  const handleRequestPro = async () => {
    await supabase.from('pro_requests').insert({
      id: uuidv4(),
      user_id: userId,
      nickname,
      requested_at: new Date().toISOString(),
      status: 'pending'
    });
    alert("Zahtjev za PRO status je poslan.");
    setShowProRequest(false);
  };

  const ukupnaKvota = () => parovi.reduce((acc, p) => acc * parseFloat(p.kvota || 1), 1).toFixed(2);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleChangePar = (i, field, value) => {
    const updated = [...parovi];
    updated[i][field] = value;
    setParovi(updated);
  };

  const handleDodajPar = () => {
    setParovi([...parovi, { par: '', kvota: '', tip: '' }]);
  };

  const handleChangeStatus = async (id, newStatus) => {
    const { data: bet } = await supabase.from('bets').select('*').eq('id', id).single();
    if (bet.user_id !== userId) return;
    await supabase.from('bets').update({ status: newStatus }).eq('id', id);
    await fetchSviListici();
    await fetchListici(userId);
  };

  const handleLike = async (betId) => {
    const existing = likes[betId]?.find(l => l.user_id === userId);
    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('likes').insert({ id: uuidv4(), user_id: userId, bet_id: betId });
    }
    await fetchSviListici();
  };

  const handleAddComment = async (betId) => {
    const content = newComments[betId];
    if (!content) return;
    await supabase.from('comments').insert({ id: uuidv4(), user_id: userId, bet_id: betId, content, nickname });
    setNewComments({ ...newComments, [betId]: '' });
    await fetchSviListici();
  };

  const handleDeleteComment = async (commentId) => {
    await supabase.from('comments').delete().eq('id', commentId).eq('user_id', userId);
    await fetchSviListici();
  };

  const renderListic = (l) => (
    <div key={l.id} className="border-b border-gray-600 py-2">
      <p><strong>{l.profiles?.nickname || 'Nepoznat'}:</strong> {l.title}</p>
      {l.analysis && <p className="italic text-gray-400 mt-1">Analiza: {l.analysis}</p>}
      <p>{l.pairs.map(p => `${p.par} (${p.tip}) - ${p.kvota}`).join(', ')}</p>
      <p>Kvota: {l.total_odds} - Ulog: {l.stake} - Status: {l.status}</p>
      {l.user_id === userId && l.status === 'pending' && (
        <div className="flex gap-2 my-2">
          <button onClick={() => handleChangeStatus(l.id, 'win')} className="bg-green-600 px-2 rounded">Označi kao dobitan</button>
          <button onClick={() => handleChangeStatus(l.id, 'lose')} className="bg-red-600 px-2 rounded">Označi kao gubitan</button>
        </div>
      )}
      <p>👍 {likes[l.id]?.length || 0}</p>
      <button onClick={() => handleLike(l.id)} className="text-green-400 text-sm">{likes[l.id]?.some(like => like.user_id === userId) ? 'Makni lajk' : 'Lajkaj'}</button>
      <div className="ml-4 mt-2">
        {comments[l.id]?.map(c => (
          <div key={c.id} className="flex justify-between text-sm border-b border-gray-600 py-1">
            <span><strong>{c.nickname}</strong>: {c.content}</span>
            {c.user_id === userId && (
              <button onClick={() => handleDeleteComment(c.id)} className="text-red-400 text-xs ml-2">Obriši</button>
            )}
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <input className="p-1 bg-gray-800 text-white w-full"
            placeholder="Komentar..." value={newComments[l.id] || ''}
            onChange={(e) => setNewComments({ ...newComments, [l.id]: e.target.value })} />
          <button onClick={() => handleAddComment(l.id)} className="bg-blue-600 px-2 rounded">Komentiraj</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 text-white bg-black min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Amaterski Tipster Dashboard</h1>
        <button onClick={handleLogout} className="bg-red-600 px-4 py-2 rounded">Odjava</button>
      </div>

      <h2 className="text-lg mt-2">Tvoj saldo: <span className="font-bold text-yellow-400">{saldo.toFixed(2)}€</span></h2>

      {showProRequest && (
        <button onClick={handleRequestPro} className="mt-4 bg-purple-600 px-4 py-2 rounded">Zatraži PRO status</button>
      )}

      <h2 className="text-xl font-bold mb-2 mt-4">Unesi novi listić</h2>
      <input value={naslov} onChange={e => setNaslov(e.target.value)} className="mb-1 p-1 w-full bg-gray-800" placeholder="Naslov" />
      <input value={ulog} onChange={e => setUlog(e.target.value)} className="mb-1 p-1 w-full bg-gray-800" placeholder="Ulog (€)" />
      {parovi.map((p, i) => (
        <div key={i} className="flex gap-2 mb-1">
          <input value={p.par} onChange={e => handleChangePar(i, 'par', e.target.value)} placeholder="Par" className="bg-gray-800 p-1 w-1/3" />
          <input value={p.tip} onChange={e => handleChangePar(i, 'tip', e.target.value)} placeholder="Tip" className="bg-gray-800 p-1 w-1/3" />
          <input value={p.kvota} onChange={e => handleChangePar(i, 'kvota', e.target.value)} placeholder="Kvota" className="bg-gray-800 p-1 w-1/3" />
        </div>
      ))}
      <button onClick={handleDodajPar} className="bg-gray-700 px-2 py-1 mb-2 rounded">Dodaj par</button>
      <textarea value={analiza} onChange={e => setAnaliza(e.target.value)} placeholder="Analiza" className="bg-gray-800 w-full p-1 mb-2" />
      <button onClick={handleUnosListica} className="bg-green-600 px-4 py-2 rounded">Objavi listić</button>

      <div className="mt-6">
        <button onClick={() => setExpandedPro(!expandedPro)} className="w-full bg-gray-700 p-2 rounded">
          {expandedPro ? 'Sakrij PRO listiće' : 'Prikaži PRO listiće'}
        </button>
        {expandedPro && proListici.map(renderListic)}
      </div>

      <div className="mt-6">
        <button onClick={() => setExpandedAmateur(!expandedAmateur)} className="w-full bg-gray-700 p-2 rounded">
          {expandedAmateur ? 'Sakrij amaterske listiće' : 'Prikaži amaterske listiće'}
        </button>
        {expandedAmateur && amateurListici.map(renderListic)}
      </div>
    </div>
  );
}
