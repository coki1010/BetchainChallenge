import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useRouter } from 'next/router';

export default function AmateurTipsterDashboard() {
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState('');
  const [saldo, setSaldo] = useState(10000);
  const [mojiListici, setMojiListici] = useState([]);
  const [proListici, setProListici] = useState([]);
  const [amateurListici, setAmateurListici] = useState([]);
  const [rangLista, setRangLista] = useState([]);
  const [proOpen, setProOpen] = useState(true);
  const [amateurOpen, setAmateurOpen] = useState(true);
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [likes, setLikes] = useState({});
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/');
      setUser(user);

      const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).single();
      setNickname(profile?.nickname || '');

      const { data: pro } = await supabase.from('bets').select('*, profiles(nickname)').eq('role', 'pro_tipster').order('created_at', { ascending: false });
      const { data: amateur } = await supabase.from('bets').select('*, profiles(nickname)').eq('role', 'amateur_tipster').order('created_at', { ascending: false });
      setProListici(pro || []);
      setAmateurListici(amateur || []);

      const { data: commentsData } = await supabase.from('comments').select('*, profiles(nickname)').order('created_at');
      const commentMap = {};
      commentsData?.forEach((c) => {
        if (!commentMap[c.bet_id]) commentMap[c.bet_id] = [];
        commentMap[c.bet_id].push(c);
      });
      setComments(commentMap);

      const { data: likesData } = await supabase.from('likes').select('*');
      const likeMap = {};
      likesData?.forEach((like) => {
        if (like.user_id === user.id) likeMap[like.bet_id] = true;
      });
      setLikes(likeMap);
    };

    fetchData();
  }, []);
  const handleLike = async (betId) => {
    if (!user) return;
    if (likes[betId]) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('bet_id', betId);
    } else {
      await supabase.from('likes').insert({ user_id: user.id, bet_id: betId });
    }
    setLikes((prev) => ({ ...prev, [betId]: !prev[betId] }));
  };

  const handleCommentSubmit = async (betId) => {
    const text = newComments[betId]?.trim();
    if (!text) return;
    await supabase.from('comments').insert({ user_id: user.id, bet_id: betId, text });

    const { data } = await supabase.from('comments').select('*, profiles(nickname)').eq('bet_id', betId).order('created_at');
    setComments((prev) => ({ ...prev, [betId]: data }));
    setNewComments((prev) => ({ ...prev, [betId]: '' }));
  };

  const handleDeleteComment = async (commentId, betId) => {
    await supabase.from('comments').delete().eq('id', commentId);
    const updated = (comments[betId] || []).filter(c => c.id !== commentId);
    setComments(prev => ({ ...prev, [betId]: updated }));
  };

  const renderListic = (bet) => (
    <div key={bet.id} className="bg-[#1f1f1f] p-4 my-2 rounded-lg">
      <p className="text-sm text-gray-400">{new Date(bet.created_at).toLocaleString()}</p>
      <p className="text-xl font-semibold">{bet.title}</p>
      <p>Autor: <span className="text-blue-400">{bet.profiles?.nickname || 'Nepoznat'}</span></p>
      <p>Ulog: €{bet.stake} | Kvota: {bet.total_odds}</p>
      <p className="text-sm italic">Analiza: {bet.analysis}</p>
      <p>Status: {bet.status}</p>

      <button onClick={() => handleLike(bet.id)} className="text-sm mt-2 text-blue-500">
        {likes[bet.id] ? '❤️ Sviđa mi se' : '🤍 Like'}
      </button>

      <div className="mt-2">
        <input
          type="text"
          value={newComments[bet.id] || ''}
          onChange={(e) => setNewComments(prev => ({ ...prev, [bet.id]: e.target.value }))}
          placeholder="Komentar..."
          className="w-full bg-[#2c2c2c] p-2 rounded mb-1"
        />
        <button onClick={() => handleCommentSubmit(bet.id)} className="text-green-400 text-sm">Pošalji</button>
      </div>

      <div className="mt-2">
        {(comments[bet.id] || []).map(c => (
          <div key={c.id} className="flex justify-between items-center text-sm text-gray-300">
            <span><strong>{c.profiles?.nickname || 'Korisnik'}:</strong> {c.text}</span>
            {c.user_id === user?.id && (
              <button onClick={() => handleDeleteComment(c.id, bet.id)} className="text-red-400 ml-2">Obriši</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="p-4 text-white bg-black min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold mb-4">Amaterski Tipster Dashboard</h1>
        <button onClick={handleLogout} className="text-red-400">Odjava</button>
      </div>

      <p>Saldo: €{saldo.toFixed(2)} | Prolaznost: {prolaznost}%</p>
      {mozeZatraziti && <button className="bg-yellow-500 p-2 rounded my-2">Zatraži PRO status</button>}

      {/* ---- Forma za unos novog listića ---- */}
      {/* (Ostaje isti kao što već imaš u kodu, nije duplano ovdje) */}

      {/* ---- Moji listići ---- */}
      <div className="my-6">
        <h2 className="text-xl font-bold mb-2">Moji listići</h2>
        {mojiListici.map(bet => renderListic(bet))}
      </div>

      {/* ---- Rang lista ---- */}
      <div className="my-6">
        <h2 className="text-xl font-bold mb-2">Rang lista amaterskih tipstera</h2>
        {rangLista.map((r, i) => (
          <p key={i}>{i + 1}. {r.nickname || r.email} - €{r.saldo.toFixed(2)}</p>
        ))}
      </div>

      {/* ---- Padajući izbornik za PRO i AM tipstere ---- */}
      <div className="my-6">
        <details className="mb-4">
          <summary className="cursor-pointer text-xl font-bold">PRO Tipsteri – Listići</summary>
          <div className="mt-2">
            {proListici.map(bet => renderListic(bet))}
          </div>
        </details>

        <details>
          <summary className="cursor-pointer text-xl font-bold">Amaterski Tipsteri – Listići</summary>
          <div className="mt-2">
            {sviListici.map(bet => renderListic(bet))}
          </div>
        </details>
      </div>
    </div>
  );
}
