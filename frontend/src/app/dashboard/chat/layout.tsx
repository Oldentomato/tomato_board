import "@copilotkit/react-core/v2/styles.css";
import { CopilotKitProvider } from "@/providers/CopilotKitProvider";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <CopilotKitProvider>{children}</CopilotKitProvider>;
}
