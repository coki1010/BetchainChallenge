// /pages/dashboard/pro-tipster-dashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';

export default function ProTipsterDashboard() {
  const [userId, setUserId] = useState(null);
  const [nickname, setNickname] = useState('');
  const [saldo, setSaldo] = useState(10000);
  const [parovi, setParovi] = useState([{ par: '', kvota: '', tip: '' }]);
  const [ulog, setUlog] = useState('');
  const [naslov, setNaslov] = useState('');
  const [analiza, setAnaliza] = useState('');
  const [status, setStatus] = useState('pending');
  const [mojiListici, setMojiListici] = useState([]);
  const [proListici, setProListici] = useState([]);
  const [amateurListici, setAmateurListici] = useState([]);
  const [expandedPro, setExpandedPro] = useState(true);
  const [expandedAmateur, setExpandedAmateur] = useState(true);
  const router = useRouter();

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
      let saldoTemp = 10000;
      data.forEach(bet => {
        if (bet.status === 'won') saldoTemp += bet.stake * bet.total_odds;
        else if (bet.status === 'lost') saldoTemp -= bet.stake;
      });
      setSaldo(saldoTemp);
    }
  };

  const fetchSviListici = async () => {
    const { data: pro } = await supabase.from('bets').select('*, profiles(nickname)').eq('role', 'pro_tipster');
    const { data: amateur } = await supabase.from('bets').select('*, profiles(nickname)').eq('role', 'amateur_tipster');
    setProListici(pro || []);
    setAmateurListici(amateur || []);
  };

  const ukupnaKvota = () => {
    return parovi.reduce((acc, p) => acc * parseFloat(p.kvota || 1), 1).toFixed(2);
  };

  const handleChangePar = (i, f, v) => {
    const novi = [...parovi];
    novi[i][f] = v;
    setParovi(novi);
  };

  const handleDodajPar = () => setParovi([...parovi, { par: '', kvota: '', tip: '' }]);

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
      role: 'pro_tipster',
      pairs: parovi,
      created_at: new Date().toISOString()
    }]);
    if (!error) {
      setNaslov('');
      setUlog('');
      setAnaliza('');
      setParovi([{ par: '', kvota: '', tip: '' }]);
      setStatus('pending');
      fetchListici(userId);
      fetchSviListici();
    }
  };

  const oznaciKao = async (betId, novoStanje) => {
    const { error } = await supabase.from('bets').update({ status: novoStanje }).eq('id', betId).eq('user_id', userId);
    if (!error) {
      fetchListici(userId);
      fetchSviListici();
    }
  };

  const renderListic = (l) => (
    <div key={l.id} className="border-b border-gray-600 py-2">
      <p><strong>{l.profiles?.nickname || 'Nepoznat'}:</strong> {l.title}</p>
      <p>{l.pairs?.map(p => `${p.par} (${p.tip}) - ${p.kvota}`).join(', ')}</p>
      <p>Kvota: {l.total_odds} - Ulog: {l.stake} - Status: {l.status}</p>
      {l.user_id === userId && l.status === 'pending' && (
        <div className="flex gap-2 my-2">
          <button onClick={() => oznaciKao(l.id, 'won')} className="bg-green-600 px-2 py-1 rounded">Označi kao dobitan</button>
          <button onClick={() => oznaciKao(l.id, 'lost')} className="bg-red-600 px-2 py-1 rounded">Označi kao gubitan</button>
        </div>
      )}
    </div>
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="p-4 text-white bg-black min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">PRO Tipster Dashboard</h1>
        <button onClick={handleLogout} className="bg-red-600 px-4 py-2 rounded">Odjava</button>
      </div>
      <p className="text-lg font-semibold mb-4">Tvoj saldo: €{saldo.toFixed(2)}</p>

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
