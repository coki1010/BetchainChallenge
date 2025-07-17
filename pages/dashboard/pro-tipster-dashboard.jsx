// ProTipsterDashboard.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import ParInput from '../components/ParInput';
import KomentarForma from '../components/KomentarForma';
import KomentarLista from '../components/KomentarLista';

const ProTipsterDashboard = ({ user }) => {
  const [listici, setListici] = useState([]);
  const [saldo, setSaldo] = useState(10000);
  const [likes, setLikes] = useState({});

  const userId = user?.id;

  const fetchSviListici = async () => {
    const { data: betsData } = await supabase.from('bets').select('*');
    const { data: likesData } = await supabase.from('likes').select('*');
    const { data: commentsData } = await supabase.from('comments').select('*');

    const enriched = betsData.map(bet => {
      const betLikes = likesData.filter(l => l.bet_id === bet.id);
      const betComments = commentsData.filter(c => c.bet_id === bet.id);
      return {
        ...bet,
        likes: betLikes,
        comments: betComments
      };
    });
    setListici(enriched);
    setLikes(
      likesData.reduce((acc, like) => {
        if (!acc[like.bet_id]) acc[like.bet_id] = [];
        acc[like.bet_id].push(like);
        return acc;
      }, {})
    );
  };

  const fetchListici = async (id) => {
    const { data } = await supabase.from('bets').select('*').eq('user_id', id);
    if (data) {
      let saldoTemp = 10000;
      data.forEach(bet => {
        const stake = parseFloat(bet.stake);
        const odds = parseFloat(bet.total_odds);
        if (bet.status === 'win') {
          saldoTemp -= stake;
          saldoTemp += stake * odds;
        } else if (bet.status === 'lose') {
          saldoTemp -= stake;
        }
      });
      setSaldo(saldoTemp);
    }
  };

  const handleDeleteComment = async (commentId) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
      console.error('Greška pri brisanju komentara:', error.message);
    } else {
      await fetchSviListici();
    }
  };

  const handleLike = async (betId) => {
    const alreadyLiked = likes[betId]?.some(l => l.user_id === userId);

    if (alreadyLiked) {
      const likeToRemove = likes[betId].find(l => l.user_id === userId);
      if (likeToRemove && likeToRemove.id) {
        const { error } = await supabase.from('likes').delete().eq('id', likeToRemove.id);
        if (error) console.error('Greška pri brisanju lajka:', error.message);
      }
    } else {
      const { error } = await supabase.from('likes').insert({
        id: uuidv4(),
        bet_id: betId,
        user_id: userId,
        created_at: new Date(),
      });
      if (error) console.error('Greška pri lajku:', error.message);
    }

    await fetchSviListici();
  };

  useEffect(() => {
    if (userId) {
      fetchListici(userId);
      fetchSviListici();
    }
  }, [userId]);

  return (
    <div className="p-4 text-white">
      <h1 className="text-2xl font-bold">PRO Tipster Dashboard</h1>
      <p className="mb-4">Tvoj saldo: <span className="text-yellow-400 font-bold">{saldo.toFixed(2)}€</span></p>

      {/* ovdje ide forma za unos listića */}

      <div className="mt-6">
        <button onClick={fetchSviListici} className="mb-2">Osvježi listiće</button>
        {listici.map(l => (
          <div key={l.id} className="mb-4 border-b border-gray-600 pb-2">
            <p><strong>{l.nickname}:</strong> {l.title}</p>
            <p>Kvota: {l.total_odds} - Ulog: {l.stake} - Status: {l.status}</p>
            <div>
              <span className="text-yellow-400">👍 {l.likes?.length || 0}</span>
              {likes[l.id]?.some(like => like.user_id === userId) ? (
                <button className="text-green-400 ml-2" onClick={() => handleLike(l.id)}>Makni lajk</button>
              ) : (
                <button className="text-green-400 ml-2" onClick={() => handleLike(l.id)}>Lajkaj</button>
              )}
            </div>
            <KomentarLista komentari={l.comments} userId={userId} handleDeleteComment={handleDeleteComment} />
            <KomentarForma betId={l.id} userId={userId} osvjezi={fetchSviListici} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProTipsterDashboard;
