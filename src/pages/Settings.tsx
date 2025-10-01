import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";
import { useToast } from "@/hooks/use-toast";
import { useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import {
  Camera,
  Save,
  User,
  Mail,
  Globe,
  Palette,
  Bell,
  Shield,
  Download,
  Wallet,
} from "lucide-react";
import { shortenAddress } from "@/lib/utils";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();

  // Profile state
  const [profile, setProfile] = useState({
    name: "Agent User",
    email: "user@example.com",
    avatar: "",
  });

  // Settings state
  const [settings, setSettings] = useState({
    language: "en",
    notifications: true,
    autoSave: true,
    dataSharing: false,
  });

  const handleProfileSave = () => {
    // Simulate saving profile
    toast({
      title: "Профиль сохранен",
      description: "Ваши изменения профиля успешно сохранены",
    });
  };

  const handleSettingsSave = () => {
    // Simulate saving settings
    toast({
      title: "Настройки сохранены",
      description: "Ваши настройки успешно применены",
    });
  };

  const handleAvatarChange = () => {
    // Simulate avatar upload
    toast({
      title: "Функция в разработке",
      description: "Загрузка аватара будет доступна в следующей версии",
      variant: "default",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Настройки</h1>
        <p className="text-muted-foreground">
          Управляйте своим профилем и настройками приложения
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Профиль пользователя
          </CardTitle>
          <CardDescription>
            Управляйте информацией своего профиля
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar} alt={profile.name} />
                <AvatarFallback className="text-2xl">
                  {profile.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="outline"
                className="absolute -bottom-2 -right-2 h-8 w-8"
                onClick={handleAvatarChange}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 space-y-4 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Имя</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    placeholder="Введите ваше имя"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                    placeholder="Введите ваш email"
                  />
                </div>
              </div>
              <Button onClick={handleProfileSave} className="w-full sm:w-auto">
                <Save className="h-4 w-4 mr-2" />
                Сохранить профиль
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            TON Кошелек
          </CardTitle>
          <CardDescription>
            Управление подключением к TON-кошельку
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {wallet ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Подключенный кошелек</Label>
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-sm bg-muted px-3 py-2 rounded-md flex-1">
                      {shortenAddress(wallet.account.address, 6, 4)}
                    </div>
                    <Badge variant="secondary">{wallet.device.appName}</Badge>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => tonConnectUI.disconnect()}
                  className="w-full sm:w-auto"
                >
                  Отключить
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Ваш кошелек подключен. Вы можете использовать его для
                взаимодействия со смарт-контрактами и выполнения транзакций.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  Подключите ваш TON кошелек для взаимодействия со
                  смарт-контрактами
                </p>
                <div className="flex justify-center">
                  <Button onClick={() => tonConnectUI.openModal()}>
                    Подключить кошелек
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Настройки приложения
          </CardTitle>
          <CardDescription>
            Настройте внешний вид и поведение приложения
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Тема оформления
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <Label>Цветовая схема</Label>
                <p className="text-sm text-muted-foreground">
                  Выберите тему для интерфейса приложения
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Текущая:{" "}
                  {theme === "dark"
                    ? "Темная"
                    : theme === "light"
                    ? "Светлая"
                    : "Системная"}
                </span>
                <ModeToggle />
              </div>
            </div>
          </div>

          <Separator />

          {/* Language Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Язык и регион
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <Label>Язык интерфейса</Label>
                <p className="text-sm text-muted-foreground">
                  Выберите предпочитаемый язык
                </p>
              </div>
              <Select
                value={settings.language}
                onValueChange={(value) =>
                  setSettings({ ...settings, language: value })
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Выберите язык" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Notification Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Уведомления
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Уведомления о задачах</Label>
                  <p className="text-sm text-muted-foreground">
                    Получать уведомления о статусе задач
                  </p>
                </div>
                <Switch
                  checked={settings.notifications}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notifications: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Автосохранение</Label>
                  <p className="text-sm text-muted-foreground">
                    Автоматически сохранять изменения
                  </p>
                </div>
                <Switch
                  checked={settings.autoSave}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, autoSave: checked })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Privacy Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Конфиденциальность
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <Label>Обмен данными</Label>
                <p className="text-sm text-muted-foreground">
                  Разрешить обмен анонимными данными для улучшения сервиса
                </p>
              </div>
              <Switch
                checked={settings.dataSharing}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, dataSharing: checked })
                }
              />
            </div>
          </div>

          <Separator />

          {/* Data Export */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Download className="h-4 w-4" />
              Экспорт данных
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <Label>Загрузить данные</Label>
                <p className="text-sm text-muted-foreground">
                  Скачайте копию всех ваших данных
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  toast({
                    title: "Функция в разработке",
                    description:
                      "Экспорт данных будет доступен в следующей версии",
                  })
                }
              >
                <Download className="h-4 w-4 mr-2" />
                Экспорт
              </Button>
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={handleSettingsSave} className="w-full sm:w-auto">
              <Save className="h-4 w-4 mr-2" />
              Сохранить настройки
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
