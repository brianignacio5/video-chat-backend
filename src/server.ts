import { ChatServer } from "./chatServer";
import { Routes } from "./routes/routes";

let app = new ChatServer().getApp();

const route = new Routes(app);

route.getRoutes();

export { app };
