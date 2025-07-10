// pages/dashboard/pro-tipster-dashboard.jsx

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/router';

const languages = {
  en: { dashboard: 'PRO Tipster Dashboard', balance: 'Balance', newBet: 'New Bet', title: 'Bet Title', analysis: 'Analysis', stake: 'Stake (€)', totalOdds: 'Total Odds', addPair: 'Add new pair', publish: 'Publish Bet', match: 'Match', odds: 'Odds', status: 'Status', win: 'Win', lose: 'Lose', ongoing: 'Ongoing', leaderboard: 'Tipster Leaderboard', nickname: 'Nickname', logout: 'Logout', lang: 'Language' },
  hr: { dashboard: 'PRO Tipster Nadzorna ploča', balance: 'Saldo', newBet: 'Novi listić', title: 'Naslov listića', analysis: 'Analiza', stake: 'Ulog (€)', totalOdds: 'Ukupna kvota', addPair: 'Dodaj novi par', publish: 'Objavi listić', match: 'Par', odds: 'Kvota', status: 'Status', win: 'Dobitan', lose: 'Gubitan', ongoing: 'U tijeku', leaderboard: 'Poredak tipstera', nickname: 'Nadimak', logout: 'Odjava', lang: 'Jezik' },
  srb: { dashboard: 'PRO Tipster Kontrolna tabla', balance: 'Stanje', newBet: 'Novi tiket', title: 'Naslov tiketa', analysis: 'Analiza', stake: 'Ulog (€)', totalOdds: 'Ukupna kvota', addPair: 'Dodaj novi par', publish: 'Objavi tiket', match: 'Par', odds: 'Kvota', status: 'Status', win: 'Dobitan', lose: 'Gubitan', ongoing: 'U toku', leaderboard: 'Tabela tipstera', nickname: 'Nadimak', logout: 'Odjavi se', lang: 'Jezik' },
  slo: { dashboard: 'PRO Tipster Nadzorna plošča', balance: 'Stanje', newBet: 'Nova stava', title: 'Naslov stave', analysis: 'Analiza', stake: 'Vložek (€)', totalOdds: 'Skupna kvota', addPair: 'Dodaj par', publish: 'Objavi stavo', match: 'Par', odds: 'Kvota', status: 'Status', win: 'Zmagovalna', lose: 'Izgubljena', ongoing: 'V teku', leaderboard: 'Lestvica tipsterjev', nickname: 'Vzdevek', logout: 'Odjava', lang: 'Jezik' },
};

