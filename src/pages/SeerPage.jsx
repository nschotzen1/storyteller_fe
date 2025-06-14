import React from 'react';
import CardGrid from '../components/seer/CardGrid';

const SeerPage = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-purple-400 tracking-wider font-cinzel">
          Storyteller Seer Cards
        </h1>
        <p className="text-lg text-gray-400 mt-2">
          Unveil the threads of fate. Click on a card to explore its mysteries.
        </p>
      </header>
      <main className="flex-grow flex items-center justify-center">
        <CardGrid />
      </main>
      <footer className="mt-8 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Arcane Digital. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default SeerPage;
