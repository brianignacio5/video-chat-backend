import * as express from "express";
import { createServer, Server } from "http";
import * as socketIo from "socket.io";
import { IMessage } from "./types";

export class ChatServer {
  public static readonly PORT: number = 5000;
  public static readonly FRONTEND_PORT: number = 8080;

  private app: express.Application;
  private port: string | number;
  private server: Server;
  private io: socketIo.Server;

  private activeSockets: string[] = [];
  private messages: IMessage[] = [];

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
        this.io.emit("removeUser", socket.id);
      });

      socket.on("makeOffer", function (data) {
        socket.to(data.to).emit("offerMade", {
          offer: data.offer,
          socket: socket.id,
        });
      });

      socket.on("makeAnswer", function (data) {
        socket.to(data.to).emit("answerMade", {
          socket: socket.id,
          answer: data.answer,
        });
      });

      const existingSocket = this.activeSockets.find(
        (currSocket) => currSocket === socket.id
      );

      if (!existingSocket) {
        socket.emit("addUsers", {
          users: this.activeSockets,
        });
        this.activeSockets.push(socket.id);

        socket.broadcast.emit("addUsers", {
          users: [socket.id],
        });
      }

      socket.on("sendTxtMsg", (data) => {
        const newLength = this.messages.push({
          content: data.message,
          userId: socket.id,
        });
        const msgToSend = {
          message: {
            content: data.message,
            id: newLength - 1,
            userId: socket.id,
          },
          from: {
            id: socket.id,
            name: data.from,
          },
        };
        socket.broadcast.emit("messageFromServer", msgToSend);
        socket.emit("messageFromServer", msgToSend);
      });
    });
  }

  public addMessage(message: IMessage) {
    const newLength = this.messages.push(message);
    return newLength - 1;
  }

  private createServer() {
    this.server = createServer(this.app);
  }

  private sockets() {
    this.io = new socketIo.Server(this.server, {
      cors: {
        origin:
          "http://localhost:" +
          (process.env.FRONTEND_PORT || ChatServer.FRONTEND_PORT),
        methods: ["GET", "POST"],
      },
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}
