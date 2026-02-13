import styles from './Button.module.css';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon: Icon,
  iconOnly = false,
  className = '',
  ...props
}) {
  const classes = [
    styles.btn,
    styles[`btn--${variant}`],
    size !== 'md' && styles[`btn--${size}`],
    fullWidth && styles['btn--full'],
    loading && styles['btn--loading'],
    iconOnly && styles['btn--icon'],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={loading || props.disabled} {...props}>
      {loading && <span className={styles.btn__spinner} />}
      {Icon && !loading && <Icon size={iconOnly ? 20 : 16} />}
      {!iconOnly && children}
    </button>
  );
}
