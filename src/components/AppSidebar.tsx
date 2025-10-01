import { Home, MessageSquarePlus, List, Settings, Bot } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTheme } from "@/components/theme-provider";
import darkLogo from "@/logo imgs/intenthub-high-resolution-logo-transparent.png";
import lightLogo from "@/logo imgs/intenthub-high-resolution-logo-grayscale-transparent.png";

const items = [
  { title: "Home", url: "/", icon: Home },
  { title: "Create Task", url: "/create", icon: MessageSquarePlus },
  { title: "Manage Tasks", url: "/manage", icon: List },
  { title: "Agent Tasks", url: "/agent", icon: Bot },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { theme } = useTheme();

  return (
    <Sidebar className={open ? "w-64" : "w-16"} collapsible="icon">
      <SidebarContent>
        {/* Logo Section */}
        <div className="flex justify-center py-4 border-b">
          {open ? (
            <img
              src={theme === "dark" ? darkLogo : lightLogo}
              alt="IntendHub Logo"
              className="h-7 w-auto my-5"
            />
          ) : (
            <img
              src={theme === "dark" ? darkLogo : lightLogo}
              alt="IntendHub Logo"
              className="h-8 w-8 object-contain"
            />
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="h-8 w-8" />
                      {open && (
                        <span className="ml-3 text-lg">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
