public without sharing class AnalyticsController {

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getSummaryStats(String userAccountId) {
        Map<String, Object> result = new Map<String, Object>();
        List<Day_Log__c> allLogs = [
            SELECT Score__c, Health_Score__c, Career_Score__c,
                   Consistency_Score__c, Completed_Tasks__c, Total_Tasks__c, Date__c
            FROM Day_Log__c
            WHERE UserAccount__c = :userAccountId
            ORDER BY Date__c DESC
        ];

        if (allLogs.isEmpty()) {
            result.put('totalDays', 0);
            result.put('avgScore', 0);
            result.put('avgHealth', 0);
            result.put('avgCareer', 0);
            result.put('avgConsistency', 0);
            result.put('streak', 0);
            return result;
        }

        Decimal sumScore = 0, sumHealth = 0, sumCareer = 0, sumConsistency = 0;
        for (Day_Log__c dl : allLogs) {
            sumScore       += dl.Score__c       != null ? dl.Score__c       : 0;
            sumHealth      += dl.Health_Score__c != null ? dl.Health_Score__c : 0;
            sumCareer      += dl.Career_Score__c != null ? dl.Career_Score__c : 0;
            sumConsistency += dl.Consistency_Score__c != null ? dl.Consistency_Score__c : 0;
        }
        Integer count = allLogs.size();

        // Streak calculation
        Integer streak = 0;
        Date expected = Date.today();
        for (Day_Log__c dl : allLogs) {
            if (dl.Date__c == expected) {
                streak++;
                expected = expected.addDays(-1);
            } else {
                break;
            }
        }

        result.put('totalDays', count);
        result.put('avgScore',       (sumScore / count).setScale(1));
        result.put('avgHealth',      (sumHealth / count).setScale(1));
        result.put('avgCareer',      (sumCareer / count).setScale(1));
        result.put('avgConsistency', (sumConsistency / count).setScale(1));
        result.put('streak', streak);
        return result;
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getCategoryBreakdown(String userAccountId) {
        List<Map<String, Object>> breakdown = new List<Map<String, Object>>();
        List<AggregateResult> results = [
            SELECT Habit__r.Category__c category,
                   AVG(Intensity__c) avgIntensity,
                   COUNT(Id) totalLogs
            FROM Task_Log__c
            WHERE Day_Log__r.UserAccount__c = :userAccountId
            GROUP BY Habit__r.Category__c
            ORDER BY AVG(Intensity__c) DESC
        ];
        for (AggregateResult ar : results) {
            Map<String, Object> row = new Map<String, Object>();
            row.put('category',     ar.get('category'));
            row.put('avgIntensity', ar.get('avgIntensity'));
            row.put('totalLogs',    ar.get('totalLogs'));
            breakdown.add(row);
        }
        return breakdown;
    }
}
