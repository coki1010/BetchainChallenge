import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/customSupabaseClient';

export default function LoginRegister() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_subscribed')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'admin') {
          router.push('/admin-dashboard');
        } else if (profile?.role === 'tipster') {
          router.push('/tipster-dashboard');
        } else if (profile?.role === 'amateur_tipster') {
          router.push('/dashboard/amateur-tipster-dashboard');
        } else if (profile?.role === 'subscriber' || profile?.is_subscribed) {
          router.push('/subscriber-dashboard');
        } else {
          router.push('/');
        }
      }
    };

    checkUser();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('Greška pri prijavi: ' + error.message);
    } else {
      // Nakon logina, ponovo pozivamo provjeru korisnika
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_subscribed')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        router.push('/admin-dashboard');
      } else if (profile?.role === 'tipster') {
        router.push('/tipster-dashboard');
      } else if (profile?.role === 'amateur_tipster') {
        router.push('/dashboard/amateur-tipster-dashboard');
      } else if (profile?.role === 'subscriber' || profile?.is_subscribed) {
        router.push('/subscriber-dashboard');
      } else {
        router.push('/');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <div className="bg-[#1a1a1a] p-6 rounded-xl w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-2 bg-[#2a2a2a] rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-2 bg-[#2a2a2a] rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded"
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>
        <p className="text-sm mt-4 text-center">
          Don't have an account? <a href="/register" className="underline text-blue-400">Register here</a>
        </p>
      </div>
    </div>
  );
}
