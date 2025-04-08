import { ChatMessagesProvider } from "@/lib/chat-store/chat-message-provider"
import Chat from "./components/chat/chat"
import LayoutApp from "./components/layout/layout-app"

export default async function Home() {
  return (
    <LayoutApp>
      <ChatMessagesProvider>
        <Chat />
      </ChatMessagesProvider>
    </LayoutApp>
  )
}
