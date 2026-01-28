import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Bell, Shield, X } from 'lucide-react';
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
      <DialogContent className="w-[95vw] sm:w-[90vw] max-w-md mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-lime-1000" />
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                Notifications
              </DialogTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Control how you receive notifications
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Push Notifications */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Push <span className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded text-sm">Notifications</span>
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Receive notifications for new messages
              </p>
            </div>
            <Switch
              checked={pushNotifications}
              onCheckedChange={handlePushNotificationsChange}
              className="data-[state=checked]:bg-lime-1000"
            />
          </div>

          {/* Message Preview */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Message <span className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded text-sm">Preview</span>
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                <span className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded text-sm">Show</span> message content in notifications
              </p>
            </div>
            <Switch
              checked={messagePreview}
              onCheckedChange={handleMessagePreviewChange}
              className="data-[state=checked]:bg-lime-1000"
            />
          </div>

          {/* Test Notification Button */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <Button 
              onClick={testNotification}
              variant="outline"
              className="w-full border-lime-1000 text-lime-1000 hover:bg-lime-100 dark:hover:bg-lime-800/20"
            >
              Test Notification
            </Button>
          </div>

          {/* Privacy & Security Section */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h3 className="font-medium text-gray-900 dark:text-white">Privacy & Security</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage your privacy and security preferences
            </p>
            
            {/* Auto-connect Wallet */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                  Auto-connect Wallet
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Automatically connect your wallet when opening the app
                </p>
              </div>
              <Switch
                checked={autoConnectWallet}
                onCheckedChange={handleAutoConnectChange}
                className="data-[state=checked]:bg-lime-1000"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}