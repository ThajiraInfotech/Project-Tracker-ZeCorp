# Thajira WorkFlow - Project & Task Management System

![Thajira WorkFlow Logo](https://via.placeholder.com/300x100?text=Thajira+WorkFlow)

**Simple Project & Task Management Software for Zeecorp**

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB (v6+)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-repo/thajira-workflow.git
cd thajira-workflow
```

2. **Install dependencies**
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

3. **Set up environment variables**
Create a `.env` file in the root directory and add the following:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/thajira_workflow
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=30d

# Cloudinary Configuration (to be added later)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email Configuration (to be added later)
EMAIL_SERVICE=
EMAIL_USER=
EMAIL_PASSWORD=
SENDGRID_API_KEY=

# Server Configuration
PORT=5000
FRONTEND_URL=http://localhost:5173
```

4. **Run the application**
```bash
# Start both backend and frontend in development mode
npm run dev

# Or run separately:
# Backend: npm run dev:backend
# Frontend: cd frontend && npm run dev
```

5. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 📦 Tech Stack

### Backend
- **Node.js** with **Express.js**
- **MongoDB** with **Mongoose** ODM
- **JWT** for authentication
- **Socket.io** for real-time updates
- **Cloudinary** for file storage
- **Nodemailer** for email notifications

### Frontend
- **React.js** with **Vite** build tool
- **Tailwind CSS** for styling
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Chart.js** for data visualization
- **React Hook Form** for form handling
- **Zod** for form validation

## 🏗️ Project Structure

```
thajira-workflow/
├── backend/                  # Backend API
│   ├── controllers/         # Route controllers
│   ├── models/              # MongoDB models
│   ├── routes/              # API routes
│   ├── middleware/          # Express middleware
│   ├── utils/               # Utility functions
│   ├── server.js            # Main server file
│   └── ...
├── frontend/                 # Frontend application
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── layouts/         # Page layouts
│   │   ├── pages/           # Page components
│   │   ├── store/           # Redux store
│   │   ├── services/        # API services
│   │   ├── utils/           # Utility functions
│   │   ├── App.jsx          # Main app component
│   │   └── ...
│   ├── vite.config.js        # Vite configuration
│   ├── tailwind.config.js   # Tailwind configuration
│   └── ...
├── .env                     # Environment variables
├── package.json             # Project dependencies
└── README.md                # Project documentation
```

## 🎯 Key Features

### 1. **User Authentication & Authorization**
- Role-based access control (Admin, Manager, Staff)
- JWT authentication with token refresh
- Password reset functionality

### 2. **Project Management**
- Create, update, and delete projects
- Assign project managers and team members
- Track project progress and status
- Upload project files and documents

### 3. **Task Management**
- Create tasks with deadlines and priorities
- Assign tasks to team members
- Track task progress (0-100%)
- Add comments and file attachments
- Real-time task updates

### 4. **Attendance & Timesheet System**
- Check-in/check-out functionality
- Automatic overtime calculation
- Daily, weekly, and monthly timesheets
- Location tracking (optional)

### 5. **Reporting & Analytics**
- Real-time dashboard with key metrics
- Daily, weekly, and monthly reports
- Project-specific reports
- User performance reports
- Export reports to PDF

### 6. **File Management**
- Upload files to projects and tasks
- Cloudinary integration for file storage
- File preview and download

### 7. **Real-time Updates**
- Socket.io integration for live updates
- Instant notifications for task assignments
- Real-time progress tracking

## 📂 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Projects
- `POST /api/projects` - Create new project
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/my-tasks` - Get my tasks
- `PUT /api/tasks/:id/status` - Update task status
- `POST /api/tasks/:id/comments` - Add comment to task

### Attendance
- `POST /api/attendance/check-in` - Check in
- `POST /api/attendance/check-out` - Check out
- `GET /api/attendance/my-attendance` - Get my attendance
- `GET /api/attendance/daily-report` - Get daily report

### Reports
- `GET /api/reports/daily` - Get daily report
- `GET /api/reports/weekly` - Get weekly report
- `GET /api/reports/monthly` - Get monthly report
- `GET /api/reports/dashboard` - Get dashboard data

## 🎨 UI Components

### Layouts
- **AuthLayout** - Authentication pages layout
- **MainLayout** - Main application layout with sidebar

### Pages
- **Dashboard** - Overview with charts and statistics
- **Projects** - Project management interface
- **Tasks** - Task management interface
- **Attendance** - Attendance tracking
- **Reports** - Reporting and analytics
- **Profile** - User profile management

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/thajira_workflow

# JWT
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRES_IN=30d

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (for notifications)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
SENDGRID_API_KEY=your_sendgrid_key

# Server
PORT=5000
FRONTEND_URL=http://localhost:5173
```

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Start backend server
cd ..
npm start
```

### Docker Deployment (Optional)
```dockerfile
# Dockerfile for backend
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 📞 Support

For any issues or questions, please contact:

- **Email**: support@zeecorp.com
- **Website**: https://zeecorp.com

---

**Thajira WorkFlow** - Simple, Clean & Zero Complexity Project Management for Zeecorp