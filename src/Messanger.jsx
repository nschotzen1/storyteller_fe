import React, { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { motion } from "framer-motion";

// Fallback styled components
const Card = ({ children, className }) => (
  <div className={`rounded-2xl bg-black/30 backdrop-blur-lg shadow-2xl border border-white/10 ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children, className }) => (
  <div className={`p-4 overflow-y-auto flex flex-col gap-3 filmstrip ${className}`}>
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
  { id: 3, sender: "system", text: "Can you hear me?", delay: 2000 },
];

const MysteryMessenger = ({ start }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!start) return; // ✅ Don't start revealing messages until flipped

    let index = 0;

    const revealMessages = () => {
      const message = messagesSeed[index];
      if (!message) return;

      setIsTyping(true);

      setTimeout(() => {
        setMessages((prev) => [...prev, message]);
        setIsTyping(false);
        index++;

        const nextMessage = messagesSeed[index];
        if (nextMessage) {
          const delay = nextMessage.delay || 2000;
          setTimeout(revealMessages, delay);
        }
      }, 1500);
    };

    revealMessages();
  }, [start]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now(), sender: "player", text: input }]);
    setInput("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 font-mono text-white flex items-center justify-center relative px-4">
      <div className="absolute top-6 left-6 text-indigo-400 text-xl tracking-wide opacity-80">
        ✦ Storylink
      </div>

      <Card className="w-full max-w-md h-[550px] flex flex-col">
        <CardContent className="flex-1 overflow-y-auto">
          {messages.map((msg, idx) => (
            msg && (
              <motion.div
                key={msg.id + '-' + idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={`film-frame text-sm px-4 py-3 rounded-md border shadow ${
                  msg.sender === "system"
                    ? "bg-white/10 text-indigo-200 self-start border-white/10"
                    : "bg-indigo-500 text-white self-end ml-auto border-indigo-300"
                }`}
              >
                {msg.text}
              </motion.div>
            )
          ))}
          <div ref={scrollRef} />
          {isTyping && (
            <div className="flex gap-1 mt-2 ml-1 text-indigo-300 text-xs animate-pulse">
              <span>•</span><span>•</span><span>•</span>
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

      {/* Typing animation CSS */}
      <style>{`
        .filmstrip {
          background: repeating-linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.03),
            rgba(255, 255, 255, 0.03) 2px,
            transparent 2px,
            transparent 4px
          );
          border-left: 4px solid rgba(255,255,255,0.1);
          border-right: 4px solid rgba(255,255,255,0.1);
        }

        .film-frame {
          border-top: 1px dashed rgba(255,255,255,0.1);
          border-bottom: 1px dashed rgba(255,255,255,0.1);
        }
      `}</style>
    </div>
  );
};

export default MysteryMessenger;
