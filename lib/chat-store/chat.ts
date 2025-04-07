import { readFromIndexedDB, writeToIndexedDB } from "@/lib/chat-store/persist"
import type { Chat } from "@/lib/chat-store/types"
import { createClient } from "@/lib/supabase/client"

export async function getChat(chatId: string): Promise<Chat | null> {
  const all = await readFromIndexedDB<Chat>("chats")
  return (all as Chat[]).find((c) => c.id === chatId) || null
}

export async function getUserChats(userId: string): Promise<Chat[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (!data || error) return []
  await writeToIndexedDB("chats", data)
  return data
}

export async function createChat(
  userId: string,
  title: string,
  model: string,
  systemPrompt: string
): Promise<string> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("chats")
    .insert({ user_id: userId, title, model, system_prompt: systemPrompt })
    .select("id")
    .single()

  if (error || !data?.id) throw error

  await writeToIndexedDB("chats", {
    id: data.id,
    title,
    model,
    user_id: userId,
    system_prompt: systemPrompt,
    created_at: new Date().toISOString(),
  })

  return data.id
}

export async function updateChatModel(chatId: string, model: string) {
  const supabase = createClient()
  await supabase.from("chats").update({ model }).eq("id", chatId)

  const existing = await getChat(chatId)
  if (existing) {
    await writeToIndexedDB("chats", { ...existing, model })
  }
}