const ProTipsterDashboard = () => {
  const router = useRouter();
  const [lang, setLang] = useState('en');
  const t = languages[lang];
  const [user, setUser] = useState(null);
  const [bets, setBets] = useState([]);
  const [newBet, setNewBet] = useState({ title: '', analysis: '', stake: '', pairs: [{ match: '', odds: '' }] });
  const [balance, setBalance] = useState(10000);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const storedLang = localStorage.getItem('lang');
    if (storedLang) setLang(storedLang);

    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
      setBalance(profile?.balance || 10000);

      const { data: betData } = await supabase.from('bets').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setBets(betData);

      const { data: leaderboardData } = await supabase.from('profiles').select('id, nickname, balance').order('balance', { ascending: false });
      setLeaderboard(leaderboardData);
    };

    fetchUserData();
  }, []);

  const changeLang = (l) => {
    localStorage.setItem('lang', l);
    setLang(l);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

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
        const updatedBalance = balance + profit;
        setBalance(updatedBalance);
        supabase.from('profiles').update({ balance: updatedBalance }).eq('id', user.id);
        supabase.from('bets').update({ status: result }).eq('id', betId);
        return { ...bet, status: result };
      }
      return bet;
    });
    setBets(updatedBets);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t.dashboard}</h1>
        <div className="flex items-center gap-4">
          <select
            value={lang}
            onChange={(e) => changeLang(e.target.value)}
            className="bg-[#1a1a1a] text-white p-1 rounded"
          >
            <option value="en">EN</option>
            <option value="hr">HR</option>
            <option value="srb">SRB</option>
            <option value="slo">SLO</option>
          </select>
          <button onClick={handleLogout} className="text-red-400 underline">{t.logout}</button>
        </div>
      </div>

      <p className="mb-4">{t.balance}: <span className="font-semibold">€{balance.toFixed(2)}</span></p>

      <div className="bg-[#1a1a1a] p-4 rounded-xl mb-6">
        <h2 className="text-lg font-semibold mb-4">{t.newBet}</h2>
        <input type="text" placeholder={t.title} className="w-full p-2 bg-[#2a2a2a] rounded mb-2" value={newBet.title} onChange={(e) => setNewBet({ ...newBet, title: e.target.value })} />
        <textarea placeholder={t.analysis} className="w-full p-2 bg-[#2a2a2a] rounded mb-2" value={newBet.analysis} onChange={(e) => setNewBet({ ...newBet, analysis: e.target.value })} />
        <input type="number" placeholder={t.stake} className="w-full p-2 bg-[#2a2a2a] rounded mb-2" value={newBet.stake} onChange={(e) => setNewBet({ ...newBet, stake: e.target.value })} />

        {newBet.pairs.map((pair, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input type="text" placeholder={t.match} className="w-full p-2 bg-[#2a2a2a] rounded" value={pair.match} onChange={(e) => handlePairChange(index, 'match', e.target.value)} />
            <input type="number" step="0.01" placeholder={t.odds} className="w-24 p-2 bg-[#2a2a2a] rounded" value={pair.odds} onChange={(e) => handlePairChange(index, 'odds', e.target.value)} />
          </div>
        ))}

        <div className="flex justify-between items-center mb-4">
          <button onClick={handleAddPair} className="text-sm text-blue-400 underline">{t.addPair}</button>
          <span className="text-sm">{t.totalOdds}: <strong>{calculateTotalOdds()}</strong></span>
        </div>

        <Button onClick={handleCreateBet}>{t.publish}</Button>
      </div>

      <div className="space-y-4">
        {Array.isArray(bets) && bets.map((bet) => (
          <div key={bet.id} className="bg-[#1f1f1f] p-4 rounded-xl">
            <p className="text-sm text-gray-400">{new Date(bet.created_at).toLocaleString()}</p>
            <p className="text-lg font-bold mt-1">{bet.title}</p>
            <p className="mt-1">{t.analysis}: {bet.analysis}</p>
            <p className="mt-1">{t.stake}: €{bet.stake} | {t.totalOdds}: {bet.total_odds}</p>
            <ul className="mt-2 text-sm list-disc ml-4">
              {bet.pairs.map((pair, i) => (
                <li key={i}>{pair.match} – {t.odds} {pair.odds}</li>
              ))}
            </ul>
            <p className="mt-2 font-semibold">{t.status}: {bet.status === 'pending' ? t.ongoing : bet.status === 'win' ? t.win : t.lose}</p>
            {bet.status === 'pending' && (
              <div className="flex gap-2 mt-3">
                <Button onClick={() => handleMarkBet(bet.id, 'win')} className="bg-green-600 hover:bg-green-700">{t.win}</Button>
                <Button onClick={() => handleMarkBet(bet.id, 'lose')} className="bg-red-600 hover:bg-red-700">{t.lose}</Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-bold mb-4">{t.leaderboard}</h2>
        <div className="bg-[#1a1a1a] p-4 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-700">
                <th className="py-2">#</th>
                <th className="py-2">{t.nickname}</th>
                <th className="py-2">{t.balance}</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(leaderboard) && leaderboard.map((tipster, index) => (
                <tr key={tipster.id} className="border-b border-gray-800">
                  <td className="py-2">{index + 1}</td>
                  <td className="py-2">{tipster.nickname}</td>
                  <td className="py-2">€{tipster.balance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProTipsterDashboard;
