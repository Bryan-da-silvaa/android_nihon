import { requireNativeView } from 'expo';
import * as React from 'react';

import { WidgetManagerViewProps } from './WidgetManager.types';

const NativeView: React.ComponentType<WidgetManagerViewProps> =
  requireNativeView('WidgetManager');

export default function WidgetManagerView(props: WidgetManagerViewProps) {
  return <NativeView {...props} />;
}
