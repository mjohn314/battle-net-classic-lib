import { ResponseType } from './response-type.enum';
import { ResponseStatus } from './response-status.model';

export interface Response<T extends Object> {
  command: ResponseType;
  request_id: number;
  status: ResponseStatus;
  payload: T;
}