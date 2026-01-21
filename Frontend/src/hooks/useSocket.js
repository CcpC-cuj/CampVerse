import { useEffect, useRef } from 'react';
import { acquireSocket, releaseSocket } from '../utils/socketManager';

export const useSocket = () => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = acquireSocket();
    return () => releaseSocket();
  }, []);

  return socketRef;
};
