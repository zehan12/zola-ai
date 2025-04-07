"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import {
  deleteChat,
  fetchAndCacheChats,
  getCachedChats,
  updateChatTitle,
} from "@/lib/chat-store/history"
import { ChatHistory } from "@/lib/chat-store/types"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { CommandHistory } from "./command-history"
import { DrawerHistory } from "./drawer-history"

export function History() {
  const isMobile = useBreakpoint(768)
  const [chats, setChats] = useState<ChatHistory[]>([])

  useEffect(() => {
    const loadChats = async () => {
      const supabase = createClient()
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth?.user?.id
      if (!userId) return

      setChats(await getCachedChats())
      const fresh = await fetchAndCacheChats(userId)
      setChats(fresh)
    }

    loadChats()
  }, [])

  const handleSaveEdit = async (id: string, newTitle: string) => {
    await updateChatTitle(id, newTitle)
    setChats((prev) =>
      prev.map((chat) => (chat.id === id ? { ...chat, title: newTitle } : chat))
    )
  }

  const handleConfirmDelete = async (id: string) => {
    await deleteChat(id)
    setChats((prev) => prev.filter((chat) => chat.id !== id))
  }

  if (isMobile) {
    return (
      <DrawerHistory
        chatHistory={chats}
        onSaveEdit={handleSaveEdit}
        onConfirmDelete={handleConfirmDelete}
      />
    )
  }

  return (
    <CommandHistory
      chatHistory={chats}
      onSaveEdit={handleSaveEdit}
      onConfirmDelete={handleConfirmDelete}
    />
  )
}
