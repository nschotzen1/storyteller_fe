// Enhanced MysteryMessenger.jsx
// A retro-sci-fi messaging UI with layered melancholy, mystery, and narrative weight

import React, { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CurtainOutro from "./CurtainOutro";
import "./CurtainOutro.css";

const SERVER = 'http://localhost:5001';

const MessageBubble = ({ text, sender }) => {
  const avatar = sender === 'system' ? '/avatars/assistant.png' : '/avatars/user.png';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`flex items-start gap-2 ${
        sender === 'system' ? 'self-start' : 'self-end flex-row-reverse'
      }`}
    >
      <img
        src={avatar}
        alt={sender}
        className="w-8 h-8 rounded-full border border-yellow-700 shadow-md"
      />
      <div className="flex flex-col max-w-[80%]">
        {sender === 'system' && (
          <div className="mb-1 text-xs text-yellow-400 font-fell leading-snug tracking-wide">
            <div className="flex items-center gap-1 font-semibold">
              The Esteemed Storyteller’s Society
              <span className="ml-1 wax-seal text-red-700">🕯️</span>
            </div>
            <div className="text-[10px] italic text-yellow-600">
              Verified Pro Account
            </div>
          </div>
        )}
        <div
          className={`px-4 py-3 rounded-lg text-sm shadow-md whitespace-pre-wrap ${
            sender === "system"
              ? "bg-yellow-900/20 text-yellow-100 backdrop-blur-md border border-yellow-800"
              : "bg-yellow-100 text-black font-mono"
          }`}
        >
          {text}
        </div>
      </div>
    </motion.div>
  );
};

const startNewSession = () => {
  const newId = Math.random().toString(36).substring(2, 15);
  localStorage.setItem('sessionId', newId);
  window.location.reload();
};

const Input = ({ className, ...props }) => (
  <input
    {...props}
    className={`px-4 py-2 rounded-md bg-black/70 text-yellow-100 border border-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 w-full font-mono placeholder-yellow-600 ${className}`}
  />
);

