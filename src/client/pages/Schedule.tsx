import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { MkrEvent, MkrGroup, Chairs, Teachers } from "../../shared/models";
import './Schedule.css';
import { 
  getFacultyGroups, getFaculties, getFacultyChairs, getGroupSchedule, getCourseName, getLessonHours,
  getChairTeachers, getTeacherSchedule 
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
  const [loadingChairs, setLoadingChairs] = useState<boolean>(false);
  const [loadingSchedule, setLoadingSchedule] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [groups, setGroups] = useState<Map<number, MkrGroup[]> | null>(null);
  const [activeCourse, setActiveCourse] = useState<number | null>(null);
  const [courseGroups, setCourseGroups] = useState<MkrGroup[] | null>(null);
  const [currentGroup, setCurrentGroup] = useState<MkrGroup | null>(null);

  const [chairs, setChairs] = useState<Chairs[] | null>(null);
  const [activeChair, setActiveChair] = useState<Chairs | null>(null);
  const [teachers, setTeachers] = useState<Teachers[] | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<Teachers | null>(null);

  const [currentSchedule, setCurrentSchedule] = useState<MkrEvent[] | null>(null);

  useEffect(() => {
    setError(null);
    setGroups(null); setChairs(null); setActiveChair(null);
    setTeachers(null); setCourseGroups(null); setActiveCourse(null);
    setCurrentGroup(null); setCurrentTeacher(null); setCurrentSchedule(null);

    if (mode === 'students') {
      getFacultyGroups(String(parentId)).then(setGroups).catch(e => setError("Помилка завантаження груп"));
    } else {
      setLoadingChairs(true);
      getFacultyChairs(String(parentId)).then(s => {
         setChairs(s);
         setLoadingChairs(false);
       }).catch(e => {
         setError("Помилка завантаження кафедр");
         setLoadingChairs(false);
       });
    }
  }, [parentId, mode]);

  useEffect(() => {
    if (mode === 'teachers' && activeChair) {
        getChairTeachers(Number(activeChair.id)).then(setTeachers);
        setCurrentTeacher(null);
        setCurrentSchedule(null);
    } else if (mode === 'teachers' && !activeChair) {
        setTeachers(null);
    }
  }, [activeChair, mode]);

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
    setLoadingSchedule(true);
    setCurrentSchedule(null);

    const fetch = async () => {
      try {
        let s: MkrEvent[] = [];
        if (mode === 'students' && currentGroup) {
          s = await getGroupSchedule(String(parentId), currentGroup.course, currentGroup.id);
        } else if (mode === 'teachers' && currentTeacher && activeChair) {
          s = await getTeacherSchedule(Number(activeChair.id), currentTeacher.id);
        }
        setCurrentSchedule(s);
      } catch (err) { setError("Не вдалося завантажити розклад"); } 
      finally { setLoadingSchedule(false); }
    };
    fetch();
  }, [currentGroup, currentTeacher, parentId, mode, activeChair]);


  const getButtonPosition = () => {
    if (mode === 'teachers' && activeChair) {
        return { top: '2.5em', right: '-1em' }; 
    }
    
    if (mode === 'teachers' && !activeChair) {
        return { top: '10px', right: '10px' }; 
    }

    if (mode === 'students') {
        return { top: '2.5em', right: '0.6em' };
    }

    return { top: '10px', right: '10px' };
  };

  const buttonStyle = getButtonPosition();

  const handleBack = () => {
     if (mode === 'teachers') {
        if (currentTeacher) setCurrentTeacher(null);
        else if (activeChair) setActiveChair(null);
        else onClose();
     } else {
        onClose();
     }
  };

  return (
    <div className="active-info"> 
      
      <div style={{
          position: 'absolute',
          top: buttonStyle.top, 
          right: buttonStyle.right, 
          zIndex: 200
      }}>
        <CloseButton onClick={handleBack} />
      </div>

      <section>
        <div className="content">
          {mode === 'students' && groups && (
            <>
                <div className="courses">
                  {Array.from(groups.keys()).sort().map((course) => (
                    <CardButton key={course} title={getCourseName(course)} size={CardSize.Micro}
                      active={activeCourse === course} onClick={() => setActiveCourse(course)}
                    />
                  ))}
                </div>
                
                <div className="groups-schedule">
                    {courseGroups && (
                        <div className="groups">
                        {courseGroups.map((group) => (
                            <CardButton key={group.id} title={group.name} size={CardSize.Micro}
                            active={currentGroup?.id === group.id} onClick={() => setCurrentGroup(group)}
                            />
                        ))}
                        </div>
                    )}
                    
                    <div className="schedule-wrapper-bounded">
                        {loadingSchedule && <Loader />}
                        {!loadingSchedule && currentSchedule && (
                            <div className="schedule-container">
                                <GroupSchedule schedule={currentSchedule} lessonHours={lessonHours} />
                            </div>
                        )}
                        <ErrorOverlay error={error} />
                    </div>
                </div>
            </>
          )}

          {mode === 'teachers' && (
             <div className="teacher-flow-container">
                
                {loadingChairs && <div style={{width:'100%', display:'flex', justifyContent:'center'}}><Loader/></div>}
                
                {chairs && (
                   <div className={activeChair ? "teacher-slider" : "teacher-grid"}>
                      {chairs.map((chair) => (
                        <CardButton
                          key={chair.id}
                          title={chair.name}
                          size={activeChair ? CardSize.Minimized : CardSize.Full} 
                          active={activeChair?.id === chair.id}
                          image={chair.image} 
                          onClick={() => setActiveChair(chair)}
                        />
                      ))}
                   </div>
                )}

                {activeChair && teachers && (
                   <div className="teacher-slider fade-in">
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

                <div className="schedule-wrapper-bounded" style={{ marginTop: '10px' }}>
                    {loadingSchedule && <Loader />}
                    
                    {!loadingSchedule && currentSchedule && (
                        <div className="schedule-container fade-in">
                             <GroupSchedule schedule={currentSchedule} lessonHours={lessonHours} />
                        </div>
                    )}
                    <ErrorOverlay error={error} />
                </div>
             </div>
          )}

        </div>
      </section>
    </div>
  );
}

function GenericList({ items, activeId, onSelect, mode, onCloseParent }: { items: GenericItem[], activeId: string | number | null, onSelect: (item: GenericItem) => void, mode: ScheduleMode, onCloseParent: () => void }) {
  const size = activeId == null ? CardSize.Full : CardSize.Minimized;
  const partiallyFilled = items.length < 3; 

  const shouldShift = mode === 'teachers';

  return (
    <>
      {!activeId && (
        <div className="active-info">
             <div >
                <CloseButton onClick={onCloseParent} />
             </div>
             
             <div className="content" style={{ textAlign: 'center', opacity: 0.8 }}>
                <p>Оберіть {mode === 'students' ? 'факультет' : 'факультет'} зі списку нижче:</p>
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
        const data = await getFaculties();
        setItems(data);
        
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
        image: '/img/students/about.png' 
    },
    { 
        id: 'teachers', 
        title: 'Розклад для викладачів',
        image: '/img/students/about.png' 
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