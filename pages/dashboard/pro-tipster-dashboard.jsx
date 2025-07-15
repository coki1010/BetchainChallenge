// Put your existing imports here
import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useUser } from '@supabase/auth-helpers-react';

export default function ProTipsterDashboard() {
  const user = useUser();
  const [bets, setBets] = useState([]);
  const [newBet, setNewBet] = useState({ title: '', analysis: '', stake: '', total_odds: '', pair: '', tip: '', kvota: '' });
  const [balance, setBalance] = useState(10000);
  const [view, setView] = useState('pro');

  useEffect(() => {
    fetchBets();
  }, []);

  useEffect(() => {
    calculateBalance();
  }, [bets]);

  const fetchBets = async () => {
    const { data, error } = await supabase.from('bets').select('*');
    if (!error) setBets(data);
  };

  const calculateBalance = () => {
    let saldo = 10000;
    bets.forEach((bet) => {
      if (bet.user_id === user.id && bet.status === 'won') {
        saldo += bet.stake * bet.total_odds;
      } else if (bet.user_id === user.id && bet.status === 'lost') {
        saldo -= bet.stake;
      }
    });
    setBalance(saldo);
  };

  const handleCreateBet = async () => {
    const { title, analysis, stake, total_odds, pair, tip, kvota } = newBet;
    const pairData = [{ par: pair, tip: tip, kvota: kvota }];
    const { error } = await supabase.from('bets').insert([
      {
        user_id: user.id,
        title,
        analysis,
        stake: Number(stake),
        total_odds: Number(total_odds),
        pairs: pairData,
        status: 'pending',
        role: 'pro_tipster',
      },
    ]);
    if (!error) {
      setNewBet({ title: '', analysis: '', stake: '', total_odds: '', pair: '', tip: '', kvota: '' });
      fetchBets();
    }
  };

  const handleMark = async (betId, status) => {
    const { error } = await supabase.from('bets').update({ status }).eq('id', betId);
    if (!error) {
      fetchBets();
    }
  };

  const filteredBets = bets.filter((bet) =>
    view === 'pro' ? bet.role === 'pro_tipster' : bet.role === 'amateur_tipster'
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Pro Tipster Dashboard</h1>
      <p className="mb-4">Tvoj saldo: €{balance.toFixed(2)}</p>

      <div className="mb-4">
        <select
          value={view}
          onChange={(e) => setView(e.target.value)}
          className="p-2 border border-gray-300 rounded"
        >
          <option value="pro">PRO Tipseri listići</option>
          <option value="amateur">Amaterski Tipseri listići</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <input type="text" placeholder="Naslov" value={newBet.title} onChange={(e) => setNewBet({ ...newBet, title: e.target.value })} className="p-2 border" />
        <input type="text" placeholder="Analiza" value={newBet.analysis} onChange={(e) => setNewBet({ ...newBet, analysis: e.target.value })} className="p-2 border" />
        <input type="number" placeholder="Ulog" value={newBet.stake} onChange={(e) => setNewBet({ ...newBet, stake: e.target.value })} className="p-2 border" />
        <input type="number" placeholder="Ukupna kvota" value={newBet.total_odds} onChange={(e) => setNewBet({ ...newBet, total_odds: e.target.value })} className="p-2 border" />
        <input type="text" placeholder="Par" value={newBet.pair} onChange={(e) => setNewBet({ ...newBet, pair: e.target.value })} className="p-2 border" />
        <input type="text" placeholder="Tip" value={newBet.tip} onChange={(e) => setNewBet({ ...newBet, tip: e.target.value })} className="p-2 border" />
        <input type="text" placeholder="Kvota" value={newBet.kvota} onChange={(e) => setNewBet({ ...newBet, kvota: e.target.value })} className="p-2 border" />
        <button onClick={handleCreateBet} className="bg-blue-600 text-white p-2 rounded">Dodaj listić</button>
      </div>

      {filteredBets.map((bet) => (
        <div key={bet.id} className="border p-4 mb-4 rounded shadow">
          <p><strong>{bet.title}</strong></p>
          <p>{bet.analysis}</p>
          <p>Ulog: €{bet.stake}</p>
          <p>Ukupna kvota: {bet.total_odds}</p>
          {bet.pairs?.map((p, i) => (
            <p key={i}>Par: {p.par} | Tip: {p.tip} | Kvota: {p.kvota}</p>
          ))}
          <p>Status: <span className={`font-semibold ${bet.status === 'won' ? 'text-green-600' : bet.status === 'lost' ? 'text-red-600' : 'text-yellow-600'}`}>{bet.status}</span></p>
          {bet.user_id === user.id && bet.status === 'pending' && (
            <div className="mt-2 flex gap-2">
              <button onClick={() => handleMark(bet.id, 'won')} className="bg-green-600 px-2 rounded text-white">Označi kao dobitan</button>
              <button onClick={() => handleMark(bet.id, 'lost')} className="bg-red-600 px-2 rounded text-white">Označi kao gubitan</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
