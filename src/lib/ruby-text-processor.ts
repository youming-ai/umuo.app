import type { Segment, WordTimestamp } from "@/types/database";

export interface RubyCharacter {
  character: string;
  furigana?: string;
  romaji?: string;
  isKanji?: boolean;
  isHiragana?: boolean;
  isKatakana?: boolean;
}

export interface RubyWord {
  text: string;
  reading?: string;
  romaji?: string;
  characters: RubyCharacter[];
  startTime?: number;
  endTime?: number;
}

/**
 * 检测字符类型
 */
function detectCharacterType(char: string): {
  isKanji: boolean;
  isHiragana: boolean;
  isKatakana: boolean;
} {
  const kanjiRegex = /[\u4e00-\u9faf\u3400-\u4dbf\uf900-\ufaff]/;
  const hiraganaRegex = /[\u3040-\u309f\u30a0-\u30ff]/; // 包括平假名和片假名
  const katakanaRegex = /[\u30a0-\u30ff]/;

  return {
    isKanji: kanjiRegex.test(char),
    isHiragana: hiraganaRegex.test(char) && !katakanaRegex.test(char),
    isKatakana: katakanaRegex.test(char),
  };
}

/**
 * 简单的平假名到罗马音转换
 */
function hiraganaToRomaji(hiragana: string): string {
  const romajiMap: Record<string, string> = {
    あ: "a",
    い: "i",
    う: "u",
    え: "e",
    お: "o",
    か: "ka",
    き: "ki",
    く: "ku",
    け: "ke",
    こ: "ko",
    が: "ga",
    ぎ: "gi",
    ぐ: "gu",
    げ: "ge",
    ご: "go",
    さ: "sa",
    し: "shi",
    す: "su",
    せ: "se",
    そ: "so",
    ざ: "za",
    じ: "ji",
    ず: "zu",
    ぜ: "ze",
    ぞ: "zo",
    た: "ta",
    ち: "chi",
    つ: "tsu",
    て: "te",
    と: "to",
    だ: "da",
    ぢ: "ji",
    づ: "zu",
    で: "de",
    ど: "do",
    な: "na",
    に: "ni",
    ぬ: "nu",
    ね: "ne",
    の: "no",
    は: "ha",
    ひ: "hi",
    ふ: "fu",
    へ: "he",
    ほ: "ho",
    ば: "ba",
    び: "bi",
    ぶ: "bu",
    べ: "be",
    ぼ: "bo",
    ぱ: "pa",
    ぴ: "pi",
    ぷ: "pu",
    ぺ: "pe",
    ぽ: "po",
    ま: "ma",
    み: "mi",
    む: "mu",
    め: "me",
    も: "mo",
    や: "ya",
    ゆ: "yu",
    よ: "yo",
    ら: "ra",
    り: "ri",
    る: "ru",
    れ: "re",
    ろ: "ro",
    わ: "wa",
    を: "wo",
    ん: "n",
    ぁ: "a",
    ぃ: "i",
    ぅ: "u",
    ぇ: "e",
    ぉ: "o",
    ゃ: "ya",
    ゅ: "yu",
    ょ: "yo",
    っ: "",
    ー: "-",
  };

  // 处理拗音
  const smallTsuRegex = /(っ)([かきくけこさしすせそたちつてとはひふへほぱぴぷぺぽ])/g;
  const sokuonMap: Record<string, string> = {
    か: "k",
    き: "k",
    く: "k",
    け: "k",
    こ: "k",
    さ: "s",
    し: "sh",
    す: "s",
    せ: "s",
    そ: "s",
    た: "t",
    ち: "ch",
    つ: "ts",
    て: "t",
    と: "t",
    は: "h",
    ひ: "h",
    ふ: "f",
    へ: "h",
    ほ: "h",
    ぱ: "p",
    ぴ: "p",
    ぷ: "p",
    ぺ: "p",
    ぽ: "p",
  };

  let result = hiragana;

  // 处理促音
  result = result.replace(smallTsuRegex, (_match, _smallTsu, nextChar) => {
    const sokuon = sokuonMap[nextChar] || nextChar.charAt(0);
    return sokuon;
  });

  // 转换单个字符
  result = result
    .split("")
    .map((char) => romajiMap[char] || char)
    .join("");

  return result;
}

/**
 * 片假名到罗马音转换
 */
