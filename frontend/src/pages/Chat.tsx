import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Hash, MessageSquare, Pencil, Send, Trash2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  eventType: "message_created" | "message_updated" | "message_deleted" | "read_receipt";
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

const formatDay = (value: string) =>
  new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });

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
    if (!activeRoom) return "Select a conversation";
    if (activeRoom.type === "channel") return `#${activeRoom.name}`;
    const other = activeRoom.participants.find((p) => p.userId !== currentUser?.id);
    return other?.name || "Direct Message";
  }, [activeRoom, currentUser?.id]);

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
      if (!activeRoomId && merged.length > 0) {
        setActiveRoomId(merged[0].id);
      } else if (activeRoomId && !merged.some((room) => room.id === activeRoomId)) {
        setActiveRoomId(merged[0]?.id || null);
      }
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

  useEffect(() => {
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      return;
    }
    loadMessages(activeRoomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId]);

  useEffect(() => {
    if (!activeRoomId) return;
    const token = getToken();
    if (!token) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(getChatWsUrl(token, activeRoomId));
      socket.onmessage = async (event) => {
        const parsed = JSON.parse(event.data) as ChatWsEvent;
        if (parsed.type !== "chat_event") return;

        if (parsed.eventType === "message_created") {
          const payload = parsed.payload as ChatMessage;
          setMessages((prev) => {
            const exists = prev.some((msg) => msg.id === payload.id);
            return exists ? prev.map((msg) => (msg.id === payload.id ? payload : msg)) : [...prev, payload];
          });
          if (payload.roomId === activeRoomId) await markRoomRead(activeRoomId, payload.id);
          await loadRooms();
          return;
        }

        if (parsed.eventType === "message_updated" || parsed.eventType === "message_deleted") {
          const payload = parsed.payload as ChatMessage;
          setMessages((prev) => prev.map((msg) => (msg.id === payload.id ? payload : msg)));
          await loadRooms();
          return;
        }

        if (parsed.eventType === "read_receipt") {
          await loadRooms();
        }
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
      if (socket) socket.close();
    };
  }, [activeRoomId]);

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
    const room = await createChannel({
      name: channelName.trim(),
      memberIds: channelMemberIds,
    });
    setCreateChannelOpen(false);
    setChannelName("");
    setChannelMemberIds([]);
    await loadRooms();
    setActiveRoomId(room.id);
  };

  const onSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeRoomId || !newMessage.trim()) return;
    const created = await createRoomMessage(activeRoomId, newMessage.trim());
    setMessages((prev) => (prev.some((msg) => msg.id === created.id) ? prev : [...prev, created]));
    setNewMessage("");
    await markRoomRead(activeRoomId, created.id);
    await loadRooms();
  };

  const onSaveEdit = async () => {
    if (!editingMessageId || !editingText.trim()) return;
    const updated = await editRoomMessage(editingMessageId, editingText.trim());
    setMessages((prev) => prev.map((msg) => (msg.id === updated.id ? updated : msg)));
    setEditingMessageId(null);
    setEditingText("");
    await loadRooms();
  };

  const onDeleteMessage = async (messageId: string) => {
    const updated = await deleteRoomMessage(messageId);
    setMessages((prev) => prev.map((msg) => (msg.id === updated.id ? updated : msg)));
    await loadRooms();
  };

  return (
    <div className="h-screen bg-muted/30 text-foreground overflow-hidden">
      <div className="h-full grid grid-cols-1 md:grid-cols-[64px_300px_1fr] xl:grid-cols-[64px_310px_1fr_280px]">
        <aside className="hidden md:flex border-r bg-card/70 backdrop-blur-sm flex-col items-center py-3 gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {currentUser?.initials || "U"}
            </AvatarFallback>
          </Avatar>
          <Button variant="secondary" size="icon" className="h-10 w-10">
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </aside>

        <section className="hidden md:flex border-r bg-card flex-col overflow-hidden">
          <div className="p-3 border-b space-y-2">
            <h1 className="text-sm font-semibold">Chat</h1>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people and channels" className="h-8" />
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" className="h-8 text-xs" onClick={() => setCreateDmOpen(true)}>New DM</Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setCreateChannelOpen(true)}>Channel</Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto jira-scrollbar p-2 space-y-3">
            <div>
              <p className="px-2 text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Direct Messages</p>
              <div className="space-y-1">
                {filteredDms.map((room) => {
                  const other = room.participants.find((p) => p.userId !== currentUser?.id);
                  const title = other?.name || "Direct Message";
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setActiveRoomId(room.id)}
                      className={`w-full text-left rounded-md px-2.5 py-2 transition-colors ${
                        room.id === activeRoomId ? "bg-accent" : "hover:bg-accent/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{title}</span>
                        {room.unreadCount > 0 && (
                          <span className="min-w-5 h-5 px-1 text-[11px] rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center">
                            {room.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{room.lastMessage?.content || "No messages yet"}</p>
                    </button>
                  );
                })}
                {!loadingRooms && filteredDms.length === 0 && <p className="px-2 text-xs text-muted-foreground">No direct chats.</p>}
              </div>
            </div>

            <Separator />

            <div>
              <p className="px-2 text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Channels</p>
              <div className="space-y-1">
                {filteredChannels.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setActiveRoomId(room.id)}
                    className={`w-full text-left rounded-md px-2.5 py-2 transition-colors ${
                      room.id === activeRoomId ? "bg-accent" : "hover:bg-accent/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">{room.name}</span>
                      </div>
                      {room.unreadCount > 0 && (
                        <span className="min-w-5 h-5 px-1 text-[11px] rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center">
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{room.lastMessage?.content || "No messages yet"}</p>
                  </button>
                ))}
                {!loadingRooms && filteredChannels.length === 0 && <p className="px-2 text-xs text-muted-foreground">No channels yet.</p>}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-background flex flex-col overflow-hidden">
          <div className="md:hidden border-b p-3 space-y-2 bg-card">
            <div className="flex items-center justify-between">
              <h1 className="text-sm font-semibold">Chat</h1>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate("/")}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back
              </Button>
            </div>
            <Select value={activeRoomId || NONE} onValueChange={(value) => setActiveRoomId(value === NONE ? null : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select conversation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Select conversation</SelectItem>
                {dmRooms.map((room) => {
                  const other = room.participants.find((p) => p.userId !== currentUser?.id);
                  return (
                    <SelectItem key={room.id} value={room.id}>
                      {other?.name || "Direct Message"}
                    </SelectItem>
                  );
                })}
                {channelRooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    #{room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" className="h-8 text-xs" onClick={() => setCreateDmOpen(true)}>New DM</Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setCreateChannelOpen(true)}>Channel</Button>
            </div>
          </div>

          <header className="h-14 border-b px-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{activeRoomTitle}</h2>
              <p className="text-xs text-muted-foreground">{activeRoom ? `${activeRoom.participants.length} participants` : "Select a room"}</p>
            </div>
            {activeRoom && (
              <Badge variant="outline">
                {activeRoom.type === "channel" ? "Channel" : "DM"}
              </Badge>
            )}
          </header>

          <div className="flex-1 overflow-y-auto jira-scrollbar px-6 py-4 space-y-4 bg-muted/20">
            {loadingMessages && <p className="text-sm text-muted-foreground">Loading conversation...</p>}
            {!loadingMessages && !activeRoom && <p className="text-sm text-muted-foreground">Select a conversation from the left panel.</p>}
            {!loadingMessages && activeRoom && messages.length === 0 && <p className="text-sm text-muted-foreground">Start the conversation.</p>}

            {messages.map((message, index) => {
              const mine = message.senderId === currentUser?.id;
              const isEditing = editingMessageId === message.id;
              const prev = index > 0 ? messages[index - 1] : null;
              const showDay = !prev || formatDay(prev.createdAt) !== formatDay(message.createdAt);
              return (
                <div key={message.id} className="space-y-2">
                  {showDay && (
                    <div className="text-center">
                      <span className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground">{formatDay(message.createdAt)}</span>
                    </div>
                  )}
                  <div className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                    {!mine && (
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback className="text-[10px]">{initials(message.senderName)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[72%] rounded-lg border px-3 py-2 ${mine ? "bg-primary text-primary-foreground border-primary/40" : "bg-card"}`}>
                      <div className="flex items-center gap-2 text-[11px] opacity-80 mb-1">
                        {!mine && <span className="font-medium">{message.senderName}</span>}
                        <span>{formatTime(message.createdAt)}</span>
                        {message.isEdited && <span>edited</span>}
                      </div>

                      {isEditing ? (
                        <div className="space-y-1">
                          <Input value={editingText} onChange={(e) => setEditingText(e.target.value)} className="h-8 text-sm bg-background text-foreground" />
                          <div className="flex justify-end gap-1">
                            <Button size="sm" className="h-7 text-xs" onClick={onSaveEdit}>Save</Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                setEditingMessageId(null);
                                setEditingText("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      )}

                      {mine && !isEditing && (
                        <div className="mt-1 flex justify-end gap-2">
                          <button
                            type="button"
                            className="text-[11px] opacity-80 hover:opacity-100 inline-flex items-center gap-1"
                            onClick={() => {
                              setEditingMessageId(message.id);
                              setEditingText(message.content);
                            }}
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                          <button
                            type="button"
                            className="text-[11px] opacity-80 hover:opacity-100 inline-flex items-center gap-1"
                            onClick={() => onDeleteMessage(message.id)}
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={onSendMessage} className="border-t p-3 bg-card flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={activeRoom ? "Type a message" : "Select a conversation first"}
              disabled={!activeRoom}
            />
            <Button type="submit" disabled={!activeRoom || !newMessage.trim()} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Send
            </Button>
          </form>
        </section>

        <aside className="hidden xl:block border-l bg-card overflow-y-auto jira-scrollbar">
          <div className="h-14 border-b px-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Details</h3>
          </div>
          <div className="p-4 space-y-4">
            {!activeRoom && <p className="text-sm text-muted-foreground">No conversation selected.</p>}
            {activeRoom && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Conversation</p>
                  <p className="text-sm mt-1">{activeRoomTitle}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Members</p>
                  <div className="mt-2 space-y-2">
                    {activeRoom.participants.map((member) => (
                      <div key={member.userId} className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px]">{initials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm truncate">{member.name}</p>
                          <p className="text-[11px] text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      <Dialog open={createDmOpen} onOpenChange={setCreateDmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Direct Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Select teammate</Label>
            <Select value={targetUserId} onValueChange={setTargetUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Choose user</SelectItem>
                {users
                  .filter((user) => user.id !== currentUser?.id)
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDmOpen(false)}>Cancel</Button>
              <Button onClick={onCreateDm} disabled={targetUserId === NONE}>Start</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createChannelOpen} onOpenChange={setCreateChannelOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block">Channel name</Label>
              <Input value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="Design-Team" />
            </div>
            <div>
              <Label className="mb-1 block">Members</Label>
              <div className="max-h-52 overflow-auto rounded-md border p-2 space-y-1">
                {users
                  .filter((user) => user.id !== currentUser?.id)
                  .map((user) => {
                    const selected = channelMemberIds.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        className={`w-full text-left text-sm px-2 py-1 rounded ${selected ? "bg-accent" : "hover:bg-accent/60"}`}
                        onClick={() => {
                          setChannelMemberIds((prev) => (selected ? prev.filter((id) => id !== user.id) : [...prev, user.id]));
                        }}
                      >
                        {user.name}
                      </button>
                    );
                  })}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateChannelOpen(false)}>Cancel</Button>
              <Button onClick={onCreateChannel} disabled={!channelName.trim()}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
