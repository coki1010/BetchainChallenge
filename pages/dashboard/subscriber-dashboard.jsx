import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useRouter } from 'next/router';

const translations = { /* ... tvoji prijevodi ostaju */ };

const SubscriberDashboard = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [bets, setBets] = useState([]);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [lang, setLang] = useState('en');
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const t = translations[lang];

  useEffect(() => {
    const storedLang = localStorage.getItem('language');
    if (storedLang) setLang(storedLang);

    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const { data: profile } = await supabase.from('profiles').select('is_subscribed').eq('id', user.id).single();
      setHasSubscription(profile?.is_subscribed);

      const { data: betsData } = await supabase
        .from('bets')
        .select('*, profiles(nickname)')
        .order('created_at', { ascending: false });
      setBets(betsData || []);

      const { data: likesData } = await supabase.from('likes').select('*');
      const likeMap = {};
      likesData?.forEach((like) => {
        if (like.user_id === user.id) {
          likeMap[like.bet_id] = true;
        }
      });
      setLikes(likeMap);

      const { data: commentsData } = await supabase.from('comments').select('*, profiles(nickname)').order('created_at', { ascending: true });
      const commentMap = {};
      commentsData?.forEach((c) => {
        if (!commentMap[c.bet_id]) commentMap[c.bet_id] = [];
        commentMap[c.bet_id].push(c);
      });
      setComments(commentMap);
    };

    fetchData();
  }, []);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLang(newLang);
    localStorage.setItem('language', newLang);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

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
    if (!user || !newComments[betId]) return;
    const text = newComments[betId].trim();
    if (!text) return;
    await supabase.from('comments').insert({ user_id: user.id, bet_id: betId, text });
    setNewComments((prev) => ({ ...prev, [betId]: '' }));
    const { data: newComment } = await supabase.from('comments').select('*, profiles(nickname)').order('created_at', { ascending: false }).limit(1);
    setComments((prev) => ({
      ...prev,
      [betId]: [...(prev[betId] || []), newComment[0]]
    }));
  };

  const filteredBets = bets.filter(bet =>
    bet.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bet.profiles?.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t.dashboard}</h1>
        <div className="flex gap-4 items-center">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#1a1a1a] text-white px-2 py-1 rounded"
          />
          <select value={lang} onChange={handleLanguageChange} className="bg-[#1a1a1a] text-white px-2 py-1 rounded">
            <option value="en">EN</option>
            <option value="hr">HR</option>
            <option value="srb">SRB</option>
            <option value="sl">SLO</option>
          </select>
          <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded">{t.logout}</button>
        </div>
      </div>

      {!hasSubscription ? (
        <div className="bg-[#1a1a1a] p-6 rounded-xl text-center">
          <p className="text-lg mb-4">{t.noSub}</p>
          <a href="https://buy.stripe.com/cNi7sL1cr9NFaka2pg9R601" target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded">
            {t.activate}
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredBets.map((bet) => (
            <div key={bet.id} className="bg-[#1a1a1a] p-4 rounded-xl">
              <p className="text-sm text-gray-400">{new Date(bet.created_at).toLocaleString()}</p>
              <p className="text-lg font-bold mt-1">{bet.title}</p>
              <p className="mt-1">{t.author}: <span className="text-blue-400">{bet.profiles?.nickname || 'Unknown'}</span></p>
              <p className="mt-1">{t.analysis}: {bet.analysis}</p>
              <p className="mt-1">{t.stake}: €{bet.stake} | {t.odds}: {bet.total_odds}</p>
              <p className="mt-2 font-semibold">{t.status}: {bet.status === 'pending' ? t.pending : bet.status === 'win' ? t.win : t.lose}</p>
              <div className="mt-3">
                <button onClick={() => handleLike(bet.id)} className="text-blue-400 text-sm">
                  {likes[bet.id] ? '❤️ Liked' : '🤍 Like'}
                </button>
              </div>
              <div className="mt-3">
                <input
                  type="text"
                  value={newComments[bet.id] || ''}
                  onChange={(e) => setNewComments((prev) => ({ ...prev, [bet.id]: e.target.value }))}
                  placeholder="Add a comment..."
                  className="w-full p-2 bg-[#2a2a2a] rounded mb-2"
                />
                <button onClick={() => handleCommentSubmit(bet.id)} className="text-sm text-green-400">Submit</button>
                <div className="mt-2">
                  {(comments[bet.id] || []).map((c) => (
                    <p key={c.id} className="text-sm text-gray-300">
                      <strong>{c.profiles?.nickname || 'User'}:</strong> {c.text}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div id="kontakt" className="mt-16 bg-[#1a1a1a] p-6 rounded-xl text-white">
        <h2 className="text-xl font-semibold mb-4">{t.contact}</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const form = e.target;
          const formData = {
            name: form.name.value,
            email: form.email.value,
            message: form.message.value,
          };
          const response = await fetch('/api/send-contact-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });
          if (response.ok) {
            alert('Message sent!');
            form.reset();
          } else {
            alert('Error sending message.');
          }
        }} className="space-y-4">
          <input type="text" name="name" placeholder={t.name} required className="w-full p-2 bg-[#2a2a2a] rounded" />
          <input type="email" name="email" placeholder={t.email} required className="w-full p-2 bg-[#2a2a2a] rounded" />
          <textarea name="message" placeholder={t.message} required className="w-full p-2 bg-[#2a2a2a] rounded"></textarea>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">{t.send}</button>
        </form>
      </div>
    </div>
  );
};

export default SubscriberDashboard;
