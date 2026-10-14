package vn.haui.advisor.academic.engine;

import vn.haui.advisor.academic.model.StudentProfileFixture;
import vn.haui.advisor.contracts.dto.SimulatedCourseGrade;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class GradeCalculator {

    public static final int DEFAULT_SCALE = 2;
    public static final RoundingMode ROUNDING_MODE = RoundingMode.HALF_UP;

    private GradeCalculator() {}

    public static Double toGradePoint4(String letterGrade) {
        if (letterGrade == null || letterGrade.trim().isEmpty() || "UNKNOWN".equalsIgnoreCase(letterGrade.trim())) {
            return null; // Không tự động gán điểm = 0
        }
        return switch (letterGrade.trim().toUpperCase()) {
            case "A" -> 4.0;
            case "B+" -> 3.5;
            case "B" -> 3.0;
            case "C+" -> 2.5;
            case "C" -> 2.0;
            case "D+" -> 1.5;
            case "D" -> 1.0;
            case "F" -> 0.0;
            default -> null; // Giá trị không hợp lệ không tự gán 0
        };
    }

    public static Boolean isPassed(String letterGrade) {
        if (letterGrade == null || letterGrade.trim().isEmpty() || "UNKNOWN".equalsIgnoreCase(letterGrade.trim())) {
            return null; // Không tự động đánh giá là Đã đạt
        }
        String normalized = letterGrade.trim().toUpperCase();
        if ("F".equals(normalized)) {
            return false;
        }
        Double points = toGradePoint4(normalized);
        if (points == null) {
            return null; // Không tự suy diễn khi không rõ điểm hoặc đang học
        }
        return points >= 1.0;
    }

    public static boolean isCertificateCourse(String courseCode, String courseName) {
        if (courseCode != null) {
            String upper = courseCode.toUpperCase();
            if (upper.startsWith("GDTC") || upper.startsWith("QPAN") || upper.startsWith("GDQP")) {
                return true;
            }
        }
        if (courseName != null) {
            String lower = courseName.toLowerCase();
            if (lower.contains("giáo dục thể chất") || lower.contains("giáo dục quốc phòng") || lower.contains("quốc phòng an ninh")) {
                return true;
            }
        }
        return false;
    }

    public static BigDecimal calculateGpa(Collection<StudentProfileFixture.CourseAttempt> attempts) {
        if (attempts == null || attempts.isEmpty()) {
            return null;
        }

        BigDecimal totalWeightedPoints = BigDecimal.ZERO;
        int totalCredits = 0;
        int validAttemptsCount = 0;

        for (StudentProfileFixture.CourseAttempt attempt : attempts) {
            if (attempt.getCourseCode() != null && isCertificateCourse(attempt.getCourseCode(), attempt.getCourseName())) {
                continue; // GDTC & GDQP-AN không tính vào GPA/CPA
            }
            Double point = attempt.getGradePoint4();
            if (point == null && attempt.getLetterGrade() != null) {
                point = toGradePoint4(attempt.getLetterGrade());
            }

            if (point != null && attempt.getCredits() != null && attempt.getCredits() > 0) {
                BigDecimal credits = BigDecimal.valueOf(attempt.getCredits());
                BigDecimal weightedPoints = BigDecimal.valueOf(point).multiply(credits);
                totalWeightedPoints = totalWeightedPoints.add(weightedPoints);
                totalCredits += attempt.getCredits();
                validAttemptsCount++;
            }
        }

        if (validAttemptsCount == 0 || totalCredits == 0) {
            return null; // Trả null thay vì 0.0 khi không có dữ liệu điểm hợp lệ
        }

        return totalWeightedPoints.divide(BigDecimal.valueOf(totalCredits), DEFAULT_SCALE, ROUNDING_MODE);
    }

    public static BigDecimal calculateCpa(List<StudentProfileFixture.CourseAttempt> allAttempts) {
        if (allAttempts == null || allAttempts.isEmpty()) {
            return null;
        }

        // BR-06: Học cải thiện & học lại: Lấy điểm hợp lệ cao nhất của mỗi môn học
        Map<String, StudentProfileFixture.CourseAttempt> bestAttempts = new LinkedHashMap<>();
        for (StudentProfileFixture.CourseAttempt attempt : allAttempts) {
            if (attempt.getCourseCode() == null) continue;
            if (isCertificateCourse(attempt.getCourseCode(), attempt.getCourseName())) {
                continue; // Bỏ qua chứng chỉ thể chất / quốc phòng
            }
            // Không tính các môn đang học (in-progress / unknown grade)
            if (attempt.getLetterGrade() == null || "UNKNOWN".equalsIgnoreCase(attempt.getLetterGrade().trim())
                    || "IN_PROGRESS".equalsIgnoreCase(attempt.getLetterGrade().trim())) {
                continue;
            }

            StudentProfileFixture.CourseAttempt existing = bestAttempts.get(attempt.getCourseCode().toUpperCase());
            if (existing == null) {
                bestAttempts.put(attempt.getCourseCode().toUpperCase(), attempt);
            } else {
                Double existingPts = existing.getGradePoint4() != null ? existing.getGradePoint4() : toGradePoint4(existing.getLetterGrade());
                Double currentPts = attempt.getGradePoint4() != null ? attempt.getGradePoint4() : toGradePoint4(attempt.getLetterGrade());

                if (existingPts == null && currentPts != null) {
                    bestAttempts.put(attempt.getCourseCode().toUpperCase(), attempt);
                } else if (existingPts != null && currentPts != null && currentPts > existingPts) {
                    bestAttempts.put(attempt.getCourseCode().toUpperCase(), attempt);
                }
            }
        }

        return calculateGpa(bestAttempts.values());
    }

    public static BigDecimal calculateGpaFromAttempts(Collection<vn.haui.advisor.contracts.dto.TranscriptAttemptItem> attempts) {
        if (attempts == null || attempts.isEmpty()) {
            return null;
        }

        BigDecimal totalWeightedPoints = BigDecimal.ZERO;
        BigDecimal totalCredits = BigDecimal.ZERO;
        int validAttemptsCount = 0;

        for (vn.haui.advisor.contracts.dto.TranscriptAttemptItem attempt : attempts) {
            if (attempt.getCourseCode() != null && isCertificateCourse(attempt.getCourseCode(), attempt.getCourseName())) {
                continue;
            }
            if (attempt.getLetterGrade() == null || "UNKNOWN".equalsIgnoreCase(attempt.getLetterGrade().trim())
                    || "IN_PROGRESS".equalsIgnoreCase(attempt.getLetterGrade().trim())) {
                continue;
            }
            Double point = toGradePoint4(attempt.getLetterGrade());
            if (point != null && attempt.getCredits() != null && attempt.getCredits().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal weightedPoints = BigDecimal.valueOf(point).multiply(attempt.getCredits());
                totalWeightedPoints = totalWeightedPoints.add(weightedPoints);
                totalCredits = totalCredits.add(attempt.getCredits());
                validAttemptsCount++;
            }
        }

        if (validAttemptsCount == 0 || totalCredits.compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }

        return totalWeightedPoints.divide(totalCredits, DEFAULT_SCALE, ROUNDING_MODE);
    }

    public static BigDecimal calculateCpaFromAttempts(List<vn.haui.advisor.contracts.dto.TranscriptAttemptItem> allAttempts) {
        if (allAttempts == null || allAttempts.isEmpty()) {
            return null;
        }

        Map<String, vn.haui.advisor.contracts.dto.TranscriptAttemptItem> bestAttempts = new LinkedHashMap<>();
        for (vn.haui.advisor.contracts.dto.TranscriptAttemptItem attempt : allAttempts) {
            if (attempt.getCourseCode() == null) continue;
            if (isCertificateCourse(attempt.getCourseCode(), attempt.getCourseName())) {
                continue;
            }
            if (attempt.getLetterGrade() == null || "UNKNOWN".equalsIgnoreCase(attempt.getLetterGrade().trim())
                    || "IN_PROGRESS".equalsIgnoreCase(attempt.getLetterGrade().trim())) {
                continue;
            }

            String key = attempt.getCourseCode().toUpperCase();
            vn.haui.advisor.contracts.dto.TranscriptAttemptItem existing = bestAttempts.get(key);
            if (existing == null) {
                bestAttempts.put(key, attempt);
            } else {
                Double existingPts = toGradePoint4(existing.getLetterGrade());
                Double currentPts = toGradePoint4(attempt.getLetterGrade());

                if (existingPts == null && currentPts != null) {
                    bestAttempts.put(key, attempt);
                } else if (existingPts != null && currentPts != null && currentPts > existingPts) {
                    bestAttempts.put(key, attempt);
                }
            }
        }

        return calculateGpaFromAttempts(bestAttempts.values());
    }

    public static int calculateAccumulatedCreditsFromAttempts(List<vn.haui.advisor.contracts.dto.TranscriptAttemptItem> allAttempts) {
        if (allAttempts == null || allAttempts.isEmpty()) {
            return 0;
        }

        Map<String, Integer> passedCreditsByCourse = new LinkedHashMap<>();
        for (vn.haui.advisor.contracts.dto.TranscriptAttemptItem attempt : allAttempts) {
            if (attempt.getCourseCode() == null || attempt.getCredits() == null) continue;
            Boolean passed = isPassed(attempt.getLetterGrade());
            if (Boolean.TRUE.equals(passed)) {
                passedCreditsByCourse.put(attempt.getCourseCode().toUpperCase(), attempt.getCredits().intValue());
            }
        }

        return passedCreditsByCourse.values().stream().mapToInt(Integer::intValue).sum();
    }

    public static int calculateDebtCreditsFromAttempts(List<vn.haui.advisor.contracts.dto.TranscriptAttemptItem> allAttempts) {
        if (allAttempts == null || allAttempts.isEmpty()) {
            return 0;
        }

        // Môn nợ là môn từng bị F và CHƯA từng đạt điểm >= D trong bất kỳ lần học nào sau đó
        Map<String, Integer> latestFailingCredits = new LinkedHashMap<>();
        Set<String> passedCourses = new HashSet<>();

        for (vn.haui.advisor.contracts.dto.TranscriptAttemptItem attempt : allAttempts) {
            if (attempt.getCourseCode() == null || attempt.getCredits() == null) continue;
            String code = attempt.getCourseCode().toUpperCase();
            Boolean passed = isPassed(attempt.getLetterGrade());
            if (Boolean.TRUE.equals(passed)) {
                passedCourses.add(code);
                latestFailingCredits.remove(code);
            } else if (Boolean.FALSE.equals(passed)) {
                if (!passedCourses.contains(code)) {
                    latestFailingCredits.put(code, attempt.getCredits().intValue());
                }
            }
        }

        return latestFailingCredits.values().stream().mapToInt(Integer::intValue).sum();
    }

    public static BigDecimal simulateNewCpa(BigDecimal currentCpa, Integer accumulatedCredits, List<SimulatedCourseGrade> simulations) {
        if (currentCpa == null || accumulatedCredits == null || simulations == null || simulations.isEmpty()) {
            return currentCpa;
        }

        BigDecimal currentWeightedPoints = currentCpa.multiply(BigDecimal.valueOf(accumulatedCredits));
        BigDecimal addedWeightedPoints = BigDecimal.ZERO;
        int addedCredits = 0;

        for (SimulatedCourseGrade sim : simulations) {
            BigDecimal points = sim.getExpectedGradePoints();
            if (points == null && sim.getExpectedGrade() != null) {
                Double pts = toGradePoint4(sim.getExpectedGrade());
                if (pts != null) {
                    points = BigDecimal.valueOf(pts);
                }
            }

            if (points != null && sim.getCredits() != null && sim.getCredits() > 0) {
                addedWeightedPoints = addedWeightedPoints.add(points.multiply(BigDecimal.valueOf(sim.getCredits())));
                addedCredits += sim.getCredits();
            }
        }

        int newTotalCredits = accumulatedCredits + addedCredits;
        if (newTotalCredits == 0) {
            return currentCpa;
        }

        BigDecimal totalWeightedPoints = currentWeightedPoints.add(addedWeightedPoints);
        return totalWeightedPoints.divide(BigDecimal.valueOf(newTotalCredits), DEFAULT_SCALE, ROUNDING_MODE);
    }

    public static BigDecimal calculateRetakeRoi(int courseCredits, Double currentPoints, Double targetPoints, int totalAccumulatedCredits) {
        if (currentPoints == null || targetPoints == null || totalAccumulatedCredits <= 0 || targetPoints <= currentPoints) {
            return BigDecimal.ZERO.setScale(DEFAULT_SCALE, ROUNDING_MODE);
        }

        double pointDelta = targetPoints - currentPoints;
        double weightedGain = pointDelta * courseCredits;
        return BigDecimal.valueOf(weightedGain)
                .divide(BigDecimal.valueOf(totalAccumulatedCredits), DEFAULT_SCALE, ROUNDING_MODE);
    }

    public static BigDecimal calculateRequiredAverageGpa(BigDecimal currentCpa, int accumulatedCredits,
                                                         BigDecimal targetCpa, int remainingCredits) {
        if (currentCpa == null || targetCpa == null || remainingCredits <= 0) {
            return null;
        }

        int targetTotalCredits = accumulatedCredits + remainingCredits;
        BigDecimal targetTotalWeighted = targetCpa.multiply(BigDecimal.valueOf(targetTotalCredits));
        BigDecimal currentWeighted = currentCpa.multiply(BigDecimal.valueOf(accumulatedCredits));
        BigDecimal neededWeighted = targetTotalWeighted.subtract(currentWeighted);

        return neededWeighted.divide(BigDecimal.valueOf(remainingCredits), DEFAULT_SCALE, ROUNDING_MODE);
    }
}
