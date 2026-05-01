# Daily Tracker - Quick Start Guide

## What Was Built

A complete Salesforce-based **Daily Tracker** application with:
- ✅ Custom user authentication (non-SFDC users)
- ✅ 5-Tab Dashboard interface
- ✅ Task/Habit management system
- ✅ Intelligent scoring system
- ✅ Analytics and calendar views
- ✅ Modern, premium, mobile-responsive UI

---

## 📦 Components Deployed

### Objects
1. **UserAccount__c** - Non-SFDC user accounts
2. **Task__c** - Habits/tasks with priority
3. **Task_Log__c** - Daily task completion logs with intensity
4. **Day_Log__c** - Daily summaries with category scores

### Apex Classes
- **DailyTrackerController** - All backend logic (auth, data, scoring)

### LWC Components
- **authenticationScreen** - Login/Signup/Forgot Password
- **dailyTrackerDashboard** - Main app with 5 tabs

---

## 🎯 The 5 Tabs

| Tab | Purpose | Key Features |
|-----|---------|--------------|
| 📝 Reflection | Add daily thoughts | Save reflection text, auto-calc scores |
| 📊 Show Log | View trends | Analytics by day/week/month, graphs |
| 📅 Calendar | Visual overview | Color-coded by score (green/yellow/orange/red) |
| ✅ Tasks | Log daily progress | Check completed, set intensity 0-100% |
| ⚙️ Habits | Configure tasks | Add/delete habits with priority & category |

---

## 🧮 Scoring Formula

```
For each category (Health, Career, Discipline, etc.):
  Score = (Priority₁ × Intensity₁) + (Priority₂ × Intensity₂) + ...
          ───────────────────────────────────────────────────
                     SUM(All Priorities) × 100%

Overall Score = Average of all category scores
```

**Example:**
- Task 1: Health, Priority 0.8, Intensity 87% → 0.8 × 87% = 0.696
- Task 2: Career, Priority 0.5, Intensity 100% → 0.5 × 100% = 0.5
- Health Score = 0.696 / (0.8 × 100%) = 87%
- Career Score = 0.5 / (0.5 × 100%) = 100%
- Overall = (87% + 100%) / 2 = 93.5%

---

## 🚀 How to Test

### 1. Deploy to Org
```bash
cd c:\Users\rushi\Desktop\Github\rushikesh-portfolio-s
sfdx force:source:deploy -p force-app -u your-org-alias
```

### 2. Create Sample Data (Apex Execute)
```apex
// Create sample user
UserAccount__c user = new UserAccount__c(
    Name = 'demo',
    Password__c = Crypto.generateDigest('SHA-256', 
        Blob.valueOf('password123' + 'salt123')).toString(),
    Security_Question__c = 'City Born',
    Security_Answer__c = 'newyork'
);
insert user;

// Create sample tasks
List<Task__c> tasks = new List<Task__c>{
    new Task__c(Name='Drink 8 glasses', Category__c='Health', Priority__c='High', Target_Quantity__c=8, Is_Active__c=true),
    new Task__c(Name='Exercise 30min', Category__c='Health', Priority__c='Medium', Target_Quantity__c=30, Is_Active__c=true),
    new Task__c(Name='Complete project task', Category__c='Career', Priority__c='Critical', Is_Active__c=true),
    new Task__c(Name='Read 30 pages', Category__c='Discipline', Priority__c='Medium', Is_Active__c=true)
};
insert tasks;
```

### 3. Open the App
Add component to Lightning App or use VF page:
```xml
<aura:component>
    <c:dailyTrackerDashboard></c:dailyTrackerDashboard>
</aura:component>
```

### 4. Test Flow
1. **Sign In**: Use `demo` / `password123`
2. **Add Habits** (Tab 5): Configure your daily tasks
3. **Log Tasks** (Tab 4): Mark completed and set intensity %
4. **Add Reflection** (Tab 1): Write daily thoughts
5. **View Analytics** (Tab 2): See score trends
6. **Check Calendar** (Tab 3): See daily performance

---

## 🔑 Key Credentials

**Demo Account:**
- Username: `demo`
- Password: `password123`
- Security Question: `City Born`
- Answer: `newyork`

---

## 🎨 UI Highlights

- **Header**: Welcome message, current date, sign-out button
- **Score Cards**: 4 cards showing Overall, Health, Career, Discipline scores
- **Tab Navigation**: 5 emoji-labeled tabs for easy navigation
- **Responsive**: Works on desktop (full width), tablet (2 col), mobile (1 col)
- **Color Scheme**: Purple gradient (#667eea, #764ba2) with accent colors

---

## 💾 Data Structure

### User Session
- Each user logs in via `authenticationScreen`
- `currentUserId` stored in component state
- All queries filtered by this UserAccount

### Daily Data
- One `Day_Log__c` per user per date
- Multiple `Task_Log__c` entries link to one Day_Log
- Tasks configured in `Task__c` (master list per user)

### Relationships
```
UserAccount__c
    ↓
Day_Log__c (one per date)
    ↓
Task_Log__c (one per task per date)
    ↓
Task__c (habit definition)
```

---

## ✨ What's Different from Old System

| Aspect | Old | New |
|--------|-----|-----|
| Users | SFDC Users | Custom UserAccount__c |
| Auth | Force.com Platform | Username/Password/Security Q |
| Categories | Fixed (3) | User-defined (unlimited) |
| Intensity | Not stored | Stored as 0-100% field |
| Scoring | Simple count % | Weighted by priority |
| UI | Basic | Modern, premium, responsive |
| Tabs | None | 5 dedicated tabs |

---

## 🛠️ Troubleshooting

**"Component not loading?"**
- Check that all objects are deployed
- Verify Apex controller is active
- Check browser console for errors

**"Scores not calculating?"**
- Ensure Task_Log__c has Status__c = true (completed)
- Verify Intensity__c is set (0-100)
- Check Task__c Priority__c is set (Low/Medium/High/Critical)

**"Data not persisting?"**
- Check record creation in debug logs
- Verify UserAccount__c ID is stored correctly
- Test Apex methods directly in Execute Anonymous

---

## 📞 Support Resources

- **Implementation Doc**: `DAILY_TRACKER_IMPLEMENTATION.md`
- **Controller**: `force-app/main/default/classes/DailyTrackerController.cls`
- **Dashboard HTML**: `force-app/main/default/lwc/dailyTrackerDashboard/`
- **Auth Screen**: `force-app/main/default/lwc/authenticationScreen/`

---

**Status**: ✅ **COMPLETE** - Ready for deployment!

All objects, fields, Apex logic, and LWC components are built and ready to deploy to your Salesforce org.
