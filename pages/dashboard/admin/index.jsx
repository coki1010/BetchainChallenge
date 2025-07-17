import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function AdminDashboard() {
  const [counts, setCounts] = useState({
    subscribers: 0,
    activeSubscribers: 0,
    amateurTipsters: 0,
    proTipsters: 0,
    influencers: 0,
    referralStats: {},
    totalMonthlyCosts: 0,
    proPayments: [],
    influencerPayments: [],
    proRequests: [],
  });

  const router = useRouter();

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }

    const subscribers = profiles.filter(p => p.role === 'subscriber').length;
    const activeSubscribers = profiles.filter(p => p.role === 'subscriber' && p.is_subscribed === true).length;
    const amateurTipsters = profiles.filter(p => p.role === 'amateur_tipster').length;
    const proTipsters = profiles.filter(p => p.role === 'pro_tipster').length;
    const influencers = profiles.filter(p => p.role === 'influencer').length;

    const proPayments = profiles
      .filter(p => p.role === 'pro_tipster')
      .map(p => ({
        email: p.email,
        amount: p.monthly_payment || 0,
      }));

    const influencerPayments = profiles
      .filter(p => p.role === 'influencer')
      .map(p => ({
        email: p.email,
        amount: p.monthly_payment || 0,
      }));

    const totalMonthlyCosts = [...proPayments, ...influencerPayments].reduce((sum, p) => sum + p.amount, 0);

    const proRequests = profiles.filter(p => p.pro_request === true);

    setCounts({
      subscribers,
      activeSubscribers,
      amateurTipsters,
      proTipsters,
      influencers,
      referralStats: {}, // Add real logic if needed
      totalMonthlyCosts,
      proPayments,
      influencerPayments,
      proRequests,
    });
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white text-black rounded-xl shadow p-4">
          <p className="text-sm font-medium">Pretplatnici</p>
          <p className="text-2xl font-bold">{counts.subscribers}</p>
        </div>
        <div className="bg-white text-black rounded-xl shadow p-4">
          <p className="text-sm font-medium">Aktivni</p>
          <p className="text-2xl font-bold">{counts.activeSubscribers}</p>
        </div>
        <div className="bg-white text-black rounded-xl shadow p-4">
          <p className="text-sm font-medium">Amaterski Tipsteri</p>
          <p className="text-2xl font-bold">{counts.amateurTipsters}</p>
        </div>
        <div className="bg-white text-black rounded-xl shadow p-4">
          <p className="text-sm font-medium">PRO Tipsteri</p>
          <p className="text-2xl font-bold">{counts.proTipsters}</p>
        </div>
        <div className="bg-white text-black rounded-xl shadow p-4">
          <p className="text-sm font-medium">Influenceri</p>
          <p className="text-2xl font-bold">{counts.influencers}</p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Referral statistika</h2>
        <p className="text-sm italic text-gray-400">Još nije implementirano.</p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Mjesečni trošak</h2>
        <p className="mb-2">Ukupno: {counts.totalMonthlyCosts} € / mjesec</p>
        <h3 className="font-semibold">PRO Tipsteri:</h3>
        {counts.proPayments.map((p, i) => (
          <p key={i}>{p.email} – {p.amount} €</p>
        ))}
        <h3 className="font-semibold mt-4">Influenceri:</h3>
        {counts.influencerPayments.length === 0 && <p className="text-gray-400">Nema influencera.</p>}
        {counts.influencerPayments.map((p, i) => (
          <p key={i}>{p.email} – {p.amount} €</p>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Zahtjevi za PRO status</h2>
        {counts.proRequests.length === 0 ? (
          <p className="text-gray-400">Nema novih zahtjeva.</p>
        ) : (
          counts.proRequests.map((r, i) => (
            <p key={i}>{r.email}</p>
          ))
        )}
      </div>

      <div className="flex gap-4 mt-4">
        <button
          onClick={() => router.push('/dashboard/admin/add-tipster')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Dodaj novog tipstera
        </button>
        <button
          onClick={() => router.push('/dashboard/admin/add-influencer')}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
        >
          Dodaj influencera
        </button>
        <button
          onClick={() => router.push('/dashboard/admin/create-challenge')}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          Kreiraj izazov
        </button>
      </div>
    </div>
  );
}
