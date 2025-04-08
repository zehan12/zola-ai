import { createClient } from "@/lib/supabase/client"
import { Message } from "ai"
import { readFromIndexedDB, writeToIndexedDB } from "../persist"

type ChatMessageEntry = {
  id: string
  messages: Message[]
}

export async function getCachedMessages(chatId: string): Promise<Message[]> {
  const entry = await readFromIndexedDB<ChatMessageEntry>("messages", chatId)

  if (!entry || Array.isArray(entry)) return []

  return (entry.messages || []).sort(
    (a, b) => +new Date(a.createdAt || 0) - +new Date(b.createdAt || 0)
  )
}

export async function fetchAndCacheMessages(
  chatId: string
): Promise<Message[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("messages")
    .select("id, content, role, attachments, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })

  if (!data || error) {
    console.error("Failed to fetch messages:", error)
    return []
  }

  const formattedMessages: Message[] = data.map((message) => ({
    id: String(message.id),
    content: message.content,
    role: message.role,
    experimental_attachments: message.attachments,
    createdAt: new Date(message.created_at || ""),
  }))

  await writeToIndexedDB("messages", {
    id: chatId,
    messages: formattedMessages,
  })
  return formattedMessages
}

export async function addMessage(
  chatId: string,
  message: Message
): Promise<void> {
  const supabase = createClient()

  await supabase.from("messages").insert({
    chat_id: chatId,
    role: message.role,
    content: message.content,
    attachments: message.experimental_attachments,
    created_at: message.createdAt?.toISOString() || new Date().toISOString(),
  })

  const current = await getCachedMessages(chatId)
  const updated = [...current, message]
  await writeToIndexedDB("messages", { id: chatId, messages: updated })
}

export async function setMessages(
  chatId: string,
  messages: Message[]
): Promise<void> {
  const supabase = createClient()

  const payload = messages.map((message) => ({
    chat_id: chatId,
    role: message.role,
    content: message.content,
    attachments: message.experimental_attachments,
    created_at: message.createdAt?.toISOString() || new Date().toISOString(),
  }))

  await supabase.from("messages").insert(payload)
  await writeToIndexedDB("messages", { id: chatId, messages })
}

export async function clearMessagesCache(chatId: string): Promise<void> {
  await writeToIndexedDB("messages", { id: chatId, messages: [] })
}

export async function clearMessagesForChat(chatId: string): Promise<void> {
  const supabase = createClient()

  // Delete messages from the database
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("chat_id", chatId)

  if (error) {
    console.error("Failed to clear messages from database:", error)
  }

  // Clear the cache
  await clearMessagesCache(chatId)
}
