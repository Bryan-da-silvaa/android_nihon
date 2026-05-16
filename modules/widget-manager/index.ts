// Reexport the native module. On web, it will be resolved to WidgetManagerModule.web.ts
// and on native platforms to WidgetManagerModule.ts
export { default as WidgetManagerModule } from './src/WidgetManagerModule';
export * from './src/WidgetManager.types';
