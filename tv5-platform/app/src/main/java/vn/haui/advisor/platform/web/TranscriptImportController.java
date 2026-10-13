package vn.haui.advisor.platform.web;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.haui.advisor.contracts.dto.*;
import vn.haui.advisor.contracts.ports.StudentContextProvider;
import vn.haui.advisor.platform.transcript.importing.TranscriptImportService;

/**
 * Nhập bảng điểm: tải lên/nhập tay → xem lại → xác nhận. Không đăng nhập hay crawl cổng e-HaUI.
 */
@RestController
@RequestMapping("/api/v1/academic/transcript/imports")
public class TranscriptImportController {

    private final StudentContextProvider studentContextProvider;
    private final TranscriptImportService importService;

    public TranscriptImportController(StudentContextProvider studentContextProvider, TranscriptImportService importService) {
        this.studentContextProvider = studentContextProvider;
        this.importService = importService;
    }

    @GetMapping
    public TranscriptImportListResponse listTranscriptImports() {
        return importService.list(studentContextProvider.getAuthenticatedContext());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public TranscriptImportResponse uploadTranscript(@RequestPart("file") MultipartFile file) {
        return importService.upload(studentContextProvider.getAuthenticatedContext(), file);
    }

    @PostMapping("/manual")
    public TranscriptImportResponse startManualTranscriptImport() {
        return importService.startManual(studentContextProvider.getAuthenticatedContext());
    }

    @GetMapping("/{importSessionId}")
    public TranscriptImportResponse getTranscriptImport(@PathVariable String importSessionId) {
        return importService.get(studentContextProvider.getAuthenticatedContext(), importSessionId);
    }

    @PutMapping("/{importSessionId}/rows")
    public TranscriptImportResponse updateTranscriptImportRows(@PathVariable String importSessionId,
                                                               @RequestBody UpdateImportRowsRequest request) {
        return importService.updateRows(studentContextProvider.getAuthenticatedContext(), importSessionId, request);
    }

    @PostMapping("/{importSessionId}/confirm")
    public TranscriptResponse confirmTranscriptImport(@PathVariable String importSessionId,
                                                      @RequestBody ConfirmTranscriptImportRequest request) {
        return importService.confirm(studentContextProvider.getAuthenticatedContext(), importSessionId, request);
    }

    @PostMapping("/{importSessionId}/cancel")
    public TranscriptImportResponse cancelTranscriptImport(@PathVariable String importSessionId) {
        return importService.cancel(studentContextProvider.getAuthenticatedContext(), importSessionId);
    }
}
