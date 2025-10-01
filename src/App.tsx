import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { WalletConnect } from "@/components/WalletConnect";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";
import { TaskSyncManager } from "@/components/TaskSyncManager";
import Index from "./pages/Index";
import CreateTask from "./pages/CreateTask";
import ManageTasks from "./pages/ManageTasks";
import AgentTasks from "./pages/AgentTasks";
import Settings from "./pages/Settings";
import TestErrorCleanup from "./pages/TestErrorCleanup";
import TestTonConnect from "./pages/TestTonConnect";
import ManifestTest from "./pages/ManifestTest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <TonConnectUIProvider
    manifestUrl="http://localhost:5173/tonconnect-manifest.json"
    actionsConfiguration={{
      twaReturnUrl: "http://localhost:5173",
    }}
  >
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <TaskSyncManager />
          <BrowserRouter>
            <SidebarProvider>
              <div className="flex min-h-screen w-full">
                <AppSidebar />
                <div className="flex-1 flex flex-col">
                  <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
                    <SidebarTrigger />
                    <div className="flex items-center gap-4">
                      <ModeToggle />
                      <WalletConnect />
                    </div>
                  </header>
                  <main className="flex-1 overflow-hidden">
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/create" element={<CreateTask />} />
                      <Route path="/manage" element={<ManageTasks />} />
                      <Route path="/agent" element={<AgentTasks />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route
                        path="/test-error"
                        element={<TestErrorCleanup />}
                      />
                      <Route path="/test-ton" element={<TestTonConnect />} />
                      <Route path="/manifest-test" element={<ManifestTest />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </TonConnectUIProvider>
);

export default App;
