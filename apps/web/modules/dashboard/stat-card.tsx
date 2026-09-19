import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  // Small explanation under the number
  hint?: string;
};

// One number with a label, used on the overview and analytics pages.
export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-medium tabular-nums">
          {value}
        </CardTitle>
        {hint ? <p className="text-xs text-ink-mute">{hint}</p> : null}
      </CardHeader>
    </Card>
  );
}
