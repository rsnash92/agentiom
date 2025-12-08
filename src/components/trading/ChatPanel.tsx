'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/hooks';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  agentName: string;
  agentId?: string;
  agentStatus: 'active' | 'paused' | 'stopped';
}

export function ChatPanel({
  agentName,
  agentId,
  agentStatus,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { getAccessToken } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  // Load chat history on mount
  useEffect(() => {
    if (!agentId) return;

    async function loadHistory() {
      setIsLoadingHistory(true);
      try {
        const token = await getAccessToken();
        const res = await fetch(`/api/agents/${agentId}/chat`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages.map((m: { id: string; role: string; content: string; timestamp: string }) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })));
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadHistory();
  }, [agentId, getAccessToken]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading || !agentId) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    setStreamingContent('');

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const token = await getAccessToken();
      console.log('[ChatPanel] Sending message to agent:', agentId);
      console.log('[ChatPanel] Token:', token ? 'present' : 'missing');

      const response = await fetch(`/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: messageToSend, stream: true }),
        signal: abortControllerRef.current.signal,
      });

      console.log('[ChatPanel] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ChatPanel] Error response:', errorText);
        throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream');
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                accumulatedContent += data.text;
                setStreamingContent(accumulatedContent);
              }
              if (data.done) {
                // Add the complete message
                const assistantMessage: ChatMessage = {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: accumulatedContent,
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, assistantMessage]);
                setStreamingContent('');
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch {
              // Ignore parse errors from incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // User cancelled, add partial content if any
        if (streamingContent) {
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: streamingContent + ' [cancelled]',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setStreamingContent('');
        }
      } else {
        console.error('Chat error:', error);
        // Show error message
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setStreamingContent('');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [inputValue, isLoading, agentId, getAccessToken, streamingContent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCancelStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleClearChat = async () => {
    if (!agentId) return;

    try {
      const token = await getAccessToken();
      await fetch(`/api/agents/${agentId}/chat`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }
  };

  const promptSuggestions = [
    'What are the current market conditions?',
    'Analyze BTC price action',
    'Show my portfolio performance',
    'What is my current risk exposure?',
    'Suggest a trade based on my strategy',
  ];

  return (
    <div className="flex flex-col h-full bg-background-secondary">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center">
          <BotIcon className="w-5 h-5 text-foreground-muted" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">{agentName}</h3>
          <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                agentStatus === 'active'
                  ? 'bg-success'
                  : agentStatus === 'paused'
                    ? 'bg-warning'
                    : 'bg-error'
              }`}
            />
            <span className="capitalize">{agentStatus === 'active' ? 'Online' : agentStatus}</span>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="p-2 text-foreground-muted hover:text-foreground hover:bg-background rounded-lg transition-colors"
            title="Clear chat"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 && !streamingContent ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-4">
              <BotIcon className="w-8 h-8 text-foreground-subtle" />
            </div>
            <p className="text-sm text-foreground-muted mb-1">
              Start a conversation with {agentName}
            </p>
            <p className="text-xs text-foreground-subtle mb-6">
              Ask about market analysis, trade ideas, or portfolio review
            </p>

            {/* Quick Prompts */}
            <div className="space-y-2 w-full max-w-xs">
              {promptSuggestions.slice(0, 3).map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setInputValue(prompt)}
                  className="w-full px-3 py-2 text-xs text-left text-foreground-muted bg-card hover:bg-card-hover border border-border rounded-lg transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                    message.role === 'user'
                      ? 'bg-primary text-black'
                      : 'bg-card text-foreground border border-border'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {/* Streaming content */}
            {streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap bg-card text-foreground border border-border">
                  {streamingContent}
                  <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
                </div>
              </div>
            )}
            {/* Loading indicator */}
            {isLoading && !streamingContent && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-foreground-muted rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-foreground-muted rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="w-2 h-2 bg-foreground-muted rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Prompt Library Dropdown */}
      {showPromptLibrary && (
        <div className="border-t border-border bg-card p-3">
          <div className="text-xs font-medium text-foreground-muted mb-2">Quick Prompts</div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {promptSuggestions.map((prompt, index) => (
              <button
                key={index}
                onClick={() => {
                  setInputValue(prompt);
                  setShowPromptLibrary(false);
                  inputRef.current?.focus();
                }}
                className="w-full px-3 py-2 text-xs text-left text-foreground hover:bg-background rounded-md transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 border-t border-border">
        <div className="flex items-end gap-2 bg-card rounded-xl border border-border p-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={agentId ? 'Ask about markets, trades, or analysis...' : 'Select an agent to chat'}
            rows={1}
            disabled={!agentId || isLoading}
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none px-2 py-1.5 max-h-24 min-h-[36px] disabled:opacity-50"
            style={{ height: 'auto' }}
          />
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setShowPromptLibrary(!showPromptLibrary)}
              className={`p-2 rounded-lg transition-colors ${
                showPromptLibrary
                  ? 'bg-primary text-black'
                  : 'text-foreground-muted hover:text-foreground hover:bg-background'
              }`}
              title="Prompt Library"
            >
              <BookIcon className="w-5 h-5" />
            </button>
            {isLoading ? (
              <button
                onClick={handleCancelStream}
                className="p-2 rounded-lg bg-error/20 text-error hover:bg-error/30 transition-colors"
                title="Cancel"
              >
                <StopIcon className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || !agentId}
                className={`p-2 rounded-lg transition-colors ${
                  inputValue.trim() && agentId
                    ? 'bg-primary text-black hover:bg-primary-hover'
                    : 'bg-card text-foreground-subtle cursor-not-allowed'
                }`}
              >
                <SendIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        {!agentId && (
          <p className="text-xs text-foreground-muted mt-2 text-center">
            Chat requires an agent to be selected
          </p>
        )}
      </div>
    </div>
  );
}

// Icons
function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" strokeWidth="3" strokeLinecap="round" />
      <line x1="16" y1="16" x2="16" y2="16" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
