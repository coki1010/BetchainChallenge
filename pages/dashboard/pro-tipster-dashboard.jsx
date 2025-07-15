// Uvoz potrebnih React hookova, Supabase klijenta, Next.js routera i UUID generatora
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';

export default function AmateurTipsterDashboard() {
  // Definisanje svih state-ova za korisničke podatke i listiće
  const [userId, setUserId] = useState(null); // Sprema ID prijavljenog korisnika
  const [nickname, setNickname] = useState(''); // Sprema nadimak korisnika
  const [saldo, setSaldo] = useState(10000); // Početni saldo
  const [parovi, setParovi] = useState([{ par: '', kvota: '', tip: '' }]); // Lista parova u listiću
  const [ulog, setUlog] = useState(''); // Ulog za listić
  const [naslov, setNaslov] = useState(''); // Naslov listića
  const [analiza, setAnaliza] = useState(''); // Analiza listića
  const [status, setStatus] = useState('pending'); // Status listića
  const [mojiListici, setMojiListici] = useState([]); // Moji objavljeni listići
  const [sviListici, setSviListici] = useState([]); // Amaterski listići svih korisnika
  const [proListici, setProListici] = useState([]); // Listići PRO tipstera
  const [comments, setComments] = useState({}); // Komentari po listićima
  const [likes, setLikes] = useState({}); // Lajkovi po listićima
  const [newComments, setNewComments] = useState({}); // Novi komentar koji se unosi
  const [expandedPro, setExpandedPro] = useState(true); // Prikaz/sakrivanje PRO sekcije
  const [expandedAmateur, setExpandedAmateur] = useState(true); // Prikaz/sakrivanje amaterske sekcije
  const router = useRouter();

  // Odjava korisnika
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Dohvat korisničkih podataka i listića nakon učitavanja stranice
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/');
      setUserId(user.id);

      const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).single();
      if (profile) setNickname(profile.nickname);

      await fetchListici(user.id); // Dohvati moje listiće
      await fetchSviListici(); // Dohvati sve PRO i amaterske listiće
    };
    fetchData();
  }, []);

  // Dohvat mojih listića i računanje salda
  const fetchListici = async (id) => {
    const { data } = await supabase.from('bets').select('*').eq('user_id', id);
    if (data) {
      setMojiListici(data);
      let saldoTemp = 10000;
      data.forEach(bet => {
        if (bet.status === 'won') saldoTemp += bet.stake * bet.total_odds;
        else if (bet.status === 'lost') saldoTemp -= bet.stake;
      });
      setSaldo(saldoTemp);
    }
  };

  // Dohvat svih listića i povezivanje s komentarima i lajkovima
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

  // Obrada komentara
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

  // Obrada lajkova
  const handleLike = async (betId) => {
    const existing = await supabase.from('likes').select('*').eq('bet_id', betId).eq('user_id', userId);
    if (!existing.data.length) {
      await supabase.from('likes').insert([{ bet_id: betId, user_id: userId }]);
      fetchSviListici();
    }
  };

  // Dodavanje parova u listić
  const handleChangePar = (i, f, v) => {
    const novi = [...parovi];
    novi[i][f] = v;
    setParovi(novi);
  };

  const handleDodajPar = () => setParovi([...parovi, { par: '', kvota: '', tip: '' }]);

  // Računanje ukupne kvote
  const ukupnaKvota = () => {
    return parovi.reduce((acc, p) => acc * parseFloat(p.kvota || 1), 1).toFixed(2);
  };

  // Dodavanje novog listića
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

  // Prikaz komentara
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
          <input className="p-1 bg-gray-800 text-white w-full"
            placeholder="Komentar..." value={newComments[betId] || ''}
            onChange={(e) => handleCommentChange(betId, e.target.value)} />
          <button onClick={() => handleAddComment(betId)} className="bg-blue-600 px-2 rounded">Komentiraj</button>
        </div>
      </div>
    );
  };

  // Prikaz pojedinog listića
  const renderListic = (l) => (
    <div key={l.id} className="border-b border-gray-600 py-2">
      <p><strong>{l.profiles?.nickname || 'Nepoznat'}:</strong> {l.title}</p>
      <p>{l.pairs.map(p => `${p.par} (${p.tip}) - ${p.kvota}`).join(', ')}</p>
      <p>Kvota: {l.total_odds} - Ulog: {l.stake} - Status: {l.status}</p>
      <p>👍 {likes[l.id]?.length || 0}</p>
      <button onClick={() => handleLike(l.id)} className="text-green-400 text-sm">Lajkaj</button>
      {renderComments(l.id)}
    </div>
  );

  // Glavni JSX prikaz stranice
  return (
    <div className="p-4 text-white bg-black min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Amaterski Tipster Dashboard</h1>
        <button onClick={handleLogout} className="bg-red-600 px-4 py-2 rounded">Odjava</button>
      </div>

      {/* Forma za unos novog listića */}
      <h2 className="text-xl font-bold mb-2">Unesi novi listić</h2>
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

      {/* Prikaz PRO i amaterskih listića */}
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
        {expandedAmateur && sviListici.map(renderListic)}
      </div>
    </div>
  );
}
