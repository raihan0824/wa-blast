import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  if (!socketRef.current) {
    socketRef.current = io('/', { autoConnect: false });
  }

  useEffect(() => {
    const socket = socketRef.current!;
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef.current;
}
