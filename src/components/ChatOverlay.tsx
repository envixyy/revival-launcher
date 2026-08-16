import { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';

interface Message {
  id: string;
  sender: 'me' | 'friend';
  text: string;
  timestamp: Date;
}

interface ChatOverlayProps {
  friendName: string;
  onClose: () => void;
}

// Simulated responses depending on the friend
const FRIEND_REPLIES: Record<string, string[]> = {
  Geometrically: [
    "Yo! Just got into Origin Realms. The biomes are crazy!",
    "Wait, are you launching the instance now? Let's join the same server.",
    "Give me 5 mins, fighting a dungeon boss.",
    "I'm using the Fabric loader with Sodium, fps is smooth.",
    "Awesome launcher design btw! Looks super clean."
  ],
  triphora: [
    "Hey! Minecraft is loading right now, loading shaders takes a bit.",
    "Let me know if you want to test my new custom modpack.",
    "I'm testing neocraft. Are you online?",
    "Just downloaded a custom pack from CurseForge. Runs perfect on Revival.",
    "Add me on Discord if you want to join voice call!"
  ],
  coolbot100s: [
    "Hey dude! Playing some survival on 1.21.1 vanilla.",
    "Just created a copy of my main creative instance.",
    "I love the yellow glow style of the launcher!",
    "Can you send me your exported modpack zip?",
    "Offline mode works perfectly, testing local multiplayer now."
  ],
  Minenash: [
    "I'm offline right now, playing some singleplayer modded.",
    "Making some textures for my next resource pack.",
    "Let's play later, just finishing dinner.",
    "Revival's new library grid view is so much better than lists."
  ]
};

export function ChatOverlay({ friendName, onClose }: ChatOverlayProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initialize chat history with a greeting
  useEffect(() => {
    const greeting = FRIEND_REPLIES[friendName]?.[0] ?? "Hey there! What's up?";
    setMessages([
      {
        id: 'init',
        sender: 'friend',
        text: greeting,
        timestamp: new Date()
      }
    ]);
  }, [friendName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'me',
      text: inputText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Trigger simulated typing and reply
    setIsTyping(true);
    const replyDelay = 1000 + Math.random() * 1500;

    setTimeout(() => {
      const replies = FRIEND_REPLIES[friendName] || ["Nice!", "Cool!", "Yeah!", "I see."];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      
      const friendMsg: Message = {
        id: `friend-${Date.now()}`,
        sender: 'friend',
        text: randomReply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, friendMsg]);
      setIsTyping(false);
    }, replyDelay);
  };

  return (
    <div className="fixed bottom-4 right-80 w-80 h-96 bg-[#16171d] border border-[#facc15]/30 rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-[#0e0f13] border-b border-[#2c2e38] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#facc15] animate-pulse" />
          <div>
            <h4 className="font-extrabold text-xs text-white leading-none">{friendName}</h4>
            <p className="text-[9px] text-gray-500 mt-1">Direct Messages</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3 bg-[#111216]/50">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[80%] ${msg.sender === 'me' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
          >
            <div className={`p-2.5 rounded-2xl text-[11px] font-semibold leading-relaxed shadow-sm ${
              msg.sender === 'me'
                ? 'bg-[#facc15] text-black rounded-tr-none font-bold'
                : 'bg-[#1c1d22] border border-[#2c2e38] text-gray-200 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
            <span className="text-[8px] text-gray-600 mt-1 px-1">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {isTyping && (
          <div className="flex flex-col mr-auto items-start max-w-[80%]">
            <div className="bg-[#1c1d22] border border-[#2c2e38] p-2.5 rounded-2xl rounded-tl-none flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-[#0e0f13] border-t border-[#2c2e38] flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder={`Message ${friendName}...`}
          className="flex-1 bg-[#1c1d22] border border-[#2c2e38] rounded-xl px-3 py-2 text-[11px] text-white outline-none focus:border-[#facc15]/50 transition-all"
        />
        <button
          type="submit"
          className="p-2 bg-[#facc15] text-black rounded-xl hover:bg-yellow-300 transition-all flex-shrink-0"
        >
          <Send size={12} />
        </button>
      </form>
    </div>
  );
}
