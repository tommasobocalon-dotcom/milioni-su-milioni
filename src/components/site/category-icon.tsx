import { Building2, Droplet, PaintRoller, Ruler, Wrench, Zap, type LucideProps } from "lucide-react";

const ICONS = { building: Building2, droplet: Droplet, zap: Zap, ruler: Ruler, roller: PaintRoller, wrench: Wrench };

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? Wrench;
  return <Icon aria-hidden {...props} />;
}
