// pages/dashboard/pro-tipster-dashboard.jsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';

export default function ProTipsterDashboard() {
  const user = useUser();
  const router = useRouter();

  const [bets, setBets] = useState([]);
  const [title, setTitle] = useState('');
  const [stake, setStake] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [matches, setMatches] = useState([{ match: '', tip: '', odds: '' }]);
  const [showBets, setShowBets] = useState(true);
  const [likes, setLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState('');
  const [nickname, setNickname] = useState('');

  const fetchBets = async () => {
    const { data } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    setBets(data);
  };

  const fetchNickname = async () => {
    const { data } = await supabase.from('profiles').select('nickname').eq('id', user.id).single();
    setNickname(data?.nickname || '');
  };

  const fetchLikesAndComments = async () => {
    const [likesRes, commentsRes] = await Promise.all([
      supabase.from('likes').select('*'),
      supabase.from('comments').select('*'),
    ]);
    setLikes(likesRes.data || []);
    setComments(commentsRes.data || []);
  };

  useEffect(() => {
    if (user) {
      fetchBets();
      fetchNickname();
      fetchLikesAndComments();
    }
  }, [user]);

  const handleAddMatch = () => {
    setMatches([...matches, { match: '', tip: '', odds: '' }]);
  };

  const handleMatchChange = (index, field, value) => {
    const updated = [...matches];
    updated[index][field] = value;
    setMatches(updated);
  };

  const totalOdds = matches.reduce((acc, m) => acc * parseFloat(m.odds || 1), 1);

  const handleSubmit = async () => {
    const { error } = await supabase.from('bets').insert({
      user_id: user.id,
      title,
      stake: parseFloat(stake),
      analysis,
      matches,
      total_odds: totalOdds,
      status: 'pending',
      nickname,
    });
    if (!error) {
      fetchBets();
      setTitle('');
      setStake('');
      setAnalysis('');
      setMatches([{ match: '', tip: '', odds: '' }]);
    }
  };

  const handleLike = async (bet_id) => {
    const existing = likes.find((l) => l.bet_id === bet_id && l.user_id === user.id);
    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('likes').insert({ user_id: user.id, bet_id });
    }
    fetchLikesAndComments();
  };

  const handleComment = async (bet_id) => {
    if (!commentContent.trim()) return;
    await supabase.from('comments').insert({
      user_id: user.id,
      bet_id,
      content: commentContent,
      nickname,
    });
    setCommentContent('');
    fetchLikesAndComments();
  };

  const handleDeleteComment = async (commentId) => {
    await supabase.from('comments').delete().eq('id', commentId);
    fetchLikesAndComments();
  };

  const handleStatusChange = async (bet, status) => {
    if (bet.user_id !== user.id) return;
    const updated = await supabase.from('bets').update({ status }).eq('id', bet.id);
    if (status === 'win') {
      const profit = bet.stake * bet.total_odds;
      await supabase.rpc('update_tipster_balance', { uid: user.id, amount: profit });
    }
    if (status === 'lose') {
      await supabase.rpc('update_tipster_balance', { uid: user.id, amount: -bet.stake });
    }
    fetchBets();
  };

  return (
    <div className="p-4 text-white">
      <h1 className="text-xl font-bold mb-4">PRO Tipster Dashboard</h1>
      <p className="text-yellow-400 text-lg font-bold mb-2">
        Tvoj saldo: <span id="saldo">{user?.user_metadata?.balance || '10,000.00'}€</span>
      </p>

      <h2 className="text-lg font-semibold">Unesi novi listić</h2>
      <input placeholder="Naslov" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input placeholder="Ulog (€)" type="number" value={stake} onChange={(e) => setStake(e.target.value)} />

      {matches.map((m, i) => (
        <div key={i} className="flex gap-2">
          <input placeholder="Par" value={m.match} onChange={(e) => handleMatchChange(i, 'match', e.target.value)} />
          <input placeholder="Tip" value={m.tip} onChange={(e) => handleMatchChange(i, 'tip', e.target.value)} />
          <input placeholder="Kvota" value={m.odds} onChange={(e) => handleMatchChange(i, 'odds', e.target.value)} />
        </div>
      ))}
      <button onClick={handleAddMatch}>Dodaj par</button>
      <textarea placeholder="Analiza" value={analysis} onChange={(e) => setAnalysis(e.target.value)} />
      <button className="bg-green-600 px-4 py-2 mt-2" onClick={handleSubmit}>Objavi listić</button>

      <button onClick={() => setShowBets(!showBets)} className="mt-4 block">
        {showBets ? 'Sakrij PRO listiće' : 'Prikaži PRO listiće'}
      </button>

      {showBets && bets.map((bet) => (
        <div key={bet.id} className="border p-2 mt-4">
          <p><strong>{bet.nickname}</strong>: {bet.title}</p>
          {bet.matches.map((m, i) => (
            <div key={i}>{m.match} - {m.tip} - {m.odds}</div>
          ))}
          <p>Kvota: {bet.total_odds} - Ulog: {bet.stake} - Status: {bet.status}</p>
          <p>
            👍 {likes.filter((l) => l.bet_id === bet.id).length} {' '}
            <button onClick={() => handleLike(bet.id)}>
              {likes.some((l) => l.bet_id === bet.id && l.user_id === user.id) ? 'Makni lajk' : 'Lajkaj'}
            </button>
          </p>

          {bet.user_id === user.id && (
            <div>
              <button onClick={() => handleStatusChange(bet, 'win')}>Označi kao dobitan</button>
              <button onClick={() => handleStatusChange(bet, 'lose')}>Označi kao gubitni</button>
            </div>
          )}

          <details>
            <summary>Prikaži/Sakrij komentare</summary>
            {comments
              .filter((c) => c.bet_id === bet.id)
              .map((comment) => (
                <div key={comment.id}>
                  <strong>{comment.nickname}</strong>: {comment.content}
                  {comment.user_id === user.id && (
                    <button onClick={() => handleDeleteComment(comment.id)} className="text-red-400 ml-2">Obriši</button>
                  )}
                </div>
              ))}
            <input
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Komentar..."
            />
            <button onClick={() => handleComment(bet.id)}>Komentiraj</button>
          </details>
        </div>
      ))}

      <button className="text-red-500 mt-8" onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}>Odjava</button>
    </div>
  );
}
