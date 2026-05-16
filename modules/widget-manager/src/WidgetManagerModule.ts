import { NativeModule, requireNativeModule } from 'expo';

import { WidgetManagerModuleEvents } from './WidgetManager.types';

declare class WidgetManagerModule extends NativeModule<WidgetManagerModuleEvents> {
  setWidgetData(data: string): void;
  startLockScreenService(): void;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<WidgetManagerModule>('WidgetManager');
