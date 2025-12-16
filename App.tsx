import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import NurseDashboard from './components/NurseDashboard';
import EducatorDashboard from './components/EducatorDashboard';
import CoursePlayer from './components/CoursePlayer';
import { User, Course, AuthState, QuizAttempt } from './types';
import { INITIAL_USERS, INITIAL_COURSES } from './services/mockData';

function App() {
  // --- App State with LocalStorage Persistence ---
  
  // Initialize Users: Try to get from LocalStorage, otherwise use Mock Data
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const savedUsers = localStorage.getItem('mahsa_users');
      return savedUsers ? JSON.parse(savedUsers) : INITIAL_USERS;
    } catch (error) {
      console.error("Failed to load users from storage", error);
      return INITIAL_USERS;
    }
  });

  // Initialize Courses: Try to get from LocalStorage, otherwise use Mock Data
  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      const savedCourses = localStorage.getItem('mahsa_courses');
      return savedCourses ? JSON.parse(savedCourses) : INITIAL_COURSES;
    } catch (error) {
      console.error("Failed to load courses from storage", error);
      return INITIAL_COURSES;
    }
  });

  const [auth, setAuth] = useState<AuthState>({ isAuthenticated: false, currentUser: null });
  
  // UI State
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [changePinMode, setChangePinMode] = useState(false);
  const [loginError, setLoginError] = useState<string | undefined>(undefined);

  // --- Persistence Effects ---

  // Save Users whenever they change
  useEffect(() => {
    localStorage.setItem('mahsa_users', JSON.stringify(users));
  }, [users]);

  // Save Courses whenever they change
  useEffect(() => {
    localStorage.setItem('mahsa_courses', JSON.stringify(courses));
  }, [courses]);

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
      const updatedUsers = [...users];
      updatedUsers[userIndex] = { ...updatedUsers[userIndex], pin: newPin };
      setUsers(updatedUsers);
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
       const updatedUsers = users.map(u => 
         u.id === auth.currentUser!.id ? { ...u, pin: newPin } : u
       );
       setUsers(updatedUsers);
       setAuth(prev => ({ ...prev, currentUser: { ...prev.currentUser!, pin: newPin } }));
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

    const updatedUsers = users.map(u => {
      if (u.id === auth.currentUser?.id) {
         // Create new array if quizAttempts is undefined (legacy data)
         return { ...u, quizAttempts: [...(u.quizAttempts || []), attempt] };
      }
      return u;
    });
    
    setUsers(updatedUsers);
    // Update auth user ref to ensure consistency during the session
    setAuth(prev => ({ ...prev, currentUser: updatedUsers.find(u => u.id === prev.currentUser?.id) || null }));
  };

  const handleCompleteCourse = (courseId: string, earnedXp: number) => {
    if (!auth.currentUser) return;
    
    // Find course to get max possible XP for badge calculation
    const course = courses.find(c => c.id === courseId);
    const maxPossibleXp = course ? course.slides.length * 50 : 0;
    const isPerfectScore = earnedXp === maxPossibleXp && maxPossibleXp > 0;

    // Update User State (XP, Completed Courses, Check for Badges)
    const updatedUsers = users.map(u => {
      if (u.id === auth.currentUser!.id) {
        // Prevent double reward if something glitches (optional logic, but good for safety)
        if (u.completedCourses.includes(courseId)) return u;
        
        const newXp = u.xp + earnedXp;
        const newCompleted = [...u.completedCourses, courseId];
        const newBadges = [...u.badges];

        // --- Simple Badge Logic ---
        // 1. First Course Badge (b1)
        if (newCompleted.length === 1 && !newBadges.includes('b1')) {
          newBadges.push('b1');
        }
        // 2. 1000 XP Badge (b2)
        if (newXp >= 1000 && !newBadges.includes('b2')) {
          newBadges.push('b2');
        }
        // 3. Quiz Whiz (b4) - Perfect Score
        if (isPerfectScore && !newBadges.includes('b4')) {
           newBadges.push('b4');
        }

        return {
          ...u,
          xp: newXp,
          badges: newBadges,
          completedCourses: newCompleted
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    
    // Update local current user state to reflect changes immediately
    const updatedCurrentUser = updatedUsers.find(u => u.id === auth.currentUser!.id) || null;
    setAuth({ isAuthenticated: true, currentUser: updatedCurrentUser });

    setActiveCourse(null);
    
    // Optional: Alert for XP gained
    // alert(`Course Complete! You earned ${earnedXp} XP.`);
  };

  const handleAddCourse = (courseData: Omit<Course, 'id'>) => {
    const newCourse: Course = {
      ...courseData,
      id: `c${courses.length + 1}-${Date.now()}`,
      timestamp: Date.now() // Set creation time
    };
    setCourses([...courses, newCourse]);
  };

  const handleUpdateCourse = (updatedCourse: Course) => {
    setCourses(courses.map(c => c.id === updatedCourse.id ? updatedCourse : c));
  };

  // --- User Management Handlers ---

  const handleAddUser = (newUser: User) => {
    // Check for duplicate ID
    if (users.some(u => u.id === newUser.id)) {
      alert(`User with ID ${newUser.id} already exists.`);
      return;
    }
    setUsers([...users, newUser]);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    // If we are updating the currently logged-in user (e.g. an admin updating themselves), update auth state
    if (auth.currentUser?.id === updatedUser.id) {
       setAuth(prev => ({ ...prev, currentUser: updatedUser }));
    }
  };

  const handleRemoveUser = (userId: string) => {
    if (userId === auth.currentUser?.id) {
      alert("You cannot delete your own account while logged in.");
      return;
    }
    if (confirm("Are you sure you want to remove this user? This cannot be undone.")) {
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const handleImportUsers = (importedUsers: User[]) => {
    const updatedUsers = [...users];
    
    importedUsers.forEach(imported => {
      const index = updatedUsers.findIndex(u => u.id === imported.id);
      if (index >= 0) {
        updatedUsers[index] = {
          ...updatedUsers[index],
          name: imported.name,
          pin: imported.pin,
          role: imported.role
        };
      } else {
        updatedUsers.push(imported);
      }
    });
    
    setUsers(updatedUsers);
    alert(`Successfully processed ${importedUsers.length} users.`);
  };

  // --- Render ---

  return (
    <div className="bg-gray-200 min-h-screen flex items-center justify-center font-sans">
      {/* Mobile Simulator Container */}
      <div className="w-full max-w-[450px] h-[100dvh] sm:h-[850px] bg-white sm:rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col">
        
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