import React, { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { motion } from "framer-motion";

const MessageBubble = ({ text, sender }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={`max-w-[80%] px-4 py-3 rounded-md text-sm font-mono shadow-lg ${
      sender === "system"
        ? "bg-white/10 text-yellow-100 self-start"
        : "bg-yellow-100 text-black self-end"
    }`}
  >
    {text}
  </motion.div>
);

const Input = ({ className, ...props }) => (
  <input
    {...props}
    className={`px-4 py-2 rounded-md bg-black/60 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-400 w-full font-mono ${className}`}
  />
);

const messagesSeed = [
  { id: 1, sender: "system", text: "Are you there?", delay: 1000 },
  { id: 2, sender: "system", text: "I wasn’t sure this channel still worked.", delay: 3000 },
  { id: 3, sender: "system", text: "Can you hear me?", delay: 2000 },
];

const MysteryMessenger = ({ start = true }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!start) return;
    let index = 0;
    const revealMessages = () => {
      const message = messagesSeed[index];
      if (!message) return;

      setIsTyping(true);
      setTimeout(() => {
        setMessages((prev) => [...prev, message]);
        setIsTyping(false);
        index++;
        if (messagesSeed[index]) {
          setTimeout(revealMessages, messagesSeed[index].delay || 2000);
        }
      }, 1400);
    };
    revealMessages();
  }, [start]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now(), sender: "player", text: input }]);
    setInput("");
  };

  return (
    <motion.div
      className="relative min-h-screen w-full bg-black text-white font-mono flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 3.5, delay: 2 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a120a] via-[#30231c] to-black opacity-95 z-0"></div>
      <div className="absolute inset-0 bg-[url('/textures/film_grain.png')] bg-cover bg-center opacity-10 z-0 pointer-events-none mix-blend-soft-light"></div>
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/80 z-10 pointer-events-none"></div>

      <div className="z-20 w-full max-w-md h-[600px] border border-yellow-900 rounded-xl bg-black/20 backdrop-blur-md flex flex-col overflow-hidden shadow-2xl">
        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 relative">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} text={msg.text} sender={msg.sender} />
          ))}
          {isTyping && <div className="text-yellow-200 animate-pulse ml-1">▍</div>}
          <div ref={scrollRef} />
        </div>
        <div className="p-4 border-t border-yellow-900 bg-black/30 flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message…"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <Send
            size={20}
            className="text-yellow-300 cursor-pointer hover:text-white transition"
            onClick={sendMessage}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default MysteryMessenger;
