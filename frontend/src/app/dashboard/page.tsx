import { WeatherToday } from "@/components/dashboard/WeatherToday";
import { WeatherWeek } from "@/components/dashboard/WeatherWeek";
import { MailPanel } from "@/components/dashboard/MailPanel";
import { CalendarPanel } from "@/components/dashboard/CalendarPanel";
import { MemoBoard } from "@/components/dashboard/MemoPanel";
import { EnterAnimation } from "@/components/dashboard/EnterAnimation";

export default function DashboardPage() {
  return (
    <MemoBoard>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-5 lg:gap-5">
          <div className="flex min-h-0 flex-col gap-4 lg:col-span-3 lg:overflow-y-auto lg:pr-1 scrollbar-subtle">
            <EnterAnimation variant="up" delay={80}>
              <WeatherToday />
            </EnterAnimation>
            <EnterAnimation variant="up" delay={200}>
              <WeatherWeek />
            </EnterAnimation>
          </div>
          <div className="flex min-h-0 flex-col gap-4 lg:col-span-2 lg:h-full lg:min-h-0 lg:overflow-hidden">
            <EnterAnimation variant="unfold" delay={320} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <MailPanel className="h-full" />
            </EnterAnimation>
            <EnterAnimation variant="unfold" delay={440} className="shrink-0">
              <CalendarPanel />
            </EnterAnimation>
          </div>
        </div>
      </div>
    </MemoBoard>
  );
}
