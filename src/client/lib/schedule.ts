import type { Faculty, LessonTime, MkrApiDictionary, MkrEvent, MkrGroup } from "../../shared/models";
import type { Chairs, Teachers } from "../../shared/models"; 
// @ts-ignore
import cache from "js-cache";
import config from "./config";

const localCache = new cache.Cache({
  max: 100,
  ttl: config.cacheTime
});



const facultyImages: Map<string, string> = new Map([
  ['1',  '/img/faculties/agro.png'],
  ['5',  '/img/faculties/economics.png'],
  ['57', '/img/faculties/veterinarian.png'],
  ['7',  '/img/faculties/itf.png'],
  ['6',  '/img/faculties/management.png'],
  ['42', '/img/faculties/finances.png'],
]);


const chairImages: Map<string, string> = new Map([
  ['182', '/img/faculties/itf.png'], // Комп`ютерних наук та економічної кібернетики
  ['29',  '/img/faculties/itf.png'], // Математики, фізики та коп'ютерних технологій
  ['220', '/img/faculties/itf.png'], // Математики
  ['147', '/img/faculties/itf.png'], // Електроенертетики, електротехніки та електромеханіки
  ['219', '/img/faculties/itf.png'], // Кафедра електричної та телекомунікаційної інженерії
  ['218', '/img/faculties/itf.png'], // Кафедра системотехніки та сервісної інженерії
  ['181', '/img/faculties/itf.png'], // Агроінженерії та технічного сервісу
  ['14',  '/img/faculties/itf.png'], // Інженерної механіки та технологічних процесів в АПК
  ['17',  '/img/faculties/itf.png'], // Машин та обладнання сільськогосподарського виробництва
  ['110', '/img/faculties/itf.png'], // Деканат ІТФ

  // === Агрономія та Екологія (Agro) ===
  ['1',   '/img/faculties/agro.png'], // Ботаніки, генетики та захисту рослин
  ['2',   '/img/faculties/agro.png'], // Землеробства, ґрунтознавства та агрохімії
  ['4',   '/img/faculties/agro.png'], // Рослинництва та садівництва
  ['6',   '/img/faculties/agro.png'], // Лісового та садово-паркового господарства
  ['3',   '/img/faculties/agro.png'], // Екології та охорони навколишнього середовища
  ['211', '/img/faculties/agro.png'], // Біоінженерії, біо- та харчових технологій
  ['12',  '/img/faculties/agro.png'], // Харчових технологій та мікробіології

  // === Ветеринарія та Тваринництво (Veterinarian) ===
  ['215', '/img/faculties/veterinarian.png'], // Ветеринарної медицини...
  ['216', '/img/faculties/veterinarian.png'], // Хірургії, терапії, вірусології...
  ['10',  '/img/faculties/veterinarian.png'], // Ветеринарної гігієни, санітарії та експертизи
  ['213', '/img/faculties/veterinarian.png'], // Охорони праці та біотехнічних систем у тваринництві
  ['214', '/img/faculties/veterinarian.png'], // Технології виробництва та переробки продукції тваринництва
  ['212', '/img/faculties/veterinarian.png'], // Технології розведення... дрібних тварин
  ['7',   '/img/faculties/veterinarian.png'], // Технології виробництва продуктів тваринництва...
  ['11',  '/img/faculties/veterinarian.png'], // Годівлі сільськогосподарських тварин...

  // === Економіка (Economics) ===
  ['143', '/img/faculties/economics.png'], // Економіки та підприємницької діяльності
  ['165', '/img/faculties/economics.png'], // Аналізу та статистики
  ['20',  '/img/faculties/economics.png'], // Бізнесу та сфери обслуговування
  ['217', '/img/faculties/economics.png'], // Альтернативних джерел енергії та аграрної економіки
  ['112', '/img/faculties/economics.png'], // Деканат ЕіП

  // === Фінанси та Облік (Finances) ===
  ['122', '/img/faculties/finances.png'], // Бухгалтерський облік
  ['28',  '/img/faculties/finances.png'], // Фінансів, банківської справи та страхування
  ['76',  '/img/faculties/finances.png'], // Аналізу та аудиту
  ['26',  '/img/faculties/finances.png'], // Обліку та оподаткування

  // === Менеджмент, Право та Інше (Management) ===
  ['145', '/img/faculties/management.png'], // Адміністративного менеджменту...
  ['23',  '/img/faculties/management.png'], // Аграрного менеджменту та маркетингу
  ['24',  '/img/faculties/management.png'], // Права
  ['18',  '/img/faculties/management.png'], // Української та іноземних мов
  ['21',  '/img/faculties/management.png'], // Історії України та філософії
  ['175', '/img/faculties/management.png'], // Кафедра військової підготовки
  ['30',  '/img/faculties/management.png'], // Військова кафедра
  ['94',  '/img/faculties/management.png'], // Інститут післядипломної освіти
  
]);


