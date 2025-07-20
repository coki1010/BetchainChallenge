import { useState, useEffect } from 'react';
import { supabase } from '../../lib/customSupabaseClient';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';

export default function AmateurTipsterDashboard() {
  const [userId, setUserId] = useState(null);
  const [nickname, setNickname] = useState('');
  const [saldo, setSaldo] = useState(10000);
  const [parovi, setParovi] = useState([{ par: '', kvota: '', tip: '' }]);
  const [ulog, setUlog] = useState('');
  const [naslov, setNaslov] = useState('');
  const [analiza, setAnaliza] = useState('');
  const [proListici, setProListici] = useState([]);
  const [amateurListici, setAmateurListici] = useState([]);
  const [comments, setComments] = useState({});
  const [likes, setLikes] = useState({});
  const [newComments, setNewComments] = useState({});
  const [expandedPro, setExpandedPro] = useState(true);
  const [expandedAmateur, setExpandedAmateur] = useState(true);
  const [showProRequest, setShowProRequest] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [language, setLanguage] = useState('en');
  const router = useRouter();

  useEffect(() => {
    const storedLang = localStorage.getItem('language') || 'en';
    setLanguage(storedLang);

    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/');
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, is_subscribed, subscribed_until')
        .eq('id', user.id)
        .single();

      if (profile) {
        setNickname(profile.nickname);
        const now = new Date();
        const until = profile.subscribed_until ? new Date(profile.subscribed_until) : null;

        if (!profile.is_subscribed || !until || until < now) {
          setAccessDenied(true);
          return;
        }
      }

      await fetchListici(user.id);
      await fetchSviListici();
    };
    fetchData();
  }, []);

  const handleLanguageChange = (e) => {
    const selectedLang = e.target.value;
    setLanguage(selectedLang);
    localStorage.setItem('language', selectedLang);
  };

  if (accessDenied) {
    return (
      <div className="p-8 text-white bg-black min-h-screen flex flex-col items-center justify-center">
        <div className="absolute top-4 right-4">
          <select value={language} onChange={handleLanguageChange} className="bg-gray-800 text-white px-2 py-1 rounded">
            <option value="en">English</option>
            <option value="hr">Hrvatski</option>
            <option value="sr">Srpski</option>
            <option value="sl">Slovenski</option>
          </select>
        </div>
        <h1 className="text-2xl font-bold text-red-500 mb-4">Trebate se pretplatiti</h1>
        <p className="text-lg mb-6 text-center max-w-md">
          Da biste pristupili amaterskom dashboardu, morate imati aktivnu pretplatu.
        </p>
        <a
          href="https://buy.stripe.com/cNi7sL1cr9NFaka2pg9R601"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded text-lg font-semibold"
        >
          Pretplati se sada
        </a>
      </div>
    );
  }

  // ... sve ostale tvoje funkcije ostaju potpuno iste (fetchListici, handleLike, renderListic, itd.)

  return (
    <div className="p-4 text-white bg-black min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Amaterski Tipster Dashboard</h1>
        <div className="flex gap-4 items-center">
          <select value={language} onChange={handleLanguageChange} className="bg-gray-800 text-white px-2 py-1 rounded">
            <option value="en">English</option>
            <option value="hr">Hrvatski</option>
            <option value="sr">Srpski</option>
            <option value="sl">Slovenski</option>
          </select>
          <button onClick={handleLogout} className="bg-red-600 px-4 py-2 rounded">Odjava</button>
        </div>
      </div>

      {/* Sve ostalo u JSX ostaje isto */}
