# Nihon Mobile - Premium AI Japanese Learning App

## Project Overview
Nihon Mobile is a premium, native mobile application designed for mastering the Japanese language. It is a high-performance, offline-first application that integrates on-device Large Language Models (LLM) to provide a private and instantaneous learning assistant.

### Core Philosophy
- **Mobile-First**: Strictly tailored for touch, gestures, and small screens.
- **Local-First**: All data, dictionaries, and AI models run locally on the device for maximum privacy and zero latency.
- **Hardware Accelerated**: Optimized to leverage modern mobile GPUs (especially Snapdragon 8 Gen 3 / S24 Ultra).

---

## Technical Stack

### AI Engine (LocalSensei)
- **Model**: Gemma 2.4B-it (E4B / 4-bit Quantized).
- **Backend**: [LiteRT-LM](https://ai.google.dev/edge/litert) (formerly MediaPipe LLM Inference).
- **Acceleration**: Full GPU (OpenCL) support with fallback to CPU.
- **Optimizations**:
  - **Warm-up Phase**: Silent dummy prompt on initialization to compile GPU kernels.
  - **Context Limit**: 4096 tokens max for memory stability.
  - **Clean Output**: Native Regex parsing to remove technical wrappers (e.g., `Text(text=...)`).

### Frontend & UI
- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (App Router).
- **Styling**: NativeWind (Tailwind CSS 4) with premium dark aesthetics.
- **Chat Experience**: 
  - **Asynchronous Streaming**: Real-time token reception via `EventEmitter`.
  - **Bridge Throttling**: Updates sent every 100ms to prevent React Native bridge saturation.
  - **Performance Metrics**: Real-time display of Tokens Per Second (TPS).
  - **Keyboard Handling**: Robust manual pixel-offset calculation for perfect input alignment.

### Data & Infrastructure
- **Database**: SQLite (`expo-sqlite`) for all SRS data and vocab.
- **App Variants**: 
  - Dual-installation support (Dev vs Prod) via native Gradle configuration (`applicationIdSuffix`).
  - **Nihon Dev**: `com.tabitha.nihon.dev`
  - **Nihon**: `com.tabitha.nihon`
  - Managed via `app.config.js` and `create-apk.sh`.

---

## Project Structure

- `modules/local-sensei/`: Custom Expo native module for LiteRT-LM interaction.
  - `android/src/main/java/.../LocalSenseiModule.kt`: Native Kotlin logic for AI streaming and GPU management.
- `app/`: Native routing (including the premium `ai_chat.tsx`).
- `services/` & `db/`: Local-first data persistence and SRS logic.
- `scripts/`: Maintenance and build tools (including `create-apk.sh`).

---

## Current Status & Roadmap

### Completed ✅
- Full GPU-accelerated AI integration (LocalSensei).
- Real-time streaming with UI throttling for extreme fluidity.
- Triple-buffered keyboard avoidance for Android.
- Dynamic build system for Dev/Prod variants.

### Ongoing 🚀
- Performance monitoring for long AI conversations.
- Integration of SRS vocabulary suggestions within the AI chat.

---

## Maintenance Commands

- `npm run android:dev`: Launch the development variant.
- `npm run android`: Launch the production variant.
- `./create-apk.sh`: Interactive script to build and serve APKs via local HTTP server.

*Note: The model file must be present at `${FileSystem.documentDirectory}/gemma-4-E4B-it.litertlm` for the engine to initialize.*