async function getFaculties(): Promise<Faculty[]> {
  const cached = localCache.get('faculties');
  if (cached) return cached as Faculty[];

  const resp = await fetch(`${config.mkrApiUrl}/structures/0/faculties`);
  const items: MkrApiDictionary[] = await resp.json();
  
  const itemsWithImages = items
    .filter((f) => facultyImages.has(f.id))
    .map((f: MkrApiDictionary) => {
      let name = f.name.replace('Факультет ', '').replace('інформаційних технологій', 'ІТ');
      name = name.charAt(0).toUpperCase() + name.slice(1);
      
      return ({
          ...f, 
          name, 
          image: facultyImages.get(f.id)
      }) as Faculty;
    });
  
  localCache.set('faculties', itemsWithImages);
  return itemsWithImages;
}

async function getChairs(): Promise<Chairs[]> {
  const cached = localCache.get('chairs-list');
  if (cached) return cached as Chairs[];

  const resp = await fetch(`${config.mkrApiUrl}/structures/0/chairs`);
  const items: MkrApiDictionary[] = await resp.json();

  const itemsWithImages = items
    .filter((c) => chairImages.has(c.id))
    .map((c: MkrApiDictionary) => {
      let name = c.name.replace('Кафедра ', ''); 
      name = name.charAt(0).toUpperCase() + name.slice(1);

      return ({
          ...c, 
          name, 
          image: chairImages.get(c.id) 
      }) as Chairs;
    });

  itemsWithImages.sort((a, b) => a.name.localeCompare(b.name));

  localCache.set('chairs-list', itemsWithImages);
  return itemsWithImages;
}

async function getChairTeachers(chairId: number): Promise<Teachers[]> {
    const cached = localCache.get(`chair-${chairId}-teachers`);
    if (cached) return cached as Teachers[];
  
    const resp = await fetch(`${config.mkrApiUrl}/structures/0/chairs/${chairId}/teachers`);
    if (!resp.ok) throw new Error(`Failed to fetch teachers`);
  
    const teachers = await resp.json() as Teachers[];
    teachers.sort((a, b) => a.name.localeCompare(b.name));
  
    localCache.set(`chair-${chairId}-teachers`, teachers);
    return teachers;
}

async function getFacultyGroups(facultyId: string): Promise<Map<number, MkrGroup[]>> {
    const cached = localCache.get(`faculty-${facultyId}-groups`);
    if (cached) return cached as Map<number, MkrGroup[]>;

    const resp = await fetch(`${config.mkrApiUrl}/structures/0/faculties/${facultyId}/groups`);
    if (!resp.ok) throw new Error(`Failed to fetch groups`);
    
    const groups = await resp.json() as MkrGroup[];
    
    const groupsByCourse = groups.reduce((acc, group) => {
      const course = group.course;
      if(!acc.has(course)) acc.set(course, []);
      acc.get(course)!.push(group);
      return acc;
    }, new Map<number, MkrGroup[]>());

    groupsByCourse.forEach((groups) => groups.sort((a, b) => a.name.localeCompare(b.name)));

    localCache.set(`faculty-${facultyId}-groups`, groupsByCourse);
    return groupsByCourse;
}

async function getGroupSchedule(facultyId: string, course: number, groupId: string): Promise<MkrEvent[]> {
  const cached = localCache.get(`faculty-${facultyId}-course-${course}-group-${groupId}-schedule`);
  if (cached) return cached as MkrEvent[];
  const resp = await fetch(`${config.mkrApiUrl}/structures/0/faculties/${facultyId}/courses/${course}/groups/${groupId}/schedule`);
  const data = await resp.json() as MkrEvent[];
  localCache.set(`faculty-${facultyId}-course-${course}-group-${groupId}-schedule`, data);
  return data;
}

async function getTeacherSchedule(chairId: number, teacherId: number): Promise<MkrEvent[]> {
    const cached = localCache.get(`chair-${chairId}-teacher-${teacherId}-schedule`);
    if (cached) return cached as MkrEvent[];
    const resp = await fetch(`${config.mkrApiUrl}/structures/0/chairs/${chairId}/teachers/${teacherId}/schedule`);
    const data = await resp.json() as MkrEvent[];
    localCache.set(`chair-${chairId}-teacher-${teacherId}-schedule`, data);
    return data;
}

function getCourseName(course: number): string {
    return course < 6 ? `${course}-й курс` : course === 6 ? 'Магістратура' : 'Магістратура (2й рік)';
}

const lessonHours = [
    { time: "8:00",  end: "9:20", name: '1 Пара' },
    { time: "9:30",  end: "10:50", name: '2 Пара' },
    { time: "11:30", end: "12:50", name: '3 Пара' },
    { time: "13:10", end: "14:30", name: '4 Пара' },
    { time: "14:40", end: "16:00", name: '5 Пара' },
    { time: "16:10", end: "17:30", name: '6 Пара' },
    { time: "17:40", end: "19:00", name: '7 Пара' },
    { time: "19:30", end: "20:50", name: '8 Пара' },
];
function getLessonHours() { return lessonHours; }

export { 
    getFaculties, getFacultyGroups, getGroupSchedule, 
    getChairs, getChairTeachers, getTeacherSchedule,
    getCourseName, getLessonHours 
};