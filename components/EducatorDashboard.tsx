import React, { useState, useRef } from 'react';
import { User, Course, Role } from '../types';
import Button from './Button';
import Input from './Input';
import CourseBuilder from './CourseBuilder';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Users, BookOpen, Plus, LogOut, Search, Pencil, Download, Upload, Trash2, X, UserPlus, FileSpreadsheet, ShieldCheck, Library } from 'lucide-react';

interface EducatorDashboardProps {
  user: User;
  users: User[];
  courses: Course[];
  onAddCourse: (courseData: Omit<Course, 'id'>) => void;
  onUpdateCourse: (course: Course) => void;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onRemoveUser: (userId: string) => void;
  onImportUsers: (users: User[]) => void;
  onLogout: () => void;
}

const EducatorDashboard: React.FC<EducatorDashboardProps> = ({ 
  user,
  users, 
  courses, 
  onAddCourse,
  onUpdateCourse,
  onAddUser,
  onUpdateUser,
  onRemoveUser,
  onImportUsers,
  onLogout 
}) => {
  const [activeTab, setActiveTab] = useState<'compliance' | 'courses' | 'users'>('compliance');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  
  // User Management State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserMode, setIsEditUserMode] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', id: '', pin: '', role: 'Nurse' as Role });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats Logic
  const nurses = users.filter(u => u.role === 'Nurse');
  const totalAssignments = nurses.length * courses.length;
  const totalCompletions = nurses.reduce((acc, user) => acc + user.completedCourses.length, 0);
  const completionRate = totalAssignments > 0 ? Math.round((totalCompletions / totalAssignments) * 100) : 0;

  const data = [
    { name: 'Completed', value: totalCompletions },
    { name: 'Pending', value: totalAssignments - totalCompletions },
  ];
  const COLORS = ['#10b981', '#cbd5e1']; // Green and Slate-300

  // Derive unique categories for the builder
  const availableCategories = Array.from(new Set(courses.map(c => c.category))).sort();

  // --- Course Handlers ---

  const handleSaveCourse = (courseData: Omit<Course, 'id'>) => {
    if (editingCourse) {
      onUpdateCourse({ ...courseData, id: editingCourse.id });
    } else {
      onAddCourse(courseData);
    }
    setIsBuilderOpen(false);
    setEditingCourse(null);
  };

  const handleCreateNew = () => {
    setEditingCourse(null);
    setIsBuilderOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setIsBuilderOpen(true);
  };

  // --- User Handlers ---

  const handleOpenAddUser = () => {
    setNewUser({ name: '', id: '', pin: '', role: 'Nurse' });
    setIsEditUserMode(false);
    setIsAddUserOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setNewUser({
      name: user.name,
      id: user.id,
      pin: user.pin,
      role: user.role
    });
    setIsEditUserMode(true);
    setIsAddUserOpen(true);
  };

  const handleSaveUser = () => {
    if(!newUser.name || !newUser.id || !newUser.pin) return;
    
    if (isEditUserMode) {
      // Find original user to preserve XP, badges, etc.
      const originalUser = users.find(u => u.id === newUser.id);
      if (originalUser) {
        const updatedUser: User = {
          ...originalUser,
          name: newUser.name,
          pin: newUser.pin,
          role: newUser.role,
          // Update avatar if name changed, otherwise keep original
          avatar: originalUser.name !== newUser.name 
            ? `https://ui-avatars.com/api/?name=${encodeURIComponent(newUser.name)}&background=random`
            : originalUser.avatar
        };
        onUpdateUser(updatedUser);
      }
    } else {
      const user: User = {
        id: newUser.id,
        name: newUser.name,
        pin: newUser.pin,
        role: newUser.role,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newUser.name)}&background=random`,
        xp: 0,
        streak: 0,
        badges: [],
        completedCourses: [],
        quizAttempts: []
      };
      onAddUser(user);
    }
    
    setIsAddUserOpen(false);
    setNewUser({ name: '', id: '', pin: '', role: 'Nurse' });
    setIsEditUserMode(false);
  };

  const handleExportCSV = () => {
    const headers = ["id,name,pin,role,xp\n"];
    const rows = users.map(u => `${u.id},"${u.name}",${u.pin},${u.role},${u.xp}`).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mahsa_users.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportQuizCSV = () => {
    const headers = ["Timestamp,User Name,Staff ID,Course,Question,Selected Answer,Is Correct\n"];
    
    const rows = users.flatMap(u => {
      // Safely handle if quizAttempts is undefined
      return (u.quizAttempts || []).map(attempt => {
        const course = courses.find(c => c.id === attempt.courseId);
        const courseTitle = course ? course.title.replace(/,/g, '') : 'Unknown Course'; // Remove commas to prevent CSV break
        const safeQuestion = attempt.question.replace(/,/g, ' ');
        const safeAnswer = attempt.selectedOption.replace(/,/g, ' ');
        const date = new Date(attempt.timestamp).toLocaleString();
        
        return `${date},"${u.name}",${u.id},"${courseTitle}","${safeQuestion}","${safeAnswer}",${attempt.isCorrect ? 'Correct' : 'Wrong'}`;
      });
    }).join("\n");

    const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mahsa_quiz_analysis.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const parsedUsers: User[] = [];

      // Skip header (index 0)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV parse assuming no commas in values except name which might be quoted
        // A robust parser is recommended for production, but simple split works for basic needs
        const parts = line.split(',');
        // Handle basics: id,name,pin,role
        if (parts.length >= 4) {
           const id = parts[0].trim();
           // Remove quotes if present for name
           const name = parts[1].replace(/"/g, '').trim();
           const pin = parts[2].trim();
           const role = parts[3].trim() as Role;

           if(id && name && pin) {
             parsedUsers.push({
               id,
               name,
               pin,
               role: (role === 'Nurse' || role === 'Educator') ? role : 'Nurse',
               avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
               xp: 0,
               streak: 0,
               badges: [],
               completedCourses: [],
               quizAttempts: []
             });
           }
        }
      }

      if (parsedUsers.length > 0) {
        onImportUsers(parsedUsers);
      } else {
        alert("No valid users found in CSV.");
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  if (isBuilderOpen) {
    return (
      <CourseBuilder 
        initialCourse={editingCourse || undefined}
        onSave={handleSaveCourse} 
        onCancel={() => { setIsBuilderOpen(false); setEditingCourse(null); }} 
        availableCategories={availableCategories}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Sleek Header - Indigo Theme */}
      <div className="bg-indigo-900 text-white p-6 pb-20 rounded-b-[2.5rem] shadow-xl relative z-10 transition-all">
        <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-3">
             <div className="p-1 bg-indigo-800 rounded-full">
                <img src={user.avatar} alt="Profile" className="w-12 h-12 rounded-full border-2 border-indigo-400 object-cover" />
             </div>
             <div>
               <p className="text-indigo-300 text-xs uppercase font-bold tracking-wider flex items-center gap-1">
                 Administrator
               </p>
               <h1 className="text-xl font-bold">{user.name}</h1>
             </div>
           </div>
           <button onClick={onLogout} className="text-indigo-200 hover:text-white text-xs font-medium bg-indigo-800/50 hover:bg-indigo-700/50 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1">
             <LogOut size={14} /> Log Out
           </button>
        </div>

        {/* Admin Overview Stats inside Header */}
        <div className="flex gap-8 mt-6 px-2">
            <div className="flex flex-col">
                <span className="text-2xl font-bold text-white leading-none">{courses.length}</span>
                <span className="text-[10px] text-indigo-300 uppercase tracking-wide font-semibold mt-1">Modules</span>
            </div>
            <div className="flex flex-col">
                 <span className="text-2xl font-bold text-white leading-none">{nurses.length}</span>
                 <span className="text-[10px] text-indigo-300 uppercase tracking-wide font-semibold mt-1">Staff</span>
            </div>
             <div className="flex flex-col">
                 <span className="text-2xl font-bold text-emerald-400 leading-none">{completionRate}%</span>
                 <span className="text-[10px] text-indigo-300 uppercase tracking-wide font-semibold mt-1">Compliance</span>
            </div>
        </div>
      </div>

      {/* Navigation Tabs - Overlapping the Header */}
      <div className="px-6 -mt-12 relative z-20 mb-2">
        <div className="bg-white p-1.5 rounded-2xl shadow-lg shadow-indigo-900/10 border border-slate-100 flex">
          <button 
            onClick={() => setActiveTab('compliance')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex flex-col items-center gap-1 ${activeTab === 'compliance' ? 'bg-indigo-50 text-indigo-900 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <ShieldCheck size={18} className={activeTab === 'compliance' ? 'text-indigo-600' : 'text-slate-400'}/>
            Compliance
          </button>
          <button 
            onClick={() => setActiveTab('courses')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex flex-col items-center gap-1 ${activeTab === 'courses' ? 'bg-indigo-50 text-indigo-900 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
          >
             <Library size={18} className={activeTab === 'courses' ? 'text-indigo-600' : 'text-slate-400'}/>
            Courses
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex flex-col items-center gap-1 ${activeTab === 'users' ? 'bg-indigo-50 text-indigo-900 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
          >
             <Users size={18} className={activeTab === 'users' ? 'text-indigo-600' : 'text-slate-400'}/>
            Staff
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-20 no-scrollbar pt-2">
        {activeTab === 'compliance' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            
            {/* Chart */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 h-64 flex flex-col items-center relative mt-2">
               <h3 className="text-sm font-bold text-slate-700 w-full mb-2">Overall Compliance</h3>
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text in Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-6 pointer-events-none">
                  <span className="text-3xl font-bold text-slate-800">{completionRate}%</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Done</span>
              </div>
              <div className="flex gap-4 text-xs mt-[-10px]">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Completed</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"></div>Pending</div>
              </div>
            </div>

            {/* Staff List */}
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-3">Staff Breakdown</h3>
              <div className="space-y-3">
                {nurses.map(nurse => {
                  const doneCount = nurse.completedCourses.length;
                  const total = courses.length;
                  const isAllDone = doneCount === total && total > 0;
                  return (
                    <div key={nurse.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                       <div className="flex items-center gap-3">
                         <img src={nurse.avatar} className="w-9 h-9 rounded-full bg-slate-200 border border-slate-100" alt="" />
                         <div>
                           <p className="text-sm font-bold text-slate-800">{nurse.name}</p>
                           <p className="text-xs text-slate-400">ID: {nurse.id}</p>
                         </div>
                       </div>
                       <span className={`text-xs px-2 py-1 rounded-full font-bold ${isAllDone ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                         {doneCount}/{total}
                       </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="space-y-4 animate-in fade-in duration-500 pt-2">
             <Button fullWidth onClick={handleCreateNew} className="flex items-center justify-center gap-2 mb-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200">
               <Plus size={20} /> Create New Course
             </Button>
             
             {courses.map(course => (
               <div 
                 key={course.id} 
                 onClick={() => handleEditCourse(course)}
                 className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-all active:scale-[0.99] group"
               >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                         <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">{course.category}</span>
                      </div>
                      <h3 className="font-bold text-slate-800">{course.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{course.slides.length} slides • {course.durationMinutes} min</p>
                    </div>
                    <button className="text-slate-300 group-hover:text-indigo-500 transition-colors p-1 bg-slate-50 rounded-full group-hover:bg-indigo-50">
                      <Pencil size={16}/>
                    </button>
                  </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'users' && (
           <div className="space-y-4 animate-in fade-in duration-500 pt-2">
             
             <div className="grid grid-cols-2 gap-3 mb-4">
                <Button onClick={handleOpenAddUser} className="flex items-center justify-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200">
                   <UserPlus size={18} /> Add User
                </Button>
                <div className="flex gap-2">
                   <button 
                     onClick={handleImportClick}
                     className="flex-1 bg-white border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center gap-1 text-xs font-semibold hover:bg-slate-50 shadow-sm"
                   >
                     <Upload size={16} /> Import
                   </button>
                   <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                   
                   <button 
                     onClick={handleExportCSV}
                     className="flex-1 bg-white border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center gap-1 text-xs font-semibold hover:bg-slate-50 shadow-sm"
                   >
                     <Download size={16} /> Users
                   </button>
                </div>
             </div>

             <Button 
                onClick={handleExportQuizCSV}
                variant="outline"
                className="w-full flex items-center justify-center gap-2 mb-4 text-sm border-dashed border-2"
              >
                <FileSpreadsheet size={18} className="text-green-600"/> Export Quiz Analysis Log
              </Button>

             <div className="space-y-3">
               {users.map(u => (
                 <div key={u.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-100">
                        <img src={u.avatar} alt={u.name} className="w-full h-full object-cover"/>
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                           <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded text-slate-600 font-semibold">{u.id}</span>
                           <span>•</span>
                           <span className={u.role === 'Educator' ? 'text-indigo-600 font-bold' : ''}>{u.role}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleOpenEditUser(u)}
                        className="p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors"
                        title="Edit User"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => onRemoveUser(u.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Remove User"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                 </div>
               ))}
             </div>
             
             <div className="p-4 bg-blue-50 rounded-xl text-xs text-blue-700 leading-relaxed border border-blue-100">
               <p className="font-bold mb-1">CSV Format for Import:</p>
               <code className="block bg-white/50 p-2 rounded">id,name,pin,role</code>
               <p className="mt-2 opacity-80">Example: 99999,"John Doe",1234,Nurse</p>
             </div>
           </div>
        )}
      </div>

      {/* Add/Edit User Modal */}
      {isAddUserOpen && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-mahsa-navy">
                  {isEditUserMode ? 'Edit User' : 'Add New User'}
                </h3>
                <button onClick={() => setIsAddUserOpen(false)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100">
                  <X size={20} className="text-slate-500"/>
                </button>
              </div>
              
              <div className="space-y-1">
                 <Input 
                   label="Staff ID" 
                   value={newUser.id} 
                   onChange={e => setNewUser({...newUser, id: e.target.value})} 
                   placeholder="e.g. 65432" 
                   disabled={isEditUserMode} // Disable ID editing
                 />
                 <Input 
                   label="Full Name" 
                   value={newUser.name} 
                   onChange={e => setNewUser({...newUser, name: e.target.value})} 
                   placeholder="e.g. Jane Doe" 
                 />
                 <Input 
                   label="PIN Code" 
                   value={newUser.pin} 
                   onChange={e => setNewUser({...newUser, pin: e.target.value})} 
                   maxLength={4} 
                   placeholder="4 Digits" 
                 />
                 
                 <div className="flex flex-col gap-1 mb-6">
                    <label className="text-sm font-medium text-slate-600 ml-1">Role</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setNewUser({...newUser, role: 'Nurse'})}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${newUser.role === 'Nurse' ? 'bg-white shadow-sm text-mahsa-navy' : 'text-slate-400'}`}
                      >
                        Nurse
                      </button>
                      <button 
                        onClick={() => setNewUser({...newUser, role: 'Educator'})}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${newUser.role === 'Educator' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-400'}`}
                      >
                        Educator
                      </button>
                    </div>
                 </div>

                 <Button fullWidth onClick={handleSaveUser}>
                   {isEditUserMode ? 'Update User' : 'Create User'}
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default EducatorDashboard;