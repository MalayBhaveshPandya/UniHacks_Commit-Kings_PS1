import { MessageSquare } from 'lucide-react';
import EmptyState from '../components/shared/EmptyState';

export default function ChatPage() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="Team Chat"
      description="Direct messages and team conversations will live here. Coming in Phase 3."
    />
  );
}
