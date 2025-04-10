"use client"

import { useBreakpoint } from "@/app/hooks/use-breakpoint"
import { useChats } from "@/lib/chat-store/chats/provider"
import { ListMagnifyingGlass } from "@phosphor-icons/react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { CommandHistory } from "./command-history"
import { DrawerHistory } from "./drawer-history"

export function HistoryTrigger() {
  const isMobile = useBreakpoint(768)
  const params = useParams<{ chatId: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const { chats, updateTitle, deleteChat } = useChats()
  const [isOpen, setIsOpen] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(
    params.chatId
  )

  useEffect(() => {
    // Extract chat ID from pathname (e.g., /c/123 -> 123)
    // we do this because we do window.history.pushState in chat.tsx
    const match = pathname.match(/\/c\/([^\/]+)/)
    const chatIdFromPath = match ? match[1] : undefined

    setCurrentChatId(chatIdFromPath)
  }, [pathname])

  const handleSaveEdit = async (id: string, newTitle: string) => {
    await updateTitle(id, newTitle)
  }

  const handleConfirmDelete = async (id: string) => {
    setIsOpen(false)
    await deleteChat(id, currentChatId, () => router.push("/"))
  }

  const trigger = (
    <button
      className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-1.5 transition-colors"
      type="button"
      onClick={() => setIsOpen(true)}
    >
      <ListMagnifyingGlass size={24} />
    </button>
  )

  if (isMobile) {
    return (
      <DrawerHistory
        chatHistory={chats}
        onSaveEdit={handleSaveEdit}
        onConfirmDelete={handleConfirmDelete}
        trigger={trigger}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    )
  }

  return (
    <CommandHistory
      chatHistory={chats}
      onSaveEdit={handleSaveEdit}
      onConfirmDelete={handleConfirmDelete}
      trigger={trigger}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    />
  )
}
