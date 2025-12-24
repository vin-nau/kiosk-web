export type Faculty = {
  id: string,
  name: string,
  image: string
};
export type LocalizedString = string | { ua: string; en?: string } | null;

export type InfoCard = {
  id: string,
  title: Exclude<LocalizedString, null>
  subtitle?: LocalizedString,
  image?: string | null,
  content?: LocalizedString,
  
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

export type Chair = {
  id: string;
  name: string;
  image: string;
}

export type Teacher = {
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
  title: Exclude<LocalizedString, null>;
  description: LocalizedString;
  src: string;
  image: string | null;
  category: string;
  position: number;
  published: boolean;
}