function katakanaToRomaji(katakana: string): string {
  // 将片假名转换为平假名，然后使用平假名转换函数
  const katakanaToHiraganaMap: Record<string, string> = {
    ア: "あ",
    イ: "い",
    ウ: "う",
    エ: "え",
    オ: "お",
    カ: "か",
    キ: "き",
    ク: "く",
    ケ: "け",
    コ: "こ",
    ガ: "が",
    ギ: "ぎ",
    グ: "ぐ",
    ゲ: "げ",
    ゴ: "ご",
    サ: "さ",
    シ: "し",
    ス: "す",
    セ: "せ",
    ソ: "そ",
    ザ: "ざ",
    ジ: "じ",
    ズ: "ず",
    ゼ: "ぜ",
    ゾ: "ぞ",
    タ: "た",
    チ: "ち",
    ツ: "つ",
    テ: "て",
    ト: "と",
    ダ: "だ",
    ヂ: "ぢ",
    ヅ: "づ",
    デ: "で",
    ド: "ど",
    ナ: "な",
    ニ: "に",
    ヌ: "ぬ",
    ネ: "ね",
    ノ: "の",
    ハ: "は",
    ヒ: "ひ",
    フ: "ふ",
    ヘ: "へ",
    ホ: "ほ",
    バ: "ば",
    ビ: "び",
    ブ: "ぶ",
    ベ: "べ",
    ボ: "ぼ",
    パ: "ぱ",
    ピ: "ぴ",
    プ: "ぷ",
    ペ: "ぺ",
    ポ: "ぽ",
    マ: "ま",
    ミ: "み",
    ム: "む",
    メ: "め",
    モ: "も",
    ヤ: "や",
    ユ: "ゆ",
    ヨ: "よ",
    ラ: "ら",
    リ: "り",
    ル: "る",
    レ: "れ",
    ロ: "ろ",
    ワ: "わ",
    ヲ: "を",
    ン: "ん",
    ァ: "ぁ",
    ィ: "ぃ",
    ゥ: "ぅ",
    ェ: "ぇ",
    ォ: "ぉ",
    ャ: "ゃ",
    ュ: "ゅ",
    ョ: "ょ",
    ッ: "っ",
    ー: "ー",
  };

  const hiragana = katakana
    .split("")
    .map((char) => katakanaToHiraganaMap[char] || char)
    .join("");
  return hiraganaToRomaji(hiragana);
}

/**
 * 解析假名信息
 */
function parseFuriganaData(text: string, furigana?: string): RubyCharacter[] {
  const characters: RubyCharacter[] = [];

  if (!furigana) {
    // 如果没有假名数据，直接分析字符
    for (const char of text) {
      const charType = detectCharacterType(char);
      characters.push({
        character: char,
        isKanji: charType.isKanji,
        isHiragana: charType.isHiragana,
        isKatakana: charType.isKatakana,
      });
    }
    return characters;
  }

  // 简单的假名解析逻辑（这里需要根据实际数据格式调整）
  // 假设假名格式是 "漢字|かんじ" 的形式
  const furiganaEntries = furigana.split(" ");
  let furiganaIndex = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charType = detectCharacterType(char);

    const rubyChar: RubyCharacter = {
      character: char,
      isKanji: charType.isKanji,
      isHiragana: charType.isHiragana,
      isKatakana: charType.isKatakana,
    };

    // 为汉字添加假名
    if (charType.isKanji && furiganaIndex < furiganaEntries.length) {
      const entry = furiganaEntries[furiganaIndex];
      const parts = entry.split("|");
      if (parts.length === 2 && parts[0] === char) {
        rubyChar.furigana = parts[1];
        furiganaIndex++;
      }
    }

    characters.push(rubyChar);
  }

  return characters;
}

/**
 * 生成罗马音
 */
function generateRomaji(characters: RubyCharacter[]): string {
  let romaji = "";

  for (const char of characters) {
    if (char.furigana) {
      // 如果有假名，使用假名转换
      romaji += hiraganaToRomaji(char.furigana);
    } else if (char.isHiragana) {
      // 平假名直接转换
      romaji += hiraganaToRomaji(char.character);
    } else if (char.isKatakana) {
      // 片假名转换
      romaji += katakanaToRomaji(char.character);
    } else {
      // 其他字符（如汉字但没有假名）直接保留
      romaji += char.character;
    }
  }

  return romaji;
}

/**
 * 处理单个词的ruby信息
 */
