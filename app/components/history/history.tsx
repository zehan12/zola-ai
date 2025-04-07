"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { toast } from "@/components/ui/toast"
import {
  deleteChat,
  fetchAndCacheChats,
  getCachedChats,
  updateChatTitle,
} from "@/lib/chat-store/history"
import { ChatHistory } from "@/lib/chat-store/types"
import { useEffect, useState } from "react"
import { CommandHistory } from "./command-history"
import { DrawerHistory } from "./drawer-history"

type HistoryProps = {
  userId: string
}

export function History({ userId }: HistoryProps) {
  const isMobile = useBreakpoint(768)
  const [chats, setChats] = useState<ChatHistory[]>([])

  // @todo: we could prefetch chats earlier (e.g. during auth check or page load)
  useEffect(() => {
    const loadChats = async () => {
      setChats(await getCachedChats())
      const fresh = await fetchAndCacheChats(userId)
      setChats(fresh)
    }

    loadChats()
  }, [])

  const handleSaveEdit = async (id: string, newTitle: string) => {
    const prev = [...chats]

    setChats((prev) =>
      prev.map((chat) => (chat.id === id ? { ...chat, title: newTitle } : chat))
    )

    try {
      await updateChatTitle(id, newTitle)
    } catch (err) {
      setChats(prev)
      toast({
        title: "Failed to save title",
        status: "error",
      })
    }
  }

  const handleConfirmDelete = async (id: string) => {
    const prev = [...chats]

    setChats((prev) => prev.filter((chat) => chat.id !== id))

    try {
      await deleteChat(id)
    } catch (err) {
      setChats(prev)
      toast({
        title: "Failed to delete chat",
        status: "error",
      })
    }
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
