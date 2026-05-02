public without sharing class DailyTrackerController {

    // ─── AUTH ────────────────────────────────────────────────────────────────

    @AuraEnabled
    public static Map<String, Object> createUser(String username, String password, String securityAnswer) {
        Map<String, Object> result = new Map<String, Object>();
        try {
            List<UserAccount__c> existing = [
                SELECT Id FROM UserAccount__c WHERE Username__c = :username LIMIT 1
            ];
            if (!existing.isEmpty()) {
                result.put('success', false);
                result.put('message', 'Username already exists. Please choose another.');
                return result;
            }
            UserAccount__c ua = new UserAccount__c(
                Username__c      = username,
                Password__c      = password,
                Security_Answer__c = securityAnswer.toLowerCase().trim(),
                Is_Active__c     = true
            );
            insert ua;
            result.put('success', true);
            result.put('userId', ua.Id);
            result.put('username', ua.Username__c);
        } catch (Exception e) {
            result.put('success', false);
            result.put('message', e.getMessage());
        }
        return result;
    }

    @AuraEnabled
    public static Map<String, Object> signIn(String username, String password) {
        Map<String, Object> result = new Map<String, Object>();
        try {
            List<UserAccount__c> users = [
                SELECT Id, Username__c, Is_Active__c
                FROM UserAccount__c
                WHERE Username__c = :username AND Password__c = :password AND Is_Active__c = true
                LIMIT 1
            ];
            if (users.isEmpty()) {
                result.put('success', false);
                result.put('message', 'Invalid username or password.');
            } else {
                result.put('success', true);
                result.put('userId', users[0].Id);
                result.put('username', users[0].Username__c);
            }
        } catch (Exception e) {
            result.put('success', false);
            result.put('message', e.getMessage());
        }
        return result;
    }

    @AuraEnabled
    public static Map<String, Object> verifySecurityQuestion(String username, String answer) {
        Map<String, Object> result = new Map<String, Object>();
        List<UserAccount__c> users = [
            SELECT Id, Security_Answer__c FROM UserAccount__c WHERE Username__c = :username LIMIT 1
        ];
        if (users.isEmpty()) {
            result.put('success', false);
            result.put('message', 'Username not found.');
        } else if (users[0].Security_Answer__c == answer.toLowerCase().trim()) {
            result.put('success', true);
            result.put('userId', users[0].Id);
        } else {
            result.put('success', false);
            result.put('message', 'Incorrect answer. Please try again.');
        }
        return result;
    }

    @AuraEnabled
    public static Map<String, Object> resetPassword(String userId, String newPassword) {
        Map<String, Object> result = new Map<String, Object>();
        try {
            UserAccount__c ua = new UserAccount__c(Id = userId, Password__c = newPassword);
            update ua;
            result.put('success', true);
        } catch (Exception e) {
            result.put('success', false);
            result.put('message', e.getMessage());
        }
        return result;
    }

    // ─── HABITS ──────────────────────────────────────────────────────────────

    @AuraEnabled(cacheable=true)
    public static List<Habit__c> getHabits(String userAccountId) {
        return [
            SELECT Id, Name, Category__c, Priority__c, Is_Active__c, Sort_Order__c
            FROM Habit__c
            WHERE UserAccount__c = :userAccountId AND Is_Active__c = true
            ORDER BY Sort_Order__c ASC NULLS LAST, Name ASC
        ];
    }

    @AuraEnabled
    public static Habit__c saveHabit(String userAccountId, String habitId, String name,
                                     String category, String priority) {
        Habit__c h;
        if (String.isNotBlank(habitId)) {
            h = new Habit__c(Id = habitId, Name = name, Category__c = category, Priority__c = priority);
        } else {
            h = new Habit__c(
                Name             = name,
                Category__c      = category,
                Priority__c      = priority,
                Is_Active__c     = true,
                UserAccount__c  = userAccountId
            );
        }
        upsert h;
        return h;
    }

    @AuraEnabled
    public static void deleteHabit(String habitId) {
        Habit__c h = new Habit__c(Id = habitId, Is_Active__c = false);
        update h;
    }

    // ─── DAY LOG ─────────────────────────────────────────────────────────────

    @AuraEnabled
    public static Map<String, Object> getTodayLog(String userAccountId) {
        Map<String, Object> result = new Map<String, Object>();
        Date today = Date.today();
        List<Day_Log__c> logs = [
            SELECT Id, Date__c, Score__c, Health_Score__c, Career_Score__c,
                   Discipline_Score__c, Consistency_Score__c, Reflection__c,
                   Completed_Tasks__c, Total_Tasks__c
            FROM Day_Log__c
            WHERE UserAccount__c = :userAccountId AND Date__c = :today
            LIMIT 1
        ];
        if (!logs.isEmpty()) {
            result.put('dayLog', logs[0]);
            result.put('taskLogs', getTaskLogsForDay(logs[0].Id));
        } else {
            result.put('dayLog', null);
            result.put('taskLogs', new List<Task_Log__c>());
        }
        return result;
    }

    @AuraEnabled
    public static List<Task_Log__c> getTaskLogsForDay(String dayLogId) {
        return [
            SELECT Id, Habit__c, Habit__r.Name, Habit__r.Category__c, Habit__r.Priority__c,
                   Status__c, Intensity__c, Score_Value__c
            FROM Task_Log__c
            WHERE Day_Log__c = :dayLogId
            ORDER BY Habit__r.Sort_Order__c ASC NULLS LAST
        ];
    }

    @AuraEnabled
    public static Map<String, Object> saveDayLog(String userAccountId, String reflection,
                                                  List<Map<String, Object>> taskData) {
        Map<String, Object> result = new Map<String, Object>();
        try {
            Date today = Date.today();
            List<Day_Log__c> existing = [
                SELECT Id FROM Day_Log__c WHERE UserAccount__c = :userAccountId AND Date__c = :today LIMIT 1
            ];
            Day_Log__c dl;
            if (!existing.isEmpty()) {
                dl = existing[0];
            } else {
                dl = new Day_Log__c(UserAccount__c = userAccountId, Date__c = today);
                insert dl;
            }

            // Upsert task logs
            Map<String, Task_Log__c> existingTaskLogs = new Map<String, Task_Log__c>();
            for (Task_Log__c tl : [SELECT Id, Habit__c FROM Task_Log__c WHERE Day_Log__c = :dl.Id]) {
                existingTaskLogs.put(tl.Habit__c, tl);
            }

            List<Task_Log__c> toUpsert = new List<Task_Log__c>();
            Decimal healthNum = 0, healthDen = 0;
            Decimal careerNum = 0, careerDen = 0;
            Decimal totalNum = 0, totalDen = 0;
            Integer completed = 0;

            Map<String, Decimal> priorityMap = new Map<String, Decimal>{
                'Low' => 0.3, 'Medium' => 0.5, 'High' => 0.8, 'Critical' => 1.0
            };

            for (Map<String, Object> td : taskData) {
                String habitId  = (String)  td.get('habitId');
                Boolean status  = (Boolean) td.get('status');
                Decimal intensity = Decimal.valueOf(String.valueOf(td.get('intensity')));
                String priority = (String)  td.get('priority');
                String category = (String)  td.get('category');

                Decimal pw = priorityMap.containsKey(priority) ? priorityMap.get(priority) : 0.5;
                Decimal scoreVal = pw * (intensity / 100);

                Task_Log__c tl;
                if (existingTaskLogs.containsKey(habitId)) {
                    tl = existingTaskLogs.get(habitId);
                } else {
                    tl = new Task_Log__c(Day_Log__c = dl.Id, Habit__c = habitId);
                }
                tl.Status__c    = status;
                tl.Intensity__c = intensity;
                tl.Score_Value__c = scoreVal * 100;
                toUpsert.add(tl);

                // Accumulate scores
                Decimal maxScore = pw * 1.0;
                totalNum += scoreVal;
                totalDen += maxScore;

                String cat = category != null ? category.toLowerCase() : '';
                if (cat == 'health') {
                    healthNum += scoreVal;
                    healthDen += maxScore;
                } else if (cat == 'career') {
                    careerNum += scoreVal;
                    careerDen += maxScore;
                }
                if (status) completed++;
            }

            upsert toUpsert;

            // Calculate scores (0-100)
            Decimal finalScore   = totalDen > 0 ? (totalNum / totalDen) * 100 : 0;
            Decimal healthScore  = healthDen > 0 ? (healthNum / healthDen) * 100 : 0;
            Decimal careerScore  = careerDen > 0 ? (careerNum / careerDen) * 100 : 0;
            Decimal consistency  = healthDen > 0 && careerDen > 0
                                   ? (healthScore + careerScore) / 2 : finalScore;

            dl.Reflection__c         = reflection;
            dl.Score__c              = finalScore.setScale(1);
            dl.Health_Score__c       = healthScore.setScale(1);
            dl.Career_Score__c       = careerScore.setScale(1);
            dl.Consistency_Score__c  = consistency.setScale(1);
            dl.Completed_Tasks__c    = completed;
            dl.Total_Tasks__c        = taskData.size();
            update dl;

            result.put('success', true);
            result.put('dayLogId', dl.Id);
            result.put('score', finalScore.setScale(1));
        } catch (Exception e) {
            result.put('success', false);
            result.put('message', e.getMessage());
        }
        return result;
    }

    // ─── ANALYTICS ───────────────────────────────────────────────────────────

    @AuraEnabled(cacheable=true)
    public static List<Day_Log__c> getAnalyticsData(String userAccountId, String period) {
        Date startDate;
        Date today = Date.today();
        if (period == 'week')       startDate = today.addDays(-7);
        else if (period == 'month') startDate = today.addDays(-30);
        else if (period == 'year')  startDate = today.addDays(-365);
        else                        startDate = today.addDays(-7); // default week

        return [
            SELECT Id, Date__c, Score__c, Health_Score__c, Career_Score__c,
                   Consistency_Score__c, Completed_Tasks__c, Total_Tasks__c
            FROM Day_Log__c
            WHERE UserAccount__c = :userAccountId AND Date__c >= :startDate
            ORDER BY Date__c ASC
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Day_Log__c> getCalendarData(String userAccountId, Integer year, Integer month) {
        Date startDate = Date.newInstance(year, month, 1);
        Date endDate   = startDate.addMonths(1).addDays(-1);
        return [
            SELECT Id, Date__c, Score__c
            FROM Day_Log__c
            WHERE UserAccount__c = :userAccountId AND Date__c >= :startDate AND Date__c <= :endDate
            ORDER BY Date__c ASC
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Day_Log__c> getAllLogs(String userAccountId) {
        return [
            SELECT Id, Date__c, Score__c, Health_Score__c, Career_Score__c,
                   Consistency_Score__c, Reflection__c, Completed_Tasks__c, Total_Tasks__c
            FROM Day_Log__c
            WHERE UserAccount__c = :userAccountId
            ORDER BY Date__c DESC
        ];
    }
}
