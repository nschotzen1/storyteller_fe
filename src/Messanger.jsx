import React, { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { motion } from "framer-motion";
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
      <img src={avatar} alt={sender} className="w-8 h-8 rounded-full border border-yellow-700 shadow-sm" />
      <div className="flex flex-col max-w-[80%]">
        {sender === 'system' && (
          <div className="mb-1 text-xs text-yellow-400 font-fell leading-snug tracking-wide group relative">
            <div className="flex items-center gap-1 font-semibold">
              The Esteemed Storyteller’s Society
              <span className="ml-1 wax-seal text-red-700 transition-transform duration-500 ease-in-out group-hover:rotate-[15deg] group-hover:scale-110 drop-shadow">🕯️</span>
            </div>
            <div className="text-[10px] italic text-yellow-600">
              Verified Business Account – Pro User
            </div>
          </div>
        )}
        <div
          className={`px-4 py-3 rounded-md text-sm shadow-lg ${
            sender === "system"
              ? "bg-white/10 text-yellow-100 font-fell"
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
    className={`px-4 py-2 rounded-md bg-black/60 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-400 w-full font-mono ${className}`}
  />
);

const MysteryMessenger = ({ start = true }) => {
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

    const interval = setInterval(() => {
      currentText += typewriterIntro[index];
      index++;

      if (index >= typewriterIntro.length) {
        clearInterval(interval);
        setIsTyping(false);
      }

      setMessages([{ id: 0, sender: "system", text: currentText }]);
    }, 30);

    return () => clearInterval(interval);
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
      }, 3500); // Delay before fading, then curtain drop
    }

    setIsSending(false);
  };

  return (
    <motion.div
      className="relative min-h-screen w-full bg-black text-white font-mono flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 3.5, delay: 2 }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a120a] via-[#30231c] to-black opacity-95 z-0"></div>
      <div className="absolute inset-0 bg-[url('/textures/film_grain.png')] bg-cover bg-center opacity-10 z-0 pointer-events-none mix-blend-soft-light"></div>
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/80 z-10 pointer-events-none"></div>

      {/* Chat window */}
      <div className="z-20 w-full max-w-md h-[600px] border border-yellow-900 rounded-xl bg-black/20 backdrop-blur-md flex flex-col overflow-hidden shadow-2xl">
        <div className={`flex-1 p-6 overflow-y-auto flex flex-col gap-4 relative transition-all duration-1000 ease-in-out ${chatEnded ? 'fade-rain' : ''}`}>
        {messages.map((msg, i) => (
        <div key={msg.id} style={{ "--i": i }} className={chatEnded ? "smudge-message" : ""}>
          <MessageBubble text={msg.text} sender={msg.sender} />
        </div>
        ))}

          {isTyping && (
            <div className="flex gap-1 ml-1">
              <div className="w-2 h-2 bg-yellow-200 rounded-full animate-bounce [animation-delay:0ms]" />
              <div className="w-2 h-2 bg-yellow-200 rounded-full animate-bounce [animation-delay:200ms]" />
              <div className="w-2 h-2 bg-yellow-200 rounded-full animate-bounce [animation-delay:400ms]" />
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        <div className="p-4 border-t border-yellow-900 bg-black/30 flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isSending ? "Awaiting response..." : "Type your message…"}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={isSending}
          />
          <Send size={20} className="text-yellow-300 cursor-pointer hover:text-white transition" onClick={sendMessage} />
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

      {showCurtainOutro && <CurtainOutro />}
    </motion.div>
  );
};

export default MysteryMessenger;
