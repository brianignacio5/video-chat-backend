import * as express from "express";
import { createServer, Server } from "http";
import * as socketIo from "socket.io";

export class ChatServer {
  public static readonly PORT: number = 5000;

  private app: express.Application;
  private port: string | number;
  private server: Server;
  private io: socketIo.Server;

  private activeSockets: string[] = [];

  constructor() {
    this.createApp();
    this.config();
    this.createServer();
    this.sockets();
    this.listen();
  }

  private createApp() {
    this.app = express();
    this.app.use(express.static("public"));
  }

  private config() {
    this.port = process.env.PORT || ChatServer.PORT;
  }

  private listen() {
    this.server.listen(this.port, () => {
      console.log(`Listening in port ${this.port}`);
    });
    this.io.on("connection", (socket) => {
      console.log(`${socket.id} has connected`);

      socket.on("disconnect", () => {
        this.activeSockets.splice(this.activeSockets.indexOf(socket.id), 1);
        this.io.emit("remove-user", socket.id);
      });

      socket.on("make-offer", function (data) {
        socket.to(data.to).emit("offer-made", {
          offer: data.offer,
          socket: socket.id,
        });
      });

      socket.on("make-answer", function (data) {
        socket.to(data.to).emit("answer-made", {
          socket: socket.id,
          answer: data.answer,
        });
      });

      const existingSocket = this.activeSockets.find(
        (currSocket) => currSocket === socket.id
      );

      if (!existingSocket) {
        socket.emit("add-users", {
          users: this.activeSockets
        });
        this.activeSockets.push(socket.id);
        
        socket.broadcast.emit("add-users", {
          users: [socket.id],
        });
      }
    });
  }

  private createServer() {
    this.server = createServer(this.app);
  }

  private sockets() {
    this.io = new socketIo.Server(this.server);
  }

  public getApp(): express.Application {
    return this.app;
  }
}
