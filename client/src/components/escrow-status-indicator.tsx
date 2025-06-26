import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import type { Escrow } from "@shared/schema";

interface EscrowStatusIndicatorProps {
  conversationId: number;
}

export default function EscrowStatusIndicator({ conversationId }: EscrowStatusIndicatorProps) {
  const { data: escrows = [] } = useQuery<Escrow[]>({
    queryKey: ["/api/conversations", conversationId, "escrows"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const activeEscrows = escrows.filter(e => 
    ["pending", "funded", "confirming"].includes(e.status)
  );

  if (activeEscrows.length === 0) return null;

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          icon: <Clock className="h-3 w-3" />,
          color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
          text: "Pending"
        };
      case "funded":
        return {
          icon: <Shield className="h-3 w-3" />,
          color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
          text: "Funded"
        };
      case "confirming":
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
          text: "Confirming"
        };
      default:
        return {
          icon: <Shield className="h-3 w-3" />,
          color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
          text: "Active"
        };
    }
  };

  const mostUrgentEscrow = activeEscrows.find(e => e.status === "confirming") ||
                          activeEscrows.find(e => e.status === "funded") ||
                          activeEscrows[0];

  const statusInfo = getStatusInfo(mostUrgentEscrow.status);

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-50 to-cyan-50 dark:from-orange-950 dark:to-cyan-950 border-l-4 border-orange-500 dark:border-cyan-400 mb-2">
      <Shield className="h-4 w-4 text-orange-500 dark:text-cyan-400" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {activeEscrows.length} Active Escrow{activeEscrows.length > 1 ? 's' : ''}
          </span>
          <Badge className={`${statusInfo.color} flex items-center gap-1`}>
            {statusInfo.icon}
            <span className="text-xs">{statusInfo.text}</span>
          </Badge>
        </div>
        {mostUrgentEscrow && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {mostUrgentEscrow.initiatorRequiredAmount} {mostUrgentEscrow.initiatorCurrency} ⇄ {mostUrgentEscrow.participantRequiredAmount} {mostUrgentEscrow.participantCurrency}
          </p>
        )}
      </div>
    </div>
  );
}