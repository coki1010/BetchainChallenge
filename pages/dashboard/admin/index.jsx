import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AdminDashboard = () => {
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    setLoading(true);

    const { data: profiles, error } = await supabase.from("profiles").select("*");

    const subscribers = profiles.filter((p) => p.role === "subscriber").length;
    const activeSubscribers = profiles.filter((p) => p.role === "subscriber" && p.is_subscribed === true).length;
    const amateurTipsters = profiles.filter((p) => p.role === "amateur_tipster").length;
    const proTipsters = profiles.filter((p) => p.role === "pro_tipster").length;
    const influencers = profiles.filter((p) => p.role === "influencer").length;

    const referralStats = {};
    profiles.forEach((p) => {
      if (p.referred_by) {
        referralStats[p.referred_by] = (referralStats[p.referred_by] || 0) + 1;
      }
    });

    const { data: tipsterPayments } = await supabase.from("tipster_payments").select("*");
    const proPayments = tipsterPayments || [];
    const proTotal = proPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    const { data: influencerPayments } = await supabase.from("influencer_payments").select("*");
    const infPayments = influencerPayments || [];
    const infTotal = infPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    const totalMonthlyCosts = proTotal + infTotal;

    const { data: proRequests } = await supabase
      .from("pro_requests")
      .select("*, profiles(email, nickname)")
      .eq("status", "pending");

    setCounts({
      subscribers,
      activeSubscribers,
      amateurTipsters,
      proTipsters,
      influencers,
      referralStats,
      totalMonthlyCosts,
      proPayments,
      influencerPayments: infPayments,
      proRequests,
    });

    setLoading(false);
  };

  const handleApproveRequest = async (userId) => {
    await supabase.from("pro_requests").update({ status: "approved" }).eq("user_id", userId);
    await supabase.from("profiles").update({ role: "pro_tipster" }).eq("id", userId);
    fetchCounts();
  };

  const handleRejectRequest = async (userId) => {
    await supabase.from("pro_requests").update({ status: "rejected" }).eq("user_id", userId);
    fetchCounts();
  };

  const handleAddTipster = async () => {
    const email = prompt("Unesi email tipstera:");
    const amount = prompt("Unesi mjesečni iznos (€):");
    if (email && amount) {
      await supabase.from("tipster_payments").insert([{ email, amount: parseFloat(amount) }]);
      fetchCounts();
    }
  };

  const handleAddInfluencer = async () => {
    const email = prompt("Unesi email influencera:");
    const amount = prompt("Unesi mjesečni iznos (€):");
    if (email && amount) {
      await supabase.from("influencer_payments").insert([{ email, amount: parseFloat(amount) }]);
      fetchCounts();
    }
  };

  const handleCreateChallenge = () => {
    alert("Kreiranje izazova dolazi uskoro!");
  };

  return (
    <div className="p-6 space-y-4 bg-[#0f0f0f] text-white min-h-screen">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <Card className="bg-black text-white">
              <CardHeader><CardTitle className="text-white">Pretplatnici (svi)</CardTitle></CardHeader>
              <CardContent><p className="text-xl text-white">{counts.subscribers}</p></CardContent>
            </Card>
            <Card className="bg-black text-white">
              <CardHeader><CardTitle className="text-white">Aktivni pretplatnici</CardTitle></CardHeader>
              <CardContent><p className="text-xl text-white">{counts.activeSubscribers}</p></CardContent>
            </Card>
            <Card className="bg-black text-white">
              <CardHeader><CardTitle className="text-white">Amaterski tipsteri</CardTitle></CardHeader>
              <CardContent><p className="text-xl text-white">{counts.amateurTipsters}</p></CardContent>
            </Card>
            <Card className="bg-black text-white">
              <CardHeader><CardTitle className="text-white">PRO tipsteri</CardTitle></CardHeader>
              <CardContent><p className="text-xl text-white">{counts.proTipsters}</p></CardContent>
            </Card>
            <Card className="bg-black text-white">
              <CardHeader><CardTitle className="text-white">Influenceri</CardTitle></CardHeader>
              <CardContent><p className="text-xl text-white">{counts.influencers}</p></CardContent>
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
                  {counts.proPayments.map((p) => (
                    <li key={p.email}>{p.email} – {p.amount} €</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold">Influenceri:</h3>
                <ul>
                  {counts.influencerPayments.map((p) => (
                    <li key={p.email}>{p.email} – {p.amount} €</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <h2 className="text-xl font-semibold mb-2">Zahtjevi za PRO status</h2>
            {counts?.proRequests?.length > 0 ? (
              counts.proRequests.map((req) => (
                <div key={req.id} className="bg-[#1a1a1a] p-4 rounded mb-2">
                  <p><strong>{req.profiles?.nickname || "Nepoznat"}</strong> ({req.profiles?.email}) traži PRO status.</p>
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
        <Button className="ml-2 bg-yellow-500 hover:bg-yellow-600 text-black" onClick={handleCreateChallenge}>Kreiraj izazov</Button>
      </div>
    </div>
  );
};

export default AdminDashboard;
