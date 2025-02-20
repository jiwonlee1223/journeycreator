import { NextApiRequest } from 'next';
import type { NextApiResponse } from 'next';
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

export const config = {
  api: {
    bodyParser: false, // Socket.IO는 스트림 방식으로 데이터를 처리하므로 bodyParser 비활성화
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket) {
    return res.status(500).json({ error: 'Socket is not available' });
  }
  // res.socket.server는 Next.js에서 HTTP 서버를 참조할 수 있도록 제공
  const httpServer: NetServer = (res.socket as any).server;

  // Socket.IO 서버가 아직 초기화되지 않았다면 초기화
  if (!(res.socket as any).server.io) {
    console.log('Initializing Socket.IO...');
    const io = new SocketIOServer(httpServer, {
      path: '/api/socket', // 클라이언트가 이 경로로 연결하게 됨
    });
    (res.socket as any).server.io = io;

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      // 클라이언트로부터 'message' 이벤트 수신 시, 모든 클라이언트에게 브로드캐스트
      socket.on('message', (data) => {
        console.log('Received message:', data);
        io.emit('message', data);
      });
    });
  }
  res.end();
}
