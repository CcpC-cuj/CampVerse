import io from 'socket.io-client';

const DEFAULT_API_URL = 'https://imkrish-campverse-backend.hf.space';

let socket = null;
let refCount = 0;
let currentToken = null;

const getApiUrl = () => import.meta.env.VITE_API_URL || DEFAULT_API_URL;

export const acquireSocket = () => {
  refCount += 1;

  if (!socket) {
    const API_URL = getApiUrl();
    const token = localStorage.getItem('token');
    currentToken = token;

    socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      if (token) {
        socket.emit('authenticate', token);
      }
    });
  } else {
    const token = localStorage.getItem('token');
    if (token && token !== currentToken && socket.connected) {
      currentToken = token;
      socket.emit('authenticate', token);
    }
  }

  return socket;
};

export const releaseSocket = () => {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
};

export const resetSocket = () => {
  if (socket) {
    socket.disconnect();
  }
  socket = null;
  refCount = 0;
  currentToken = null;
};
