/** App-owned text-message shape, independent of AI SDK transport versions. */
export interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string }
