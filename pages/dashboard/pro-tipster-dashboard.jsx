// /pages/dashboard/pro-tipster-dashboard.jsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useRouter } from 'next/router';

export default function ProTipsterDashboard() {
  const [userId, setUserId] = useState(null);
  const [nickname, setNickname] = useState('');
  const [listici, setListici] = useState([]);
  const [saldo, setSaldo] = useState(10000);
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [likes, setLikes] = useState({});

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/');
      setUserId(user.id);

      const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).single();
      if (profile) setNickname(profile.nickname);

      await fetchListici(user.id);
    };
    fetchData();
  }, []);

  const fetchListici = async (uid) => {
    const { data } = await supabase
      .from('bets')
      .select('*, profiles(nickname)')
      .eq('role', 'pro_tipster');

    if (data) {
      setListici(data);

      // Saldo za ovog usera
      const moji = data.filter(b => b.user_id === uid);
      let temp = 10000;
      moji.forEach(bet => {
        if (bet.status === 'won') temp += bet.stake * bet.total_odds;
        else if (bet.status === 'lost') temp -= bet.stake;
      });
      setSaldo(temp);
    }

    const betIds = data.map(b => b.id);
    const { data: komentari } = await supabase.from('comments').select('*').in('bet_id', betIds);
    const { data: lajkovi } = await supabase.from('likes').select('*').in('bet_id', betIds);

    const grouped = {};
    komentari?.forEach(c => {
      if (!grouped[c.bet_id]) grouped[c.bet_id] = [];
      grouped[c.bet_id].push(c);
    });
    setComments(grouped);

    const groupedLikes = {};
    lajkovi?.forEach(l => {
      if (!groupedLikes[l.bet_id]) groupedLikes[l.bet_id] = [];
      groupedLikes[l.bet_id].push(l);
    });
    setLikes(groupedLikes);
  };

  const handleMark = async (id, status) => {
    const bet = listici.find(b => b.id === id);
    if (bet.user_id !== userId) return;
    await supabase.from('bets').update({ status }).eq('id', id);
    await fetchListici(userId);
  };

  const handleLike = async (id) => {
    const existing = await supabase.from('likes').select('*').eq('bet_id', id).eq('user_id', userId);
    if (!existing.data.length) {
      await supabase.from('likes').insert([{ bet_id: id, user_id: userId }]);
      await fetchListici(userId);
    }
  };

  const handleCommentChange = (id, val) => {
    setNewComments({ ...newComments, [id]: val });
  };

  const handleAddComment = async (id) => {
    const content = newComments[id];
    if (!content) return;
    await supabase.from('comments').insert([{ bet_id: id, user_id: userId, content, nickname }]);
    setNewComments({ ...newComments, [id]: '' });
    await fetchListici(userId);
  };

  const handleDeleteComment = async (id) => {
    await supabase.from('comments').delete().eq('id', id);
    await fetchListici(userId);
  };

  const renderComments = (bet) => (
    <div className="ml-4 mt-2">
      {(comments[bet.id] || []).map(c => (
        <div key={c.id} className="text-sm flex justify-between border-b border-gray-600 py-1">
          <span><strong>{c.nickname}:</strong> {c.content}</span>
          {c.user_id === userId && (
            <button onClick={() => handleDeleteComment(c.id)} className="text-red-400 text-xs">Obriši</button>
          )}
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <input className="p-1 w-full bg-gray-800" placeholder="Komentar..." value={newComments[bet.id] || ''}
          onChange={e => handleCommentChange(bet.id, e.target.value)} />
        <button className="bg-blue-500 px-2 rounded" onClick={() => handleAddComment(bet.id)}>Komentiraj</button>
      </div>
    </div>
  );

  return (
    <div className="p-4 bg-black text-white min-h-screen">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">PRO Tipster Dashboard</h1>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
          className="bg-red-600 px-4 py-2 rounded">Odjava</button>
      </div>

      <h2 className="text-lg mb-2">Tvoje trenutno stanje: <strong>{saldo.toFixed(2)} €</strong></h2>

      {listici.map(bet => (
        <div key={bet.id} className="border-b border-gray-600 py-4">
          <p><strong>{bet.profiles?.nickname || 'Nepoznat'}:</strong> {bet.title}</p>
          <p>{bet.pairs?.map(p => `${p.par} (${p.tip}) - ${p.kvota}`).join(', ')}</p>
          <p>Ulog: {bet.stake} € | Kvota: {bet.total_odds} | Status: <strong>{bet.status}</strong></p>
          {bet.user_id === userId && bet.status === 'pending' && (
            <div className="flex gap-2 my-2">
              <button onClick={() => handleMark(bet.id, 'won')} className="bg-green-600 px-2 rounded">Označi kao dobitan</button>
              <button onClick={() => handleMark(bet.id, 'lost')} className="bg-red-600 px-2 rounded">Označi kao gubitan</button>
            </div>
          )}
          <p>👍 {likes[bet.id]?.length || 0}</p>
          <button className="text-green-400 text-sm" onClick={() => handleLike(bet.id)}>Lajkaj</button>
          {renderComments(bet)}
        </div>
      ))}
    </div>
  );
}
