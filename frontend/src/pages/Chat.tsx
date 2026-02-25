import { FormEvent, useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ArrowLeft,
  Hash,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
  Users,
  Plus,
  Search,
  Smile,
  Paperclip,
  MoreHorizontal,
  Phone,
  Video,
  Info,
  Circle,
  ChevronDown,
  AtSign,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import {
  createChannel,
  createDirectMessageRoom,
  createRoomMessage,
  deleteRoomMessage,
  editRoomMessage,
  getChatWsUrl,
  getToken,
  listChatRooms,
  listRoomMessages,
  markRoomRead,
} from "@/lib/api";
import { ChatMessage, ChatRoom } from "@/types/jira";

type ChatWsEvent = {
  type: "chat_event";
  eventType: "message_created" | "message_updated" | "message_deleted" | "read_receipt" | "typing_start" | "typing_stop";
  payload: ChatMessage | { roomId: string; userId?: string };
};

const NONE = "__none__";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatDay = (value: string) => {
  const d = new Date(value);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
};

const formatLastMessageTime = (value: string) => {
  const d = new Date(value);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return formatTime(value);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const avatarColors = [
  "bg-avatar-1", "bg-avatar-2", "bg-avatar-3", "bg-avatar-4",
  "bg-avatar-5", "bg-avatar-6", "bg-avatar-7", "bg-avatar-8",
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

export default function Chat() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { users } = useProject();

  const [search, setSearch] = useState("");
  const [dmRooms, setDmRooms] = useState<ChatRoom[]>([]);
  const [channelRooms, setChannelRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [createDmOpen, setCreateDmOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string>(NONE);
  const [channelName, setChannelName] = useState("");
  const [channelMemberIds, setChannelMemberIds] = useState<string[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"chat" | "activity">("chat");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const allRooms = useMemo(() => [...dmRooms, ...channelRooms], [dmRooms, channelRooms]);
  const activeRoom = useMemo(() => allRooms.find((room) => room.id === activeRoomId) || null, [allRooms, activeRoomId]);

  const filteredDms = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return dmRooms;
    return dmRooms.filter((room) => {
      const other = room.participants.find((p) => p.userId !== currentUser?.id);
      return (other?.name || "").toLowerCase().includes(query);
    });
  }, [dmRooms, search, currentUser?.id]);

  const filteredChannels = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return channelRooms;
    return channelRooms.filter((room) => room.name.toLowerCase().includes(query));
  }, [channelRooms, search]);

  const activeRoomTitle = useMemo(() => {
    if (!activeRoom) return "";
    if (activeRoom.type === "channel") return activeRoom.name;
    const other = activeRoom.participants.find((p) => p.userId !== currentUser?.id);
    return other?.name || "Direct Message";
  }, [activeRoom, currentUser?.id]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadRooms = async () => {
    setLoadingRooms(true);
    try {
      const [dms, channels] = await Promise.all([
        listChatRooms({ type: "dm" }),
        listChatRooms({ type: "channel" }),
      ]);
      setDmRooms(dms);
      setChannelRooms(channels);
      const merged = [...dms, ...channels];
      if (!activeRoomId && merged.length > 0) setActiveRoomId(merged[0].id);
      else if (activeRoomId && !merged.some((room) => room.id === activeRoomId)) setActiveRoomId(merged[0]?.id || null);
    } finally {
      setLoadingRooms(false);
    }
  };

  const loadMessages = async (roomId: string) => {
    setLoadingMessages(true);
    try {
      const items = await listRoomMessages(roomId);
      setMessages(items);
      const last = items[items.length - 1];
      await markRoomRead(roomId, last?.id);
      await loadRooms();
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => { loadRooms(); }, []);
  useEffect(() => {
    if (!activeRoomId) { setMessages([]); return; }
    loadMessages(activeRoomId);
  }, [activeRoomId]);

  // WebSocket
  useEffect(() => {
    if (!activeRoomId) return;
    const token = getToken();
    if (!token) return;
    let stopped = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (stopped) return;
      const socket = new WebSocket(getChatWsUrl(token, activeRoomId));
      socketRef.current = socket;

      socket.onmessage = async (event) => {
        const parsed = JSON.parse(event.data) as ChatWsEvent;
        if (parsed.type !== "chat_event") return;

        if (parsed.eventType === "typing_start") {
          const p = parsed.payload as { userId?: string };
          if (p.userId && p.userId !== currentUser?.id) {
            setTypingUsers((prev) => new Set(prev).add(p.userId!));
          }
          return;
        }
        if (parsed.eventType === "typing_stop") {
          const p = parsed.payload as { userId?: string };
          if (p.userId) {
            setTypingUsers((prev) => { const n = new Set(prev); n.delete(p.userId!); return n; });
          }
          return;
        }
        if (parsed.eventType === "message_created") {
          const payload = parsed.payload as ChatMessage;
          setMessages((prev) => prev.some((msg) => msg.id === payload.id) ? prev.map((msg) => msg.id === payload.id ? payload : msg) : [...prev, payload]);
          if (payload.roomId === activeRoomId) await markRoomRead(activeRoomId, payload.id);
          await loadRooms();
          return;
        }
        if (parsed.eventType === "message_updated" || parsed.eventType === "message_deleted") {
          const payload = parsed.payload as ChatMessage;
          setMessages((prev) => prev.map((msg) => msg.id === payload.id ? payload : msg));
          await loadRooms();
          return;
        }
        if (parsed.eventType === "read_receipt") await loadRooms();
      };

      socket.onclose = () => {
        if (stopped) return;
        reconnectTimer = setTimeout(connect, 2000);
      };
    };

    connect();
    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socketRef.current?.close();
      socketRef.current = null;
      setTypingUsers(new Set());
    };
  }, [activeRoomId, currentUser?.id]);

  const sendTypingStart = useCallback(() => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socketRef.current.send(JSON.stringify({ type: "typing_start" }));
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "typing_stop" }));
      }
      isTypingRef.current = false;
    }, 3000);
  }, []);

  const onCreateDm = async () => {
    if (targetUserId === NONE) return;
    const room = await createDirectMessageRoom({ targetUserId });
    setCreateDmOpen(false);
    setTargetUserId(NONE);
    await loadRooms();
    setActiveRoomId(room.id);
  };

  const onCreateChannel = async () => {
    if (!channelName.trim()) return;
    const room = await createChannel({ name: channelName.trim(), memberIds: channelMemberIds });
    setCreateChannelOpen(false);
    setChannelName("");
    setChannelMemberIds([]);
    await loadRooms();
    setActiveRoomId(room.id);
  };

  const onSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeRoomId || !newMessage.trim()) return;
    // Stop typing indicator
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "typing_stop" }));
    }
    isTypingRef.current = false;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const created = await createRoomMessage(activeRoomId, newMessage.trim());
    setMessages((prev) => prev.some((msg) => msg.id === created.id) ? prev : [...prev, created]);
    setNewMessage("");
    await markRoomRead(activeRoomId, created.id);
    await loadRooms();
    textareaRef.current?.focus();
  };

  const onSaveEdit = async () => {
    if (!editingMessageId || !editingText.trim()) return;
    const updated = await editRoomMessage(editingMessageId, editingText.trim());
    setMessages((prev) => prev.map((msg) => msg.id === updated.id ? updated : msg));
    setEditingMessageId(null);
    setEditingText("");
    await loadRooms();
  };

  const onDeleteMessage = async (messageId: string) => {
    const updated = await deleteRoomMessage(messageId);
    setMessages((prev) => prev.map((msg) => msg.id === updated.id ? updated : msg));
    await loadRooms();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage(e as unknown as FormEvent);
    }
  };

  // Group consecutive messages from the same sender within 5 minutes
  const groupedMessages = useMemo(() => {
    return messages.map((msg, i) => {
      const prev = i > 0 ? messages[i - 1] : null;
      const showAvatar = !prev || prev.senderId !== msg.senderId || (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) > 300000;
      const showDay = !prev || formatDay(prev.createdAt) !== formatDay(msg.createdAt);
      return { ...msg, showAvatar, showDay };
    });
  }, [messages]);

  const typingNames = useMemo(() => {
    if (!activeRoom) return [];
    return Array.from(typingUsers).map((uid) => {
      const p = activeRoom.participants.find((pp) => pp.userId === uid);
      return p?.name?.split(" ")[0] || "Someone";
    });
  }, [typingUsers, activeRoom]);

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden flex">
      {/* Activity Rail */}
      <aside className="hidden md:flex w-[68px] bg-card border-r border-border flex-col items-center py-4 gap-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={sidebarTab === "chat" ? "secondary" : "ghost"}
              size="icon"
              className="h-10 w-10 rounded-lg"
              onClick={() => setSidebarTab("chat")}
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Chat</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={sidebarTab === "activity" ? "secondary" : "ghost"}
              size="icon"
              className="h-10 w-10 rounded-lg"
              onClick={() => setSidebarTab("activity")}
            >
              <Users className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">People</TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Back to app</TooltipContent>
        </Tooltip>

        <Avatar className="h-9 w-9 mt-2 cursor-pointer ring-2 ring-transparent hover:ring-primary/40 transition-all">
          <AvatarFallback className={`text-xs text-primary-foreground font-semibold ${getAvatarColor(currentUser?.name || "U")}`}>
            {currentUser?.initials || "U"}
          </AvatarFallback>
        </Avatar>
      </aside>

      {/* Conversations List */}
      <section className="hidden md:flex w-[320px] border-r border-border bg-card flex-col overflow-hidden shrink-0">
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between shrink-0 border-b border-border">
          <h1 className="text-base font-semibold">Chat</h1>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCreateDmOpen(true)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  New message
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreateChannelOpen(true)}>
                  <Hash className="h-4 w-4 mr-2" />
                  New channel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-8 pl-8 text-sm bg-muted/50 border-none focus-visible:ring-1"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Room List */}
        <ScrollArea className="flex-1">
          <div className="px-2 pb-2">
            {/* Channels */}
            {filteredChannels.length > 0 && (
              <div className="mb-1">
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Channels</span>
                </div>
                {filteredChannels.map((room) => (
                  <RoomItem
                    key={room.id}
                    room={room}
                    isActive={room.id === activeRoomId}
                    currentUserId={currentUser?.id}
                    onClick={() => setActiveRoomId(room.id)}
                  />
                ))}
              </div>
            )}

            {/* DMs */}
            {filteredDms.length > 0 && (
              <div className="mb-1">
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Direct Messages</span>
                </div>
                {filteredDms.map((room) => (
                  <RoomItem
                    key={room.id}
                    room={room}
                    isActive={room.id === activeRoomId}
                    currentUserId={currentUser?.id}
                    onClick={() => setActiveRoomId(room.id)}
                  />
                ))}
              </div>
            )}

            {!loadingRooms && filteredDms.length === 0 && filteredChannels.length === 0 && (
              <div className="px-4 py-12 text-center">
                <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Start a new message or create a channel</p>
              </div>
            )}

            {loadingRooms && (
              <div className="px-4 py-8 text-center">
                <div className="h-5 w-5 mx-auto border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground mt-2">Loading...</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </section>

      {/* Main Chat Area */}
      <section className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
        {/* Mobile header */}
        <div className="md:hidden border-b border-border p-3 space-y-2 bg-card">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-semibold">Chat</h1>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate("/")}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
          </div>
          <Select value={activeRoomId || NONE} onValueChange={(v) => setActiveRoomId(v === NONE ? null : v)}>
            <SelectTrigger><SelectValue placeholder="Select conversation" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Select conversation</SelectItem>
              {dmRooms.map((room) => {
                const other = room.participants.find((p) => p.userId !== currentUser?.id);
                return <SelectItem key={room.id} value={room.id}>{other?.name || "Direct Message"}</SelectItem>;
              })}
              {channelRooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>#{room.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chat header */}
        {activeRoom ? (
          <header className="h-14 border-b border-border px-4 flex items-center justify-between shrink-0 bg-card/50">
            <div className="flex items-center gap-3 min-w-0">
              {activeRoom.type === "channel" ? (
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Hash className="h-4.5 w-4.5 text-primary" />
                </div>
              ) : (
                <div className="relative">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className={`text-xs text-primary-foreground font-semibold ${getAvatarColor(activeRoomTitle)}`}>
                      {initials(activeRoomTitle)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-presence-online border-2 border-card" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-sm font-semibold truncate">
                  {activeRoom.type === "channel" ? `# ${activeRoomTitle}` : activeRoomTitle}
                </h2>
                <p className="text-[11px] text-muted-foreground truncate">
                  {activeRoom.participants.length} member{activeRoom.participants.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Video className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Video call</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Phone className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Audio call</TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showDetails ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Details</TooltipContent>
              </Tooltip>
            </div>
          </header>
        ) : (
          <header className="h-14 border-b border-border px-4 flex items-center bg-card/50 shrink-0">
            <p className="text-sm text-muted-foreground">Select a conversation</p>
          </header>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto jira-scrollbar">
          {!activeRoom && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center px-8">
                <div className="h-20 w-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare className="h-10 w-10 text-primary/60" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Welcome to Chat</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Select a conversation from the sidebar or start a new one to begin messaging.
                </p>
              </div>
            </div>
          )}

          {activeRoom && loadingMessages && (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {activeRoom && !loadingMessages && messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center px-8">
                <div className="h-16 w-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Send className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <h3 className="text-sm font-semibold mb-1">Start the conversation</h3>
                <p className="text-xs text-muted-foreground">Send the first message to get things going.</p>
              </div>
            </div>
          )}

          {activeRoom && !loadingMessages && messages.length > 0 && (
            <div className="px-4 md:px-6 py-4">
              {groupedMessages.map((message) => {
                const mine = message.senderId === currentUser?.id;
                const isEditing = editingMessageId === message.id;
                const isHovered = hoveredMessageId === message.id;

                return (
                  <div key={message.id}>
                    {message.showDay && (
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[11px] font-medium text-muted-foreground px-2">{formatDay(message.createdAt)}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}

                    <div
                      className={`group relative flex gap-3 py-0.5 -mx-2 px-2 rounded-md transition-colors ${isHovered ? "bg-muted/50" : "hover:bg-muted/30"}`}
                      onMouseEnter={() => setHoveredMessageId(message.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      {/* Avatar or spacer */}
                      <div className="w-9 shrink-0 pt-1">
                        {message.showAvatar && (
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className={`text-xs text-primary-foreground font-semibold ${getAvatarColor(message.senderName)}`}>
                              {initials(message.senderName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {message.showAvatar && (
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-foreground hover:underline cursor-pointer">
                              {message.senderName}
                            </span>
                            <span className="text-[11px] text-muted-foreground">{formatTime(message.createdAt)}</span>
                            {message.isEdited && (
                              <span className="text-[10px] text-muted-foreground italic">(edited)</span>
                            )}
                          </div>
                        )}

                        {!message.showAvatar && !isHovered && (
                          <div /> /* spacer */
                        )}
                        {!message.showAvatar && isHovered && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground w-9 text-center">
                            {formatTime(message.createdAt)}
                          </span>
                        )}

                        {isEditing ? (
                          <div className="space-y-2 max-w-xl">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="w-full text-sm bg-card border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                              rows={2}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSaveEdit(); }
                                if (e.key === "Escape") { setEditingMessageId(null); setEditingText(""); }
                              }}
                              autoFocus
                            />
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Enter to save, Esc to cancel</span>
                              <Button size="sm" className="h-6 text-xs px-2" onClick={onSaveEdit}>Save</Button>
                              <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => { setEditingMessageId(null); setEditingText(""); }}>Cancel</Button>
                            </div>
                          </div>
                        ) : message.isDeleted ? (
                          <p className="text-sm text-muted-foreground italic">This message has been deleted.</p>
                        ) : (
                          <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                        )}
                      </div>

                      {/* Hover action bar */}
                      {isHovered && !isEditing && !message.isDeleted && (
                        <div className="absolute -top-3 right-2 flex items-center bg-card border border-border rounded-md shadow-sm overflow-hidden">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="h-7 w-7 flex items-center justify-center hover:bg-muted transition-colors">
                                <Smile className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>React</TooltipContent>
                          </Tooltip>
                          {mine && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className="h-7 w-7 flex items-center justify-center hover:bg-muted transition-colors"
                                    onClick={() => { setEditingMessageId(message.id); setEditingText(message.content); }}
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className="h-7 w-7 flex items-center justify-center hover:bg-destructive/10 transition-colors"
                                    onClick={() => onDeleteMessage(message.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="h-7 w-7 flex items-center justify-center hover:bg-muted transition-colors">
                                <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>More</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Typing indicator */}
        {typingNames.length > 0 && (
          <div className="px-6 py-1.5 shrink-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span>
                {typingNames.length === 1
                  ? `${typingNames[0]} is typing...`
                  : `${typingNames.join(", ")} are typing...`}
              </span>
            </div>
          </div>
        )}

        {/* Compose area */}
        {activeRoom && (
          <div className="border-t border-border bg-card/50 px-4 py-3 shrink-0">
            <form onSubmit={onSendMessage}>
              <div className="border border-border rounded-lg bg-card focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    sendTypingStart();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${activeRoom.type === "channel" ? `#${activeRoomTitle}` : activeRoomTitle}`}
                  rows={1}
                  className="w-full text-sm bg-transparent px-3 pt-3 pb-1 resize-none focus:outline-none placeholder:text-muted-foreground min-h-[40px] max-h-[120px]"
                  style={{ height: "auto", overflow: newMessage.split("\n").length > 3 ? "auto" : "hidden" }}
                />
                <div className="flex items-center justify-between px-2 py-1.5">
                  <div className="flex items-center gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Attach file</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                          <Smile className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Emoji</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                          <AtSign className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Mention</TooltipContent>
                    </Tooltip>
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    className="h-8 w-8 rounded-md"
                    disabled={!newMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* Details Panel */}
      {showDetails && activeRoom && (
        <aside className="hidden lg:flex w-[300px] border-l border-border bg-card flex-col overflow-hidden shrink-0 animate-slide-in-right">
          <div className="h-14 border-b border-border px-4 flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold">Details</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDetails(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              {/* Room info */}
              <div className="text-center py-2">
                {activeRoom.type === "channel" ? (
                  <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                    <Hash className="h-8 w-8 text-primary" />
                  </div>
                ) : (
                  <Avatar className="h-16 w-16 mx-auto mb-3">
                    <AvatarFallback className={`text-lg text-primary-foreground font-semibold ${getAvatarColor(activeRoomTitle)}`}>
                      {initials(activeRoomTitle)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <h4 className="text-sm font-semibold">
                  {activeRoom.type === "channel" ? `# ${activeRoomTitle}` : activeRoomTitle}
                </h4>
                <Badge variant="secondary" className="mt-1.5 text-[11px]">
                  {activeRoom.type === "channel" ? "Channel" : "Direct Message"}
                </Badge>
              </div>

              <Separator />

              {/* Members */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Members ({activeRoom.participants.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {activeRoom.participants.map((member) => (
                    <div key={member.userId} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={`text-[10px] text-primary-foreground font-semibold ${getAvatarColor(member.name)}`}>
                            {initials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-presence-online border-2 border-card" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-[11px] text-muted-foreground capitalize">{member.role}</p>
                      </div>
                      {member.userId === currentUser?.id && (
                        <span className="text-[10px] text-muted-foreground">(you)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </aside>
      )}

      {/* Dialogs */}
      <Dialog open={createDmOpen} onOpenChange={setCreateDmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">To</Label>
              <Select value={targetUserId} onValueChange={setTargetUserId}>
                <SelectTrigger><SelectValue placeholder="Select a person" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE} disabled>Select a person</SelectItem>
                  {users.filter((u) => u.id !== currentUser?.id).map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDmOpen(false)}>Cancel</Button>
              <Button onClick={onCreateDm} disabled={targetUserId === NONE}>Start chat</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createChannelOpen} onOpenChange={setCreateChannelOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Channel name</Label>
              <Input value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="e.g. design-team" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Add members</Label>
              <div className="max-h-48 overflow-auto rounded-md border border-border p-1 space-y-0.5">
                {users.filter((u) => u.id !== currentUser?.id).map((user) => {
                  const selected = channelMemberIds.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      className={`w-full text-left text-sm px-2.5 py-1.5 rounded-md flex items-center gap-2 transition-colors ${selected ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}
                      onClick={() => setChannelMemberIds((prev) => selected ? prev.filter((id) => id !== user.id) : [...prev, user.id])}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className={`text-[9px] text-primary-foreground font-semibold ${getAvatarColor(user.name)}`}>
                          {initials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{user.name}</span>
                      {selected && <Circle className="h-3 w-3 fill-primary text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateChannelOpen(false)}>Cancel</Button>
              <Button onClick={onCreateChannel} disabled={!channelName.trim()}>Create channel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function RoomItem({
  room,
  isActive,
  currentUserId,
  onClick,
}: {
  room: ChatRoom;
  isActive: boolean;
  currentUserId?: string;
  onClick: () => void;
}) {
  const isChannel = room.type === "channel";
  const other = room.participants.find((p) => p.userId !== currentUserId);
  const title = isChannel ? room.name : other?.name || "Direct Message";
  const lastMsg = room.lastMessage;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-md px-2.5 py-2 flex items-center gap-2.5 transition-colors ${
        isActive
          ? "bg-primary/10 text-primary"
          : "hover:bg-muted/60 text-foreground"
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {isChannel ? (
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
            <Hash className="h-4 w-4 text-muted-foreground" />
          </div>
        ) : (
          <>
            <Avatar className="h-9 w-9">
              <AvatarFallback className={`text-xs text-primary-foreground font-semibold ${getAvatarColor(title)}`}>
                {initials(title)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-presence-online border-2 border-card" />
          </>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className={`text-sm truncate ${room.unreadCount > 0 ? "font-semibold" : "font-medium"}`}>
            {isChannel ? `# ${title}` : title}
          </span>
          {lastMsg && (
            <span className="text-[10px] text-muted-foreground shrink-0">{formatLastMessageTime(lastMsg.createdAt)}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className={`text-xs truncate ${room.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"}`}>
            {lastMsg?.content || "No messages yet"}
          </p>
          {room.unreadCount > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 text-[10px] rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center shrink-0 font-semibold">
              {room.unreadCount > 99 ? "99+" : room.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