const MysteryMessenger = ({ start = true, onCurtainDropComplete }) => {
  const [messages, setMessages] = useState([]);
  const [chatEnded, setChatEnded] = useState(false);
  const [showCurtainOutro, setShowCurtainOutro] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [sessionId] = useState(() => {
    const stored = localStorage.getItem('sessionId');
    if (stored) return stored;
    const newId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('sessionId', newId);
    return newId;
  });

  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const typewriterIntro = `We are pleased to inform you that the typewriter, as discussed, is ready for dispatch. The society spares no expense in ensuring that our esteemed members receive only the finest instruments for their craft. We trust you are still expecting it? Of course you are. Just a quick confirmation before we proceed. Where shall we send it?`;

  useEffect(() => {
    if (!start) return;

    let currentText = "";
    let index = 0;
    setIsTyping(true);

    const audio = new Audio("/audio/typewriter-narration.mp3");

    setTimeout(() => {
      audio.play().catch(err => console.warn("Voice playback failed:", err));
    }, 2000);

    const interval = setInterval(() => {
      currentText += typewriterIntro[index];
      index++;

      if (index >= typewriterIntro.length) {
        clearInterval(interval);
        setIsTyping(false);
      }

      setMessages([{ id: 0, sender: "system", text: currentText }]);
    }, 30);

    return () => {
      clearInterval(interval);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [start]);

  const sendMessageToAPI = async (text) => {
    try {
      const response = await fetch(`${SERVER}/api/sendMessage`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text })
      });

      const data = await response.json();
      return data;
    } catch (err) {
      console.error("API error:", err);
      return { reply: "There was an error responding.", has_chat_ended: false };
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isSending || chatEnded) return;

    const userMessage = {
      id: Date.now(),
      sender: "player",
      text: input
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    const { reply, has_chat_ended } = await sendMessageToAPI(userMessage.text);

    const assistantId = Date.now() + 1;
    let currentText = "";
    let index = 0;
    setIsTyping(true);

    const interval = setInterval(() => {
      currentText += reply[index];
      index++;

      if (index >= reply.length) {
        clearInterval(interval);
        setIsTyping(false);
      }

      setMessages((prev) => {
        const others = prev.filter((m) => m.id !== assistantId);
        return [...others, {
          id: assistantId,
          sender: "system",
          text: currentText
        }];
      });
    }, 30);

    if (has_chat_ended) {
      setTimeout(() => {
        setChatEnded(true);
        setTimeout(() => {
          setShowCurtainOutro(true);
        }, 3000);
      }, 3500);
    }

    setIsSending(false);
  };

  return (
    <motion.div
      className="relative min-h-screen w-full bg-black flex items-center justify-center overflow-hidden text-white font-mono"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 3.5, delay: 2 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#0c0c0c] via-[#1a1a1a] to-black opacity-95 z-0"></div>
      <div className="absolute inset-0 bg-[url('/textures/film_grain.png')] bg-cover bg-center opacity-5 z-0 pointer-events-none mix-blend-soft-light"></div>
      <div className="absolute inset-0 bg-grid-scanlines z-10 pointer-events-none"></div>

      <div className="relative w-[380px] md:w-[420px] h-[640px] rounded-[28px] border-[4px] border-yellow-800 shadow-[0_0_40px_rgba(255,255,255,0.08)] bg-gradient-to-br from-[#1c1c1c] via-[#292522] to-[#0e0d0b] ring-2 ring-yellow-900/40 overflow-hidden backdrop-blur-[3px]">
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-yellow-900 rounded-full opacity-40"></div>
        <div className="absolute top-3 left-3 flex items-center gap-1 text-yellow-800 text-[10px] font-mono opacity-60">
          <div className="w-3 h-2 border border-yellow-800 rounded-sm relative">
            <div className="w-[70%] h-full bg-yellow-700" />
            <div className="absolute -right-[2px] top-0 h-2 w-[2px] bg-yellow-700" />
          </div>
          68%
        </div>
        <div className="absolute top-3 right-3 text-[9px] font-mono text-yellow-800 opacity-50 tracking-wide flicker">
          LINK LOST
        </div>

        <div className="absolute inset-1 bg-black/70 rounded-[24px] flex flex-col overflow-hidden">
          <div className={`flex-1 p-5 overflow-y-auto flex flex-col gap-4 relative ${chatEnded ? 'fade-rain' : ''}`}>
            {messages.map((msg, i) => (
              <div key={msg.id} style={{ "--i": i }} className={chatEnded ? "smudge-message" : ""}>
                <MessageBubble text={msg.text} sender={msg.sender} />
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-1 ml-1">
                <div className="w-2 h-2 bg-yellow-200 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-yellow-200 rounded-full animate-bounce [animation-delay:200ms]" />
                <div className="w-2 h-2 bg-yellow-200 rounded-full animate-bounce [animation-delay:400ms]" />
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <div className="p-4 border-t border-yellow-800 bg-black/50 flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isSending ? "Awaiting response..." : "Type your message…"}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={isSending}
            />
            <Send
              size={24}
              className="text-yellow-300 cursor-pointer hover:text-yellow-100 active:scale-90 transition-transform duration-200"
              onClick={sendMessage}
            />
          </div>

          <button
            onClick={startNewSession}
            className="absolute top-4 right-4 z-30 text-xs bg-yellow-900 text-yellow-100 px-3 py-1 rounded hover:bg-yellow-700 transition font-mono"
          >
            New Session
          </button>

          <div className="absolute bottom-2 right-4 text-xs text-yellow-700 opacity-50 font-mono">
            session: {sessionId}
          </div>
        </div>
      </div>

      {showCurtainOutro && <CurtainOutro onDropComplete={onCurtainDropComplete} />}
    </motion.div>
  );
};

export default MysteryMessenger;
