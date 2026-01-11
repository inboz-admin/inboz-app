import { useState, useEffect, useRef } from 'react';
import { getSocket } from '@/services/socket';
import type { Socket } from 'socket.io-client';

export interface CampaignProgress {
  stage: 'preparing' | 'sending' | 'completed' | 'failed';
  campaignId: string;
  totalEmails: number;
  queuedEmails: number;
  sentEmails: number;
  deliveredEmails: number;
  failedEmails: number;
  percentage: number;
  currentStep: number;
  totalSteps: number;
  timestamp: Date | string;
}

export interface StepProgress {
  stepId: string;
  stepOrder: number;
  emailsSent: number;
  emailsDelivered: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsFailed: number;
  percentage: number;
  timestamp: Date | string;
}

export function useCampaignProgress(campaignId: string | null) {
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress | null>(null);
  const [stepProgress, setStepProgress] = useState<Map<string, StepProgress>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!campaignId) {
      // Clear progress when no campaign
      setCampaignProgress(null);
      setStepProgress(new Map());
      return;
    }

    console.log('📡 Setting up real-time progress for campaign:', campaignId);

    const socket = getSocket();
    socketRef.current = socket;

    // Connection handlers
    const handleConnect = () => {
      console.log('🔌 Socket connected for campaign:', campaignId);
      setIsConnected(true);
      // Join campaign room for targeted updates
      socket.emit('join-campaign-room', campaignId);
    };

    const handleDisconnect = () => {
      console.log('🔌 Socket disconnected for campaign:', campaignId);
      setIsConnected(false);
    };

    // Campaign progress handler
    const handleCampaignProgress = (data: CampaignProgress) => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;
      
      console.log('📊 Campaign progress update:', {
        campaignId: data.campaignId,
        sentEmails: data.sentEmails,
        totalEmails: data.totalEmails,
        percentage: data.percentage.toFixed(2) + '%',
        timeSinceLastUpdate: timeSinceLastUpdate + 'ms'
      });

      lastUpdateRef.current = now;
      setCampaignProgress(data);

      // If campaign completed, show notification
      if (data.stage === 'completed' || data.percentage >= 100) {
        console.log('🎉 Campaign completed!');
      }
    };

    // Step progress handler (supports multiple steps)
    const handleStepProgress = (data: StepProgress) => {
      console.log('📊 Step progress update:', {
        stepId: data.stepId,
        stepOrder: data.stepOrder,
        emailsSent: data.emailsSent,
        percentage: data.percentage.toFixed(2) + '%'
      });

      setStepProgress((prev) => {
        const updated = new Map(prev);
        updated.set(data.stepId, data);
        return updated;
      });
    };

    // Register event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on(`campaign-progress-campaign-${campaignId}`, handleCampaignProgress);

    // If already connected, join room immediately
    if (socket.connected) {
      handleConnect();
    }

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up campaign progress listeners for:', campaignId);
      
      if (socketRef.current) {
        socketRef.current.emit('leave-campaign-room', campaignId);
        socketRef.current.off('connect', handleConnect);
        socketRef.current.off('disconnect', handleDisconnect);
        socketRef.current.off(`campaign-progress-campaign-${campaignId}`, handleCampaignProgress);
      }

      setCampaignProgress(null);
      setStepProgress(new Map());
    };
  }, [campaignId]);

  return {
    campaignProgress,
    stepProgress: Array.from(stepProgress.values()),
    isConnected,
    lastUpdate: lastUpdateRef.current,
  };
}

