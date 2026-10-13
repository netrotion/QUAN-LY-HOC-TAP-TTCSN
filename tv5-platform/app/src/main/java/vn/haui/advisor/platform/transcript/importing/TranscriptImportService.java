package vn.haui.advisor.platform.transcript.importing;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.platform.config.ImportProperties;
import vn.haui.advisor.platform.curriculum.CurriculumRepository;
import vn.haui.advisor.platform.curriculum.CurriculumRepository.CourseInfo;
import vn.haui.advisor.platform.error.ApiException;
import vn.haui.advisor.platform.student.StudentDataService;
import vn.haui.advisor.platform.student.StudentRepository;
import vn.haui.advisor.platform.transcript.TranscriptRepository;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Nhập bảng điểm: tải lên (parser/OCR) hoặc nhập tay → xem lại/sửa → xác nhận.
 *
 * - Trước khi xác nhận không ghi gì vào bảng điểm chính thức (enrollment_attempts) và dataRevision giữ nguyên.
 * - Xác nhận thay toàn bộ bảng điểm bằng các dòng included đã hết vấn đề chặn, tăng dataRevision trong cùng giao dịch.
 * - Số liệu in trên tài liệu (CPA, tín chỉ tích lũy) chỉ nằm trong documentSummary của phiên để đối chiếu,
 *   không bao giờ được lưu vào hồ sơ hay đưa cho AcademicFacade.
 */
@Service
public class TranscriptImportService {

    private static final int LIST_LIMIT = 10;
    static final String REPORTED_FIGURES_WARNING = "CPA và số tín chỉ in trên tài liệu chỉ để đối chiếu; CPA chính thức do hệ thống "
            + "tính từ bảng điểm sau khi bạn xác nhận.";

    private final ImportProperties properties;
    private final TranscriptDocumentReader documentReader;
    private final TranscriptTextParser parser = new TranscriptTextParser();
    private final ImportSessionRepository sessionRepository;
    private final CurriculumRepository curriculumRepository;
    private final TranscriptRepository transcriptRepository;
    private final StudentRepository studentRepository;
    private final StudentDataService studentDataService;

    public TranscriptImportService(ImportProperties properties, TranscriptDocumentReader documentReader,
                                   ImportSessionRepository sessionRepository, CurriculumRepository curriculumRepository,
                                   TranscriptRepository transcriptRepository, StudentRepository studentRepository,
                                   StudentDataService studentDataService) {
        this.properties = properties;
        this.documentReader = documentReader;
        this.sessionRepository = sessionRepository;
        this.curriculumRepository = curriculumRepository;
        this.transcriptRepository = transcriptRepository;
        this.studentRepository = studentRepository;
        this.studentDataService = studentDataService;
    }

