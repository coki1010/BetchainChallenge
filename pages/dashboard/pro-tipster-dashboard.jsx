import { useEffect, useState } from 'react';
import { supabase } from '../../lib/customSupabaseClient';

export default function ProTipsterDashboard() {
  const [listici, setListici] = useState([]);
  const [userId, setUserId] = useState(null);
  const [saldo, setSaldo] = useState(10000);

  useEffect(() => {
    const fetchUserAndListici = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchListici(user.id);
      }
    };

    const fetchListici = async (uid) => {
      const { data, error } = await supabase
        .from('bets')
        .select('id, user_id, pairs, kvota, ulog, status, analysis')
        .eq('user_id', uid);

      if (error) console.error(error);
      else {
        setListici(data);
        let saldoTemp = 10000;
        data.forEach(bet => {
          if (bet.status === 'won') saldoTemp += bet.ulog * (bet.kvota - 1);
          else if (bet.status === 'lost') saldoTemp -= bet.ulog;
        });
        setSaldo(saldoTemp);
      }
    };

    fetchUserAndListici();
  }, []);

  const promijeniStatus = async (betId, noviStatus) => {
    const { error } = await supabase
      .from('bets')
      .update({ status: noviStatus })
      .eq('id', betId);

    if (!error) {
      const osvjezeni = listici.map(b =>
        b.id === betId ? { ...b, status: noviStatus } : b
      );
      setListici(osvjezeni);
      let saldoTemp = 10000;
      osvjezeni.forEach(bet => {
        if (bet.status === 'won') saldoTemp += bet.ulog * (bet.kvota - 1);
        else if (bet.status === 'lost') saldoTemp -= bet.ulog;
      });
      setSaldo(saldoTemp);
    }
  };

  const obrisiKomentar = async (commentId) => {
    await supabase.from('comments').delete().eq('id', commentId);
  };

  const ukloniLajk = async (betId) => {
    if (!userId) return;
    await supabase.from('likes').delete().match({ bet_id: betId, user_id: userId });
  };

  const fetchKomentari = async (betId) => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('bet_id', betId)
      .order('created_at', { ascending: false });
    return data;
  };

  const fetchLajkovi = async (betId) => {
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('bet_id', betId);
    return data.length;
  };

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">PRO Tipster Dashboard</h1>
      <p className="mb-6">Saldo: {saldo.toFixed(2)}€</p>

      {listici.map((l) => (
        <div key={l.id} className="border border-gray-700 p-4 mb-4 rounded-xl bg-gray-800">
          <p className="text-sm text-gray-400 mb-1">
            Status: <span className={l.status === 'won' ? 'text-green-400' : l.status === 'lost' ? 'text-red-400' : 'text-yellow-400'}>
              {l.status}
            </span>
          </p>
          <p className="mb-1">
            {l.pairs.map(p => `${p.par} (${p.tip}) - ${p.kvota}`).join(', ')}
          </p>
          {l.analysis && <p className="italic text-gray-300">Analiza: {l.analysis}</p>}
          <p>Ulog: {l.ulog}€, Kvota: {l.kvota}</p>

          {l.status === 'pending' && (
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => promijeniStatus(l.id, 'won')}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded"
              >
                Označi kao dobitan
              </button>
              <button
                onClick={() => promijeniStatus(l.id, 'lost')}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded"
              >
                Označi kao gubitan
              </button>
            </div>
          )}

          <div className="mt-4 text-sm">
            <strong>Komentari:</strong>
            <CommentList betId={l.id} userId={userId} onDelete={obrisiKomentar} />
          </div>

          <div className="mt-2 text-sm">
            <strong>Lajkovi: </strong>
            <LikeCount betId={l.id} />
            <button
              onClick={() => ukloniLajk(l.id)}
              className="ml-2 text-red-400 hover:underline"
            >
              Ukloni lajk
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CommentList({ betId, userId, onDelete }) {
  const [komentari, setKomentari] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('bet_id', betId)
        .order('created_at', { ascending: false });
      setKomentari(data);
    };
    fetch();
  }, [betId]);

  return (
    <ul className="space-y-1 mt-1">
      {komentari.map((k) => (
        <li key={k.id} className="flex justify-between items-center bg-gray-700 p-2 rounded">
          <span>
            <strong>{k.nickname || 'Korisnik'}:</strong> {k.content}
          </span>
          {userId === k.user_id && (
            <button
              onClick={() => {
                onDelete(k.id);
                setKomentari(prev => prev.filter(c => c.id !== k.id));
              }}
              className="text-sm text-red-300 hover:underline ml-2"
            >
              Obriši
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function LikeCount({ betId }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('bet_id', betId);
      setCount(data.length);
    };
    fetch();
  }, [betId]);

  return <span>{count}</span>;
}
