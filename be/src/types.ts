import { Request, Express } from 'express'

export interface MulterRequest extends Request {
  file?: Express.Multer.File
}
