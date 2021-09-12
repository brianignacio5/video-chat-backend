import * as express from "express";
import { createServer, Server } from "http";
import { Server as SocketServer } from "socket.io";
import { ExtendedSocket, IMessage, IUser } from "./types";

export class ChatServer {
  public static readonly PORT: number = 5000;
  public static readonly FRONTEND_PORT: number = 8080;

  private app: express.Application;
  private port: string | number;
  private server: Server;
  private io: SocketServer;

  private activeSockets: string[] = [];
  private messages: IMessage[] = [];
  private users: IUser[] = [];

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
    this.io.on("connection", (socket: ExtendedSocket) => {
      console.log(`${socket.id} has connected`);
      console.log(`${socket.username} has connected`);

      socket.on("disconnect", () => {
        this.activeSockets.splice(this.activeSockets.indexOf(socket.id), 1);
        const indexToDel = this.users.findIndex(
          (user) => user.id === socket.id
        );
        if (indexToDel !== -1) {
          this.users.splice(indexToDel, 1);
        }
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

      const existingUser = this.users.find(
        (currUser) => currUser.id === socket.id
      );

      if (!existingUser) {
        socket.emit("addUsers", {
          users: this.users,
        });

        socket.emit("myUserInfo", {
          id: socket.id,
          name: socket.username,
        });

        this.activeSockets.push(socket.id);
        this.users.push({
          id: socket.id,
          name: socket.username,
        });

        socket.broadcast.emit("addUsers", {
          users: [{ id: socket.id, name: socket.username }],
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
            from: data.from,
          },
        };
        socket.to(data.to).emit("messageFromServer", msgToSend);
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
    this.io = new SocketServer(this.server, {
      cors: {
        origin:
          "http://localhost:" +
          (process.env.FRONTEND_PORT || ChatServer.FRONTEND_PORT),
        methods: ["GET", "POST"],
      },
    });

    this.io.use((socket: ExtendedSocket, next) => {
      const username = socket.handshake.auth.username;
      if (!username) {
        return next(new Error("Invalid username"));
      }
      socket.username = username;
      next();
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}
