export type Faculty = {
  id: string,
  name: string,
  image: string
};

export type InfoCard = {
  id: string,
  title_ua: string,
  title_en?: string,
  subtitle_ua?: string | null,
  subtitle_en?: string | null,
  image?: string | null,
  content_ua?: string | null,
  content_en?: string | null,
  
  // Category of the info, e.g. "students", "abiturients", "faculties"
  category: string,  
  
  // If set show the list of categories instead of content
  subcategory?: string | null,
  
  // Opitional link to an external resource for syncing the info
  resource?: string,
  position: number,
  published: boolean
}

export type MkrApiDictionary = {
  id: string;
  name: string;
}

export type MkrGroup = {
  id: string;
  name: string;
  course: number;
}

export type Chairs = {
  id: string;
  name: string;
  image: string;
}

export type Teachers = {
  id: number;
  name: string
}

export type LessonTime = {
  time: string;
  end: string;
  name: string;
}

export type MkrEvent = {
  name: string,
  place: string,
  group?: string,
  teacher?: string,
  type: string,
  start: string,
  end: string
}

export type VideoSubtitle = {
  language: string;
  label: string;
  src: string;
}

export type Video = {
  id: string;
  title_ua: string;
  title_en?: string;
  description_ua: string;
  description_en?: string;
  src: string;
  image: string | null;
  category: string;
  position: number;
  published: boolean;
}

