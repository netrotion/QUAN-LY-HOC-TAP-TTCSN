package vn.haui.advisor.contracts.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

public class AcademicStatusRequest implements Serializable {
    private String studentId;
    private String dataRevision;

    public AcademicStatusRequest() {
    }

    public AcademicStatusRequest(String studentId, String dataRevision) {
        this.studentId = studentId;
        this.dataRevision = dataRevision;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getDataRevision() {
        return dataRevision;
    }

    public void setDataRevision(String dataRevision) {
        this.dataRevision = dataRevision;
    }
}
