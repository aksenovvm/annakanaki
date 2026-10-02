/**
 * Этап 1: данные хранятся прямо в коде.
 * На этапе 4 эти массивы заменятся запросами к API (`/api/v1/services`, `/api/v1/barbers`).
 * Поля названы так же, как в будущей модели данных (docs/spec.md, раздел 5).
 */

export type Service = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  /** Цена в сумах */
  price: number;
  isPopular?: boolean;
};

export type Barber = {
  id: string;
  name: string;
  role: string;
  bio: string;
  experienceYears: number;
  rating: number;
  specialties: string[];
  /** Цвет-заглушка вместо фото, пока нет Supabase Storage */
  accent: string;
};

export type Review = {
  id: string;
  clientName: string;
  barberName: string;
  rating: number;
  comment: string;
  date: string;
};

export const shop = {
  name: "Kanaki Barbershop",
  tagline: "Мужские стрижки и бритьё в центре Ташкента",
  address: "Ташкент, ул. Амира Темура, 15",
  phone: "+998 90 123-45-67",
  phoneHref: "tel:+998901234567",
  telegram: "kanaki_barbershop",
  instagram: "kanaki.barbershop",
  hours: [
    { days: "Пн–Пт", time: "10:00 – 21:00" },
    { days: "Сб–Вс", time: "10:00 – 20:00" },
  ],
  coordinates: { lat: 41.3111, lng: 69.2797 },
};

export const services: Service[] = [
  {
    id: "haircut",
    name: "Мужская стрижка",
    description: "Консультация, мытьё головы, стрижка и укладка.",
    durationMin: 60,
    price: 150_000,
    isPopular: true,
  },
  {
    id: "beard",
    name: "Моделирование бороды",
    description: "Форма бороды, контуры опасной бритвой, уход маслом.",
    durationMin: 30,
    price: 90_000,
  },
  {
    id: "combo",
    name: "Стрижка + борода",
    description: "Полный образ: стрижка, укладка и оформление бороды.",
    durationMin: 90,
    price: 220_000,
    isPopular: true,
  },
  {
    id: "shave",
    name: "Королевское бритьё",
    description: "Горячие полотенца, бритьё опасной бритвой, уходовая маска.",
    durationMin: 45,
    price: 120_000,
  },
  {
    id: "kids",
    name: "Детская стрижка",
    description: "Для мальчиков до 12 лет. Спокойно и без спешки.",
    durationMin: 45,
    price: 100_000,
  },
  {
    id: "buzz",
    name: "Стрижка машинкой",
    description: "Одна насадка по всей голове, окантовка.",
    durationMin: 30,
    price: 80_000,
  },
];

export const barbers: Barber[] = [
  {
    id: "timur",
    name: "Тимур",
    role: "Топ-барбер",
    bio: "Классические и современные мужские стрижки, точные фейды.",
    experienceYears: 8,
    rating: 4.9,
    specialties: ["Фейд", "Классика", "Борода"],
    accent: "#c2853d",
  },
  {
    id: "aziz",
    name: "Азиз",
    role: "Барбер",
    bio: "Любит текстурные стрижки и аккуратные бороды.",
    experienceYears: 5,
    rating: 4.8,
    specialties: ["Текстура", "Кроп", "Борода"],
    accent: "#4f7a6b",
  },
  {
    id: "rustam",
    name: "Рустам",
    role: "Барбер",
    bio: "Мастер королевского бритья и работы опасной бритвой.",
    experienceYears: 6,
    rating: 4.9,
    specialties: ["Бритьё", "Классика"],
    accent: "#6b5b95",
  },
  {
    id: "dilshod",
    name: "Дильшод",
    role: "Младший барбер",
    bio: "Быстрые и аккуратные стрижки машинкой, детские стрижки.",
    experienceYears: 2,
    rating: 4.7,
    specialties: ["Машинка", "Детские"],
    accent: "#3d6ea8",
  },
];

export const reviews: Review[] = [
  {
    id: "r1",
    clientName: "Алишер",
    barberName: "Тимур",
    rating: 5,
    comment: "Лучший фейд в городе. Записался через сайт за минуту, пришёл — сразу посадили.",
    date: "2026-09-21",
  },
  {
    id: "r2",
    clientName: "Сергей",
    barberName: "Рустам",
    rating: 5,
    comment: "Королевское бритьё — это отдельный вид отдыха. Горячие полотенца, всё чётко.",
    date: "2026-09-14",
  },
  {
    id: "r3",
    clientName: "Бекзод",
    barberName: "Азиз",
    rating: 5,
    comment: "Азиз отлично понял, что я хочу. Борода никогда так хорошо не выглядела.",
    date: "2026-09-08",
  },
  {
    id: "r4",
    clientName: "Максим",
    barberName: "Дильшод",
    rating: 4,
    comment: "Привёл сына — мастер нашёл подход, стрижка аккуратная. Приятная атмосфера.",
    date: "2026-08-30",
  },
];
