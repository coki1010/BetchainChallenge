// /pages/dashboard/amateur-tipster-dashboard.jsx

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';

export default function AmateurTipsterDashboard() {
  const [userId, setUserId] = useState(null);
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
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user) return router.push('/');
      setUserId(user.id);
      fetchListici(user.id);
      fetchRangLista();
      fetchSviListici();
    };
    fetchUser();
  }, []);

  const fetchListici = async (id) => {
    const { data } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', id);
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
      .select('*')
      .eq('role', 'pro_tipster');
    const { data: amateur } = await supabase
      .from('bets')
      .select('*')
      .eq('role', 'amateur_tipster');

    if (pro) setProListici(pro);
    if (amateur) setSviListici(amateur);
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

  const handleUnosListica = async () => {
    if (!userId) {
      alert("Greška: korisnik nije prijavljen ili nema ID.");
      return;
    }

    const kvota = parseFloat(ukupnaKvota());
    const created_at = new Date().toISOString();

    const { error } = await supabase.from('bets').insert([
      {
        id: uuidv4(),
        user_id: userId,
        title: naslov,
        stake: parseFloat(ulog),
        total_odds: kvota,
        analysis: analiza,
        status: status,
        created_at,
        role: 'amateur_tipster',
        pairs: parovi
      }
    ]);

    if (!error) {
      fetchListici(userId);
      fetchSviListici();
      setParovi([{ par: '', kvota: '', tip: '' }]);
      setUlog('');
      setAnaliza('');
      setStatus('pending');
      setNaslov('');
    } else {
      console.error("Greška prilikom unosa:", error.message);
      alert("Greška prilikom unosa: " + error.message);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    const { error } = await supabase
      .from('bets')
      .update({ status: newStatus })
      .eq('id', id)
      .eq('user_id', userId);
    if (!error) fetchListici(userId);
  };

  return (
    <div className="p-4 text-white bg-black min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Amaterski Tipster Dashboard</h1>
      <p>Saldo: €{saldo.toFixed(2)}</p>
      <p>Prolaznost: {prolaznost}%</p>
      {mozeZatraziti && <button className="bg-yellow-500 p-2 rounded my-2">Zatraži PRO status</button>}

      <div className="my-4">
        <h2 className="text-xl font-bold">Novi listić</h2>
        <input placeholder="Naslov listića" value={naslov} onChange={e => setNaslov(e.target.value)} className="w-full p-2 bg-gray-800 rounded my-2" />
        {parovi.map((p, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input placeholder="Par" value={p.par} onChange={e => handleChangePar(index, 'par', e.target.value)} className="p-2 bg-gray-800 rounded" />
            <input placeholder="Tip" value={p.tip} onChange={e => handleChangePar(index, 'tip', e.target.value)} className="p-2 bg-gray-800 rounded" />
            <input placeholder="Kvota" type="number" step="0.01" value={p.kvota} onChange={e => handleChangePar(index, 'kvota', e.target.value)} className="p-2 bg-gray-800 rounded" />
          </div>
        ))}
        <button onClick={handleDodajPar} className="bg-gray-700 p-2 rounded">Dodaj par</button>
        <p className="mt-2">Ukupna kvota: {ukupnaKvota()}</p>
        <input placeholder="Ulog" type="number" value={ulog} onChange={e => setUlog(e.target.value)} className="w-full p-2 bg-gray-800 rounded my-2" />
        <textarea placeholder="Analiza" value={analiza} onChange={e => setAnaliza(e.target.value)} className="w-full p-2 bg-gray-800 rounded my-2" />

        <div className="flex items-center gap-4 my-2">
          <label className="flex items-center gap-2">
            <input type="radio" value="pending" checked={status === 'pending'} onChange={() => setStatus('pending')} /> Pending
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" value="won" checked={status === 'won'} onChange={() => setStatus('won')} /> Dobitan
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" value="lost" checked={status === 'lost'} onChange={() => setStatus('lost')} /> Gubitan
          </label>
        </div>

        <button onClick={handleUnosListica} className="bg-green-600 p-2 mt-2 rounded">Unesi listić</button>
      </div>

      <div className="my-6">
        <h2 className="text-xl font-bold mb-2">Moji listići</h2>
        {mojiListici.map(l => (
          <div key={l.id} className="border-b border-gray-600 py-2">
            <p><strong>Naslov:</strong> {l.title}</p>
            <p><strong>Parovi:</strong> {l.pairs.map(p => `${p.par} (${p.tip}) - ${p.kvota}`).join(', ')}</p>
            <p><strong>Kvota:</strong> {l.total_odds}</p>
            <p><strong>Ulog:</strong> {l.stake}</p>
            <p><strong>Status:</strong> {l.status}</p>
            <p><strong>Analiza:</strong> {l.analysis}</p>
            {l.status === 'pending' && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleStatusUpdate(l.id, 'won')} className="bg-green-700 p-1 rounded">Označi kao dobitan</button>
                <button onClick={() => handleStatusUpdate(l.id, 'lost')} className="bg-red-700 p-1 rounded">Označi kao gubitan</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="my-6">
        <h2 className="text-xl font-bold mb-2">Rang lista amaterskih tipstera</h2>
        {rangLista.map((r, index) => (
          <p key={index}>{index + 1}. {r.nickname || r.email} - €{r.saldo.toFixed(2)}</p>
        ))}
      </div>

      <div className="my-6">
        <h2 className="text-xl font-bold mb-2">Pro tipster listići</h2>
        {proListici.map((l, i) => (
          <div key={i} className="border-b border-gray-600 py-2">
            <p>{l.pairs.map(p => `${p.par} (${p.tip}) - ${p.kvota}`).join(', ')} - Kvota: {l.total_odds} - Ulog: {l.stake}</p>
          </div>
        ))}
      </div>

      <div className="my-6">
        <h2 className="text-xl font-bold mb-2">Amaterski tipsteri listići</h2>
        {sviListici.map((l, i) => (
          <div key={i} className="border-b border-gray-600 py-2">
            <p>{l.pairs.map(p => `${p.par} (${p.tip}) - ${p.kvota}`).join(', ')} - Kvota: {l.total_odds} - Ulog: {l.stake}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
