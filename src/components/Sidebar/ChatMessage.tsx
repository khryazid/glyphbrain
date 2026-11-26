import type { ChatMessage as ChatMessageType } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
          ${isUser
            ? 'bg-gb-accent/15 text-gb-text border border-gb-accent/20'
            : 'bg-gb-surface text-gb-text border border-gb-border'}`}
      >
        {/* Contenido del mensaje */}
        <p className="whitespace-pre-wrap">{message.content}</p>

        {/* Acciones ejecutadas por la IA */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gb-border space-y-1">
            {message.actions.map((action, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-xs text-gb-text-secondary"
              >
                <span>
                  {action.type === 'crear_nota' && '✅'}
                  {action.type === 'conectar_nodos' && '🔗'}
                  {action.type === 'buscar_notas' && '🔍'}
                </span>
                <span>{action.description}</span>
              </div>
            ))}
          </div>
        )}

        {/* Loading indicator */}
        {message.isLoading && (
          <div className="mt-1 flex gap-1">
            <span className="w-1 h-1 bg-gb-accent rounded-full animate-bounce" />
            <span className="w-1 h-1 bg-gb-accent rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
            <span className="w-1 h-1 bg-gb-accent rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
        )}
      </div>
    </div>
  );
}
