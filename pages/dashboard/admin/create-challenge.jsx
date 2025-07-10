import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/customSupabaseClient';
import Input from '@/components/ui/input';
import Textarea from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const CreateChallenge = () => {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reward, setReward] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('challenges').insert([
      {
        title,
        description,
        start_date: startDate,
        end_date: endDate,
        reward: parseFloat(reward),
      },
    ]);
    if (error) {
      alert('Greška prilikom spremanja izazova!');
      console.error(error);
    } else {
      alert('Izazov uspješno kreiran!');
      router.push('/dashboard/admin');
    }
  };

  return (
    <div className="p-6 bg-[#0f0f0f] min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">Kreiraj izazov</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block mb-1">Naslov</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Naslov izazova" />
        </div>
        <div>
          <label className="block mb-1">Opis</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opis izazova" />
        </div>
        <div>
          <label className="block mb-1">Početak</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block mb-1">Kraj</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div>
          <label className="block mb-1">Nagrada (€)</label>
          <Input type="number" value={reward} onChange={(e) => setReward(e.target.value)} />
        </div>
        <Button type="submit">Spremi izazov</Button>
      </form>
    </div>
  );
};

export default CreateChallenge;
