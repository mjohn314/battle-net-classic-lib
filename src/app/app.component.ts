import { Component, OnInit, OnDestroy } from '@angular/core';
import { environment } from '../environments/environment';
import { BNCLCoreService } from 'battle-net-classic-lib';
import { OutputLine, OutputLineType } from './output/output.component';
import { Subject } from 'rxjs';
import { FormControl, Validators } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';
import { MessageEventPayload } from 'battle-net-classic-lib';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  readonly version = environment.version;
  message$ = new Subject<OutputLine>();

  apiKeyControl = new FormControl('', [Validators.required]);
  messageControl = new FormControl('', [Validators.required]);

  private ngUnsubscribe = new Subject<void>();

  constructor(
    private readonly bnclCore: BNCLCoreService
  ) { }

  ngOnInit() {
    this.bnclCore.messageReceived$.pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((message) => this.onMessageReceived(message));
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  connect() {
    this.addInfoMessage('Connecting...');
    this.bnclCore.connect(this.apiKeyControl.value);
  }

  sendMessage() {
    const message = this.messageControl.value;
    this.addInfoMessage(`Self - ${message}`);
    this.bnclCore.sendMessage(message);
  }

  private onMessageReceived(data: MessageEventPayload): void {
    this.addInfoMessage(`${data.user_id} - ${data.message}`);
  }

  private addInfoMessage(message: string) {
    this.message$.next({
      type: OutputLineType.Info,
      contents: message
    });
  }

  private addErrorMessage(message: string) {
    this.message$.next({
      type: OutputLineType.Error,
      contents: message
    });
  }
}
