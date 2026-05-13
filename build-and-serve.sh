#!/bin/bash

# Couleurs pour le terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${PURPLE}--- NIHON BUILD & SERVE ---${NC}"

# 1. Récupérer l'IP locale (en0 pour WiFi, en1 pour Ethernet/Autre)
IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)

if [ -z "$IP" ]; then
    echo -e "${RED}❌ Impossible de trouver ton adresse IP locale. Es-tu connecté au WiFi ?${NC}"
    exit 1
fi

echo -e "${BLUE}ℹ️  Ton adresse IP : ${GREEN}$IP${NC}"

# 2. Lancer le build
echo -e "${BLUE}🏗️  Compilation de l'APK (Debug)... Patientez...${NC}"
cd android
./gradlew assembleDebug

# 3. Vérifier si le build a réussi
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build réussi !${NC}"
    echo -e "${BLUE}🌐 Lancement du serveur sur : ${PURPLE}http://$IP:8000${NC}"
    echo -e "${BLUE}📂 Se déplacer dans le dossier APK...${NC}"
    
    cd app/build/outputs/apk/debug/
    
    echo -e "${GREEN}👉 Ouvre Chrome sur ton tel et tape : http://$IP:8000${NC}"
    echo -e "${BLUE}Appuie sur Ctrl+C pour arrêter le serveur quand tu as fini.${NC}"
    
    python3 -m http.server 8000
else
    echo -e "${RED}❌ Le build a échoué. Vérifie les erreurs ci-dessus.${NC}"
    exit 1
fi
