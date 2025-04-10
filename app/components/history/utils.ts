import type { Chats } from "@/lib/chat-store/types"

type TimeGroup = {
  name: string
  chats: Chats[]
}

// Group chats by time periods
export function groupChatsByDate(
  chats: Chats[],
  searchQuery: string
): TimeGroup[] | null {
  if (searchQuery) return null // Don't group when searching

  const now = new Date()
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime()
  const weekAgo = today - 7 * 24 * 60 * 60 * 1000
  const monthAgo = today - 30 * 24 * 60 * 60 * 1000
  const yearStart = new Date(now.getFullYear(), 0, 1).getTime()

  const todayChats: Chats[] = []
  const last7DaysChats: Chats[] = []
  const last30DaysChats: Chats[] = []
  const thisYearChats: Chats[] = []
  const olderChats: Record<number, Chats[]> = {}

  chats.forEach((chat) => {
    if (!chat.created_at) {
      todayChats.push(chat)
      return
    }

    const chatTimestamp = new Date(chat.created_at).getTime()

    if (chatTimestamp >= today) {
      todayChats.push(chat)
    } else if (chatTimestamp >= weekAgo) {
      last7DaysChats.push(chat)
    } else if (chatTimestamp >= monthAgo) {
      last30DaysChats.push(chat)
    } else if (chatTimestamp >= yearStart) {
      thisYearChats.push(chat)
    } else {
      const year = new Date(chat.created_at).getFullYear()
      if (!olderChats[year]) {
        olderChats[year] = []
      }
      olderChats[year].push(chat)
    }
  })

  const result: TimeGroup[] = []

  if (todayChats.length > 0) {
    result.push({ name: "Today", chats: todayChats })
  }

  if (last7DaysChats.length > 0) {
    result.push({ name: "Last 7 days", chats: last7DaysChats })
  }

  if (last30DaysChats.length > 0) {
    result.push({ name: "Last 30 days", chats: last30DaysChats })
  }

  if (thisYearChats.length > 0) {
    result.push({ name: "This year", chats: thisYearChats })
  }

  Object.entries(olderChats)
    .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
    .forEach(([year, yearChats]) => {
      result.push({ name: year, chats: yearChats })
    })

  return result
}
