import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

interface SettingRowProps {
  label: string;
  description: React.ReactNode;
  children: React.ReactNode;
}

export function SettingsSection({
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}

export function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex flex-col space-y-6 md:flex-row md:space-y-0 md:space-x-6 md:items-start">
      <div className="flex-1 space-y-1">
        <div className="text-sm font-medium leading-none">{label}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
