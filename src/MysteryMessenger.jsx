import React, { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { motion } from "framer-motion";

const Card = ({ children, className }) => (
  <div className={`rounded-2xl bg-black/30 backdrop-blur-lg shadow-2xl border border-white/10 ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children, className }) => (
  <div className={`p-4 overflow-y-auto flex flex-col gap-2 ${className}`}>
    {children}
  </div>
);

const Input = ({ className, ...props }) => (
  <input
    {...props}
    className={`px-4 py-2 rounded-md bg-black/60 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full ${className}`}
  />
);

const messagesSeed = [
  { id: 1, sender: "system", text: "Are you there?", delay: 1000 },
  { id: 2, sender: "system", text: "I wasn’t sure this channel still worked.", delay: 3000 },
];

const MysteryMessenger = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    let index = 0;
    const revealMessages = () => {
      if (index < messagesSeed.length) {
        setIsTyping(true);
        setTimeout(() => {
          setMessages((prev) => [...prev, messagesSeed[index]]);
          setIsTyping(false);
          index++;
          setTimeout(revealMessages, messagesSeed[index]?.delay || 2000);
        }, 1500);
      }
    };
    revealMessages();
  }, []);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now(), sender: "player", text: input }]);
    setInput("");
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-black via-gray-900 to-gray-800 font-mono text-white flex items-center justify-center relative px-4">
      <div className="absolute top-6 left-6 text-indigo-400 text-xl tracking-wide opacity-80">
        ✦ Storylink
      </div>
      <Card className="w-full max-w-md h-[550px] flex flex-col">
        <CardContent className="flex-1">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`text-sm px-4 py-2 rounded-xl shadow ${msg.sender === "system" ? "bg-white/10 text-indigo-200 self-start" : "bg-indigo-500 text-white self-end ml-auto"}`}
            >
              {msg.text}
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex gap-1 mt-2 ml-1 text-indigo-300 text-xs">
              <span className="typing-dot animate-bounce delay-[0ms]">•</span>
              <span className="typing-dot animate-bounce delay-[150ms]">•</span>
              <span className="typing-dot animate-bounce delay-[300ms]">•</span>
            </div>
          )}
        </CardContent>
        <div className="flex items-center border-t border-white/10 p-3 gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message…"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <Send
            size={20}
            className="text-indigo-400 cursor-pointer hover:text-white transition"
            onClick={sendMessage}
          />
        </div>
      </Card>
      <style>{`
        .typing-dot {
          animation: bounce 1.2s infinite ease-in-out;
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default MysteryMessenger;
