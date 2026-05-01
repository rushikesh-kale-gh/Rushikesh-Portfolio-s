# 📋 Daily Tracker Dashboard - Quick Reference Card

## 🚀 Deploy in 30 Seconds

```bash
# From workspace root:
sfdx force:source:deploy -p force-app -u your-org-alias
```

---

## 📝 Test Data Setup (Apex Execute)

```apex
// Create test user account
UserAccount__c user = new UserAccount__c(
    Name = 'testuser',
    Password__c = DailyTrackerController.hashPassword('password123'),
    Security_Question__c = 'City Born',
    Security_Answer__c = 'newyork'
);
insert user;

// Create test habits
List<Task__c> tasks = new List<Task__c>{
    new Task__c(Name='Drink Water', Category__c='Health', Priority__c='High', Is_Active__c=true),
    new Task__c(Name='Exercise', Category__c='Health', Priority__c='Medium', Is_Active__c=true),
    new Task__c(Name='Code Review', Category__c='Career', Priority__c='Critical', Is_Active__c=true),
    new Task__c(Name='Read Book', Category__c='Learning', Priority__c='Low', Is_Active__c=true)
};
insert tasks;

// Create today's log
Day_Log__c dayLog = new Day_Log__c(
    UserAccount__c = user.Id,
    Date__c = System.today()
);
insert dayLog;
```

---

## 🔑 Key Endpoints (Apex Methods)

| Method | Parameters | Returns |
|--------|------------|---------|
| **signInUserAccount** | username, password | `{success, userId}` |
| **createUserAccount** | username, password, question, answer | `{success, userId}` |
| **resetPassword** | username, question, answer, newPassword | `{success}` |
| **getUserSecurityQuestion** | username | `{found, question}` |
| **getDailyLog** | userAccountId, date | `{found, id, score, ...}` |
| **saveDailyLog** | userAccountId, date, reflection | `{success, dayLogId}` |
| **getTasksForDate** | userAccountId, date | `[{taskId, name, category, ...}]` |
| **saveTaskLog** | dayLogId, taskId, intensity, completed | `{success, taskLogId}` |
| **getUserTasks** | userAccountId | `[{taskId, name, category, ...}]` |
| **createTask** | userAccountId, name, category, priority, target | `{success, taskId}` |
| **updateTask** | taskId, name, category, priority, target, active | `{success}` |
| **deleteTask** | taskId | `{success}` |
| **getLogsDateRange** | userAccountId, startDate, endDate | `[{date, score, ...}]` |
| **getCalendarData** | userAccountId, year, month | `[{day, score, color}]` |

---

## 🎨 UI Component Structure

```
authenticationScreen
├─ Mode 1: Sign In
├─ Mode 2: Create Account
└─ Mode 3: Forgot Password

dailyTrackerDashboard
├─ Header (Title, User, Date, Scores)
└─ Tab Bar
   ├─ Tab 1: 📝 Reflection
   ├─ Tab 2: 📊 Show Log
   ├─ Tab 3: 📅 Calendar
   ├─ Tab 4: ✅ Tasks
   └─ Tab 5: ⚙️ Habits
```

---

## 🧮 Scoring Quick Formula

```
For each category:
    Score = SUM(priority × intensity%) / SUM(priorities) × 100

Example: Task (priority 0.8, intensity 87%)
    Score = 0.8 × 87% / 0.8 = 87%
```

### Priority Values
- Low = 0.3
- Medium = 0.5
- High = 0.8
- Critical = 1.0

---

## 🎨 Color Reference

### Calendar Scores
| Range | Color | Emoji |
|-------|-------|-------|
| 75-100% | Green | 🟢 |
| 50-75% | Yellow | 🟡 |
| 25-50% | Orange | 🟠 |
| 0-25% | Red | 🔴 |

### Category Colors
| Category | Color |
|----------|-------|
| Health | #34C759 (Green) |
| Career | #0A84FF (Blue) |
| Discipline | #FF9F0A (Orange) |
| Fitness | #FF3B30 (Red) |
| Learning | #5AC8FA (Light Blue) |
| Personal | #9B59B6 (Purple) |

### UI Theme
- Primary: #667eea (Purple)
- Secondary: #764ba2 (Dark Purple)
- Background: Linear gradient

---

## 🔒 Security Settings

### Password Hashing
```
Algorithm: SHA-256
Salt: 'salt123' (hardcoded - use env var in production)
Format: Base64 encoded
```

### User Isolation
- All queries filtered by `UserAccount__c`
- No SFDC User dependency
- Complete data privacy

---

## 📱 Responsive Breakpoints

| Device | Width | Layout |
|--------|-------|--------|
| Desktop | 1200px+ | Full 4-column grid |
| Tablet | 768-1199px | 2-column grid |
| Mobile | <768px | Single column |

---

## 🧪 Quick Test Checklist

- [ ] Deploy metadata successfully
- [ ] Create test user account
- [ ] Sign in with correct credentials
- [ ] Sign in with wrong password (should fail)
- [ ] Create new account with security question
- [ ] Reset password with security answer
- [ ] Add new habit in Tab 5
- [ ] Log tasks in Tab 4 with intensities
- [ ] Verify scores calculate correctly
- [ ] Check calendar colors (Tab 3)
- [ ] View analytics trends (Tab 2)
- [ ] Test mobile view on phone/tablet
- [ ] Add reflection (Tab 1)

---

## 🐛 Troubleshooting

### Component not showing?
- Check browser console (F12)
- Verify component is added to app
- Confirm API version is 58.0+

### Scores not calculating?
- Verify Task_Log__c records have Intensity__c
- Check Day_Log__c has UserAccount__c populated
- Review debug logs in Salesforce

### Authentication failing?
- Verify UserAccount__c records exist
- Check password hash matches (use Apex Execute)
- Confirm Security_Question__c is in picklist

### Mobile view broken?
- Clear browser cache
- Check CSS media queries (< 768px)
- Verify no horizontal scroll

---

## 📞 Key Files to Review

| File | Purpose |
|------|---------|
| [DailyTrackerController.cls](force-app/main/default/classes/DailyTrackerController.cls) | Backend logic & API |
| [authenticationScreen](force-app/main/default/lwc/authenticationScreen) | Auth UI component |
| [dailyTrackerDashboard](force-app/main/default/lwc/dailyTrackerDashboard) | Main dashboard |
| [package.xml](manifest/package.xml) | Deployment manifest |
| IMPLEMENTATION_SUMMARY.md | Detailed docs |

---

## ⚡ Performance Tips

1. **Index frequently queried fields** (UserAccount__c, Date__c)
2. **Use @AuraEnabled(cacheable=true)** for read-only queries (future enhancement)
3. **Lazy load** analytics data (already implemented)
4. **Batch operations** for bulk task creation

---

## 🎯 Next Steps

1. Deploy to dev/sandbox org
2. Create test data
3. Test all 5 tabs
4. Verify score calculations
5. Test on mobile device
6. Invite users for UAT
7. Deploy to production

**Status**: ✅ Ready for deployment!
