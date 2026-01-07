import './index.css';
import './FlipCard.css';
import './CurtainIntro.css';

import { motion, AnimatePresence } from 'framer-motion';

import React, { useState, useEffect } from 'react';
import MysteryMessenger from './Messanger';
import CurtainIntro from './CurtainIntro';
import NarrativeScene from './NarrativeScene';
import TypewriterFramework from './TypewriterFramework';
import SeerPage from './pages/SeerPage';
import WellDemoPage from './pages/WellDemoPage';


// AUTOMATICALLY SWITCHED TO DEMO PAGE
function App() {
  return (
    <WellDemoPage />
  );
}

// ORIGINAL APP
// function App() {
//   const [curtainLifted, setCurtainLifted] = useState(false);
//   const [flipped, setFlipped] = useState(false);
//   const [curtainShouldExpand, setCurtainShouldExpand] = useState(false);
//   const [showTimecard, setShowTimecard] = useState(false);
//   const [showCircleFade, setShowCircleFade] = useState(false);
//   const [locationLineVisible, setLocationLineVisible] = useState(false);
//   const [shouldFadeText, setShouldFadeText] = useState(false);
//   const [hasFadedOut, setHasFadedOut] = useState(false);
// 
// 
// 
//   // ✨ Trigger second line after timecard shows
//   useEffect(() => {
//     if (showTimecard) {
//       const timeout = setTimeout(() => setLocationLineVisible(true), 1500);
//       return () => clearTimeout(timeout);
//     }
//   }, [showTimecard]);
// 
//   useEffect(() => {
//     if (showCircleFade) {
//       const timeout = setTimeout(() => {
//         setShowTimecard(false);
//         setLocationLineVisible(false);
//       }, 11000); // 2.5 seconds after the iris begins (or longer if needed)
//   
//       return () => clearTimeout(timeout);
//     }
//   }, [showCircleFade]);
//   
// 
//   
// 
//   return (
//     <div className="w-full h-full bg-black flex items-center justify-center">
//       <div
//         className={`relative h-[720px] bg-black isolate overflow-hidden transition-all duration-[3000ms] ease-in-out ${
//           curtainShouldExpand ? 'w-full max-w-screen-xl' : 'w-[360px]'
//         }`}
//       >
//         {/* ✨ Flip card is always mounted */}
//         <div className="flip-card w-full h-full z-10">
//           <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
//             {/* Front side of the card */}
//             <div className="flip-card-front" onClick={() => setFlipped(true)}>
//               <img
//                 src="/tapestries/intro.png"
//                 alt="Initial Card"
//                 className="w-full h-full object-contain rounded-xl shadow-xl"
//               />
//             </div>
// 
//             {/* Back side of the card (chat) */}
//             <div className="flip-card-back">
//               <MysteryMessenger
//                 start={flipped}
//                 onCurtainDropComplete={() => {
//                   setCurtainShouldExpand(true);
//                 
//                   setTimeout(() => setShowTimecard(true), 4000); // Line 1
//                   setTimeout(() => setLocationLineVisible(true), 5500); // Line 2
//                 
//                   setTimeout(() => setShowCircleFade(true), 8500); // Iris
//                   setTimeout(() => setShouldFadeText(true), 11500); // Start fade
//                   setTimeout(() => {
//                     setHasFadedOut(true); // Final unmount
//                     setShowTimecard(false);
//                     setLocationLineVisible(false);
//                     setShouldFadeText(false);
//                   }, 14000);
//                 
//                 }}
//               />
// 
//             
//               {showCircleFade && (
//                 <div className="iris-mask pointer-events-none absolute inset-0 z-50">
//                   <div className="iris-circle" />
//                 </div>
//               )}
// 
//             </div>
//           </div>
//         </div>
// 
//           <AnimatePresence>
//     {hasFadedOut && (
//       <motion.div
//         className="absolute inset-0 z-[100] bg-black letterbox vignette"
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         transition={{ duration: 2 }}
//       >
//         <NarrativeScene visible={hasFadedOut} />
//       </motion.div>
//     )}
//   </AnimatePresence>
// 
//   {/* Curtain overlays the card only until it's lifted */}
//   {!curtainLifted && <CurtainIntro onReveal={() => setCurtainLifted(true)} />}
// 
//         <AnimatePresence>
//         {showTimecard && !hasFadedOut && (
//   <motion.div
//     initial={{ opacity: 1 }}
//     animate={{ opacity: shouldFadeText ? 0 : 1 }}
//     transition={{ duration: 2 }}
//     className="absolute inset-0 z-[70] flex flex-col items-center justify-center text-white text-center pointer-events-none space-y-4"
//   >
//     <h1 className="text-4xl md:text-6xl font-[Cinzel] tracking-wide drop-shadow-lg">
//       A few days later…
//     </h1>
//     {locationLineVisible && (
//       <p className="text-xl md:text-2xl font-mono text-yellow-100/90">
//         in the outskirts of the sun-streaked streets of San Juan
//       </p>
//     )}
//   </motion.div>
// )}
//       </AnimatePresence>
//       
// 
//         
//       </div>
//     </div>
//   );
// }



// function App() {
//   return (
//     <div className="w-screen h-screen bg-black text-white overflow-hidden">
//       <TypewriterFramework /> 
//       {/* <SeerPage /> */}
//     </div>
//   );
// }



export default App;
