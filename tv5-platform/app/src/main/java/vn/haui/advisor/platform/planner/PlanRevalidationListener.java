package vn.haui.advisor.platform.planner;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import vn.haui.advisor.platform.student.AcademicDataChangedEvent;

/**
 * Dữ liệu học vụ vừa đổi (xác nhận bảng điểm, khai báo chứng chỉ, đổi CTĐT): thẩm định lại kế hoạch đang theo dõi sau khi
 * giao dịch đổi dữ liệu đã commit. Lỗi ở bước này không làm hỏng thao tác đã commit; lần đọc kế hoạch sau sẽ kiểm tra lại.
 */
@Component
public class PlanRevalidationListener {

    private static final Logger log = LoggerFactory.getLogger(PlanRevalidationListener.class);

    private final StudyPlanService plans;

    public PlanRevalidationListener(StudyPlanService plans) {
        this.plans = plans;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAcademicDataChanged(AcademicDataChangedEvent event) {
        try {
            plans.revalidate(event.studentId());
        } catch (RuntimeException ex) {
            log.warn("Chưa thẩm định lại được kế hoạch sau khi dữ liệu học vụ đổi sang {}; sẽ kiểm tra lại khi đọc kế hoạch",
                    event.dataRevision(), ex);
        }
    }
}
