import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardMetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
}

const DashboardMetricCard = ({ title, value, icon: Icon, subtitle }: DashboardMetricCardProps) => {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl md:text-3xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="p-2 md:p-3 rounded-xl bg-primary/10">
            <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardMetricCard;
