// src/GMNotebook.jsx
import React from 'react';
import { motion } from 'framer-motion';

const GMNotebook = ({ rolls }) => {
  

  return (
    <motion.div
      initial={{ opacity: 0, rotate: -12, scale: 0.5, x: 300, y: -100 }}
      animate={{ opacity: 1, rotate: 0, scale: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, rotate: 12, scale: 0.8, x: 300, y: -100 }}
      transition={{ type: 'spring', stiffness: 100, damping: 14 }}
      className="absolute top-10 right-10 z-[85] w-[320px] bg-paper-grid p-5 rounded-md shadow-2xl border border-gray-400/40 text-gray-800 font-mono text-sm pointer-events-none"
      style={{
        backgroundImage: `
          url('/textures/paper_texture_rugged.jpg'),
          url('/textures/math_notebook_grid.png')
        `,
        backgroundSize: 'cover, contain',
        backgroundBlendMode: 'multiply',
        backgroundRepeat: 'no-repeat, repeat',
      }}
    >
      <h2 className="text-lg font-bold mb-3 underline decoration-dashed decoration-gray-500">GM Notebook</h2>
      <div className="space-y-4">
        {rolls.map((roll, idx) => (
          <div key={idx} className="border-t border-gray-300/60 pt-2">
            <div className="italic">{roll.check}</div>
            <div>Rolling {roll.dice}: <span className="font-bold">{roll.results.join(', ')}</span></div>
            <div className={roll.success ? 'text-green-700' : 'text-red-700'}>
              {roll.success ? '✔ Success' : '✘ Failure'}
            </div>
            {roll.notes && <div className="mt-1 text-gray-600 italic">{roll.notes}</div>}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default GMNotebook;
