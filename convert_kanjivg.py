import xml.etree.ElementTree as ET
import json
import os
import glob

def convert_kanjivg():
    # 1. Trouver le fichier XML à la racine
    xml_files = glob.glob("kanjivg-*.xml")
    if not xml_files:
        print("❌ Aucun fichier kanjivg-XXXX.xml trouvé à la racine.")
        print("Télécharge le .xml.gz sur GitHub, décompresse-le et place-le ici.")
        return

    input_file = xml_files[0]
    output_dir = "assets/data"
    output_file = os.path.join(output_dir, "kanjivg.json")

    print(f"🏗️  Conversion de {input_file} en JSON...")

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    kanji_data = {}

    try:
        tree = ET.parse(input_file)
        root = tree.getroot()

        # On cherche tous les éléments <kanji> n'importe où dans le fichier
        for kanji in root.iter():
            if kanji.tag.endswith('kanji'):
                # L'attribut element contient le caractère, sinon on essaie de le déduire de l'ID
                char = kanji.get('element')
                
                # Si pas d'element, on essaie d'extraire depuis l'id (format kvg:kanji_04e00)
                if not char:
                    kvg_id = kanji.get('id')
                    if kvg_id and '_' in kvg_id:
                        try:
                            hex_val = kvg_id.split('_')[-1]
                            char = chr(int(hex_val, 16))
                        except:
                            continue

                if not char:
                    continue
                
                paths = []
                # On cherche tous les <path> dans ce kanji
                for path in kanji.iter():
                    if path.tag.endswith('path'):
                        d = path.get('d')
                        if d:
                            paths.append(d)
                
                if paths:
                    kanji_data[char] = paths

        # Sauvegarde en JSON
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(kanji_data, f, ensure_ascii=False)

        print(f"✅ Terminé ! {len(kanji_data)} kanjis convertis dans {output_file}")

    except Exception as e:
        print(f"❌ Erreur lors de la conversion : {e}")

if __name__ == "__main__":
    convert_kanjivg()
