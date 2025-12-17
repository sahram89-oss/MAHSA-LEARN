import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import NurseDashboard from './components/NurseDashboard';
import EducatorDashboard from './components/EducatorDashboard';
import CoursePlayer from './components/CoursePlayer';
import { User, Course, AuthState, QuizAttempt } from './types';
import { INITIAL_USERS, INITIAL_COURSES } from './services/mockData';
import { api } from './services/api';
import { Loader2, WifiOff } from 'lucide-react';

function App() {
  // --- App State ---
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const [auth, setAuth] = useState<AuthState>({ isAuthenticated: false, currentUser: null });
  
  // UI State
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [changePinMode, setChangePinMode] = useState(false);
  const [loginError, setLoginError] = useState<string | undefined>(undefined);

  // --- Initial Data Fetch ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch from API
        const [fetchedUsers, fetchedCourses] = await Promise.all([
          api.getUsers(),
          api.getCourses()
        ]);
        
        setUsers(fetchedUsers);
        setCourses(fetchedCourses);
        setIsOffline(false);
      } catch (error) {
        console.error("Failed to connect to backend. Falling back to Mock Data.", error);
        // Fallback to initial mock data if API fails (or dev mode without backend)
        setUsers(INITIAL_USERS);
        setCourses(INITIAL_COURSES);
        setIsOffline(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- Handlers ---

  const handleLogin = (id: string, pin: string) => {
    const user = users.find(u => u.id === id && u.pin === pin);
    if (user) {
      setAuth({ isAuthenticated: true, currentUser: user });
      setLoginError(undefined);
    } else {
      setLoginError('Invalid Staff ID or PIN');
    }
  };

  const handleResetPin = (id: string, newPin: string): boolean => {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      const updatedUser = { ...users[userIndex], pin: newPin };
      
      // Update State
      const updatedUsers = [...users];
      updatedUsers[userIndex] = updatedUser;
      setUsers(updatedUsers);

      // API Call
      api.saveUser(updatedUser).catch(e => console.error("API Sync Error", e));
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setAuth({ isAuthenticated: false, currentUser: null });
    setActiveCourse(null);
    setChangePinMode(false);
  };

  const handleChangePin = () => {
    const newPin = prompt("Enter new 4-digit PIN:");
    if (newPin && newPin.length === 4 && !isNaN(Number(newPin)) && auth.currentUser) {
       const updatedUser = { ...auth.currentUser, pin: newPin };
       
       const updatedUsers = users.map(u => 
         u.id === auth.currentUser!.id ? updatedUser : u
       );
       
       setUsers(updatedUsers);
       setAuth(prev => ({ ...prev, currentUser: updatedUser }));
       
       // API Call
       api.saveUser(updatedUser).catch(e => console.error("API Sync Error", e));

       alert("PIN updated successfully.");
    } else if (newPin) {
       alert("Invalid PIN format. Must be 4 digits.");
    }
  };

  const handleStartCourse = (course: Course) => {
    setActiveCourse(course);
  };

  // Triggered on every quiz answer attempt
  const handleQuizAttempt = (courseId: string, slideId: string, question: string, answer: string, isCorrect: boolean) => {
    if (!auth.currentUser) return;
    
    const attempt: QuizAttempt = {
      courseId,
      slideId,
      question,
      selectedOption: answer,
      isCorrect,
      timestamp: Date.now()
    };

    // 1. Optimistic UI Update
    const updatedUser = { 
      ...auth.currentUser, 
      quizAttempts: [...(auth.currentUser.quizAttempts || []), attempt] 
    };

    const updatedUsers = users.map(u => u.id === auth.currentUser!.id ? updatedUser : u);
    setUsers(updatedUsers);
    setAuth(prev => ({ ...prev, currentUser: updatedUser }));

    // 2. Send to API
    api.logQuizAttempt(auth.currentUser.id, attempt).catch(e => console.error("Failed to log attempt", e));
  };

  const handleCompleteCourse = (courseId: string, earnedXp: number) => {
    if (!auth.currentUser) return;
    
    // Find course to get max possible XP for badge calculation
    const course = courses.find(c => c.id === courseId);
    const maxPossibleXp = course ? course.slides.length * 50 : 0;
    const isPerfectScore = earnedXp === maxPossibleXp && maxPossibleXp > 0;

    // Update User State (XP, Completed Courses, Check for Badges)
    let userUpdated = false;

    const updatedUsers = users.map(u => {
      if (u.id === auth.currentUser!.id) {
        // Prevent double reward if something glitches
        if (u.completedCourses.includes(courseId)) return u;
        
        userUpdated = true;
        const newXp = u.xp + earnedXp;
        const newCompleted = [...u.completedCourses, courseId];
        const newBadges = [...u.badges];

        // --- Simple Badge Logic ---
        if (newCompleted.length === 1 && !newBadges.includes('b1')) newBadges.push('b1');
        if (newXp >= 1000 && !newBadges.includes('b2')) newBadges.push('b2');
        if (isPerfectScore && !newBadges.includes('b4')) newBadges.push('b4');

        return {
          ...u,
          xp: newXp,
          badges: newBadges,
          completedCourses: newCompleted
        };
      }
      return u;
    });

    if (userUpdated) {
        setUsers(updatedUsers);
        const updatedCurrentUser = updatedUsers.find(u => u.id === auth.currentUser!.id) || null;
        setAuth({ isAuthenticated: true, currentUser: updatedCurrentUser });
        
        // Sync with DB
        if (updatedCurrentUser) {
            api.updateUserProgress(updatedCurrentUser).catch(e => console.error("API Sync Error", e));
        }
        
        setActiveCourse(null);
    }
  };

  const handleAddCourse = (courseData: Omit<Course, 'id'>) => {
    const newCourse: Course = {
      ...courseData,
      id: `c${courses.length + 1}-${Date.now()}`,
      timestamp: Date.now()
    };
    
    setCourses([...courses, newCourse]);
    api.saveCourse(newCourse).catch(e => console.error("API Sync Error", e));
  };

  const handleUpdateCourse = (updatedCourse: Course) => {
    setCourses(courses.map(c => c.id === updatedCourse.id ? updatedCourse : c));
    api.saveCourse(updatedCourse).catch(e => console.error("API Sync Error", e));
  };

  // --- User Management Handlers ---

  const handleAddUser = (newUser: User) => {
    if (users.some(u => u.id === newUser.id)) {
      alert(`User with ID ${newUser.id} already exists.`);
      return;
    }
    setUsers([...users, newUser]);
    api.saveUser(newUser).catch(e => console.error("API Sync Error", e));
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    
    if (auth.currentUser?.id === updatedUser.id) {
       setAuth(prev => ({ ...prev, currentUser: updatedUser }));
    }

    api.saveUser(updatedUser).catch(e => console.error("API Sync Error", e));
  };

  const handleRemoveUser = (userId: string) => {
    if (userId === auth.currentUser?.id) {
      alert("You cannot delete your own account while logged in.");
      return;
    }
    if (confirm("Are you sure you want to remove this user?")) {
      setUsers(users.filter(u => u.id !== userId));
      api.deleteUser(userId).catch(e => console.error("API Sync Error", e));
    }
  };

  const handleImportUsers = (importedUsers: User[]) => {
    // Process imports sequentially for API
    const updatedUsers = [...users];
    
    importedUsers.forEach(imported => {
      const index = updatedUsers.findIndex(u => u.id === imported.id);
      if (index >= 0) {
        updatedUsers[index] = { ...updatedUsers[index], ...imported };
      } else {
        updatedUsers.push(imported);
      }
      // Trigger API save for each
      api.saveUser(imported); 
    });
    
    setUsers(updatedUsers);
    alert(`Processing ${importedUsers.length} users...`);
  };

  // --- Render ---

  if (isLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="animate-spin mb-4 text-mahsa-teal" size={48} />
              <p>Connecting to MAHSA Database...</p>
          </div>
      );
  }

  return (
    <div className="bg-gray-200 min-h-screen flex items-center justify-center font-sans">
      {/* Mobile Simulator Container */}
      <div className="w-full max-w-[450px] h-[100dvh] sm:h-[850px] bg-white sm:rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col">
        
        {isOffline && (
            <div className="bg-red-500 text-white text-xs text-center py-1 flex items-center justify-center gap-2">
                <WifiOff size={12} /> Offline Mode - Using Mock Data (Changes won't save to DB)
            </div>
        )}

        {!auth.isAuthenticated ? (
          <LoginScreen 
            onLogin={handleLogin} 
            onResetPin={handleResetPin}
            error={loginError} 
          />
        ) : (
          <>
            {auth.currentUser?.role === 'Nurse' && (
              <NurseDashboard 
                user={auth.currentUser}
                allUsers={users}
                courses={courses}
                onStartCourse={handleStartCourse}
                onLogout={handleLogout}
                onChangePin={handleChangePin}
              />
            )}

            {auth.currentUser?.role === 'Educator' && (
              <EducatorDashboard 
                user={auth.currentUser}
                users={users}
                courses={courses}
                onAddCourse={handleAddCourse}
                onUpdateCourse={handleUpdateCourse}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onRemoveUser={handleRemoveUser}
                onImportUsers={handleImportUsers}
                onLogout={handleLogout}
              />
            )}

            {/* Course Player Overlay */}
            {activeCourse && (
              <CoursePlayer 
                course={activeCourse} 
                onClose={() => setActiveCourse(null)}
                onComplete={handleCompleteCourse}
                onQuizAttempt={handleQuizAttempt}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;