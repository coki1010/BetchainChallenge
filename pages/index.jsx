// pages/index.jsx

import React from 'react';
import Link from 'next/link';

const Home = () => {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between">
      <header className="p-6 flex justify-between items-center bg-[#1a1a1a]">
        <h1 className="text-2xl font-bold">BetChain Challenge</h1>
        <nav className="space-x-4">
          <Link href="/login-register" className="text-blue-400 hover:underline">Login / Register</Link>
          <Link href="#contact" className="hover:underline">Contact</Link>
        </nav>
      </header>

      <main className="p-8 flex-grow">
        <section className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Welcome to BetChain Challenge</h2>
          <p className="text-lg max-w-2xl mx-auto">
            Compete for monthly prizes! Whether you're a subscriber looking for the best betting tips, or an amateur tipster trying to prove your skills – we've got a challenge for you.
          </p>
          <Link href="/login-register">
            <button className="mt-6 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-semibold">Join Now</button>
          </Link>
        </section>

        <section className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-[#1a1a1a] p-6 rounded-xl">
            <h3 className="text-2xl font-semibold mb-2">For Subscribers</h3>
            <p>
              Subscribe and access exclusive tips from verified PRO tipsters. Subscribers also participate in monthly leaderboard challenges with prizes up to <strong>1000€</strong>.
            </p>
          </div>
          <div className="bg-[#1a1a1a] p-6 rounded-xl">
            <h3 className="text-2xl font-semibold mb-2">For Amateur Tipsters</h3>
            <p>
              Start with a 10,000€ virtual balance and showcase your betting skills. Reach over 70% accuracy to request PRO status. Top amateur tipster of the month wins <strong>1000€</strong>!
            </p>
          </div>
        </section>

        {/* Kontakt sekcija s tekstom umjesto forme */}
        <section id="contact" className="bg-[#1a1a1a] p-6 rounded-xl max-w-xl mx-auto text-center">
          <h3 className="text-xl font-bold mb-2">Contact</h3>
          <p className="text-gray-300">info@betchainchallenge.com</p>
        </section>
      </main>

      <footer className="text-center p-4 bg-[#1a1a1a] text-sm">
        © {new Date().getFullYear()} BetChain Challenge. All rights reserved.
      </footer>
    </div>
  );
};

export default Home;
