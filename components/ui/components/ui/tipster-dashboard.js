import React, { useState } from 'react';
import NavBar from '../components/NavBar';

const TipsterDashboard = () => {
  const [picks, setPicks] = useState([{ match: '', analysis: '' }]);

  const handlePickChange = (index, field, value) => {
    const updatedPicks = [...picks];
    updatedPicks[index][field] = value;
    setPicks(updatedPicks);
  };

  const addPick = () => {
    setPicks([...picks, { match: '', analysis: '' }]);
  };

  const submitPicks = () => {
    // Ovdje ide logika za slanje podataka na backend
    console.log('Uneseni listić:', picks);
    alert('Listić uspješno unesen!');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Navigacijski meni */}
      <NavBar />

      <div className="max-w-3xl mx-auto mt-10">
        <h1 className="text-3xl font-bold mb-6 text-center">🎯 Tipster Dashboard</h1>

        {picks.map((pick, index) => (
          <div key={index} className="mb-6 bg-gray-800 p-4 rounded-md shadow">
            <label className="block mb-2 font-semibold text-sm text-gray-300">Par {index + 1}</label>
            <input
              type="text"
              placeholder="Primjer: Dinamo - Hajduk, 1"
              value={pick.match}
              onChange={(e) => handlePickChange(index, 'match', e.target.value)}
              className="w-full p-2 rounded bg-gray-700 text-white mb-2"
            />
            <textarea
              placeholder="Analiza za ovaj par..."
              value={pick.analysis}
              onChange={(e) => handlePickChange(index, 'analysis', e.target.value)}
              className="w-full p-2 rounded bg-gray-700 text-white"
              rows={3}
            />
          </div>
        ))}

        <div className="flex justify-center space-x-4 mt-4">
          <button
            onClick={addPick}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white font-semibold"
          >
            ➕ Dodaj još jedan par
          </button>
          <button
            onClick={submitPicks}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-semibold"
          >
            ✅ Pošalji listić
          </button>
        </div>
      </div>
    </div>
  );
};

export default TipsterDashboard;
