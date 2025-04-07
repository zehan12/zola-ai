"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
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

  useEffect(() => {
    const loadChats = async () => {
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
