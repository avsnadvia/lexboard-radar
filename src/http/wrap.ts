import { RequestHandler, Request, Response, NextFunction } from "express";

/** Envolve handlers async para que erros caiam no error-handler do Express. */
export const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
