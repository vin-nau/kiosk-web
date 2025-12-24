import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { MkrEvent, MkrGroup, Chair, Teachers } from "../../shared/models";
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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChalkboardTeacher, faUserGraduate } from "@fortawesome/free-solid-svg-icons";

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

  const [chairs, setChairs] = useState<Chair[] | null>(null);
  const [activeChair, setActiveChair] = useState<Chair | null>(null);
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

  return (
    <div className="active-info"> 
        <div>
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
    </div>
  );
}

type GenericListProps = { 
  items: GenericItem[], 
  activeId: string | number | null, 
  onSelect: (item: GenericItem) => void, 
  mode: ScheduleMode,
  switchPane?: React.ReactNode
};

function GenericList({ items, activeId, onSelect, mode, switchPane }: GenericListProps) {
  const size = activeId == null ? CardSize.Full : CardSize.Minimized;
  const partiallyFilled = items.length < 3; 

  return (
    <>
      <div className="faculties-stripe">
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

        { /* Show only if there is an activeId, otherwise it is shown in the main component */ }
        {activeId ? <div className="stripe-switch-pane"> {switchPane} </div> : null}

      </div>
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

function ScheduleModesList({ active, onSelect }: { active: ScheduleMode, onSelect: (m: ScheduleMode) => void }) {
  const activeIndex = active === 'students' ? 0 : 1;
  return (
    <motion.div transition={{ duration: 0.6, ease: "easeInOut" }} className="schedule-modes">
      <a className={ active == 'students' ? "active" : ""} onClick={() => onSelect('students')} href="#">
        <FontAwesomeIcon icon={faUserGraduate} />
      </a>
      <a className={ active == 'teachers' ? "active" : ""} onClick={() => onSelect('teachers')} href="#">
        <FontAwesomeIcon icon={faChalkboardTeacher} />
      </a>
      <span className="glider" style={{ transform: `translateX(${activeIndex * 100}%)` }} />
    </motion.div>
  );
}

function Schedule() {
  const { t } = useTranslation();
  const [activeMode, setActiveMode] = useState<ScheduleMode>("students");
  const [items, setItems] = useState<GenericItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeItem, setActiveItem] = useState<GenericItem | null>(null);

  useEffect(() => {
    setLoading(true);
    setItems([]);
    setActiveItem(null);

    const fetchData = async () => {
      try {
        setItems(await getFaculties());        
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeMode]);

  const handleModeSelect = (mode: ScheduleMode) => {
    setActiveMode(mode);
    setActiveItem(null);
    setItems([]);
    setLoading(true);
  };

  const handleSelect = (item: GenericItem) => setActiveItem((activeItem?.id === item.id) ? null: item);

  return (
    <div className="schedule-page">
      
      {activeItem ? <></> : 
        <>
          <h1>{t('title.schedule')}</h1>          
        </>
      }

      <div className="schedule-modes-container">
        <ScheduleModesList active={activeMode} onSelect={handleModeSelect} />
      </div>
      
      {activeMode && loading ? <Loader /> : (
        <GenericList
          items={items}
          activeId={activeItem?.id || null}
          onSelect={handleSelect}
          mode={activeMode}
          switchPane={null}
        />
      ) }
    </div>
  );
}

export default Schedule;