import { Switch } from '@/components/ui/switch.tsx';

type CardSwitchProps = {
  title: string;
  subtitle?: string;
  checked: boolean;
  onChecked: (checked: boolean) => void;
};

export default function CardSwitch({ title, subtitle, checked, onChecked }: CardSwitchProps) {
  return (
    <div className="w-full bg-secondary hover:bg-secondary-2 rounded-2xl flex-row gap-1 px-6 py-4">
      <div className="flex flex-row justify-between items-center">
        <p className="font-semibold text-sm">{title}</p>
        <Switch id="airplane-mode" checked={checked} onCheckedChange={onChecked} />
      </div>
      {subtitle && <p className="text-xs py-2">{subtitle}</p>}
    </div>
  );
}
