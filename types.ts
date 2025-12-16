export type Role = 'Nurse' | 'Educator';

export interface QuizAttempt {
  courseId: string;
  slideId: string;
  question: string;
  selectedOption: string;
  isCorrect: boolean;
  timestamp: number;
}

export interface User {
  id: string;
  pin: string;
  name: string;
  role: Role;
  avatar: string;
  xp: number;
  streak: number;
  badges: string[]; // Array of Badge IDs
  completedCourses: string[]; // Array of course IDs
  quizAttempts?: QuizAttempt[]; // History of all quiz answers
}

export type SlideType = 'intro' | 'video' | 'quiz' | 'summary';

export interface Slide {
  id: string;
  type: SlideType;
  title: string;
  content: string; // Description or Video URL
  image?: string;
  quizData?: {
    question: string;
    options: string[];
    correctIndex: number;
  };
}

export interface Course {
  id: string;
  title: string;
  category: string; // e.g., 'Safety', 'Clinical', 'Soft Skills'
  slides: Slide[];
  xpReward: number;
  durationMinutes: number;
  timestamp?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
}