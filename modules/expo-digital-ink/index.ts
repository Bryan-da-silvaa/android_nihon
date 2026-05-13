import { requireNativeModule } from 'expo-modules-core';

interface StrokePoint {
  x: number;
  y: number;
  t?: number;
}

interface Stroke {
  points: StrokePoint[];
}

interface ExpoDigitalInkModule {
  downloadModel(): Promise<boolean>;
  recognize(strokes: Stroke[]): Promise<string[]>;
}

const DigitalInk = requireNativeModule<ExpoDigitalInkModule>('ExpoDigitalInkModule');

export default DigitalInk;
