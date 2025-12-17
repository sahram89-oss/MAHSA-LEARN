# MAHSA MicroLearn Platform

This is a React-based Progressive Web App (PWA) for the MAHSA Specialist Hospital Microlearning platform.

## ⚠️ Important: Backend Setup (phpMyAdmin)

This application is configured to connect to a **PHP/MySQL Backend**.

### 1. Database Setup (SQL)
Run this SQL in your **phpMyAdmin** to create the necessary tables:

```sql
CREATE DATABASE IF NOT EXISTS mahsa_microlearn;
USE mahsa_microlearn;

-- Users Table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    pin VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'Nurse',
    avatar TEXT,
    xp INT DEFAULT 0,
    streak INT DEFAULT 0,
    badges JSON,
    completed_courses JSON
);

-- Courses Table
CREATE TABLE courses (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    duration_minutes INT DEFAULT 5,
    xp_reward INT DEFAULT 50,
    slides JSON,
    timestamp BIGINT
);

-- Quiz Attempts Table (For Analytics)
CREATE TABLE quiz_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50),
    course_id VARCHAR(50),
    slide_id VARCHAR(50),
    question TEXT,
    selected_option TEXT,
    is_correct TINYINT(1),
    timestamp BIGINT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 2. Backend Script (PHP)
1. Create a folder named `mahsa-api` in your web server's root (e.g., `htdocs` or `www`).
2. Create a file named `api.php` inside it.
3. Paste the following PHP code:

```php
<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Database Config
$host = "localhost";
$user = "root"; // Change to your DB user
$pass = "";     // Change to your DB password
$dbname = "mahsa_microlearn";

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    die(json_encode(["error" => "Connection failed: " . $conn->connect_error]));
}

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// --- HELPER FUNCTIONS ---
function getJsonInput() {
    return json_decode(file_get_contents("php://input"), true);
}

// --- API ACTIONS ---

if ($action === 'get_users') {
    $result = $conn->query("SELECT * FROM users");
    $users = [];
    while($row = $result->fetch_assoc()) {
        $row['badges'] = json_decode($row['badges']);
        $row['completedCourses'] = json_decode($row['completed_courses']);
        
        // Fetch quiz attempts for this user
        $uid = $row['id'];
        $attempts_res = $conn->query("SELECT * FROM quiz_attempts WHERE user_id = '$uid'");
        $attempts = [];
        while($a = $attempts_res->fetch_assoc()) {
            $attempts[] = [
                'courseId' => $a['course_id'],
                'slideId' => $a['slide_id'],
                'question' => $a['question'],
                'selectedOption' => $a['selected_option'],
                'isCorrect' => (bool)$a['is_correct'],
                'timestamp' => (int)$a['timestamp']
            ];
        }
        $row['quizAttempts'] = $attempts;
        
        // Clean up keys to match frontend types
        unset($row['completed_courses']);
        $users[] = $row;
    }
    echo json_encode($users);

} elseif ($action === 'get_courses') {
    $result = $conn->query("SELECT * FROM courses");
    $courses = [];
    while($row = $result->fetch_assoc()) {
        $row['slides'] = json_decode($row['slides']);
        $row['xpReward'] = (int)$row['xp_reward'];
        $row['durationMinutes'] = (int)$row['duration_minutes'];
        unset($row['xp_reward']);
        unset($row['duration_minutes']);
        $courses[] = $row;
    }
    echo json_encode($courses);

} elseif ($action === 'save_user') {
    $data = getJsonInput();
    $id = $data['id'];
    $pin = $data['pin'];
    $name = $data['name'];
    $role = $data['role'];
    $avatar = $data['avatar'];
    $badges = json_encode($data['badges'] ?? []);
    $completed = json_encode($data['completedCourses'] ?? []);
    
    $stmt = $conn->prepare("REPLACE INTO users (id, pin, name, role, avatar, badges, completed_courses) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sssssss", $id, $pin, $name, $role, $avatar, $badges, $completed);
    
    if($stmt->execute()) echo json_encode(["success" => true]);
    else echo json_encode(["error" => $conn->error]);

} elseif ($action === 'update_user_progress') {
    $data = getJsonInput();
    $id = $data['id'];
    $xp = $data['xp'];
    $badges = json_encode($data['badges']);
    $completed = json_encode($data['completedCourses']);
    
    $stmt = $conn->prepare("UPDATE users SET xp=?, badges=?, completed_courses=? WHERE id=?");
    $stmt->bind_param("isss", $xp, $badges, $completed, $id);
    
    if($stmt->execute()) echo json_encode(["success" => true]);
    else echo json_encode(["error" => $conn->error]);

} elseif ($action === 'log_quiz_attempt') {
    $data = getJsonInput();
    $uid = $data['userId'];
    $att = $data['attempt'];
    
    $stmt = $conn->prepare("INSERT INTO quiz_attempts (user_id, course_id, slide_id, question, selected_option, is_correct, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $isCorrect = $att['isCorrect'] ? 1 : 0;
    $stmt->bind_param("sssssii", $uid, $att['courseId'], $att['slideId'], $att['question'], $att['selectedOption'], $isCorrect, $att['timestamp']);
    
    if($stmt->execute()) echo json_encode(["success" => true]);
    else echo json_encode(["error" => $conn->error]);

} elseif ($action === 'save_course') {
    $data = getJsonInput();
    $id = $data['id'];
    $title = $data['title'];
    $cat = $data['category'];
    $dur = $data['durationMinutes'];
    $xp = $data['xpReward'];
    $slides = json_encode($data['slides']);
    $ts = $data['timestamp'];
    
    $stmt = $conn->prepare("REPLACE INTO courses (id, title, category, duration_minutes, xp_reward, slides, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sssiisi", $id, $title, $cat, $dur, $xp, $slides, $ts);
    
    if($stmt->execute()) echo json_encode(["success" => true]);
    else echo json_encode(["error" => $conn->error]);

} elseif ($action === 'delete_user') {
    $data = getJsonInput();
    $id = $data['id'];
    $conn->query("DELETE FROM users WHERE id='$id'");
    echo json_encode(["success" => true]);
}

$conn->close();
?>
```

## 🚀 How to Run

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Start Frontend:**
    ```bash
    npm run dev
    ```

3.  **Frontend Config:**
    Open `services/api.ts` and ensure `API_BASE_URL` matches your local PHP server URL (e.g., `http://localhost/mahsa-api/api.php`).
