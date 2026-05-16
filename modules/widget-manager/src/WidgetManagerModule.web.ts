import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './WidgetManager.types';

type WidgetManagerModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class WidgetManagerModule extends NativeModule<WidgetManagerModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(WidgetManagerModule, 'WidgetManagerModule');
