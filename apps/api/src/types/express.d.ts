import type { Session, User } from "./index";

declare global {
  namespace Express {
    interface Request {
      session: NonNullable<Session>;
      user: User;
    }
  }
}

export {};
