import { Crown, Code2, Shield, ShieldCheck, Sparkles, Gem, Star } from 'lucide-react';
import type { Badge } from '../utils/badges';

interface BadgePillProps {
  badge: Badge;
  size?: 'sm' | 'md';
}

export function BadgePill({ badge, size = 'md' }: BadgePillProps) {
  const renderIcon = () => {
    const iconProps = { size: size === 'sm' ? 10 : 12, className: 'flex-shrink-0' };
    switch (badge.iconName) {
      case 'Crown': return <Crown {...iconProps} />;
      case 'Code2': return <Code2 {...iconProps} />;
      case 'Shield': return <Shield {...iconProps} />;
      case 'ShieldCheck': return <ShieldCheck {...iconProps} />;
      case 'Sparkles': return <Sparkles {...iconProps} />;
      case 'Gem': return <Gem {...iconProps} />;
      case 'Star': return <Star {...iconProps} fill="currentColor" />;
      default: return <Star {...iconProps} />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-black uppercase tracking-wider rounded-md ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[7.5px]' : 'px-2 py-0.5 text-[9px]'
      } ${badge.style}`}
      title={badge.description}
    >
      {renderIcon()}
      <span>{badge.label}</span>
    </span>
  );
}
