import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { MkrEvent, MkrGroup, Teachers } from "../../shared/models";
import './Schedule.css';
import { 
  getFacultyGroups, getFaculties, getGroupSchedule, getCourseName, getLessonHours,
  getChairs, getChairTeachers, getTeacherSchedule 
} from "../lib/schedule";
import CardButton, { CardSize } from "../components/cards/CardButton";
import GroupSchedule from "../components/GroupSchedule";
import { Loader } from "../components/Loader";
import { ErrorOverlay } from "../components/ErrorOverlay";
import { useTranslation } from "react-i18next";
import CloseButton from "../components/cards/CloseButton";


type ScheduleMode = 'students' | 'teachers';

type GenericItem = {
  id: string | number;
  name: string;
  image?: string;
}

const lessonHours = getLessonHours();

function DetailsContent({ parentId, mode, onClose }: { parentId: string | number, mode: ScheduleMode, onClose: () => void }) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [groups, setGroups] = useState<Map<number, MkrGroup[]> | null>(null);
  const [activeCourse, setActiveCourse] = useState<number | null>(null);
  const [courseGroups, setCourseGroups] = useState<MkrGroup[] | null>(null);
  const [currentGroup, setCurrentGroup] = useState<MkrGroup | null>(null);

  const [teachers, setTeachers] = useState<Teachers[] | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<Teachers | null>(null);

  const [currentSchedule, setCurrentSchedule] = useState<MkrEvent[] | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setGroups(null);
    setTeachers(null);
    setCourseGroups(null);
    setActiveCourse(null);
    setCurrentGroup(null);
    setCurrentTeacher(null);
    setCurrentSchedule(null);

    if (mode === 'students') {
      getFacultyGroups(String(parentId)).then(s => {
        setGroups(s);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setError("Не вдалося завантажити групи");
        setLoading(false);
      });
    } else {
      getChairTeachers(Number(parentId)).then(s => {
        setTeachers(s);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setError("Не вдалося завантажити викладачів");
        setLoading(false);
      });
    }
  }, [parentId, mode]);

  useEffect(() => {
    if (mode === 'students' && activeCourse !== null && groups) {
      setCourseGroups(groups.get(activeCourse) || null);
      setCurrentGroup(null);
      setCurrentSchedule(null);
    }
  }, [activeCourse, groups, mode]);

  useEffect(() => {
    if (!currentGroup && !currentTeacher) {
      setCurrentSchedule(null);
      return;
    }

    setLoading(true);
    setCurrentSchedule(null);

    const fetchSchedule = async () => {
      try {
        let s: MkrEvent[] = [];
        if (mode === 'students' && currentGroup) {
          s = await getGroupSchedule(String(parentId), currentGroup.course, currentGroup.id);
        } else if (mode === 'teachers' && currentTeacher) {
          s = await getTeacherSchedule(Number(parentId), currentTeacher.id);
        }
        setCurrentSchedule(s);
      } catch (err) {
        console.error(err);
        setError("Не вдалося завантажити розклад");
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [currentGroup, currentTeacher, parentId, mode]);

  return (
    <div className="active-info">
      <CloseButton onClick={onClose} />
      <section>
        <div className="content">
          
          {mode === 'students' && groups && (
            <div className="courses">
              {Array.from(groups.keys()).sort().map((course) => (
                <CardButton
                  key={course}
                  title={getCourseName(course)}
                  size={CardSize.Micro}
                  active={activeCourse === course}
                  onClick={() => setActiveCourse(course)}
                />
              ))}
            </div>
          )}

          {mode === 'teachers' && teachers && (
             <div className="courses">
                 {teachers.map((teacher) => (
                    <CardButton
                      key={teacher.id}
                      title={teacher.name}
                      size={CardSize.Minimized}
                      active={currentTeacher?.id === teacher.id}
                      onClick={() => setCurrentTeacher(teacher)}
                    />
                 ))}
             </div>
          )}


          <div 
             className="groups-schedule"
             style={mode === 'teachers' ? { justifyContent: 'center' } : {}}
          >
              
             {mode === 'students' && courseGroups && (
                <div className="groups">
                  {courseGroups.map((group) => (
                    <CardButton
                      key={group.id}
                      title={group.name}
                      size={CardSize.Micro}
                      active={currentGroup?.id === group.id}
                      onClick={() => setCurrentGroup(group)}
                    />
                  ))}
                </div>
             )}

             {currentSchedule != null && (
                 <div className="schedule-container">
                    <GroupSchedule schedule={currentSchedule} lessonHours={lessonHours} />
                 </div>
             )}
             
             <ErrorOverlay error={error} />
             {loading && <Loader />}
             
          </div>

        </div>
      </section>
    </div>
  );
}

function GenericList({ items, activeId, onSelect, mode, onCloseParent }: { items: GenericItem[], activeId: string | number | null, onSelect: (item: GenericItem) => void, mode: ScheduleMode, onCloseParent: () => void }) {
  const size = activeId == null ? CardSize.Full : CardSize.Minimized;
  const partiallyFilled = items.length < 3; 

  return (
    <>
      {!activeId && (
        <div className="active-info">
             <CloseButton onClick={onCloseParent} />
             
             <div className="content" style={{ textAlign: 'center', opacity: 0.8 }}>
                <p>Оберіть {mode === 'students' ? 'факультет' : 'кафедру'} зі списку нижче:</p>
             </div>
        </div>
      )}

      <motion.div 
        className={"info-cards" + (size === CardSize.Minimized ? " minimized" : "") + (partiallyFilled ? " partially-filled" : "")}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        {items.map((item) => (
          <CardButton
            key={item.id}
            title={item.name}
            active={item.id === activeId}
            size={size}
            image={item.image}
            onClick={() => onSelect(item)}
          />
        ))}
      </motion.div>

      {activeId && (
          <DetailsContent 
            key={activeId}
            parentId={activeId} 
            mode={mode} 
            onClose={() => onSelect({id: activeId, name: ''})} 
          />
      )}
    </>
  );
}

function ActiveScheduleMode({ mode, onClose }: { mode: ScheduleMode, onClose: () => void }) {
  const [items, setItems] = useState<GenericItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeItem, setActiveItem] = useState<GenericItem | null>(null);

  useEffect(() => {
    setLoading(true);
    setItems([]);
    setActiveItem(null);

    const fetchData = async () => {
      try {
        if (mode === 'students') {
          const data = await getFaculties();
          setItems(data);
        } else {
          const data = await getChairs();
          setItems(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [mode]);

  const handleSelect = (item: GenericItem) => {
    if (activeItem?.id === item.id) {
      setActiveItem(null);
    } else {
      setActiveItem(item);
    }
  };

  return (
    <>
      {loading ? <Loader /> : (
        <GenericList
          items={items}
          activeId={activeItem?.id || null}
          onSelect={handleSelect}
          mode={mode}
          onCloseParent={onClose}
        />
      )}
    </>
  );
}

function ScheduleModesList({ active, onSelect }: { active: ScheduleMode | null, onSelect: (m: ScheduleMode) => void }) {
  const size = active == null ? CardSize.Full : CardSize.Minimized;
  
  const modes = [
    { 
        id: 'students', 
        title: 'Розклад для студентів',
        image: '/img/faculties/agro.png' 
    },
    { 
        id: 'teachers', 
        title: 'Розклад для викладачів',
        image: '/img/faculties/agro.png' 
    }
  ];

  return (
    <motion.div 
      className={"info-cards" + (size === CardSize.Minimized ? " minimized" : "")}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {modes.map((m) => (
        <CardButton
          key={m.id}
          title={m.title}
          size={size}
          active={m.id === active}
          image={m.image} 
          onClick={() => onSelect(m.id as ScheduleMode)}
        />
      ))}
    </motion.div>
  );
}

function Schedule() {
  const [activeMode, setActiveMode] = useState<ScheduleMode | null>(null);
  const { t } = useTranslation();

  return (
    <div className="schedule-page"> 
      {activeMode == null ? <h1>{t('title.schedule')}</h1> : null}
      <ScheduleModesList active={activeMode} onSelect={setActiveMode} />
      {activeMode && (
        <ActiveScheduleMode mode={activeMode} onClose={() => setActiveMode(null)} />
      )}
    </div>
  );
}

export default Schedule;