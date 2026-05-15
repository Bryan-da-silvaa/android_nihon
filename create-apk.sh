#!/bin/bash

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}--- NIHON APK BUILDER ---${NC}"

# 1. IP Locale
IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1)

# 1b. Nettoyage
echo -e "${BLUE}🧹 Nettoyage des anciens fichiers...${NC}"
rm -rf ../dist_apks
mkdir -p ../dist_apks

# 2. Menu
echo -e "${BLUE}Que veux-tu construire ?${NC}"
echo "1) Version DEV (Nihon Dev - Debug)"
echo "2) Version PROD (Nihon - Release)"
echo "3) Les deux"
read -p "Choix (1/2/3): " CHOICE

cd android

if [ "$CHOICE" == "1" ] || [ "$CHOICE" == "3" ]; then
    echo -e "${BLUE}🏗️  Build DEV...${NC}"
    export APP_VARIANT=development
    ./gradlew assembleDebug
fi

if [ "$CHOICE" == "2" ] || [ "$CHOICE" == "3" ]; then
    echo -e "${BLUE}🏗️  Build PROD...${NC}"
    export APP_VARIANT=production
    ./gradlew assembleRelease
fi

echo -e "${GREEN}✅ Build(s) terminé(s) !${NC}"

# Création d'un dossier temporaire pour servir les APKs
mkdir -p ../dist_apks
cp app/build/outputs/apk/debug/app-debug.apk ../dist_apks/Nihon_Dev.apk 2>/dev/null
cp app/build/outputs/apk/release/app-release.apk ../dist_apks/Nihon_Prod.apk 2>/dev/null

echo -e "${BLUE}🌐 Serveur de téléchargement sur : ${PURPLE}http://$IP:8000${NC}"
echo -e "${GREEN}👉 Télécharge sur ton tel :${NC}"
[ -f "../dist_apks/Nihon_Dev.apk" ] && echo -e "   - http://$IP:8000/Nihon_Dev.apk"
[ -f "../dist_apks/Nihon_Prod.apk" ] && echo -e "   - http://$IP:8000/Nihon_Prod.apk"

cd ../dist_apks
python3 -m http.server 8000
