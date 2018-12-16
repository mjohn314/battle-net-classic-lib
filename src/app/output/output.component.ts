import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-output',
  templateUrl: './output.component.html',
  styleUrls: ['./output.component.scss']
})
export class OutputComponent implements OnInit, OnDestroy {
  @Input() addLine$: Observable<OutputLine>;

  lines: _OutputLine[] = [];

  private ngUnsubscribe = new Subject<void>();

  constructor() { }

  ngOnInit() {
    if (this.addLine$ === null || this.addLine$ === undefined) {
      throw new Error('Observable must exist before creating this component');
    }

    this.addLine$.pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((line) => this.lines.push({
        ...line,
        time: new Date()
      }));
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

}

export enum OutputLineType {
  Info,
  Message,
  Whisper,
  Error
}

export interface OutputLine {
  type: OutputLineType;
  contents: string;
}

interface _OutputLine extends OutputLine {
  time: Date;
}