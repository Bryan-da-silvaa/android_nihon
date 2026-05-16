import * as React from 'react';

import { WidgetManagerViewProps } from './WidgetManager.types';

export default function WidgetManagerView(props: WidgetManagerViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
