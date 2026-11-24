// Filenames are stable, so this module can move to another static host unchanged.
export const projects = [
  { id: 'ozon-xr', title: 'Фортуната', indexTitle: 'Фортуната · Ozon', category: 'XR-продакшен · Ozon', frames: 6, video: true },
  { id: 'extropolis', title: 'Экстрополис', indexTitle: 'Экстрополис · ШАД', category: 'День открытых дверей ШАД', frames: 2 },
  { id: 'yandex-360', title: 'Итоги года', indexTitle: 'Итоги года · Яндекс 360', category: 'Яндекс 360', frames: 3 },
  { id: 'dzen-live', title: 'Дзен Live', indexTitle: 'Дзен Live · Аврора', category: 'Запись и трансляция', frames: 3 },
  { id: 'ozon-bank', title: 'Ozon Банк', category: 'Видеопродакшен', frames: 1 },
  { id: 'yandex-market', title: 'Сфера', indexTitle: 'Сфера · Яндекс Маркет', category: 'Яндекс Маркет', frames: 2 },
  { id: 'mental-health', title: 'День ментального здоровья', indexTitle: 'День ментального здоровья', category: 'Многокамерная съёмка', frames: 6 },
  { id: 'digital-day', title: 'Digital Day', category: 'Конференция', frames: 2 },
  { id: 'tinkoff-podcast', title: 'Подкаст Тинькофф', category: 'Видеоподкаст', frames: 3 },
];

export const media = (base, name) => globalThis.__KVOK_PREVIEW_MEDIA__?.[name] ?? new URL(`media/${name}`, base).href;
export const cover = (base, project) => media(base,`${project.id}-cover.webp`);
export const still = (base, project, frame) => media(base,`${project.id}-${frame}.webp`);

// Layout is a mix of projects, not repeating full rows or adjacent tiles.
const rows = ['24987631520', '63125078346', '17503289614', '49816342075', '30752416832'];
// Project IDs are zero-based; 9 is a second shot from the first project.
export const wallProject = (row, col, mobile) => Number(rows[row][col + (mobile ? 1 : 0)]) % projects.length;
export const wallFrame = (row, col, project) => (row * 3 + col * 5) % project.frames;
