import { Newspaper } from 'lucide-react';
import EmptyState from '../components/shared/EmptyState';

export default function FeedPage() {
  return (
    <EmptyState
      icon={Newspaper}
      title="Organization Feed"
      description="Your team's reflections, updates, and decisions will appear here. Coming in Phase 2."
    />
  );
}
