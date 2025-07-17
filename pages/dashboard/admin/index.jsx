import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';

const AdminDashboard = () => {
  const router = useRouter();
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
    proRequests: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);

      const { data: profiles, error } = await supabase.from('profiles').select('*');
      console.log("🚀 PROFILI:", profiles);

      if (error) {
        console.error('Error fetching profiles:', error);
        return;
      }

      const subscribers = profiles.filter(p => p.role === 'subscriber').length;
      const activeSubscribers = profiles.filter(p =>
        p.role === 'subscriber' && (p.is_subscribed === true || p.is_subscribed === 'TRUE')
      ).length;
      const amateurTipsters = profiles.filter(p => p.role === 'amateur_tipster').length;
      const proTipsters = profiles.filter(p => p.role === 'pro_tipster').length;
      const influencers = profiles.filter(p => p.role === 'influencer').length;

      const referralStats = profiles
        .filter(p => p.referral_code)
        .reduce((acc, curr) => {
          acc[curr.referral_code] = (acc[curr.referral_code] || 0) + 1;
          return acc;
        }, {});

      const proPayments = profiles
        .filter(p => p.role === 'pro_tipster')
        .map(p => ({ email: p.email, amount: p.monthly_payment || 0 }));

      const influencerPayments = profiles
        .filter(p => p.role === 'influencer')
        .map(p => ({ email: p.email, amount: p.monthly_payment || 0 }));

      const totalMonthlyCosts = [...proPayments, ...influencerPayments].reduce((sum, p) => sum + p.amount, 0);

      const { data: proRequests, error: requestError } = await supabase
        .from('pro_requests')
        .select('*, profiles(nickname, email)')
        .eq('status', 'pending');

      if (requestError) {
        console.error('Greška prilikom dohvaćanja zahtjeva za PRO:', requestError);
      }

      setCounts({
        subscribers,
        activeSubscribers,
        amateurTipsters,
        proTipsters,
        influencers,
        referralStats,
        totalMonthlyCosts,
        proPayments,
        influencerPayments,
        proRequests: proRequests || []
      });

      setLoading(false);
    };

    fetchCounts();
  }, []);

  const handleAddTipster = async () => {
    const email = prompt('Unesi email tipstera:');
    if (!email) return;
    const nickname = prompt('Unesi nadimak tipstera:');
    if (!nickname) return;
    const isPro = confirm('Je li tipster PRO? Klikni OK za PRO, Cancel za Amatera.');
    const role = isPro ? 'pro_tipster' : 'amateur_tipster';

    let monthly_payment = null;
    if (isPro) {
      const paymentInput = prompt('Unesi mjesečni iznos koji plaćaš PRO tipsteru (u €):');
      monthly_payment = parseFloat(paymentInput);
    }

    const { error } = await supabase.from('profiles').insert([{ email, role, nickname, monthly_payment }]);
    if (error) return alert('Greška prilikom dodavanja!');
    alert('Tipster dodan!');
    location.reload();
  };

  const handleAddInfluencer = async () => {
    const email = prompt('Unesi email influencera:');
    if (!email) return;
    const referral_code = 'ref_' + uuidv4().split('-')[0];
    const paymentInput = prompt('Unesi mjesečni iznos koji plaćaš influenceru (u €):');
    const monthly_payment = parseFloat(paymentInput);

    const { error } = await supabase.from('profiles').insert([{ email, role: 'influencer', referral_code, monthly_payment }]);
    if (error) return alert('Greška prilikom dodavanja!');
    alert(Influencer dodan s referral kodom: ${referral_code});
    location.reload();
  };

  const handleCreateChallenge = () => {
    router.push('/dashboard/admin/create-challenge');
  };

  const handleApproveRequest = async (userId) => {
    await supabase.from('profiles').update({ role: 'pro_tipster' }).eq('id', userId);
    await supabase.from('pro_requests').update({ status: 'approved' }).eq('user_id', userId);
    alert('Zahtjev prihvaćen i korisnik postao PRO!');
    location.reload();
  };

  const handleRejectRequest = async (userId) => {
    await supabase.from('pro_requests').update({ status: 'rejected' }).eq('user_id', userId);
    alert('Zahtjev odbijen.');
    location.reload();
  };

  return (
    <div className="p-6 space-y-4 bg-[#0f0f0f] text-white min-h-screen">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* DEBUG PRIKAZ COUNT OBJEKTA */}
      <pre className="text-white text-sm bg-black p-2 rounded overflow-x-auto">
        {JSON.stringify(counts, null, 2)}
      </pre>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <Card className="bg-[#1f1f1f] text-white">
              <CardHeader><CardTitle className="text-white">Pretplatnici (svi)</CardTitle></CardHeader>
              <CardContent><p className="text-white text-xl">{counts.subscribers}</p></CardContent>
            </Card>
            <Card className="bg-[#1f1f1f] text-white">
              <CardHeader><CardTitle className="text-white">Aktivni pretplatnici</CardTitle></CardHeader>
              <CardContent><p className="text-white text-xl">{counts.activeSubscribers}</p></CardContent>
            </Card>
            <Card className="bg-[#1f1f1f] text-white">
              <CardHeader><CardTitle className="text-white">Amaterski tipsteri</CardTitle></CardHeader>
              <CardContent><p className="text-white text-xl">{counts.amateurTipsters}</p></CardContent>
            </Card>
            <Card className="bg-[#1f1f1f] text-white">
              <CardHeader><CardTitle className="text-white">PRO tipsteri</CardTitle></CardHeader>
              <CardContent><p className="text-white text-xl">{counts.proTipsters}</p></CardContent>
            </Card>
            <Card className="bg-[#1f1f1f] text-white">
              <CardHeader><CardTitle className="text-white">Influenceri</CardTitle></CardHeader>
              <CardContent><p className="text-white text-xl">{counts.influencers}</p></CardContent>
            </Card>
          </div>

          <div className="pt-6">
            <h2 className="text-xl font-semibold mb-2">Referral statistika</h2>
            {Object.entries(counts.referralStats).map(([code, total]) => (
              <p key={code}>{code}: {total} pretplatnik(a)</p>
            ))}
          </div>

          <div className="pt-6">
            <h2 className="text-xl font-semibold mb-2">Mjesečni trošak</h2>
            <p className="mb-2">Ukupno: {counts.totalMonthlyCosts} € / mjesec</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold">PRO Tipsteri:</h3>
                <ul>
                  {counts.proPayments.map(p => (
                    <li key={p.email}>{p.email} – {p.amount} €</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold">Influenceri:</h3>
                <ul>
                  {counts.influencerPayments.map(p => (
                    <li key={p.email}>{p.email} – {p.amount} €</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <h2 className="text-xl font-semibold mb-2">Zahtjevi za PRO status</h2>
            {counts?.proRequests?.length > 0 ? (
              counts.proRequests.map(req => (
                <div key={req.id} className="bg-[#1a1a1a] p-4 rounded mb-2">
                  <p><strong>{req.profiles?.nickname || 'Nepoznat'}</strong> ({req.profiles?.email}) traži PRO status.</p>
                  <div className="mt-2 flex gap-2">
                    <Button onClick={() => handleApproveRequest(req.user_id)} className="bg-green-600">Prihvati</Button>
                    <Button onClick={() => handleRejectRequest(req.user_id)} className="bg-red-600">Odbij</Button>
                  </div>
                </div>
              ))
            ) : (
              <p>Nema novih zahtjeva.</p>
            )}
          </div>
        </>
      )}

      <div className="pt-4">
        <Button onClick={handleAddTipster}>Dodaj novog tipstera</Button>
        <Button className="ml-2" onClick={handleAddInfluencer}>Dodaj influencera</Button>
        <Button className="ml-2" onClick={handleCreateChallenge}>Kreiraj izazov</Button>
      </div>
    </div>
  );
};

export default AdminDashboard;
