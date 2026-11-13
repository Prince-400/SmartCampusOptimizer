# Smart Campus Resource Optimizer

**An intelligent campus room management, booking, and resource allocation system powered by Data Structures and Algorithms.**

## 1. Project Overview

Smart Campus Resource Optimizer is a software solution designed to improve the management and allocation of rooms and campus resources.

The system provides a centralized platform where users can view available rooms, make bookings, and manage their reservations, while administrators and authorized staff can manage rooms, users, bookings, and resource allocation.

The project combines a web-based interface, database integration, authentication, and core Data Structures and Algorithms to provide an organized and efficient resource management solution.

## 2. Problem Statement

Educational institutions often manage classrooms, laboratories, meeting rooms, and other shared resources manually.

This can result in:

- Conflicts between room bookings.
- Inefficient utilization of available rooms.
- Difficulty tracking room availability.
- Time-consuming administrative work.
- Lack of centralized booking information.

Smart Campus Resource Optimizer aims to address these challenges through a centralized and structured resource management system.

## 3. Main Objectives

- Provide centralized room management.
- Allow users to request and manage room bookings.
- Reduce booking conflicts.
- Improve resource utilization.
- Implement Data Structures and Algorithms in a practical application.
- Provide role-based access to different users.
- Maintain organized booking and notification records.

## 4. Key Features

### Room Management
- Add and manage campus rooms.
- Maintain room information.
- View available rooms.
- Organize room allocation.

### Booking Management
- Create room booking requests.
- View booking information.
- Edit or delete permitted bookings.
- Track booking status.
- Manage pending booking requests.

### User Management
- Customer registration and login.
- User authentication.
- Role-based access.
- Account management.

### Administrative Management
- Manage rooms and bookings.
- Review booking requests.
- Manage users and resource allocation.
- Access administrative functions according to permissions.

### Notifications
- Notify relevant users about booking-related activities.
- Maintain notification records.
- Track read and unread notifications.

### Resource Allocation
- Organize resource allocation using algorithmic approaches.
- Use priority-based processing where applicable.
- Support efficient allocation of available resources.

## 5. Technologies Used

| Technology | Purpose |
|---|---|
| C++ | Core logic and DSA implementation |
| HTML | Web application structure |
| CSS | User interface design |
| JavaScript | Frontend functionality |
| Supabase | Database and authentication services |
| Git | Version control |
| GitHub | Source code hosting |
| CMake | C++ project build configuration |

## 6. Data Structures and Algorithms

The project demonstrates practical applications of Data Structures and Algorithms.

The original C++ implementation includes:

- **Hash Table:** Organizing and accessing stored information.
- **Priority Queue:** Processing priority-based resource allocation.
- **Greedy Algorithm:** Supporting resource allocation decisions.
- **Resource Allocation:** Managing available resources efficiently.

The implementation also includes room management and booking-related C++ modules.

## 7. Project Architecture

The project contains two major parts:

### A. DSA and C++ Core
Implements the fundamental resource management and allocation logic using C++ and Data Structures and Algorithms.

### B. Web Application
Provides a graphical interface for users and administrators to interact with the system.

The frontend communicates with the configured Supabase services for authentication and database operations. The repository also contains C++ API and configuration modules.

## 8. Project Folder Structure

```text
SmartCampusOptimizer/
│
├── backend/
│   ├── AllocationRequest.h
│   ├── BookingManager.cpp
│   ├── BookingManager.h
│   ├── HashTable.h
│   ├── PriorityQueue.h
│   ├── ResourceAllocator.cpp
│   ├── ResourceAllocator.h
│   ├── RoomManager.cpp
│   ├── RoomManager.h
│   ├── main.cpp
│   │
│   ├── api/
│   │   ├── AuthManager.cpp
│   │   ├── AuthManager.h
│   │   ├── BookingDatabase.cpp
│   │   ├── BookingDatabase.h
│   │   ├── JWTVerifier.cpp
│   │   ├── JWTVerifier.h
│   │   ├── RoomDatabase.cpp
│   │   ├── RoomDatabase.h
│   │   └── SupabaseClient.cpp
│   │
│   └── config/
│       ├── Config.cpp
│       └── Config.h
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── config.js
│
├── tests/
│   ├── day3_test.cpp
│   ├── day4_allocation_test.cpp
│   ├── day4_priority_test.cpp
│   ├── auth_test.cpp
│   ├── booking_database_test.cpp
│   ├── jwt_test.cpp
│   └── room_database_test.cpp
│
├── CMakeLists.txt
├── .gitignore
└── README.md
```

*The folder structure above describes the main project components; individual files may change as development continues.*

## 9. Installation and Setup

### Prerequisites

Install the following software:

1. Git
2. Visual Studio Code
3. A C++ compiler supporting C++17 or the standard configured in CMake
4. CMake
5. A modern web browser
6. A Supabase account

### Step 1: Clone the Repository

```bash
git clone https://github.com/Prince-400/SmartCampusOptimizer.git
```

Navigate into the project:

```bash
cd SmartCampusOptimizer
```

### Step 2: Configure Supabase

1. Create a Supabase project.
2. Obtain your project URL.
3. Obtain your Supabase publishable key.
4. Configure these values in `frontend/config.js` according to the existing configuration format.
5. Set up the required database tables, authentication settings, and Row Level Security policies.

**Security:** Never expose a Supabase service-role key, database password, or other private credentials in frontend code or a public repository.

### Step 3: Run the Web Application

Open the `frontend` folder.

For local development, use the VS Code Live Server extension or another local HTTP server.

Open:

```text
frontend/index.html
```

The application requires a correctly configured Supabase project for its connected authentication and database functionality.

### Step 4: Build the C++ Project

From the project root, use CMake:

```bash
cmake -S . -B build
cmake --build build
```

Run the resulting executable according to your operating system and the target configured in `CMakeLists.txt`.

## 10. How to Use the Application

### For Customers

1. Open the web application.
2. Register an account.
3. Log in using your credentials.
4. View available rooms.
5. Submit a booking request.
6. View your bookings.
7. Manage permitted reservations.
8. Check notifications.

### For Administrators and Staff

1. Log in using an authorized account.
2. Access the dashboard.
3. View room and booking information.
4. Manage rooms and booking requests according to your permissions.
5. Review users and resource allocation.
6. Monitor notifications and system activity.

Available actions depend on the assigned user role and permissions.

## 11. Testing

The repository contains C++ test files for different project components, including:

- Authentication tests.
- Booking database tests.
- JWT verification tests.
- Room database tests.
- Priority queue tests.
- Resource allocation tests.

Build and execute the relevant test targets configured in CMake.

## 12. Future Improvements

Possible future enhancements include:

- Advanced room allocation optimization.
- Timetable integration.
- Analytics and utilization reports.
- Improved conflict detection.
- Automated booking recommendations.
- Mobile-friendly improvements.
- Additional administrative reporting.

## 13. Project Purpose

This project demonstrates how Data Structures and Algorithms can be applied to a real-world campus resource management problem.

It combines algorithmic problem-solving with practical software development, database integration, authentication, and web technologies.

## 14. Repository

**GitHub:** https://github.com/Prince-400/SmartCampusOptimizer

---

**Smart Campus Resource Optimizer**  
*Making campus resource management smarter and more efficient.*