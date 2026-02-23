import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Bell, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NotificationsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationsModal({ open, onClose }: NotificationsModalProps) {
  const { toast } = useToast();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [messagePreview, setMessagePreview] = useState(true);
  const [autoConnectWallet, setAutoConnectWallet] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedPushNotifications = localStorage.getItem('pushNotifications');
    const savedMessagePreview = localStorage.getItem('messagePreview');
    const savedAutoConnect = localStorage.getItem('autoConnectWallet');
    
    if (savedPushNotifications !== null) {
      setPushNotifications(JSON.parse(savedPushNotifications));
    }
    if (savedMessagePreview !== null) {
      setMessagePreview(JSON.parse(savedMessagePreview));
    }
    if (savedAutoConnect !== null) {
      setAutoConnectWallet(JSON.parse(savedAutoConnect));
    }
  }, []);

  const handlePushNotificationsChange = (enabled: boolean) => {
    setPushNotifications(enabled);
    localStorage.setItem('pushNotifications', JSON.stringify(enabled));
    
    if (enabled) {
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            toast({
              title: "Notifications Enabled",
              description: "You'll receive notifications for new messages"
            });
          }
        });
      }
    } else {
      toast({
        title: "Notifications Disabled",
        description: "You won't receive push notifications"
      });
    }
  };

  const handleMessagePreviewChange = (enabled: boolean) => {
    setMessagePreview(enabled);
    localStorage.setItem('messagePreview', JSON.stringify(enabled));
    
    toast({
      title: enabled ? "Message Preview Enabled" : "Message Preview Disabled",
      description: enabled 
        ? "Message content will be shown in notifications"
        : "Only sender name will be shown in notifications"
    });
  };

  const handleAutoConnectChange = (enabled: boolean) => {
    setAutoConnectWallet(enabled);
    localStorage.setItem('autoConnectWallet', JSON.stringify(enabled));
    
    toast({
      title: enabled ? "Auto-connect Enabled" : "Auto-connect Disabled",
      description: enabled 
        ? "Your wallet will connect automatically"
        : "Manual wallet connection required"
    });
  };

  const testNotification = () => {
    if (!pushNotifications) {
      toast({
        title: "Notifications Disabled",
        description: "Enable push notifications to test"
      });
      return;
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('COYN Messenger', {
        body: messagePreview 
          ? 'Chris: Hey! Just sent you some COYN tokens 🪙' 
          : 'Chris sent you a message',
        icon: '/generated-icon.png',
        tag: 'coyn-test',
        requireInteraction: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => {
        notification.close();
      }, 5000);
    } else {
      toast({
        title: "Notification Permission Required",
        description: "Please allow notifications to test this feature"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[380px] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 overflow-hidden rounded-2xl gap-0 shadow-2xl [&>button[class*='absolute']]:hidden">
        <div className="relative px-6 pt-8 pb-6 text-center bg-gradient-to-b from-orange-50 dark:from-orange-950/30 to-transparent">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-orange-100 dark:bg-orange-900/50 shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30 border border-orange-200 dark:border-orange-700">
            <Bell className="w-8 h-8 text-orange-500" />
          </div>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Notifications
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            Control how you receive notifications
          </DialogDescription>
        </div>

        <div className="px-6 pb-2">
          <div className="space-y-2">
            {/* Push Notifications */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-50 dark:bg-orange-900/30">
                <Bell className="w-[18px] h-[18px] text-orange-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Push Notifications</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Receive notifications for new messages
                </div>
              </div>
              <Switch
                checked={pushNotifications}
                onCheckedChange={handlePushNotificationsChange}
                className="data-[state=checked]:bg-orange-500"
              />
            </div>

            {/* Message Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-50 dark:bg-orange-900/30">
                <Bell className="w-[18px] h-[18px] text-orange-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Message Preview</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Show message content in notifications
                </div>
              </div>
              <Switch
                checked={messagePreview}
                onCheckedChange={handleMessagePreviewChange}
                className="data-[state=checked]:bg-orange-500"
              />
            </div>

            {/* Test Notification Button */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-50 dark:bg-orange-900/30">
                <Bell className="w-[18px] h-[18px] text-orange-400" />
              </div>
              <Button 
                onClick={testNotification}
                variant="outline"
                className="flex-1 border-0 bg-transparent hover:bg-transparent text-gray-900 dark:text-gray-100 hover:text-orange-600 dark:hover:text-orange-400 font-medium text-sm p-0 h-auto justify-start"
              >
                Test Notification
              </Button>
            </div>

            {/* Privacy & Security Section */}
            <div className="mt-2 flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-50 dark:bg-orange-900/30">
                <Shield className="w-[18px] h-[18px] text-orange-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Privacy & Security</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Auto-connect wallet on app open
                </div>
              </div>
              <Switch
                checked={autoConnectWallet}
                onCheckedChange={handleAutoConnectChange}
                className="data-[state=checked]:bg-orange-500"
              />
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 pt-4 space-y-3">
          <Button
            onClick={onClose}
            className="w-full h-12 rounded-xl font-semibold text-sm shadow-lg transition-all bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 shadow-orange-300/30 text-white"
          >
            Done
          </Button>

          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full h-10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-sm"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}