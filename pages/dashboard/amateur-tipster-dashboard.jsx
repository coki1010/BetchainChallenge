// pages/dashboard/amateur-tipster-dashboard.jsx

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useRouter } from 'next/router';

export default function AmateurTipsterDashboard() {
  const [bets, setBets] = useState([]);
  const [stake, setStake] = useState('');
  const [odds, setOdds] = useState('');
  const [isWin, setIsWin] = useState(false);
  const [userId, setUserId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserAndBets = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/');

      setUserId(user.id);

      const { data: userBets } = await supabase
        .from('bets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setBets(userBets || []);
    };

    fetchUserAndBets();
  }, []);

  const handleAddBet = async (e) => {
    e.preventDefault();

    const stakeNum = parseFloat(stake);
    const oddsNum = parseFloat(odds);
    if (!stakeNum || !oddsNum) return;

    const profit = isWin ? stakeNum * oddsNum : -stakeNum;

    const { error } = await supabase.from('bets').insert([{
      user_id: userId,
      stake: stakeNum,
      odds: oddsNum,
      is_win: isWin,
      profit,
      type: 'amateur',
    }]);

    if (!error) {
      setStake('');
      setOdds('');
      setIsWin(false);

      const { data: updatedBets } = await supabase
        .from('bets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setBets(updatedBets || []);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Amaterski Tipster Dashboard</h1>

      <form onSubmit={handleAddBet} className="space-y-4 max-w-md mx-auto mb-8">
        <input
          type="number"
          step="0.01"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          placeholder="Ulog (€)"
          className="w-full p-2 rounded bg-[#1f1f1f] text-white"
        />
        <input
          type="number"
          step="0.01"
          value={odds}
          onChange={(e) => setOdds(e.target.value)}
          placeholder="Kvota"
          className="w-full p-2 rounded bg-[#1f1f1f] text-white"
        />
        <label className="flex items-center text-sm">
          <input
            type="checkbox"
            checked={isWin}
            onChange={() => setIsWin(!isWin)}
            className="mr-2"
          />
          Listić je dobitan
        </label>
        <button type="submit" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded w-full">
          Dodaj listić
        </button>
      </form>

      <h2 className="text-xl font-semibold mb-4">Tvoji listići</h2>
      {bets.length === 0 ? (
        <p className="text-gray-400">Nema još unesenih listića.</p>
      ) : (
        <ul className="space-y-3">
          {bets.map((bet) => (
            <li key={bet.id} className="bg-[#1a1a1a] p-4 rounded">
              <p>Ulog: €{bet.stake}</p>
              <p>Kvota: {bet.odds}</p>
              <p>Rezultat: {bet.is_win ? 'Dobitno' : 'Gubitno'}</p>
              <p>Profit: €{bet.profit}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
