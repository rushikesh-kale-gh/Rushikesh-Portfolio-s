public with sharing class DailyTrackerController {
    
    // ============ USER AUTHENTICATION ============
    
    @AuraEnabled(cacheable=false)
    public static Map<String, Object> createUserAccount(String username, String password, String securityQuestion, String securityAnswer) {
        Map<String, Object> response = new Map<String, Object>();
        
        try {
            // Check if username already exists
            List<UserAccount__c> existingUser = [SELECT Id FROM UserAccount__c WHERE Name = :username LIMIT 1];
            if (!existingUser.isEmpty()) {
                response.put('success', false);
                response.put('message', 'Username already exists');
                return response;
            }
            
            // Create new user account with hashed password
            UserAccount__c newUser = new UserAccount__c();
            newUser.Name = username;
            newUser.Password__c = hashPassword(password);
            newUser.Security_Question__c = securityQuestion;
            newUser.Security_Answer__c = securityAnswer.toLowerCase().trim();
            
            insert newUser;
            
            response.put('success', true);
            response.put('message', 'User account created successfully');
            response.put('userId', newUser.Id);
            return response;
        } catch (Exception e) {
            response.put('success', false);
            response.put('message', 'Error: ' + e.getMessage());
            return response;
        }
    }
    
    @AuraEnabled(cacheable=false)
    public static Map<String, Object> signInUserAccount(String username, String password) {
        Map<String, Object> response = new Map<String, Object>();
        
        try {
            List<UserAccount__c> users = [SELECT Id, Name, Password__c FROM UserAccount__c WHERE Name = :username LIMIT 1];
            
            if (users.isEmpty()) {
                response.put('success', false);
                response.put('message', 'Username not found');
                return response;
            }
            
            UserAccount__c user = users[0];
            if (!verifyPassword(password, user.Password__c)) {
                response.put('success', false);
                response.put('message', 'Password incorrect');
                return response;
            }
            
            response.put('success', true);
            response.put('message', 'Login successful');
            response.put('userId', user.Id);
            return response;
        } catch (Exception e) {
            response.put('success', false);
            response.put('message', 'Error: ' + e.getMessage());
            return response;
        }
    }
    
    @AuraEnabled(cacheable=false)
    public static Map<String, Object> resetPassword(String username, String securityQuestion, String securityAnswer, String newPassword) {
        Map<String, Object> response = new Map<String, Object>();
        
        try {
            List<UserAccount__c> users = [SELECT Id, Name, Password__c, Security_Question__c, Security_Answer__c 
                                         FROM UserAccount__c WHERE Name = :username LIMIT 1];
            
            if (users.isEmpty()) {
                response.put('success', false);
                response.put('message', 'Username not found');
                return response;
            }
            
            UserAccount__c user = users[0];
            if (user.Security_Answer__c != securityAnswer.toLowerCase().trim()) {
                response.put('success', false);
                response.put('message', 'Security answer incorrect');
                return response;
            }
            
            user.Password__c = hashPassword(newPassword);
            update user;
            
            response.put('success', true);
            response.put('message', 'Password updated successfully');
            return response;
        } catch (Exception e) {
            response.put('success', false);
            response.put('message', 'Error: ' + e.getMessage());
            return response;
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getUserSecurityQuestion(String username) {
        Map<String, Object> response = new Map<String, Object>();
        
        try {
            List<UserAccount__c> users = [SELECT Id, Security_Question__c FROM UserAccount__c WHERE Name = :username LIMIT 1];
            
            if (users.isEmpty()) {
                response.put('found', false);
                return response;
            }
            
            response.put('found', true);
            response.put('question', users[0].Security_Question__c);
            return response;
        } catch (Exception e) {
            response.put('found', false);
            response.put('message', 'Error: ' + e.getMessage());
            return response;
        }
    }
    
    // ============ DAILY LOG OPERATIONS ============
    
    @AuraEnabled(cacheable=false)
    public static Map<String, Object> getDailyLog(String userAccountId, Date logDate) {
        Map<String, Object> response = new Map<String, Object>();
        
        try {
            List<Day_Log__c> dayLogs = [
                SELECT Id, Date__c, Score__c, Health_Score__c, Career_Score__c, Discipline_Score__c, Reflection__c
                FROM Day_Log__c 
                WHERE UserAccount__c = :userAccountId AND Date__c = :logDate 
                LIMIT 1
            ];
            
            if (dayLogs.isEmpty()) {
                response.put('found', false);
                return response;
            }
            
            Day_Log__c dayLog = dayLogs[0];
            response.put('found', true);
            response.put('id', dayLog.Id);
            response.put('date', dayLog.Date__c);
            response.put('score', dayLog.Score__c);
            response.put('healthScore', dayLog.Health_Score__c);
            response.put('careerScore', dayLog.Career_Score__c);
            response.put('disciplineScore', dayLog.Discipline_Score__c);
            response.put('reflection', dayLog.Reflection__c);
            
            return response;
        } catch (Exception e) {
            response.put('error', e.getMessage());
            return response;
        }
    }
    
    @AuraEnabled(cacheable=false)
    public static Map<String, Object> saveDailyLog(String userAccountId, Date logDate, String reflection) {
        Map<String, Object> response = new Map<String, Object>();
        
        try {
            List<Day_Log__c> dayLogs = [
                SELECT Id FROM Day_Log__c 
                WHERE UserAccount__c = :userAccountId AND Date__c = :logDate 
                LIMIT 1
            ];
            
            Day_Log__c dayLog;
            if (dayLogs.isEmpty()) {
                dayLog = new Day_Log__c();
                dayLog.UserAccount__c = userAccountId;
                dayLog.Date__c = logDate;
            } else {
                dayLog = dayLogs[0];
            }
            
            dayLog.Reflection__c = reflection;
            
            // Calculate scores based on task logs
            calculateDailyScores(dayLog);
            
            upsert dayLog;
            
            response.put('success', true);
            response.put('dayLogId', dayLog.Id);
            return response;
        } catch (Exception e) {
            response.put('success', false);
            response.put('message', 'Error: ' + e.getMessage());
            return response;
        }
    }
    
    // ============ TASK LOG OPERATIONS ============
    
    @AuraEnabled(cacheable=false)
    public static List<Map<String, Object>> getTasksForDate(String userAccountId, Date logDate) {
        List<Map<String, Object>> taskLogsList = new List<Map<String, Object>>();
        
        try {
            // First get the Day Log
            List<Day_Log__c> dayLogs = [
                SELECT Id FROM Day_Log__c 
                WHERE UserAccount__c = :userAccountId AND Date__c = :logDate
            ];
            
            if (dayLogs.isEmpty()) {
                return taskLogsList;
            }
            
            String dayLogId = dayLogs[0].Id;
            
            // Get all task logs for this day
            List<Task_Log__c> taskLogs = [
                SELECT Id, Task__c, Task__r.Name, Task__r.Category__c, Task__r.Priority__c, 
                       Task__r.Target_Quantity__c, Intensity__c, Status__c
                FROM Task_Log__c
                WHERE Day_Log__c = :dayLogId
                ORDER BY Task__r.Name
            ];
            
            for (Task_Log__c tl : taskLogs) {
                Map<String, Object> taskMap = new Map<String, Object>();
                taskMap.put('taskLogId', tl.Id);
                taskMap.put('taskId', tl.Task__c);
                taskMap.put('taskName', tl.Task__r.Name);
                taskMap.put('category', tl.Task__r.Category__c);
                taskMap.put('priority', tl.Task__r.Priority__c);
                taskMap.put('targetQuantity', tl.Task__r.Target_Quantity__c);
                taskMap.put('intensity', tl.Intensity__c);
                taskMap.put('status', tl.Status__c);
                taskLogsList.add(taskMap);
            }
            
            return taskLogsList;
        } catch (Exception e) {
            System.debug('Error: ' + e.getMessage());
            return taskLogsList;
        }
    }
    
    @AuraEnabled(cacheable=false)
    public static Map<String, Object> saveTaskLog(String dayLogId, String taskId, Decimal intensity, Boolean completed) {
        Map<String, Object> response = new Map<String, Object>();
        
        try {
            List<Task_Log__c> taskLogs = [
                SELECT Id FROM Task_Log__c 
                WHERE Day_Log__c = :dayLogId AND Task__c = :taskId 
                LIMIT 1
            ];
            
            Task_Log__c taskLog;
            if (taskLogs.isEmpty()) {
                taskLog = new Task_Log__c();
                taskLog.Day_Log__c = dayLogId;
                taskLog.Task__c = taskId;
            } else {
                taskLog = taskLogs[0];
            }
            
            taskLog.Intensity__c = intensity;
            taskLog.Status__c = completed;
            
            upsert taskLog;
            
            // Recalculate parent day log scores
            List<Day_Log__c> dayLogs = [SELECT Id FROM Day_Log__c WHERE Id = :dayLogId];
            if (!dayLogs.isEmpty()) {
                calculateDailyScores(dayLogs[0]);
                update dayLogs[0];
            }
            
            response.put('success', true);
            response.put('taskLogId', taskLog.Id);
            return response;
        } catch (Exception e) {
            response.put('success', false);
            response.put('message', 'Error: ' + e.getMessage());
            return response;
        }
    }
    
    // ============ TASK/HABIT MANAGEMENT ============
    
    @AuraEnabled(cacheable=false)
    public static List<Map<String, Object>> getUserTasks(String userAccountId) {
        List<Map<String, Object>> tasksList = new List<Map<String, Object>>();
        
        try {
            List<Task__c> tasks = [
                SELECT Id, Name, Category__c, Priority__c, Target_Quantity__c, Is_Active__c
                FROM Task__c
                ORDER BY Category__c, Name
            ];
            
            for (Task__c task : tasks) {
                Map<String, Object> taskMap = new Map<String, Object>();
                taskMap.put('id', task.Id);
                taskMap.put('name', task.Name);
                taskMap.put('category', task.Category__c);
                taskMap.put('priority', task.Priority__c);
                taskMap.put('targetQuantity', task.Target_Quantity__c);
                taskMap.put('isActive', task.Is_Active__c);
                tasksList.add(taskMap);
            }
            
            return tasksList;
        } catch (Exception e) {
            System.debug('Error: ' + e.getMessage());
            return tasksList;
        }
    }
    
    @AuraEnabled(cacheable=false)
    public static Map<String, Object> createTask(String userAccountId, String taskName, String category, String priority, Decimal targetQuantity) {
        Map<String, Object> response = new Map<String, Object>();
        
        try {
            Task__c newTask = new Task__c();
            newTask.Name = taskName;
            newTask.Category__c = category;
            newTask.Priority__c = priority;
            newTask.Target_Quantity__c = targetQuantity;
            newTask.Is_Active__c = true;
            
            insert newTask;
            
            response.put('success', true);
            response.put('taskId', newTask.Id);
            return response;
        } catch (Exception e) {
            response.put('success', false);
            response.put('message', 'Error: ' + e.getMessage());
            return response;
        }
    }
    
    @AuraEnabled(cacheable=false)
    public static Map<String, Object> updateTask(String taskId, String taskName, String category, String priority, Decimal targetQuantity, Boolean isActive) {
        Map<String, Object> response = new Map<String, Object>();
        
        try {
            Task__c task = new Task__c(Id = taskId);
            task.Name = taskName;
            task.Category__c = category;
            task.Priority__c = priority;
            task.Target_Quantity__c = targetQuantity;
            task.Is_Active__c = isActive;
            
            update task;
            
            response.put('success', true);
            return response;
        } catch (Exception e) {
            response.put('success', false);
            response.put('message', 'Error: ' + e.getMessage());
            return response;
        }
    }
    
    @AuraEnabled(cacheable=false)
    public static Map<String, Object> deleteTask(String taskId) {
        Map<String, Object> response = new Map<String, Object>();
        
        try {
            delete new Task__c(Id = taskId);
            response.put('success', true);
            return response;
        } catch (Exception e) {
            response.put('success', false);
            response.put('message', 'Error: ' + e.getMessage());
            return response;
        }
    }
    
    // ============ ANALYTICS & REPORTING ============
    
    @AuraEnabled(cacheable=false)
    public static List<Map<String, Object>> getLogsDateRange(String userAccountId, Date startDate, Date endDate) {
        List<Map<String, Object>> logsList = new List<Map<String, Object>>();
        
        try {
            List<Day_Log__c> dayLogs = [
                SELECT Id, Date__c, Score__c, Health_Score__c, Career_Score__c, Discipline_Score__c
                FROM Day_Log__c
                WHERE UserAccount__c = :userAccountId AND Date__c >= :startDate AND Date__c <= :endDate
                ORDER BY Date__c ASC
            ];
            
            for (Day_Log__c log : dayLogs) {
                Map<String, Object> logMap = new Map<String, Object>();
                logMap.put('date', log.Date__c);
                logMap.put('overallScore', log.Score__c != null ? log.Score__c : 0);
                logMap.put('healthScore', log.Health_Score__c != null ? log.Health_Score__c : 0);
                logMap.put('careerScore', log.Career_Score__c != null ? log.Career_Score__c : 0);
                logMap.put('disciplineScore', log.Discipline_Score__c != null ? log.Discipline_Score__c : 0);
                logsList.add(logMap);
            }
            
            return logsList;
        } catch (Exception e) {
            System.debug('Error: ' + e.getMessage());
            return logsList;
        }
    }
    
    @AuraEnabled(cacheable=false)
    public static List<Map<String, Object>> getCalendarData(String userAccountId, Integer year, Integer month) {
        List<Map<String, Object>> calendarData = new List<Map<String, Object>>();
        
        try {
            Date monthStart = Date.newInstance(year, month, 1);
            Integer daysInMonth = Date.daysInMonth(year, month);
            Date monthEnd = Date.newInstance(year, month, daysInMonth);
            
            Map<Date, Decimal> scoresByDate = new Map<Date, Decimal>();
            
            List<Day_Log__c> dayLogs = [
                SELECT Date__c, Score__c
                FROM Day_Log__c
                WHERE UserAccount__c = :userAccountId AND Date__c >= :monthStart AND Date__c <= :monthEnd
            ];
            
            for (Day_Log__c log : dayLogs) {
                scoresByDate.put(log.Date__c, log.Score__c != null ? log.Score__c : 0);
            }
            
            for (Integer day = 1; day <= daysInMonth; day++) {
                Date currentDate = Date.newInstance(year, month, day);
                Decimal score = scoresByDate.containsKey(currentDate) ? scoresByDate.get(currentDate) : null;
                
                Map<String, Object> dayData = new Map<String, Object>();
                dayData.put('date', currentDate);
                dayData.put('day', day);
                dayData.put('score', score);
                if (score != null) {
                    dayData.put('color', getColorForScore(score));
                }
                calendarData.add(dayData);
            }
            
            return calendarData;
        } catch (Exception e) {
            System.debug('Error: ' + e.getMessage());
            return calendarData;
        }
    }
    
    // ============ HELPER METHODS ============
    
    private static String hashPassword(String password) {
        // In production, use proper hashing (e.g., bcrypt)
        // For now, using Blob hash for demo
        Blob hash = Crypto.generateDigest('SHA-256', Blob.valueOf(password + 'salt123'));
        return EncodingUtil.base64Encode(hash);
    }
    
    private static Boolean verifyPassword(String plainPassword, String hashedPassword) {
        String hashedInput = hashPassword(plainPassword);
        return hashedInput == hashedPassword;
    }
    
    private static void calculateDailyScores(Day_Log__c dayLog) {
        // Get all task logs for this day
        List<Task_Log__c> taskLogs = [
            SELECT Id, Task__c, Task__r.Priority__c, Task__r.Category__c, Intensity__c, Status__c
            FROM Task_Log__c
            WHERE Day_Log__c = :dayLog.Id AND Status__c = true
        ];
        
        Map<String, List<Map<String, Decimal>>> categoryScores = new Map<String, List<Map<String, Decimal>>>();
        
        for (Task_Log__c tl : taskLogs) {
            String category = tl.Task__r.Category__c;
            Decimal priority = getPriorityValue(tl.Task__r.Priority__c);
            Decimal intensity = tl.Intensity__c != null ? tl.Intensity__c : 0;
            
            if (!categoryScores.containsKey(category)) {
                categoryScores.put(category, new List<Map<String, Decimal>>());
            }
            
            Map<String, Decimal> scoreMap = new Map<String, Decimal>();
            scoreMap.put('priority', priority);
            scoreMap.put('intensity', intensity);
            categoryScores.get(category).add(scoreMap);
        }
        
        // Calculate scores per category
        Decimal healthScore = 0;
        Decimal careerScore = 0;
        Decimal disciplineScore = 0;
        List<Decimal> allScores = new List<Decimal>();
        
        if (categoryScores.containsKey('Health')) {
            healthScore = calculateCategoryScore(categoryScores.get('Health'));
            allScores.add(healthScore);
        }
        
        if (categoryScores.containsKey('Career')) {
            careerScore = calculateCategoryScore(categoryScores.get('Career'));
            allScores.add(careerScore);
        }
        
        if (categoryScores.containsKey('Discipline')) {
            disciplineScore = calculateCategoryScore(categoryScores.get('Discipline'));
            allScores.add(disciplineScore);
        }
        
        // Handle other custom categories
        for (String category : categoryScores.keySet()) {
            if (category != 'Health' && category != 'Career' && category != 'Discipline') {
                Decimal score = calculateCategoryScore(categoryScores.get(category));
                allScores.add(score);
            }
        }
        
        dayLog.Health_Score__c = healthScore;
        dayLog.Career_Score__c = careerScore;
        dayLog.Discipline_Score__c = disciplineScore;
        
        // Overall score = average of all category scores
        if (!allScores.isEmpty()) {
            Decimal totalScore = 0;
            for (Decimal score : allScores) {
                totalScore += score;
            }
            dayLog.Score__c = totalScore / allScores.size();
        }
    }
    
    private static Decimal calculateCategoryScore(List<Map<String, Decimal>> scores) {
        Decimal totalWeightedScore = 0;
        Decimal totalPriority = 0;
        
        for (Map<String, Decimal> scoreMap : scores) {
            Decimal priority = scoreMap.get('priority');
            Decimal intensity = scoreMap.get('intensity');
            
            totalWeightedScore += (priority * intensity);
            totalPriority += priority;
        }
        
        if (totalPriority == 0) {
            return 0;
        }
        
        return totalWeightedScore / (totalPriority * 100);
    }
    
    private static Decimal getPriorityValue(String priority) {
        if (priority == 'Low') return 0.3;
        if (priority == 'Medium') return 0.5;
        if (priority == 'High') return 0.8;
        if (priority == 'Critical') return 1.0;
        return 0.5;
    }
    
    private static String getColorForScore(Decimal score) {
        if (score == null) return 'gray';
        if (score >= 75) return 'green';
        if (score >= 50) return 'yellow';
        if (score >= 25) return 'orange';
        return 'red';
    }
}
