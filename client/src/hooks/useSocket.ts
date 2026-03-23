import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../lib/auth';

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
    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef.current;
}
