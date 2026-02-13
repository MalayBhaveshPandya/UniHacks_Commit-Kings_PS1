import { Mic } from 'lucide-react';
import EmptyState from '../components/shared/EmptyState';

export default function MeetingsPage() {
  return (
    <EmptyState
      icon={Mic}
      title="Meetings"
      description="Meeting recordings, transcripts, and AI feedback will appear here. Coming in Phase 4."
    />
  );
}
