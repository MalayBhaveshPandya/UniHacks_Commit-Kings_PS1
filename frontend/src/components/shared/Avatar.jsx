import { User } from 'lucide-react';
import styles from './Avatar.module.css';

const COLORS = [
  '#E8A838', '#5B8DEF', '#4ADE80', '#E85555',
  '#A78BFA', '#F472B6', '#22D3EE', '#FB923C',
];

export function getColor(name) {
  if (!name) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Avatar({
  name,
  src,
  size = 'md',
  anonymous = false,
  className = '',
}) {
  const classes = [
    styles.avatar,
    styles[`avatar--${size}`],
    anonymous && styles['avatar--anonymous'],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (anonymous) {
    return (
      <div className={classes}>
        <User size={size === 'xs' ? 10 : size === 'sm' ? 14 : size === 'lg' ? 24 : size === 'xl' ? 36 : 18} />
      </div>
    );
  }

  if (src) {
    return (
      <div className={classes}>
        <img src={src} alt={name || 'User avatar'} />
      </div>
    );
  }

  return (
    <div className={classes} style={{ background: getColor(name) }}>
      {getInitials(name)}
    </div>
  );
}
