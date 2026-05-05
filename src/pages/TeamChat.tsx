import { useState, useRef, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Send, Users, Hash, Search, Settings, MoreVertical, Phone, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: "online" | "away" | "offline";
  avatar?: string;
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: string;
}

interface Chat {
  id: string;
  name: string;
  type: "general" | "custom";
  members: string[];
  lastMessage?: string;
  unread: number;
}

const teamMembers: TeamMember[] = [
  { id: "1", name: "John Manager", role: "Manager", status: "online" },
  { id: "2", name: "Sarah Host", role: "Host", status: "online" },
  { id: "3", name: "Marcus Promoter", role: "Promoter", status: "away" },
  { id: "4", name: "Mike Security", role: "Security", status: "online" },
  { id: "5", name: "Emily Marketing", role: "Marketing", status: "offline" },
  { id: "6", name: "David Host", role: "Host", status: "online" },
];

const initialChats: Chat[] = [
  { id: "general", name: "General Team Chat", type: "general", members: teamMembers.map(m => m.id), lastMessage: "Mike: Security briefing at 9pm tonight", unread: 3 },
  { id: "managers", name: "Managers Only", type: "custom", members: ["1", "5"], lastMessage: "Emily: Revenue report is ready", unread: 1 },
  { id: "hosts", name: "Host Team", type: "custom", members: ["1", "2", "6"], lastMessage: "Sarah: Table 5 is reserved for VIP", unread: 0 },
];

const initialMessages: Message[] = [
  { id: "1", chatId: "general", senderId: "4", content: "Security briefing at 9pm tonight", timestamp: "2024-01-15T20:30:00" },
  { id: "2", chatId: "general", senderId: "1", content: "Great, I'll be there. Make sure all team members attend.", timestamp: "2024-01-15T20:32:00" },
  { id: "3", chatId: "general", senderId: "2", content: "VIP guest arriving at 10pm, heads up everyone!", timestamp: "2024-01-15T20:45:00" },
  { id: "4", chatId: "general", senderId: "3", content: "Got 30 guests coming from my list tonight 🎉", timestamp: "2024-01-15T21:00:00" },
];

const TeamChat = () => {
  const [chats, setChats] = useState(initialChats);
  const [messages, setMessages] = useState(initialMessages);
  const [selectedChat, setSelectedChat] = useState<Chat>(chats[0]);
  const [newMessage, setNewMessage] = useState("");
  const [isCreateChatOpen, setIsCreateChatOpen] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedChat]);

  const chatMessages = messages.filter(m => m.chatId === selectedChat.id);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      chatId: selectedChat.id,
      senderId: "1", // Current user (John Manager)
      content: newMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages([...messages, message]);
    setNewMessage("");
  };

  const handleCreateChat = () => {
    if (!newChatName || selectedMembers.length === 0) return;

    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      name: newChatName,
      type: "custom",
      members: ["1", ...selectedMembers], // Include current user
      unread: 0,
    };

    setChats([...chats, newChat]);
    setIsCreateChatOpen(false);
    setNewChatName("");
    setSelectedMembers([]);
    setSelectedChat(newChat);
  };

  const getMember = (id: string) => teamMembers.find(m => m.id === id);

  const filteredChats = chats.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Team Chat" subtitle="Communicate with your team">
      <div className="h-[calc(100vh-180px)] glass-card overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-80 border-r border-border flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Chats</h3>
                <Dialog open={isCreateChatOpen} onOpenChange={setIsCreateChatOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Plus className="w-4 h-4" />
                      New
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Chat</DialogTitle>
                      <DialogDescription>Create a custom chat with selected team members.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Chat Name</Label>
                        <Input 
                          placeholder="e.g., Weekend Team"
                          value={newChatName}
                          onChange={(e) => setNewChatName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Select Members</Label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {teamMembers.filter(m => m.id !== "1").map(member => (
                            <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                              <Checkbox 
                                checked={selectedMembers.includes(member.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedMembers([...selectedMembers, member.id]);
                                  } else {
                                    setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                                  }
                                }}
                              />
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {member.name.split(" ").map(n => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.role}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateChatOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreateChat}>Create Chat</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search chats..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Chat List */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredChats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={cn(
                      "w-full p-3 rounded-lg text-left transition-colors",
                      selectedChat.id === chat.id ? "bg-primary/10" : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        chat.type === "general" ? "bg-teal/20" : "bg-primary/20"
                      )}>
                        {chat.type === "general" ? (
                          <Users className="w-5 h-5 text-teal" />
                        ) : (
                          <Hash className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{chat.name}</p>
                          {chat.unread > 0 && (
                            <Badge className="bg-primary text-primary-foreground h-5 w-5 p-0 flex items-center justify-center">
                              {chat.unread}
                            </Badge>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <p className="text-xs text-muted-foreground truncate">{chat.lastMessage}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>

            {/* Online Members */}
            <div className="p-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Online Now</p>
              <div className="flex -space-x-2">
                {teamMembers.filter(m => m.status === "online").slice(0, 5).map(member => (
                  <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="text-xs">
                      {member.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {teamMembers.filter(m => m.status === "online").length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                    +{teamMembers.filter(m => m.status === "online").length - 5}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="h-16 px-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  selectedChat.type === "general" ? "bg-teal/20" : "bg-primary/20"
                )}>
                  {selectedChat.type === "general" ? (
                    <Users className="w-5 h-5 text-teal" />
                  ) : (
                    <Hash className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{selectedChat.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedChat.members.length} members</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost">
                  <Video className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {chatMessages.map((message, index) => {
                  const sender = getMember(message.senderId);
                  const isCurrentUser = message.senderId === "1";
                  
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn("flex gap-3", isCurrentUser && "flex-row-reverse")}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {sender?.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn("max-w-[70%]", isCurrentUser && "text-right")}>
                        <div className="flex items-center gap-2 mb-1">
                          {!isCurrentUser && <span className="text-sm font-medium">{sender?.name}</span>}
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className={cn(
                          "p-3 rounded-lg",
                          isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input 
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} className="gap-2">
                  <Send className="w-4 h-4" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default TeamChat;
