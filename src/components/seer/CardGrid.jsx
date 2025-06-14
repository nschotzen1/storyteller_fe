import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchSeerCards } from '../../apiService';
import SeerCard from './SeerCard';

const CardGrid = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCards = async () => {
      setLoading(true);
      const { data, error: fetchError } = await fetchSeerCards();
      if (fetchError) {
        console.error("Error fetching seer cards:", fetchError);
        setError(fetchError.message || 'Failed to load cards.');
        setCards([]);
      } else {
        // Assuming mock data already includes isFlipped, if not, map and add it here.
        // e.g., data.map(card => ({ ...card, isFlipped: false }))
        setCards(data || []);
      }
      setLoading(false);
    };
    loadCards();
  }, []);

  const handleFlipCard = (cardId) => {
    setCards((prevCards) =>
      prevCards.map((card) => {
        if (card.id === cardId && card.canFlip) {
          return { ...card, isFlipped: !card.isFlipped };
        }
        return card;
      })
    );
  };

  if (loading) {
    return <div className="text-center p-10">Loading cards...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">Error: {error}</div>;
  }

  if (!cards || cards.length === 0) {
    return <div className="text-center p-10">No cards available.</div>;
  }

  return (
    <div
      className="grid grid-cols-4 grid-rows-4 gap-4 w-[800px] h-[800px] bg-gray-800 p-4 rounded-lg shadow-xl"
      style={{ margin: '20px auto' }} // Centering the grid for better presentation
    >
      {cards.map((card, index) => {
        const gridStyles = {
          gridRowStart: card.gridPosition.row,
          gridColumnStart: card.gridPosition.col,
          gridRowEnd: card.gridPosition.row + card.size.rows,
          gridColumnEnd: card.gridPosition.col + card.size.cols,
          display: 'flex', // Added to help SeerCard fill the grid area
          justifyContent: 'center', // Center content within grid cell
          alignItems: 'center', // Center content within grid cell
        };
        return (
          <motion.div
            key={card.id}
            style={gridStyles}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          >
            <SeerCard
              id={card.id}
              name={card.name}
              frontImage={card.frontImage}
              backImage={card.backImage}
              canFlip={card.canFlip}
              isFlipped={card.isFlipped}
              storySnippet={card.storySnippet}
              onFlip={handleFlipCard}
              // Pass size or specific styles if SeerCard needs to adapt to grid cell
            />
          </motion.div>
        );
      })}
    </div>
  );
};

export default CardGrid;
