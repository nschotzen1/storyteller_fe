// src/GMNotebook.jsx
import React from 'react';
import { motion } from 'framer-motion';

const GMNotebook = ({ rolls }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="absolute top-10 right-10 z-[85] w-[300px] bg-gray-100 bg-grid-pattern p-4 rounded shadow-md border border-gray-400/50 text-gray-800 font-mono text-sm pointer-events-none"
      style={{
        backgroundImage: "url('/textures/math_notebook_grid.png')",
        backgroundBlendMode: 'multiply',
        backgroundSize: 'cover',
      }}
    >
      <h2 className="text-lg font-bold mb-2 underline decoration-dashed">GM Notebook</h2>
      <div className="space-y-3">
        {rolls.map((roll, idx) => (
          <div key={idx} className="border-t border-gray-300 pt-2">
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
