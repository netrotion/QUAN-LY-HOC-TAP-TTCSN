package vn.haui.advisor.contracts.fake;

import vn.haui.advisor.contracts.dto.StudentFactRecord;
import vn.haui.advisor.contracts.ports.StudentFactStore;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Triển khai in-memory của StudentFactStore phục vụ môi trường test và runtime độc lập.
 */
public class InMemoryStudentFactStore implements StudentFactStore {

    private final ConcurrentHashMap<String, StudentFactRecord> store = new ConcurrentHashMap<>();

    @Override
    public StudentFactRecord getFacts(String studentId) {
        if (studentId == null || studentId.isBlank()) {
            return null;
        }
        return store.get(studentId);
    }

    @Override
    public void saveFacts(StudentFactRecord record) {
        if (record != null && record.getStudentId() != null && !record.getStudentId().isBlank()) {
            store.put(record.getStudentId(), record);
        }
    }

    public void clear() {
        store.clear();
    }
}

