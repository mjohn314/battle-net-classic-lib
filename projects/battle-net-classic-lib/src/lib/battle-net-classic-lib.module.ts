import { NgModule, ModuleWithProviders } from '@angular/core';
import { BNCLCoreService } from './services/bncl-core.service';

@NgModule({
  imports: [],
  declarations: [],
  exports: []
})
export class BattleNetClassicLibModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: BattleNetClassicLibModule,
      providers: [
        BNCLCoreService
      ]
    }
  }
}
