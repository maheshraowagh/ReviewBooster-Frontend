import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let newSocket: Socket | null = null;

    const connectSocket = async () => {
      if (!isSignedIn) return;

      const token = await getToken();
      if (!token) return;

      const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const baseUrl = url.replace(/\/api$/, ''); // strip /api for root socket connection

      newSocket = io(baseUrl, {
        auth: { token },
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      newSocket.on('connect', () => {
        setConnected(true);
        console.log('Socket connected');
        // When reconnecting, fetch fresh data to catch up on missed events
        queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
        queryClient.invalidateQueries({ queryKey: ['email-campaign'] });
        queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        queryClient.invalidateQueries({ queryKey: ['campaign'] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp'] });
        queryClient.invalidateQueries({ queryKey: ['gbp-audit'] });
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
        console.log('Socket disconnected');
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });

      setSocket(newSocket);
    };

    connectSocket();

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [isSignedIn, getToken, queryClient]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}
