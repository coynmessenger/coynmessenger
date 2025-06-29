import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, AlertCircle } from "lucide-react";

interface ConnectionStatusProps {
  isConnected: boolean;
  className?: string;
}

export default function ConnectionStatus({ isConnected, className = "" }: ConnectionStatusProps) {
  if (isConnected) {
    return (
      <Badge 
        variant="secondary" 
        className={`bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 ${className}`}
      >
        <Wifi className="w-3 h-3 mr-1" />
        Connected
      </Badge>
    );
  }

  return (
    <Badge 
      variant="destructive" 
      className={`bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 ${className}`}
    >
      <WifiOff className="w-3 h-3 mr-1" />
      Reconnecting...
    </Badge>
  );
}