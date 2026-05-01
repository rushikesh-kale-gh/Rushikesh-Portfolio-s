# Daily Tracker Dashboard - Complete Implementation

## Overview
A comprehensive Salesforce-based Daily Tracker system with custom user authentication, task management, analytics, and a modern premium UI. This system tracks personal achievements across custom categories with intelligent scoring algorithms.

---

## 🏗️ System Architecture

### Custom Objects Created/Modified

#### 1. **UserAccount__c** (NEW)
Non-SFDC user management for the app.

**Fields:**
- `Name` (Text, required) - Username
- `Password__c` (Text, required) - Hashed password
- `Security_Question__c` (Picklist, required) - Security question for password reset
- `Security_Answer__c` (Text, required) - Answer to security question

**Picklist Values (Security Questions):**
- What city were you born in?
- What was your first pet's name?
- What was the name of your school?
- What is your favorite color?
- What was your mother's maiden name?

---

#### 2. **Task__c** (REFACTORED)
Individual habit/task definitions.

**New Fields:**
- `Priority__c` (Picklist) - Low (0.3) | Medium (0.5) | High (0.8) | Critical (1.0)
- `Target_Quantity__c` (Number) - Optional target (e.g., "8" for 8 glasses of water)

**Existing Fields:**
- `Name` - Task name
- `Category__c` (Picklist) - User-defined categories (Health, Career, Discipline, Fitness, Learning, Personal)
- `Is_Active__c` - Whether task is active

---

#### 3. **Task_Log__c** (REFACTORED)
Daily task completion logging.

**New Fields:**
- `Intensity__c` (Number, 0-100) - Task completion intensity percentage

**Existing Fields:**
- `Day_Log__c` - Lookup to daily log
- `Task__c` - Lookup to task
- `Status__c` - Whether task was completed

---

#### 4. **Day_Log__c** (REFACTORED)
Daily summary log per user.

**New Fields:**
- `UserAccount__c` (Lookup) - Links to custom user account instead of SFDC User

**Existing Fields:**
- `Date__c` - Log date
- `Score__c` - Overall daily score
- `Health_Score__c` - Health category score
- `Career_Score__c` - Career category score
- `Discipline_Score__c` - Discipline category score
- `Reflection__c` - Daily reflection text

---

### Apex Controller: **DailyTrackerController**

Comprehensive controller with the following key methods:

#### Authentication Methods
- `createUserAccount(username, password, securityQuestion, securityAnswer)` - Create new account
- `signInUserAccount(username, password)` - Sign in user
- `resetPassword(username, securityQuestion, securityAnswer, newPassword)` - Forgot password flow
- `getUserSecurityQuestion(username)` - Get security question for forgot password

#### Data Management
- `getDailyLog(userAccountId, logDate)` - Get or create daily log
- `saveDailyLog(userAccountId, logDate, reflection)` - Save daily reflection and auto-calculate scores
- `getTasksForDate(userAccountId, logDate)` - Get all tasks logged for a date
- `saveTaskLog(dayLogId, taskId, intensity, completed)` - Update task completion and intensity

#### Task/Habit Management
- `createTask(userAccountId, taskName, category, priority, targetQuantity)` - Create new habit
- `updateTask(taskId, taskName, category, priority, targetQuantity, isActive)` - Update habit
- `deleteTask(taskId)` - Delete habit
- `getUserTasks(userAccountId)` - Get all user's active habits

#### Analytics
- `getLogsDateRange(userAccountId, startDate, endDate)` - Get logs for date range
- `getCalendarData(userAccountId, year, month)` - Get color-coded calendar data

#### Scoring Algorithm
**Score Calculation Formula:**
```
Category Score = SUM(priority × intensity%) / (SUM(priorities) × 100%)

Overall Score = AVERAGE(all category scores)

Color Coding (Calendar):
- Green: 75-100%
- Yellow: 50-75%
- Orange: 25-50%
- Red: 0-25%
```

---

## 🎨 LWC Components

### 1. **authenticationScreen**
User authentication interface with three modes:

**Features:**
- ✅ Sign In with username/password
- ✅ Create New Account with security question setup
- ✅ Forgot Password flow (security question verification)
- ✅ Modern gradient UI with smooth animations
- ✅ Form validation and error messaging
- ✅ Mobile responsive design

**Emitted Events:**
- `loginsuccess` - On successful sign in
- `accountcreated` - On account creation

---

### 2. **dailyTrackerDashboard**
Main application container with 5-tab interface.

**Header:**
- User greeting with current date
- Sign Out button
- Score overview (Overall, Health, Career, Discipline)

**5 Tabs:**

#### Tab 1: 📝 Reflection
- Add/edit daily reflection text
- Save reflection
- Auto-calculation of daily scores upon save

#### Tab 2: 📊 Show Log (Analytics)
- View performance graphs
- Filter by: Today, Last 7 Days, Last 30 Days
- Shows Health (Blue), Career (Red), Consistency (Green) trends

#### Tab 3: 📅 Calendar
- Color-coded calendar view by month
- Shows daily scores as percentages
- Navigate through months
- Color legend (Green/Yellow/Orange/Red based on score ranges)

