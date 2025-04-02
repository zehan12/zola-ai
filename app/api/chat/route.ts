// /chat/api/chat.ts
import { checkUsage, incrementUsage } from "@/app/lib/api"
import { MODELS } from "@/app/lib/config"
import { validateUserIdentity } from "@/app/lib/server/api"
import { Attachment } from "@ai-sdk/ui-utils"
import { Message, streamText } from "ai"

// Maximum allowed duration for streaming (in seconds)
export const maxDuration = 30

type ChatRequest = {
  messages: Message[]
  chatId: string
  userId: string
  model: string
  isAuthenticated: boolean
  systemPrompt: string
}

export async function POST(req: Request) {
  try {
    const { messages, chatId, userId, model, isAuthenticated, systemPrompt } =
      (await req.json()) as ChatRequest

    if (!messages || !chatId || !userId) {
      return new Response(
        JSON.stringify({ error: "Error, missing information" }),
        { status: 400 }
      )
    }

    const supabase = await validateUserIdentity(userId, isAuthenticated)

    // First check if the user is within their usage limits
    await checkUsage(supabase, userId)

    const userMessage = messages[messages.length - 1]
    if (userMessage && userMessage.role === "user") {
      const { error: msgError } = await supabase.from("messages").insert({
        chat_id: chatId,
        role: "user",
        content: userMessage.content,
        attachments:
          userMessage.experimental_attachments as unknown as Attachment[],
      })
      if (msgError) {
        console.error("Error saving user message:", msgError)
      } else {
        console.log("User message saved successfully.")

        // Increment usage only after confirming the message was saved
        await incrementUsage(supabase, userId)
      }
    }

    const result = streamText({
      model: MODELS.find((m) => m.id === model)?.api_sdk!,
      system: systemPrompt || "You are a helpful assistant.",
      messages,
      // When the response finishes, insert the assistant messages.
      async onFinish({ response }) {
        try {
          for (const msg of response.messages) {
            console.log("Response message role:", msg.role)
            if (msg.content) {
              let plainText = msg.content
              try {
                const parsed = msg.content
                if (Array.isArray(parsed)) {
                  // Join all parts of type "text"
                  plainText = parsed
                    .filter((part) => part.type === "text")
                    .map((part) => part.text)
                    .join(" ")
                }
              } catch (err) {
                console.warn(
                  "Could not parse message content as JSON, using raw content"
                )
              }

              const { error: assistantError } = await supabase
                .from("messages")
                .insert({
                  chat_id: chatId,
                  role: "assistant",
                  content: plainText.toString(),
                })
              if (assistantError) {
                console.error("Error saving assistant message:", assistantError)
              } else {
                console.log("Assistant message saved successfully.")
              }
            }
          }
        } catch (err) {
          console.error(
            "Error in onFinish while saving assistant messages:",
            err
          )
        }
      },
    })

    // Ensure the stream is consumed so onFinish is triggered.
    result.consumeStream()
    const originalResponse = result.toDataStreamResponse()
    // Optionally attach chatId in a custom header.
    const headers = new Headers(originalResponse.headers)
    headers.set("X-Chat-Id", chatId)

    return new Response(originalResponse.body, {
      status: originalResponse.status,
      headers,
    })
  } catch (err: any) {
    console.error("Error in /chat/api/chat:", err)
    // Return a structured error response if the error is a UsageLimitError.
    if (err.code === "DAILY_LIMIT_REACHED") {
      return new Response(
        JSON.stringify({ error: err.message, code: err.code }),
        { status: 403 }
      )
    }

    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500 }
    )
  }
}
