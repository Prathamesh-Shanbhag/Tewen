import { useState, useRef, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  onSubmit: (content: string) => void;
  isLoading?: boolean;
}

const ChatInput = ({ onSubmit, isLoading }: ChatInputProps) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (content.trim() && !isLoading) {
      onSubmit(content);
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setContent(textarea.value);
    
    // Auto-resize textarea
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  return (
    <div className="border-t bg-background p-4">
      <div className="relative flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Describe your dream website..."
          className="min-h-[60px] max-h-[200px] pr-12 resize-none"
          disabled={isLoading}
        />
        <Button
          size="icon"
          className="absolute right-2 bottom-2"
          onClick={handleSubmit}
          disabled={!content.trim() || isLoading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Press Enter to send, Shift + Enter for new line
      </p>
    </div>
  );
};

export default ChatInput;