import { getDb } from '../db/client';
import * as FileSystem from 'expo-file-system/legacy';

const MEDIA_DIR = `${FileSystem.documentDirectory}news_media/`;

export interface NHKArticleRaw {
  news_id: string;
  title: string;
  title_with_ruby: string;
  news_publication_date: string;
  news_web_image_uri: string;
  news_easy_voice_uri: string;
  news_web_url: string;
}

export interface Article {
  id: string;
  title: string;
  title_ruby: string;
  content: string;
  image_url: string;
  audio_url: string;
  publication_date: string;
  source_url: string;
  is_news: boolean;
}

const NHK_RSS_URL = 'https://nhkeasier.com/feed/';

async function ensureMediaDir() {
  const info = await FileSystem.getInfoAsync(MEDIA_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
  }
}

async function downloadToLocal(url: string, fileName: string) {
  if (!url) return '';
  try {
    await ensureMediaDir();
    const localUri = `${MEDIA_DIR}${fileName}`;
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    
    if (!fileInfo.exists) {
      console.log(`📥 Téléchargement: ${fileName}...`);
      const { uri } = await FileSystem.downloadAsync(url, localUri);
      return uri;
    }
    return localUri;
  } catch (e) {
    console.error(`❌ Erreur téléchargement ${url}:`, e);
    return url; // On garde l'URL distante en cas d'échec
  }
}

function decodeHTML(text: string) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Récupère les dernières actualités via le flux RSS (méthode la plus robuste).
 */
export async function syncNHKNews() {
  try {
    const response = await fetch(NHK_RSS_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const xml = await response.text();
    const decodedXml = decodeHTML(xml); // On décode tout le XML d'un coup
    
    // Extraction des articles
    const items = decodedXml.split('<item>').slice(1);
    const articles: Article[] = items.map((item, index) => {
      const titleRaw = item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
      const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
      const descriptionRaw = item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '';
      const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';
      
      // On enlève les CDATA si présents
      const cleanTitle = titleRaw.replace(/<!\[CDATA\[|]]>/g, '').trim();
      const cleanDescription = descriptionRaw.replace(/<!\[CDATA\[|]]>/g, '').trim();

      // Extraction de l'image : on cherche une balise <img> dans la description si media:content manque
      let imageUrl = 'https://www3.nhk.or.jp/news/easy/images/main_visual.jpg';
      const imgMatch = cleanDescription.match(/<img[^>]+src="([^">]+)"/);
      if (imgMatch) {
        imageUrl = imgMatch[1];
      } else {
        const mediaMatch = item.match(/<media:content[^>]+url="([^">]+)"/);
        if (mediaMatch) imageUrl = mediaMatch[1];
      }

      // Extraction de l'ID
      const id = link.split('/').filter(Boolean).pop() || index.toString();

      // Nettoyage sélectif : on ne garde que <ruby> et <rt>
      const contentCleaned = cleanDescription
        .replace(/<audio[^>]*>[\s\S]*?<\/audio>/g, '') // Enlève le bloc audio complet
        .replace(/<a[^>]+>.*?<\/a>/g, '') // Enlève les liens
        .replace(/<[^>]+>/g, (tag) => {
          // On ne garde que les balises ruby et rt
          return /<\/?ruby>|<\/?rt>/.test(tag) ? tag : '';
        })
        .replace(/Original/g, '')
        .replace(/Permalink/g, '')
        .trim();

      // Extraction de l'audio : on cherche dans <enclosure> ou un lien .mp3
      let audioUrl = '';
      const enclosureMatch = item.match(/<enclosure[^>]+url="([^">]+)"/);
      if (enclosureMatch) {
        audioUrl = enclosureMatch[1];
      } else {
        const mp3Match = cleanDescription.match(/href="([^">]+\.mp3)"/);
        if (mp3Match) audioUrl = mp3Match[1];
      }

      return {
        id,
        title: cleanTitle.replace(/<ruby>.*?<\/ruby>/g, (m) => m.replace(/<[^>]*>/g, '')), 
        title_ruby: cleanTitle,
        content: contentCleaned,
        image_url: imageUrl,
        audio_url: audioUrl, 
        publication_date: new Date(pubDate).toISOString(),
        source_url: link,
        is_news: true
      };
    });

    const latestArticles = articles.slice(0, 10);
    const db = await getDb();
    
    for (const art of latestArticles) {
      // Téléchargement en local pour l'offline
      const extensionImg = art.image_url.split('.').pop() || 'jpg';
      const extensionAudio = art.audio_url.split('.').pop() || 'mp3';
      
      const localImage = await downloadToLocal(art.image_url, `${art.id}_img.${extensionImg}`);
      const localAudio = art.audio_url ? await downloadToLocal(art.audio_url, `${art.id}_audio.${extensionAudio}`) : '';

      await db.runAsync(`
        INSERT OR REPLACE INTO articles (id, title, title_ruby, content, image_url, audio_url, publication_date, source_url, is_news)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [art.id, art.title, art.title_ruby, art.content, localImage, localAudio, art.publication_date, art.source_url, art.is_news ? 1 : 0]);
    }

    console.log(`✅ [NHK-RSS] ${latestArticles.length} articles synchronisés.`);
    return latestArticles;
  } catch (error) {
    console.error("❌ [NHK-RSS] Erreur:", error);
    return [];
  }
}

/**
 * Pas besoin de fetch supplémentaire avec NHK Easier car le contenu est déjà là !
 */
export async function fetchArticleContent(id: string) {
  const db = await getDb();
  const res: any = await db.getFirstAsync('SELECT content FROM articles WHERE id = ?', [id]);
  return res?.content || '';
}

/**
 * Récupère les articles stockés localement.
 */
export async function getLocalArticles() {
  const db = await getDb();
  return await db.getAllAsync('SELECT * FROM articles WHERE is_news = 1 ORDER BY publication_date DESC');
}
