import { Injectable } from '@angular/core';

import { webSocket, WebSocketSubjectConfig, WebSocketSubject } from 'rxjs/webSocket';
import { Response } from '../responses/response.model';
import { Request } from '../requests/request.model';
import { Event as SocketEvent } from '../events/event.model';
import { SocketRequest } from '../requests/socket-request.model';
import { ResponseType } from '../responses/response-type.enum';
import { AuthenticateRequest } from '../requests/authenticate-request.model';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { RequestType } from '../requests/request-type.enum';
import { EventType } from '../events/event-type.enum';
import { ConnectRequest } from '../requests/connect-request.model';
import { MessageEventPayload } from '../events/message-event-payload.model';
import { UserUpdateEventPayload } from '../events/user-update-event-payload.model';
import { UserLeaveEventPayload } from '../events/user-leave-event-payload.model';
import { ConnectEventPayload } from '../events/connect-event-payload.model';
import { DisconnectEventPayload } from '../events/disconnect-event-payload.model';
import { DisconnectRequest } from '../requests/disconnect-request.model';
import { map } from 'rxjs/operators';
import { SendMessageRequest } from '../requests/send-message-request.model';
import { SendWhisperRequest } from '../requests/send-whisper-request.model';

@Injectable()
export class BNCLCoreService {
  /**
   * The API key to use when authenticating with the server.
   *
   * @memberof BNCLCoreService
   */
  private apiKey: string;

  /**
   *
   *
   * @memberof BNCLCoreService
   */
  private readonly socketConfig: WebSocketSubjectConfig<Response<Object> | SocketEvent | SocketRequest> = {
    url: 'wss://connect-bot.classic.blizzard.com/v1/rpc/chat',
    closeObserver: { next: (event) => this.onSocketClosed(event) },
    openObserver: { next: (event) => this.onSocketOpened(event) }
  };

  private socket: WebSocketSubject<Response<Object> | SocketEvent | SocketRequest>;

  private _requestId = 0;
  private get nextRequestId(): number {
    return this._requestId++;
  }

  private pending: Subject<Object>[] = [];

  private currentChannelSubject = new BehaviorSubject('');
  public currentChannel$ = this.currentChannelSubject.asObservable();

  private messageReceivedSubject = new Subject<MessageEventPayload>();
  public messageReceived$ = this.messageReceivedSubject.asObservable();

  private userUpdateSubject = new Subject<UserUpdateEventPayload>();
  public userUpdate$ = this.userUpdateSubject.asObservable();

  private userLeaveSubject = new Subject<UserLeaveEventPayload>();
  public userLeave$ = this.userLeaveSubject.asObservable();

  constructor() { }

  /**
   * Authenticates & Connects.
   * @param apiKey
   * @todo Add timeout when authentication fails.
   */
  public connect(apiKey: string): void {
    this.apiKey = apiKey;

    this.socket = webSocket(this.socketConfig);
    this.socket.subscribe(
      (message) => this.onMessageReceived(message),
      (err) => this.onSocketError(err),
      () => this.onSocketCompleted()
    );
  }

  /**
   * Gracefully disconnects.
   * @todo Add failure conditions. EX: not connected.
   */
  public disconnect(): void {
    const resp = new Subject();
    resp.subscribe(() => this.socket.complete());

    this.send(new DisconnectRequest(this.nextRequestId), resp);
  }

  /**
   * Sends a message to the current channel.
   * @param message - The message to send.
   * @returns - If the user was whispered or not.
   * @todo Needs a timeout
   * @todo Should make a generic timeout / map to success/fail pipe
   */
  public sendMessage(message: string): Observable<boolean> {
    const resp = new Subject();

    this.send(new SendMessageRequest(this.nextRequestId, message), resp);

    return resp.asObservable().pipe(map(() => true));
  }

  /**
   *
   * @param userId - The user ID to whisper.
   * @param message - The message to send.
   * @returns - If the user was whispered or not.
   * @todo Needs a timeout
   * @todo Needs better error handling (ie, invalid user? user has blocked you? etc)
   * @todo Should make a generic timeout / map to success/fail pipe
   */
  public sendWhisper(userId: string, message: string): Observable<boolean> {
    const resp = new Subject();

    this.send(new SendWhisperRequest(this.nextRequestId, userId, message), resp);

    return resp.asObservable().pipe(map(() => true));
  }

  private onMessageReceived(message: Response<Object> | SocketEvent | SocketRequest): void {
    // Update our internal request id counter if an unsolicited request id is received
    if (typeof message.request_id === 'number' && message.request_id > this._requestId) {
      this._requestId = message.request_id;
    }

    if (this.isSocketRequest(message)) {
      console.log('Ignoring request message -> %o', message);

      return;
    } else if (this.isSocketResponse(message)) {
      console.log('Received response message -> %o', message);

      this.pending[message.request_id].next(message.payload);
      this.pending[message.request_id].complete();

      return;
    } else if (this.isSocketEvent(message)) {
      console.log('Received event message -> %o', message);
      this.onEventMessageReceived(message);

      return;
    }

    console.log('Unknown message -> %o', message);
  }

  private onSocketError(err: any): void {

  }

  private onSocketCompleted(): void {

  }

  private onSocketClosed(event: CloseEvent): void {

  }

  private onSocketOpened(event: Event): void {
    // whenever the socket connects, we need to authenticate
    const resp = new Subject();
    resp.subscribe(() => this.onAuthenticated());

    this.send(new AuthenticateRequest(this.nextRequestId, this.apiKey), resp);
  }

  private onAuthenticated(): void {
    this.send(new ConnectRequest(this.nextRequestId), new Subject());
  }

  private send(message: Request<Object>, response: Subject<Object>): void {
    // Add the request to the list of pending requests
    this.pending[message.requestId] = response;
    this.socket.next(message.toSocketMessage());
  }

  private isSocketRequest(message: Response<Object> | SocketEvent | SocketRequest): message is SocketRequest {
    return Object.keys(RequestType).map<string>(key => RequestType[key].toLowerCase()).includes(message.command.toLowerCase());
  }

  private isSocketResponse(message: Response<Object> | SocketEvent | SocketRequest): message is Response<Object> {
    return Object.keys(ResponseType).map<string>(key => ResponseType[key].toLowerCase()).includes(message.command.toLowerCase());
  }

  private isSocketEvent(message: Response<Object> | SocketEvent | SocketRequest): message is SocketEvent {
    return Object.keys(EventType).map<string>(key => EventType[key].toLowerCase()).includes(message.command.toLowerCase());
  }

  private onEventMessageReceived(message: SocketEvent): void {
    switch (message.command.toLowerCase()) {
      case EventType.Connect.toLowerCase():
      {
        const payload = message.payload as ConnectEventPayload;
        this.currentChannelSubject.next(payload.channel);
      } break;

      case EventType.Disconnect.toLowerCase():
      {
        const payload = message.payload as DisconnectEventPayload;

      } break;

      case EventType.Message.toLowerCase():
      {
        const payload = message.payload as MessageEventPayload;
        this.messageReceivedSubject.next(payload);

      } break;

      case EventType.UserLeave.toLowerCase():
      {
        const payload = message.payload as UserLeaveEventPayload;
        this.userLeaveSubject.next(payload);

      } break;

      case EventType.UserUpdate.toLowerCase():
      {
        const payload = message.payload as UserUpdateEventPayload;
        this.userUpdateSubject.next(payload);

      } break;

      default: console.error(`Well, this is awkward. I'm not sure how you hit this -- %o`, message);
    }
  }
}
