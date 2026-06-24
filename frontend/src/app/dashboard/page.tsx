import { WeatherToday } from "@/components/dashboard/WeatherToday";
import { WeatherWeek } from "@/components/dashboard/WeatherWeek";
import { MailPanel } from "@/components/dashboard/MailPanel";
import { CalendarPanel } from "@/components/dashboard/CalendarPanel";
import { MemoBoard } from "@/components/dashboard/MemoPanel";
import { EnterAnimation } from "@/components/dashboard/EnterAnimation";

export default function DashboardPage() {
  return (
    <MemoBoard>
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-5 lg:gap-5">
          <div className="flex flex-col gap-4 lg:col-span-3 lg:pr-1">
            <EnterAnimation variant="up" delay={80}>
              <WeatherToday />
            </EnterAnimation>
            <EnterAnimation variant="up" delay={200}>
              <WeatherWeek />
            </EnterAnimation>
          </div>
          <div className="flex flex-col gap-4 lg:col-span-2">
            <EnterAnimation variant="unfold" delay={320}>
              <MailPanel />
            </EnterAnimation>
            <EnterAnimation variant="unfold" delay={440}>
              <CalendarPanel />
            </EnterAnimation>
          </div>
        </div>
      </div>
    </MemoBoard>
  );
}