    @Transactional
    public TranscriptImportResponse upload(TrustedStudentContext context, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Chưa chọn file bảng điểm hoặc file rỗng.");
        }
        if (file.getSize() > properties.getMaxFileBytes()) {
            throw ApiException.uploadTooLarge("File " + file.getSize() + " byte, tối đa " + properties.getMaxFileBytes() + " byte");
        }
        StudentRepository.StudentRow student = studentDataService.student(context);
        Instant now = Instant.now();
        requireCapacity(student.studentId(), now);

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException ex) {
            throw ApiException.badRequest("Không đọc được file tải lên.");
        }
        TranscriptDocumentReader.ReadResult read = documentReader.read(bytes);

        Map<String, CourseInfo> catalog = curriculumRepository.courseCatalog(student.curriculumId());
        boolean ocr = read.sourceType() != TranscriptSourceType.PDF_TEXT;
        TranscriptTextParser.ParsedTranscript parsed = parser.parse(read.lines(), ocr,
                code -> catalog.containsKey(code) ? catalog.get(code).credits() : null);

        ImportSessionRepository.ImportSession session = newSession(student.studentId(), read.sourceType(), now);
        session.fileName = sanitizeFileName(file.getOriginalFilename());
        session.contentType = read.contentType();
        session.fileSizeBytes = file.getSize();
        session.fileSha256 = sha256(bytes);
        session.pageCount = read.pageCount();
        session.documentSummary = parsed.summary();

        String documentStudentId = parsed.summary().getStudentIdOnDocument();
        if (read.manualReason() != null) {
            session.status = ImportSessionStatus.MANUAL_ENTRY_REQUIRED;
            session.warnings.add(read.manualReason() + " Vui lòng nhập tay từng học phần.");
        } else if (documentStudentId != null && !documentStudentId.equalsIgnoreCase(student.studentId())) {
            // Không giữ điểm của người khác: bỏ toàn bộ dòng đọc được
            session.status = ImportSessionStatus.MANUAL_ENTRY_REQUIRED;
            session.documentSummary = null;
            session.warnings.add("Mã sinh viên trên tài liệu (" + documentStudentId + ") khác tài khoản (" + student.studentId()
                    + "); dữ liệu đọc được đã bị bỏ. Hãy tải đúng bảng điểm của bạn hoặc nhập tay.");
        } else if (parsed.rows().isEmpty()) {
            session.status = ImportSessionStatus.MANUAL_ENTRY_REQUIRED;
            session.warnings.add("Không tìm thấy dòng học phần nào trong tài liệu. Vui lòng nhập tay từng học phần.");
        } else {
            if (parsed.rows().size() > properties.getMaxRows()) {
                throw ApiException.uploadTooLarge("Tài liệu có " + parsed.rows().size() + " dòng học phần, tối đa " + properties.getMaxRows());
            }
            session.status = ImportSessionStatus.REVIEW_REQUIRED;
            int index = 1;
            for (TranscriptTextParser.ParsedRow row : parsed.rows()) {
                session.rows.add(new ImportRowDraft(rowId(index++), row.sourceText(), row.courseCode(), row.documentCourseName(),
                        row.documentCredits(), row.semesterCode(), row.score10(), row.letterGrade(), true, row.confidence(),
                        row.unreadable(), ocr));
            }
        }
        if (session.documentSummary != null && (session.documentSummary.getReportedCpa() != null
                || session.documentSummary.getReportedAccumulatedCredits() != null)) {
            session.warnings.add(REPORTED_FIGURES_WARNING);
        }
        sessionRepository.insert(session);
        return toResponse(session, catalog);
    }

    @Transactional
    public TranscriptImportResponse startManual(TrustedStudentContext context) {
        StudentRepository.StudentRow student = studentDataService.student(context);
        Instant now = Instant.now();
        requireCapacity(student.studentId(), now);
        ImportSessionRepository.ImportSession session = newSession(student.studentId(), TranscriptSourceType.MANUAL, now);
        session.status = ImportSessionStatus.MANUAL_ENTRY_REQUIRED;
        session.warnings.add("Nhập từng học phần đã học, sau đó xem lại và xác nhận.");
        sessionRepository.insert(session);
        return toResponse(session, curriculumRepository.courseCatalog(student.curriculumId()));
    }

    @Transactional
    public TranscriptImportResponse get(TrustedStudentContext context, String importSessionId) {
        StudentRepository.StudentRow student = studentDataService.student(context);
        ImportSessionRepository.ImportSession session = load(student.studentId(), importSessionId);
        return toResponse(session, curriculumRepository.courseCatalog(student.curriculumId()));
    }

    @Transactional
    public TranscriptImportListResponse list(TrustedStudentContext context) {
        StudentRepository.StudentRow student = studentDataService.student(context);
        Map<String, CourseInfo> catalog = curriculumRepository.courseCatalog(student.curriculumId());
        List<TranscriptImportResponse> sessions = new ArrayList<>();
        for (ImportSessionRepository.ImportSession session : sessionRepository.listRecent(student.studentId(), LIST_LIMIT)) {
            expireIfNeeded(session);
            sessions.add(toResponse(session, catalog));
        }
        return new TranscriptImportListResponse(sessions);
    }

    @Transactional
    public TranscriptImportResponse updateRows(TrustedStudentContext context, String importSessionId, UpdateImportRowsRequest request) {
        StudentRepository.StudentRow student = studentDataService.student(context);
        ImportSessionRepository.ImportSession session = loadOpen(student.studentId(), importSessionId, request.getSessionVersion());
        List<TranscriptImportRowItem> incoming = request.getRows() == null ? List.of() : request.getRows();
        if (incoming.size() > properties.getMaxRows()) {
            throw ApiException.badRequest("Tối đa " + properties.getMaxRows() + " dòng trong một phiên nhập.");
        }

        Map<String, ImportRowDraft> existing = new HashMap<>();
        session.rows.forEach(row -> existing.put(row.rowId(), row));
        List<ImportRowDraft> rows = new ArrayList<>();
        int next = session.rows.size() + 1;
        for (TranscriptImportRowItem row : incoming) {
            ImportRowDraft previous = row.getRowId() == null ? null : existing.get(row.getRowId());
            String rowId = previous != null ? previous.rowId() : rowId(next++);
            rows.add(new ImportRowDraft(rowId,
                    previous == null ? null : previous.sourceText(),
                    upper(row.getCourseCode()),
                    previous == null ? null : previous.documentCourseName(),
                    previous == null ? null : previous.documentCredits(),
                    upper(row.getSemesterCode()),
                    row.getScore10(),
                    upper(row.getLetterGrade()),
                    !Boolean.FALSE.equals(row.getIncluded()),
                    previous == null ? null : previous.confidence(),
                    false,
                    previous != null && previous.ocr()));
        }
        session.rows = rows;
        session.status = rows.isEmpty() ? ImportSessionStatus.MANUAL_ENTRY_REQUIRED : ImportSessionStatus.REVIEW_REQUIRED;
        save(session, Instant.now());
        return toResponse(session, curriculumRepository.courseCatalog(student.curriculumId()));
    }

    @Transactional
    public TranscriptResponse confirm(TrustedStudentContext context, String importSessionId, ConfirmTranscriptImportRequest request) {
        StudentRepository.StudentRow student = studentDataService.student(context);
        ImportSessionRepository.ImportSession session = loadOpen(student.studentId(), importSessionId, request.getSessionVersion());
        StudentDataService.requireFreshRevision(student, request.getDataRevision());

        Map<String, CourseInfo> catalog = curriculumRepository.courseCatalog(student.curriculumId());
        List<TranscriptImportRowItem> rows = ImportRowValidator.validate(session.rows, catalog);
        List<TranscriptImportRowItem> included = rows.stream().filter(r -> Boolean.TRUE.equals(r.getIncluded())).toList();
        List<String> problems = new ArrayList<>();
        for (TranscriptImportRowItem row : included) {
            row.getIssues().stream().filter(ImportRowIssueItem::isBlocking)
                    .forEach(issue -> problems.add(row.getRowId() + ": " + issue.getMessage()));
        }
        if (included.isEmpty()) {
            problems.add("Chưa có dòng nào được chọn để đưa vào bảng điểm.");
        }
        if (!problems.isEmpty()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, ApiErrorCode.IMPORT_HAS_BLOCKING_ISSUES,
                    "Còn dòng cần sửa trước khi xác nhận bảng điểm.", problems);
        }

        // Dòng không có chữ gốc từ tài liệu là do sinh viên nhập tay; nếu mọi dòng đều vậy thì nguồn là MANUAL
        boolean allTyped = included.stream().allMatch(r -> r.getSourceText() == null);
        TranscriptSourceType source = allTyped ? TranscriptSourceType.MANUAL : session.sourceType;
        Instant now = Instant.now();
        transcriptRepository.replaceAll(student.studentId(), included.stream()
                .map(r -> new TranscriptRepository.AttemptToStore(r.getCourseCode(), r.getSemesterCode(), r.getScore10(), r.getLetterGrade()))
                .toList(), source, session.importSessionId, now);
        studentRepository.markTranscriptConfirmed(student.studentId(), source, session.importSessionId, now);
        studentDataService.bumpRevision(student, now);

        session.status = ImportSessionStatus.CONFIRMED;
        session.confirmedAt = now;
        save(session, now);
        return studentDataService.transcriptOf(studentRepository.findByStudentId(student.studentId()).orElseThrow());
    }

    @Transactional
    public TranscriptImportResponse cancel(TrustedStudentContext context, String importSessionId) {
        StudentRepository.StudentRow student = studentDataService.student(context);
        ImportSessionRepository.ImportSession session = load(student.studentId(), importSessionId);
        if (!session.isOpen()) {
            throw ApiException.importSessionClosed(session.status.name());
        }
        session.status = ImportSessionStatus.CANCELLED;
        save(session, Instant.now());
        return toResponse(session, curriculumRepository.courseCatalog(student.curriculumId()));
    }

    // ---------------------------------------------------------------------------------------------

    private ImportSessionRepository.ImportSession newSession(String studentId, TranscriptSourceType sourceType, Instant now) {
        ImportSessionRepository.ImportSession session = new ImportSessionRepository.ImportSession();
        session.importSessionId = "imp-" + UUID.randomUUID();
        session.studentId = studentId;
        session.sourceType = sourceType;
        session.createdAt = now;
        session.updatedAt = now;
        session.expiresAt = now.plus(properties.getSessionTtl());
        return session;
    }

    private void requireCapacity(String studentId, Instant now) {
        if (sessionRepository.countOpen(studentId, now) >= properties.getMaxOpenSessions()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, ApiErrorCode.IMPORT_LIMIT_REACHED,
                    "Bạn đang có " + properties.getMaxOpenSessions() + " phiên nhập chờ xem lại. Hãy xác nhận hoặc hủy bớt trước khi tạo phiên mới.",
                    List.of());
        }
    }

    private ImportSessionRepository.ImportSession load(String studentId, String importSessionId) {
        ImportSessionRepository.ImportSession session = sessionRepository.find(importSessionId, studentId)
                .orElseThrow(() -> ApiException.importSessionNotFound(importSessionId));
        expireIfNeeded(session);
        return session;
    }

    private ImportSessionRepository.ImportSession loadOpen(String studentId, String importSessionId, Integer clientVersion) {
        ImportSessionRepository.ImportSession session = load(studentId, importSessionId);
        if (!session.isOpen()) {
            throw ApiException.importSessionClosed(session.status.name());
        }
        if (clientVersion == null) {
            throw ApiException.badRequest("sessionVersion là bắt buộc.");
        }
        if (clientVersion != session.sessionVersion) {
            throw ApiException.importVersionConflict(session.sessionVersion, clientVersion);
        }
        return session;
    }

    private void expireIfNeeded(ImportSessionRepository.ImportSession session) {
        if (session.isOpen() && session.expiresAt != null && Instant.now().isAfter(session.expiresAt)) {
            session.status = ImportSessionStatus.EXPIRED;
            int version = session.sessionVersion;
            session.updatedAt = Instant.now();
            sessionRepository.update(session, version);
        }
    }

    private void save(ImportSessionRepository.ImportSession session, Instant now) {
        int expected = session.sessionVersion;
        session.sessionVersion = expected + 1;
        session.updatedAt = now;
        if (!sessionRepository.update(session, expected)) {
            throw ApiException.importVersionConflict(expected, expected);
        }
    }

    private TranscriptImportResponse toResponse(ImportSessionRepository.ImportSession session, Map<String, CourseInfo> catalog) {
        List<TranscriptImportRowItem> rows = ImportRowValidator.validate(session.rows, catalog);
        TranscriptImportResponse response = new TranscriptImportResponse();
        response.setImportSessionId(session.importSessionId);
        response.setStatus(session.status);
        response.setSourceType(session.sourceType);
        response.setFileName(session.fileName);
        response.setFileSizeBytes(session.fileSizeBytes);
        response.setPageCount(session.pageCount);
        response.setSessionVersion(session.sessionVersion);
        response.setRows(rows);
        response.setDocumentSummary(session.documentSummary);
        response.setWarnings(new ArrayList<>(session.warnings));
        response.setBlockingIssueCount(ImportRowValidator.blockingCount(rows));
        response.setCreatedAt(iso(session.createdAt));
        response.setUpdatedAt(iso(session.updatedAt));
        response.setExpiresAt(iso(session.expiresAt));
        response.setConfirmedAt(iso(session.confirmedAt));
        return response;
    }

    private static String rowId(int index) {
        return String.format("row-%03d", index);
    }

    static String sanitizeFileName(String original) {
        if (original == null || original.isBlank()) {
            return "bang-diem";
        }
        String name = original.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}\"<>|*?]", "_").trim();
        if (name.isEmpty()) {
            return "bang-diem";
        }
        return name.length() > 200 ? name.substring(name.length() - 200) : name;
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    private static String upper(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private static String iso(Instant instant) {
        return instant == null ? null : instant.toString();
    }
}
