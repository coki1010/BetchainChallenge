// pages/dashboard/amateur-tipster-dashboard.jsx

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';

const AmateurTipsterDashboard = () => {
  const [user, setUser] = useState(null);
  const [bets, setBets] = useState([]);
  const [newBet, setNewBet] = useState({ title: '', analysis: '', stake: '', pairs: [{ match: '', odds: '' }] });
  const [balance, setBalance] = useState(10000);
  const [stats, setStats] = useState({ win: 0, lose: 0, total: 0 });
  const [canRequestPro, setCanRequestPro] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const { data: profile } = await supabase.from('profiles').select('balance, pro_request').eq('id', user.id).single();
      setBalance(profile?.balance || 10000);

      const { data: userBets } = await supabase.from('bets').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setBets(userBets || []);

      const wins = userBets?.filter((b) => b.status === 'win').length || 0;
      const losses = userBets?.filter((b) => b.status === 'lose').length || 0;
      const total = userBets?.length || 0;
      const winRate = total >= 10 ? (wins / total) * 100 : 0;

      setStats({ win: wins, lose: losses, total });
      setCanRequestPro(winRate >= 70 && total >= 10 && !profile?.pro_request);
    };

    fetchData();
  }, []);

  const handleAddPair = () => {
    setNewBet({ ...newBet, pairs: [...newBet.pairs, { match: '', odds: '' }] });
  };

  const handlePairChange = (index, field, value) => {
    const updatedPairs = [...newBet.pairs];
    updatedPairs[index][field] = value;
    setNewBet({ ...newBet, pairs: updatedPairs });
  };

  const calculateTotalOdds = () => {
    return newBet.pairs.reduce((acc, pair) => acc * (parseFloat(pair.odds) || 1), 1).toFixed(2);
  };

  const handleCreateBet = async () => {
    const totalOdds = parseFloat(calculateTotalOdds());
    const stake = parseFloat(newBet.stake);
    const newBalance = balance - stake;

    const newBetEntry = {
      id: uuidv4(),
      user_id: user.id,
      title: newBet.title,
      analysis: newBet.analysis,
      stake,
      total_odds: totalOdds,
      pairs: newBet.pairs,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    await supabase.from('bets').insert(newBetEntry);
    await supabase.from('profiles').update({ balance: newBalance }).eq('id', user.id);

    setBalance(newBalance);
    setNewBet({ title: '', analysis: '', stake: '', pairs: [{ match: '', odds: '' }] });
    setBets([newBetEntry, ...bets]);
  };

  const handleMarkBet = async (betId, result) => {
    const updatedBets = bets.map((bet) => {
      if (bet.id === betId) {
        const profit = result === 'win' ? bet.stake * bet.total_odds : 0;
        const updatedBalance = result === 'win' ? balance + profit : balance;
        setBalance(updatedBalance);
        supabase.from('profiles').update({ balance: updatedBalance }).eq('id', user.id);
        supabase.from('bets').update({ status: result }).eq('id', betId);
        return { ...bet, status: result };
      }
      return bet;
    });

    setBets(updatedBets);
  };

  const handleRequestPro = async () => {
    await supabase.from('profiles').update({ pro_request: true }).eq('id', user.id);
    alert('Zahtjev za PRO status je poslan!');
    setCanRequestPro(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Amaterski Tipster Dashboard</h1>
        <button onClick={handleLogout} className="text-sm bg-red-600 px-4 py-1 rounded">Odjava</button>
      </div>

      <p className="mb-2">Saldo: <strong>€{balance.toFixed(2)}</strong></p>
      <p className="mb-6">Pogođeni: {stats.win} | Izgubljeni: {stats.lose} | Ukupno: {stats.total}</p>

      {canRequestPro && (
        <button onClick={handleRequestPro} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded mb-6">
          Zatraži PRO status
        </button>
      )}

      {/* Novi listić */}
      <div className="bg-[#1a1a1a] p-4 rounded-xl mb-6">
        <h2 className="text-lg font-semibold mb-4">Novi listić</h2>
        <input
          type="text"
          placeholder="Naslov listića"
          className="w-full p-2 bg-[#2a2a2a] rounded mb-2"
          value={newBet.title}
          onChange={(e) => setNewBet({ ...newBet, title: e.target.value })}
        />
        <textarea
          placeholder="Analiza"
          className="w-full p-2 bg-[#2a2a2a] rounded mb-2"
          value={newBet.analysis}
          onChange={(e) => setNewBet({ ...newBet, analysis: e.target.value })}
        />
        <input
          type="number"
          placeholder="Ulog (€)"
          className="w-full p-2 bg-[#2a2a2a] rounded mb-2"
          value={newBet.stake}
          onChange={(e) => setNewBet({ ...newBet, stake: e.target.value })}
        />

        {newBet.pairs.map((pair, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Par (npr. Dinamo - Hajduk)"
              className="w-full p-2 bg-[#2a2a2a] rounded"
              value={pair.match}
              onChange={(e) => handlePairChange(index, 'match', e.target.value)}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Kvota"
              className="w-24 p-2 bg-[#2a2a2a] rounded"
              value={pair.odds}
              onChange={(e) => handlePairChange(index, 'odds', e.target.value)}
            />
          </div>
        ))}

        <div className="flex justify-between items-center mb-4">
          <button onClick={handleAddPair} className="text-sm text-blue-400 underline">+ Dodaj novi par</button>
          <span className="text-sm">Ukupna kvota: <strong>{calculateTotalOdds()}</strong></span>
        </div>

        <Button onClick={handleCreateBet}>Objavi listić</Button>
      </div>

      {/* Lista listića */}
      <div className="space-y-4">
        {Array.isArray(bets) && bets.map((bet) => (
          <div key={bet.id} className="bg-[#1f1f1f] p-4 rounded-xl">
            <p className="text-sm text-gray-400">{new Date(bet.created_at).toLocaleString()}</p>
            <p className="text-lg font-bold mt-1">{bet.title}</p>
            <p className="mt-1">Analiza: {bet.analysis}</p>
            <p className="mt-1">Ulog: €{bet.stake} | Kvota: {bet.total_odds}</p>
            <ul className="mt-2 text-sm list-disc ml-4">
              {bet.pairs.map((pair, i) => (
                <li key={i}>{pair.match} – kvota {pair.odds}</li>
              ))}
            </ul>
            <p className="mt-2 font-semibold">Status: {bet.status === 'pending' ? 'U tijeku' : bet.status === 'win' ? 'Dobitan' : 'Gubitan'}</p>
            {bet.status === 'pending' && (
              <div className="flex gap-2 mt-3">
                <Button onClick={() => handleMarkBet(bet.id, 'win')} className="bg-green-600 hover:bg-green-700">Dobitan</Button>
                <Button onClick={() => handleMarkBet(bet.id, 'lose')} className="bg-red-600 hover:bg-red-700">Gubitan</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AmateurTipsterDashboard;
