"use client"; // Next.js 15.1.7에서는 필수는 아니지만, 클라이언트 코드임을 명시할 수 있음
import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SocketClient: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    // 현재 도메인에서 '/api/socket' 경로로 Socket.IO 서버에 연결
    const newSocket = io(undefined, { path: '/api/socket' });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to Socket.IO server, socket ID:', newSocket.id);
    });

    newSocket.on('message', (data: any) => {
      console.log('Received message:', data);
      setMessages((prev) => [...prev, data]);
    });

    // 컴포넌트 언마운트 시 연결 해제
    return () => {
      newSocket.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (socket) {
      socket.emit('message', 'Hello from React!');
    }
  };

  return (
    <div>
      <h2>Socket.io Client</h2>
      <button onClick={sendMessage}>Send Message</button>
      <h3>Received Messages:</h3>
      <ul>
        {messages.map((msg, idx) => (
          <li key={idx}>{msg}</li>
        ))}
      </ul>
    </div>
  );
};

export default SocketClient;
