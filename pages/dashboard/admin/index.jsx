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
    alert(`Influencer dodan s referral kodom: ${referral_code}`);
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
    <div className="p-6 space-y-6 bg-[#0f0f0f] text-white min-h-screen">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {loading ? (
        <p className="text-lg">Učitavanje...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Pretplatnici (svi)', value: counts.subscribers },
              { label: 'Aktivni pretplatnici', value: counts.activeSubscribers },
              { label: 'Amaterski tipsteri', value: counts.amateurTipsters },
              { label: 'PRO tipsteri', value: counts.proTipsters },
              { label: 'Influenceri', value: counts.influencers }
            ].map((item, index) => (
              <Card key={index} className="bg-[#1f1f1f] hover:shadow-xl transition">
                <CardHeader>
                  <CardTitle className="text-white text-sm">{item.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white text-2xl">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[#1f1f1f]">
              <CardHeader><CardTitle className="text-white">Referral statistika</CardTitle></CardHeader>
              <CardContent>
                {Object.entries(counts.referralStats).length === 0 ? (
                  <p>Nema referral podataka.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {Object.entries(counts.referralStats).map(([code, total]) => (
                      <li key={code} className="text-white">{code}: {total} pretplatnik(a)</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#1f1f1f]">
              <CardHeader><CardTitle className="text-white">Mjesečni trošak</CardTitle></CardHeader>
              <CardContent>
                <p className="mb-2">Ukupno: {counts.totalMonthlyCosts} € / mjesec</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h3 className="font-semibold text-white">PRO Tipsteri:</h3>
                    <ul>
                      {counts.proPayments.map(p => (
                        <li key={p.email}>{p.email} – {p.amount} €</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Influenceri:</h3>
                    <ul>
                      {counts.influencerPayments.map(p => (
                        <li key={p.email}>{p.email} – {p.amount} €</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-[#1f1f1f]">
            <CardHeader><CardTitle className="text-white">Zahtjevi za PRO status</CardTitle></CardHeader>
            <CardContent>
              {counts?.proRequests?.length > 0 ? (
                counts.proRequests.map(req => (
                  <div key={req.id} className="mb-4 border-b border-gray-700 pb-4">
                    <p><strong>{req.profiles?.nickname || 'Nepoznat'}</strong> ({req.profiles?.email})</p>
                    <div className="mt-2 flex gap-2">
                      <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleApproveRequest(req.user_id)}>Prihvati</Button>
                      <Button className="bg-red-600 hover:bg-red-700" onClick={() => handleRejectRequest(req.user_id)}>Odbij</Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm">Nema zahtjeva za PRO status.</p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-4 pt-4">
            <Button onClick={handleAddTipster} className="bg-blue-600 hover:bg-blue-700">Dodaj novog tipstera</Button>
            <Button onClick={handleAddInfluencer} className="bg-blue-600 hover:bg-blue-700">Dodaj influencera</Button>
            <Button onClick={handleCreateChallenge} className="bg-yellow-600 hover:bg-yellow-700">Kreiraj izazov</Button>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
