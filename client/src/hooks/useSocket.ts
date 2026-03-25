import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken, clearAuth } from '../lib/auth';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  if (!socketRef.current) {
    socketRef.current = io('/', {
      autoConnect: false,
      auth: { token: getToken() },
    });
  }

  useEffect(() => {
    const socket = socketRef.current!;
    socket.auth = { token: getToken() };
    socket.connect();

    const onConnectError = (err: Error) => {
      if (err.message === 'Authentication required' || err.message === 'Invalid token') {
        clearAuth();
        window.location.reload();
      }
    };
    socket.on('connect_error', onConnectError);

    return () => {
      socket.off('connect_error', onConnectError);
      socket.disconnect();
    };
  }, []);

  return socketRef.current;
}
