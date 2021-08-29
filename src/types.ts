import { Socket } from "socket.io";

export interface IMessage {
  content: string;
  userId: string;
}

export interface IUser {
  id: string;
  name: string;
}

export interface ExtendedSocket extends Socket {
  username: string;
}