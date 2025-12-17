import { User, Course, QuizAttempt } from '../types';

// CONFIGURATION: Point this to where your IT team hosts the PHP script
const API_BASE_URL = 'http://localhost/mahsa-api/api.php'; 

// Helper to handle API requests
async function apiRequest<T>(action: string, method: 'GET' | 'POST', body?: any): Promise<T> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    // Append action to URL
    const url = `${API_BASE_URL}?action=${action}`;
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error(`Request failed for action: ${action}`, error);
    throw error;
  }
}

export const api = {
  // --- GET DATA ---
  getUsers: () => apiRequest<User[]>('get_users', 'GET'),
  getCourses: () => apiRequest<Course[]>('get_courses', 'GET'),

  // --- USER ACTIONS ---
  saveUser: (user: User) => apiRequest('save_user', 'POST', user),
  
  // Send quiz attempt to DB (Logs it in quiz_attempts table AND updates user state)
  logQuizAttempt: (userId: string, attempt: QuizAttempt) => 
    apiRequest('log_quiz_attempt', 'POST', { userId, attempt }),

  // Update user stats (XP, Badges, Completed Courses)
  updateUserProgress: (user: User) => 
    apiRequest('update_user_progress', 'POST', user),

  deleteUser: (userId: string) => apiRequest('delete_user', 'POST', { id: userId }),

  // --- COURSE ACTIONS ---
  saveCourse: (course: Course) => apiRequest('save_course', 'POST', course),
};