export function processWordRuby(
  word: string,
  wordTimestamp?: WordTimestamp,
  furiganaData?: string,
): RubyWord {
  // 尝试从假名数据中解析
  let characters: RubyCharacter[] = [];

  if (furiganaData) {
    characters = parseFuriganaData(word, furiganaData);
  } else {
    // 没有假名数据时，只分析字符类型
    for (const char of word) {
      const charType = detectCharacterType(char);
      characters.push({
        character: char,
        isKanji: charType.isKanji,
        isHiragana: charType.isHiragana,
        isKatakana: charType.isKatakana,
      });
    }
  }

  // 生成罗马音
  const romaji = generateRomaji(characters);

  return {
    text: word,
    reading: characters.some((c) => c.furigana)
      ? characters.map((c) => c.furigana || c.character).join("")
      : undefined,
    romaji,
    characters,
    startTime: wordTimestamp?.start,
    endTime: wordTimestamp?.end,
  };
}

/**
 * 处理整个字幕段的ruby信息
 */
export function processSegmentRuby(segment: Segment): RubyWord[] {
  const words = segment.text.split(/\s+/);
  const rubyWords: RubyWord[] = [];

  // 假设假名数据存储在 segment.furigana 中，格式为每个词的假名用空格分隔
  const furiganaWords = segment.furigana?.split(" ") || [];

  words.forEach((word, index) => {
    const wordTimestamp = segment.wordTimestamps?.[index];
    const furiganaForWord = furiganaWords[index];

    const rubyWord = processWordRuby(word, wordTimestamp, furiganaForWord);
    rubyWords.push(rubyWord);
  });

  return rubyWords;
}

/**
 * 获取高亮字符信息
 */
export function getHighlightedCharacters(
  rubyWords: RubyWord[],
  currentTime: number,
): { wordIndex: number; charIndex: number } | null {
  for (let wordIndex = 0; wordIndex < rubyWords.length; wordIndex++) {
    const word = rubyWords[wordIndex];

    if (word.startTime && word.endTime) {
      if (currentTime >= word.startTime && currentTime <= word.endTime) {
        // 计算字符级别的精确位置
        const wordDuration = word.endTime - word.startTime;
        const charDuration = wordDuration / word.characters.length;
        const progressInWord = currentTime - word.startTime;
        const charIndex = Math.floor(progressInWord / charDuration);

        return {
          wordIndex,
          charIndex: Math.min(charIndex, word.characters.length - 1),
        };
      }
    }
  }

  return null;
}

/**
 * 格式化ruby文本为HTML
 */
export function formatRubyToHTML(
  rubyWords: RubyWord[],
  highlightedChar?: { wordIndex: number; charIndex: number },
): string {
  return rubyWords
    .map((word, wordIndex) => {
      const isHighlighted = highlightedChar?.wordIndex === wordIndex;

      const charactersHTML = word.characters
        .map((char, charIndex) => {
          const isCharHighlighted = isHighlighted && charIndex === highlightedChar?.charIndex;

          if (char.furigana) {
            return `<ruby class="${isCharHighlighted ? "text-[var(--state-info-text)] font-bold dark:text-[var(--state-info-strong)]" : ""}">
          <span class="${isCharHighlighted ? "bg-[var(--state-info-surface)]" : ""}">${char.character}</span>
          <rt class="text-xs ${
            isCharHighlighted
              ? "text-[var(--state-info-text)] dark:text-[var(--state-info-strong)]"
              : "text-[var(--text-secondary)]"
          }">${char.furigana}</rt>
        </ruby>`;
          }

          return `<span class="${
            isCharHighlighted
              ? "bg-[var(--state-info-surface)] text-[var(--state-info-text)] font-bold dark:text-[var(--state-info-strong)]"
              : ""
          }">${char.character}</span>`;
        })
        .join("");

      return `<span class="inline-block mx-1">${charactersHTML}</span>`;
    })
    .join("");
}

/**
 * 获取罗马音文本
 */
export function getRomajiText(rubyWords: RubyWord[]): string {
  return rubyWords.map((word) => word.romaji || word.text).join(" ");
}

/**
 * 检查文本是否包含日语字符
 */
export function containsJapanese(text: string): boolean {
  const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf\uf900-\ufaff]/;
  return japaneseRegex.test(text);
}

/**
 * 获取文本中的语言统计
 */
export function getTextLanguageStats(text: string): {
  kanjiCount: number;
  hiraganaCount: number;
  katakanaCount: number;
  otherCount: number;
} {
  let kanjiCount = 0;
  let hiraganaCount = 0;
  let katakanaCount = 0;
  let otherCount = 0;

  for (const char of text) {
    const charType = detectCharacterType(char);
    if (charType.isKanji) kanjiCount++;
    else if (charType.isHiragana) hiraganaCount++;
    else if (charType.isKatakana) katakanaCount++;
    else otherCount++;
  }

  return { kanjiCount, hiraganaCount, katakanaCount, otherCount };
}
