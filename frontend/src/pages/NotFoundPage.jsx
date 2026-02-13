import { Link } from 'react-router-dom';
import Button from '../components/shared/Button';
import { ArrowLeft } from 'lucide-react';
import styles from './NotFound.module.css';

export default function NotFoundPage() {
  return (
    <div className={styles['not-found']}>
      <div className={styles.code}>404</div>
      <p className={styles.message}>This page doesn&apos;t exist.</p>
      <Link to="/feed">
        <Button variant="secondary" icon={ArrowLeft}>
          Back to Feed
        </Button>
      </Link>
    </div>
  );
}