#### Tab 4: ✅ Tasks
- View today's configured tasks
- Mark tasks as completed
- Adjust intensity (0-100%) for completed tasks
- See category, priority, and target quantity for each task

#### Tab 5: ⚙️ Habits
- Add new habits with:
  - Name
  - Category (Health, Career, Discipline, Fitness, Learning, Personal)
  - Priority (Low, Medium, High, Critical)
  - Optional target quantity
- View all configured habits
- Delete habits
- Each user's habits are completely independent/private

---

## 📊 Scoring System

### How Scores Are Calculated

**Example:**
```
Day's Logged Tasks:
1. Drink Water (Health, High 0.8 priority, 87% intensity) = 0.8 × 87% = 0.696
2. Exercise (Health, High 0.8 priority, 100% intensity) = 0.8 × 100% = 0.80
3. Code Review (Career, Medium 0.5 priority, 75% intensity) = 0.5 × 75% = 0.375

Health Score = (0.696 + 0.80) / (0.8 + 0.8) = 1.496 / 1.6 = 93.5%
Career Score = 0.375 / 0.5 = 75%
Consistency = (93.5% + 75%) / 2 = 84.25%

Overall Score = Average of all category scores
```

### Intensity Concept
- All tasks have a 0-100% intensity field
- Represents how well you completed the task
- Example: "Drink 8 glasses → did 7" = 87% intensity
- Directly multiplies with priority to affect category score

---

## 🔐 Security

### Password Handling
- Passwords are hashed using SHA-256 with salt (production: use bcrypt)
- Stored in `Password__c` field

### User Isolation
- All data is scoped to `UserAccount__c` records
- Each user's tasks, logs, and reflections are completely private
- No dependency on SFDC users

---

## 🚀 Deployment & Setup

### 1. Deploy Metadata
```bash
sfdx force:source:deploy -p force-app
```

### 2. Create Test UserAccount
```apex
UserAccount__c user = new UserAccount__c(
    Name = 'testuser',
    Password__c = 'hashed_password_here',
    Security_Question__c = 'City Born',
    Security_Answer__c = 'newyork'
);
insert user;
```

### 3. Create Test Tasks
```apex
Task__c task = new Task__c(
    Name = 'Drink 8 glasses of water',
    Category__c = 'Health',
    Priority__c = 'High',
    Target_Quantity__c = 8,
    Is_Active__c = true
);
insert task;
```

### 4. Add Component to Lightning App
Add to your Lightning App:
```xml
<aura:component>
    <c:dailyTrackerDashboard></c:dailyTrackerDashboard>
</aura:component>
```

---

## 📱 Responsive Design

- **Desktop (1200px+)**: Full 5-column score cards, normal font sizes
- **Tablet (768px-1199px)**: 2-column grid for score cards, smaller padding
- **Mobile (<768px)**: 1-column layout, responsive tabs, optimized spacing

---

## 🎯 Key Features Implemented

✅ **Authentication System**
- Non-SFDC user management with custom credentials
- Password hashing and verification
- Security question-based password reset

✅ **Task Management**
- Create/edit/delete personal habits
- Categorize by user-defined categories
- Set priority levels (Low/Medium/High/Critical)
- Optional target quantities

✅ **Daily Logging**
- Mark tasks completed/not completed
- Set intensity levels (0-100%)
- Auto-calculate scores based on formula
- Add daily reflections

✅ **Analytics & Insights**
- Category-specific scores (Health, Career, Discipline)
- Overall consistency score
- Date range analytics
- Color-coded calendar view

✅ **Modern Premium UI**
- Gradient backgrounds and glass morphism effects
- Smooth animations and transitions
- Full responsive design
- Professional color scheme

✅ **Data Privacy**
- Each user's data is completely isolated
- No dependency on Salesforce users

---

## 🔄 Data Flow

```
1. User creates/signs in via AuthenticationScreen
   ↓
2. Dashboard loads user's UserAccount record
   ↓
3. User selects habits to log (Tab 5)
   ↓
4. User logs task completions and intensity (Tab 4)
   ↓
5. System auto-calculates scores and updates Day_Log__c
   ↓
6. User views reflections, analytics, calendar (Tabs 1-3)
```

---

## 🛠️ Future Enhancement Opportunities

- 📈 Chart.js integration for better analytics visualization
- 🔔 Push notifications for habit reminders
- 📤 Export data to PDF/Excel
- 🤖 AI-powered insights and recommendations
- 👥 Social features (share achievements, leaderboards)
- 🎵 Gamification (badges, streaks, milestones)
- 🌙 Dark mode toggle
- 📊 Advanced filtering and custom date ranges

---

## 📝 Notes

- Category names can be fully customized by users
- Task priorities are standardized for consistent scoring
- Intensity is flexible (percentage-based, no unit required)
- All calculations are real-time upon save
- Scores reset daily (each Day_Log__c is for one date)

---

## Support

For issues or questions, refer to:
- Apex Controller: `DailyTrackerController`
- LWC Components: `authenticationScreen`, `dailyTrackerDashboard`
- Object Schema: `UserAccount__c`, `Task__c`, `Task_Log__c`, `Day_Log__c`
