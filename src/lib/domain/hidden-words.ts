/**
 * Parole che mandano un commento in attesa di approvazione dell'azienda (non lo cancellano): insulti e volgarità
 * più comuni in italiano, in tutte le forme che servono perché il confronto è sulla parola intera (così "cazzuola"
 * non scatta). Ogni azienda può aggiungere le sue da Area Partner → Commenti.
 */
export const BASE_HIDDEN_WORDS: readonly string[] = [
  "cazzo", "cazzi", "cazzata", "cazzate", "cazzone", "cazzoni",
  "coglione", "coglioni", "cogliona",
  "stronzo", "stronza", "stronzi", "stronze", "stronzata", "stronzate",
  "merda", "merde", "merdoso", "merdosa",
  "vaffanculo", "fanculo", "affanculo", "culo",
  "minchia", "minchione", "minchiata",
  "puttana", "puttane", "troia", "troie", "zoccola", "zoccole", "bagascia",
  "bastardo", "bastarda", "bastardi", "bastarde",
  "idiota", "idioti", "imbecille", "imbecilli", "deficiente", "deficienti", "cretino", "cretina", "cretini",
  "stupido", "stupida", "stupidi", "scemo", "scema", "scemi",
  "ladro", "ladra", "ladri", "truffatore", "truffatori", "truffa", "truffe",
  "frocio", "froci", "finocchio", "negro", "negri", "terrone", "terroni", "zingaro", "zingari", "ritardato", "ritardati", "mongoloide",
  "figlio di puttana", "pezzo di merda", "testa di cazzo", "fate schifo", "fai schifo", "ti ammazzo", "vi ammazzo",
];
