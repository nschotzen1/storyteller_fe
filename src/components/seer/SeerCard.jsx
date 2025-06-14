import React from 'react';
import '../../FlipCard.css'; // Assuming FlipCard.css is in src

const SeerCard = ({
  id,
  name,
  frontImage,
  backImage,
  canFlip,
  isFlipped,
  storySnippet,
  onFlip,
  orientation, // Added orientation to props destructuring
}) => {
  const handleCardClick = () => {
    if (canFlip) {
      onFlip(id);
    }
  };

  return (
    <div
      className="flip-card"
      data-orientation={orientation} // Added data-orientation attribute
      onClick={handleCardClick}
      style={{
        width: '100%',
        height: '100%',
        cursor: canFlip ? 'pointer' : 'default',
      }}
    >
      <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}>
        <div className="flip-card-front">
          <img
            src={frontImage}
            alt={`${name} - Front`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} // Added borderRadius here if not covered by parent
          />
        </div>
        <div
          className="flip-card-back flex flex-col justify-center items-center p-2" // Using flex for content layout
          style={{ borderRadius: '16px' }} // Ensure back also has rounded corners if needed
        >
          <img
            src={backImage}
            alt={`${name} - Back`}
            style={{ width: '100%', height: '65%', objectFit: 'contain', marginBottom: '5px' }} // Contain might be better, adjusted height
          />
          <p
            className="text-xs text-center text-gray-200 overflow-y-auto"
            style={{ maxHeight: '30%', margin: '0' }} // Max height for snippet, allow scroll if too long
          >
            {storySnippet}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SeerCard;
