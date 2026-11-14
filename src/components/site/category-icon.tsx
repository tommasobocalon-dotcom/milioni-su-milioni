import { Building2, Droplet, Leaf, PaintRoller, Ruler, Sofa, Sparkles, Truck, Wrench, Zap, type LucideProps } from "lucide-react";

const ICONS = { building: Building2, droplet: Droplet, zap: Zap, ruler: Ruler, roller: PaintRoller, wrench: Wrench, sofa: Sofa, leaf: Leaf, sparkles: Sparkles, truck: Truck };

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? Wrench;
  return <Icon aria-hidden {...props} />;
}
