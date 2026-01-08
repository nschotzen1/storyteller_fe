/**
 * Mock API for Well Fragments
 */
export const fetchFragmentPayload = async () => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 500));

  const id = `frag_${Math.floor(1000 + Math.random() * 9000)}`;

  // Underwater-ish text colors
  const colors = [
    'rgba(240, 220, 170, 0.95)',  // Warm paper
    'rgba(255, 250, 220, 0.95)',  // Light paper
    'rgba(220, 240, 255, 0.9)',   // Cool white
    'rgba(200, 230, 255, 0.9)'    // Bluish
  ];

  const phrases = [
    "It was almost night as",
    "The whispers returned",
    "Beneath the silent waves",
    "A memory forgotten",
    "Time flows like water",
    "Echoes of the past",
    "Drifting into void",
    "Secrets kept forever",
    "In the deep, we wait",
    "Fragments of a dream"
  ];

  return {
    id,
    text: phrases[Math.floor(Math.random() * phrases.length)],
    font: "serif",
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 26 + Math.floor(Math.random() * 16), // 26px to 42px (Much Bigger)
    seconds_surfacing: 6 + Math.floor(Math.random() * 5) // 6 to 11 seconds
  };
};
