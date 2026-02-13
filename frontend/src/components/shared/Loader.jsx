import styles from './Loader.module.css';

export function Loader({ text, fullPage = false }) {
  return (
    <div className={`${styles['loader-wrap']} ${fullPage ? styles['loader-wrap--full'] : ''}`}>
      <div className={styles['orb-container']}>
        <span className={styles.orb} />
        <span className={styles.orb} />
        <span className={styles.orb} />
      </div>
      {text && <span className={styles['loader-text']}>{text}</span>}
    </div>
  );
}

export function Skeleton({ variant = 'text', width, height, className = '' }) {
  const classes = [
    styles.skeleton,
    styles[`skeleton--${variant}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes} style={{ width, height }} />;
}
