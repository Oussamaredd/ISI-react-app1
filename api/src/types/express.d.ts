declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      id?: string | number | object;
    }
  }
}

export {};
