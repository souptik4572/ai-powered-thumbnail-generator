import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Grid2X2,
  History,
  Image,
  Loader,
  Lock,
  LogOut,
  Mail,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Smartphone,
  Sparkles,
  Square,
  Star,
  Sun,
  Trash2,
  Tv,
  Upload,
  User,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  arrowLeft:    ArrowLeft,
  arrow:        ArrowRight,
  check:        Check,
  download:     Download,
  externalLink: ExternalLink,
  eye:          Eye,
  eyeOff:       EyeOff,
  google:       Globe,
  grid:         Grid2X2,
  history:      History,
  image:        Image,
  loader:       Loader,
  lock:         Lock,
  logout:       LogOut,
  mail:         Mail,
  moon:         Moon,
  plus:         Plus,
  refresh:      RefreshCw,
  search:       Search,
  settings:     Settings,
  smartphone:   Smartphone,
  sparkles:     Sparkles,
  square:       Square,
  star:         Star,
  sun:          Sun,
  trash:        Trash2,
  tv:           Tv,
  upload:       Upload,
  user:         User,
  x:            X,
  bolt:         Zap,
};

interface IconProps {
  name: string;
  size?: number;
  stroke?: number;
  className?: string;
}

export default function Icon({ name, size = 20, stroke = 2, className }: IconProps) {
  const LucideComponent = iconMap[name];
  if (!LucideComponent) return null;
  return <LucideComponent size={size} strokeWidth={stroke} className={className} />;
}
