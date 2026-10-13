// GENERATED — KHÔNG SỬA TAY. Sinh bởi `npm run contracts:build` từ tv5-platform/contracts (openapi-v1.yaml, examples/*.json, enum Java).
export const CONTRACT_VERSION = "1.2.0";
export const CONTRACT_MILESTONE = "contracts-v1";
export const API_BASE_PATH = '/api/v1';
export const DEMO_STUDENT = Object.freeze({
  "studentId": "2024604757",
  "dataRevision": "REV-2024604757-001"
});
export const ENUMS = Object.freeze({
  "StudyPlanStatus": [
    "DRAFT",
    "VALIDATED",
    "ACTIVE",
    "COMPLETED",
    "ARCHIVED"
  ],
  "ApiErrorCode": [
    "VALIDATION_ERROR",
    "PLAN_NOT_FOUND",
    "DATA_REVISION_STALE",
    "PLAN_VERSION_CONFLICT",
    "PLAN_NOT_EDITABLE",
    "PLAN_NOT_VALIDATED",
    "PLAN_VALIDATION_FAILED",
    "NOT_IMPLEMENTED",
    "UNAUTHENTICATED",
    "INVALID_CREDENTIALS",
    "ACCESS_DENIED",
    "ACCOUNT_ALREADY_EXISTS",
    "CURRICULUM_NOT_FOUND",
    "REQUIREMENT_NOT_FOUND",
    "IMPORT_SESSION_NOT_FOUND",
    "IMPORT_SESSION_CLOSED",
    "IMPORT_VERSION_CONFLICT",
    "IMPORT_HAS_BLOCKING_ISSUES",
    "IMPORT_LIMIT_REACHED",
    "UPLOAD_TOO_LARGE",
    "UNSUPPORTED_FILE_TYPE",
    "TOOL_NOT_READY",
    "CONVERSATION_NOT_FOUND"
  ],
  "AcademicRiskLevel": [
    "NORMAL",
    "WARNING_LEVEL_1",
    "WARNING_LEVEL_2",
    "CRITICAL"
  ]
});
export const OPERATIONS = Object.freeze({
  "activateStudyPlan": {
    "method": "POST",
    "path": "/planner/plans/{planId}/activate"
  },
  "calculateTargetGrades": {
    "method": "POST",
    "path": "/simulation/target-grades"
  },
  "cancelTranscriptImport": {
    "method": "POST",
    "path": "/academic/transcript/imports/{importSessionId}/cancel"
  },
  "chatAdvisor": {
    "method": "POST",
    "path": "/advisor/chat"
  },
  "checkCourseEligibility": {
    "method": "POST",
    "path": "/academic/eligibility"
  },
  "confirmTranscriptImport": {
    "method": "POST",
    "path": "/academic/transcript/imports/{importSessionId}/confirm"
  },
  "declareCertificate": {
    "method": "PUT",
    "path": "/academic/certificates/{requirementCode}"
  },
  "deleteStudyPlan": {
    "method": "DELETE",
    "path": "/planner/plans/{planId}"
  },
  "generateStudyPlan": {
    "method": "POST",
    "path": "/planner/generate"
  },
  "getAcademicStatus": {
    "method": "GET",
    "path": "/academic/status"
  },
  "getAuthSession": {
    "method": "GET",
    "path": "/auth/session"
  },
  "getBootstrapInfo": {
    "method": "GET",
    "path": "/system/bootstrap"
  },
  "getConversation": {
    "method": "GET",
    "path": "/advisor/conversations/{conversationId}"
  },
  "getCsrfToken": {
    "method": "GET",
    "path": "/auth/csrf"
  },
  "getCurriculum": {
    "method": "GET",
    "path": "/academic/curriculum"
  },
  "getStudentProfile": {
    "method": "GET",
    "path": "/students/me"
  },
  "getStudyPlan": {
    "method": "GET",
    "path": "/planner/plans/{planId}"
  },
  "getSystemHealth": {
    "method": "GET",
    "path": "/system/health"
  },
  "getTranscript": {
    "method": "GET",
    "path": "/academic/transcript"
  },
  "getTranscriptImport": {
    "method": "GET",
    "path": "/academic/transcript/imports/{importSessionId}"
  },
  "listCertificates": {
    "method": "GET",
    "path": "/academic/certificates"
  },
  "listConversations": {
    "method": "GET",
    "path": "/advisor/conversations"
  },
  "listStudyPlans": {
    "method": "GET",
    "path": "/planner/plans"
  },
  "listTranscriptImports": {
    "method": "GET",
    "path": "/academic/transcript/imports"
  },
  "login": {
    "method": "POST",
    "path": "/auth/login"
  },
  "logout": {
    "method": "POST",
    "path": "/auth/logout"
  },
  "rankRetakeCourses": {
    "method": "POST",
    "path": "/simulation/retake-ranking"
  },
  "reconcileStudyPlan": {
    "method": "POST",
    "path": "/planner/reconcile"
  },
  "registerAccount": {
    "method": "POST",
    "path": "/auth/register"
  },
  "restoreStudyPlan": {
    "method": "POST",
    "path": "/planner/plans/{planId}/restore"
  },
  "runGraduationAudit": {
    "method": "GET",
    "path": "/audit/graduation"
  },
  "saveStudyPlan": {
    "method": "POST",
    "path": "/planner/plans"
  },
  "simulateGrades": {
    "method": "POST",
    "path": "/simulation/grades"
  },
  "startManualTranscriptImport": {
    "method": "POST",
    "path": "/academic/transcript/imports/manual"
  },
  "updateStudentProfile": {
    "method": "PUT",
    "path": "/students/me"
  },
  "updateTranscriptImportRows": {
    "method": "PUT",
    "path": "/academic/transcript/imports/{importSessionId}/rows"
  },
  "uploadTranscript": {
    "method": "POST",
    "path": "/academic/transcript/imports"
  },
  "validateStudyPlan": {
    "method": "POST",
    "path": "/planner/validate"
  }
});
export const FIXTURES = Object.freeze({
  "auth-csrf": {
    "operationId": "getCsrfToken",
    "method": "GET",
    "path": "/auth/csrf",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "CsrfTokenResponse",
    "response": {
      "headerName": "X-XSRF-TOKEN",
      "parameterName": "_csrf",
      "token": "4f3b2a9c-8d1e-4c7a-b5f6-2e9d0c1a7b33"
    },
    "consumers": [
      "TV2"
    ]
  },
  "auth-session": {
    "operationId": "getAuthSession",
    "method": "GET",
    "path": "/auth/session",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "AuthSessionResponse",
    "response": {
      "authenticated": true,
      "studentId": "2024604757",
      "fullName": "Lê Việt Hùng",
      "role": "STUDENT"
    },
    "consumers": [
      "TV2",
      "TV3"
    ]
  },
  "auth-session-anonymous": {
    "operationId": "getAuthSession",
    "method": "GET",
    "path": "/auth/session",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "AuthSessionResponse",
    "response": {
      "authenticated": false,
      "studentId": null,
      "fullName": null,
      "role": null
    },
    "consumers": [
      "TV2"
    ]
  },
  "auth-login": {
    "operationId": "login",
    "method": "POST",
    "path": "/auth/login",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": "LoginRequest",
    "request": {
      "studentId": "2024604757",
      "password": "demo-password-example"
    },
    "responseSchema": "AuthSessionResponse",
    "response": {
      "authenticated": true,
      "studentId": "2024604757",
      "fullName": "Lê Việt Hùng",
      "role": "STUDENT"
    },
    "consumers": [
      "TV2"
    ]
  },
  "auth-login-invalid-credentials": {
    "operationId": "login",
    "method": "POST",
    "path": "/auth/login",
    "httpStatus": 401,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "ApiErrorResponse",
    "response": {
      "code": "INVALID_CREDENTIALS",
      "message": "Mã sinh viên hoặc mật khẩu không đúng.",
      "requestId": "req-2026-10-14-0002",
      "timestamp": "2026-10-14T02:01:00Z",
      "details": []
    },
    "consumers": [
      "TV2"
    ]
  },
  "auth-register": {
    "operationId": "registerAccount",
    "method": "POST",
    "path": "/auth/register",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": "RegisterAccountRequest",
    "request": {
      "studentId": "2024610001",
      "password": "demo-password-example",
      "fullName": "Nguyễn Thu Hà",
      "email": "thuha.demo@example.com",
      "className": "2024DHKTPM01",
      "cohort": "K19",
      "curriculumId": "curriculum-ktpm-haui-2024"
    },
    "responseSchema": "AuthSessionResponse",
    "response": {
      "authenticated": true,
      "studentId": "2024610001",
      "fullName": "Nguyễn Thu Hà",
      "role": "STUDENT"
    },
    "consumers": [
      "TV2",
      "TV3"
    ]
  },
  "auth-register-conflict": {
    "operationId": "registerAccount",
    "method": "POST",
    "path": "/auth/register",
    "httpStatus": 409,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "ApiErrorResponse",
    "response": {
      "code": "ACCOUNT_ALREADY_EXISTS",
      "message": "Mã sinh viên này đã có tài khoản.",
      "requestId": "req-2026-10-14-0004",
      "timestamp": "2026-10-14T02:03:00Z",
      "details": []
    },
    "consumers": [
      "TV2",
      "TV3"
    ]
  },
  "unauthenticated": {
    "operationId": "getStudentProfile",
    "method": "GET",
    "path": "/students/me",
    "httpStatus": 401,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "ApiErrorResponse",
    "response": {
      "code": "UNAUTHENTICATED",
      "message": "Bạn chưa đăng nhập hoặc phiên đã hết hạn. Vui lòng đăng nhập lại.",
      "requestId": "req-2026-10-14-0001",
      "timestamp": "2026-10-14T02:00:00Z",
      "details": []
    },
    "consumers": [
      "TV2",
      "TV3"
    ]
  },
  "access-denied": {
    "operationId": "updateStudentProfile",
    "method": "PUT",
    "path": "/students/me",
    "httpStatus": 403,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "ApiErrorResponse",
    "response": {
      "code": "ACCESS_DENIED",
      "message": "Yêu cầu bị từ chối: thiếu CSRF token hoặc tài khoản không có quyền sinh viên.",
      "requestId": "req-2026-10-14-0003",
      "timestamp": "2026-10-14T02:02:00Z",
      "details": []
    },
    "consumers": [
      "TV2",
      "TV3"
    ]
  },
  "student-profile": {
    "operationId": "getStudentProfile",
    "method": "GET",
    "path": "/students/me",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "StudentProfileResponse",
    "response": {
      "studentId": "2024604757",
      "fullName": "Lê Việt Hùng",
      "email": "lehung.haui@gmail.com",
      "className": "2024DHKTPM02",
      "cohort": "K19",
      "curriculumId": "curriculum-ktpm-haui-2024",
      "curriculumName": "Chương trình đào tạo Kỹ sư Kỹ thuật phần mềm - HaUI (Khóa 2024)",
      "majorCode": "CT1085",
      "majorName": "Kỹ thuật phần mềm",
      "faculty": "Trường Công nghệ thông tin và Truyền thông - Đại học Công nghiệp Hà Nội",
      "transcriptStatus": "CONFIRMED",
      "dataRevision": "REV-2024604757-001",
      "createdAt": "2026-09-01T00:00:00Z",
      "updatedAt": "2026-10-01T08:00:00Z"
    },
    "consumers": [
      "TV2",
      "TV3"
    ]
  },
  "student-profile-update": {
    "operationId": "updateStudentProfile",
    "method": "PUT",
    "path": "/students/me",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": "UpdateStudentProfileRequest",
    "request": {
      "fullName": null,
      "email": "lehung.haui.moi@example.com",
      "className": null,
      "cohort": null,
      "curriculumId": null,
      "dataRevision": "REV-2024604757-001"
    },
    "responseSchema": "StudentProfileResponse",
    "response": {
      "studentId": "2024604757",
      "fullName": "Lê Việt Hùng",
      "email": "lehung.haui@gmail.com",
      "className": "2024DHKTPM02",
      "cohort": "K19",
      "curriculumId": "curriculum-ktpm-haui-2024",
      "curriculumName": "Chương trình đào tạo Kỹ sư Kỹ thuật phần mềm - HaUI (Khóa 2024)",
      "majorCode": "CT1085",
      "majorName": "Kỹ thuật phần mềm",
      "faculty": "Trường Công nghệ thông tin và Truyền thông - Đại học Công nghiệp Hà Nội",
      "transcriptStatus": "CONFIRMED",
      "dataRevision": "REV-2024604757-001",
      "createdAt": "2026-09-01T00:00:00Z",
      "updatedAt": "2026-10-01T08:00:00Z"
    },
    "consumers": [
      "TV3"
    ]
  },
  "curriculum": {
    "operationId": "getCurriculum",
    "method": "GET",
    "path": "/academic/curriculum",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "CurriculumResponse",
    "response": {
      "curriculumId": "curriculum-ktpm-haui-2024",
      "curriculumName": "Chương trình đào tạo Kỹ sư Kỹ thuật phần mềm - HaUI (Khóa 2024)",
      "majorCode": "CT1085",
      "majorName": "Kỹ thuật phần mềm",
      "faculty": "Trường Công nghệ thông tin và Truyền thông - Đại học Công nghiệp Hà Nội",
      "totalCreditsRequired": 150,
      "status": "VERIFIED_GROUND_TRUTH",
      "source": "Cổng thông tin đào tạo sv.haui.edu.vn",
      "courses": [
        {
          "courseCode": "IT6015",
          "courseName": "Kỹ thuật lập trình",
          "credits": 3,
          "knowledgeBlock": "I. KIẾN THỨC GIÁO DỤC ĐẠI CƯƠNG",
          "suggestedSemester": 2,
          "mandatory": false,
          "prerequisiteCourseCodes": [],
          "priorCourseCodes": [
            "ME6042"
          ],
          "corequisiteCourseCodes": []
        },
        {
          "courseCode": "IT6002",
          "courseName": "Cấu trúc dữ liệu và giải thuật",
          "credits": 3,
          "knowledgeBlock": "II. KIẾN THỨC GIÁO DỤC CHUYÊN NGHIỆP",
          "suggestedSemester": 3,
          "mandatory": false,
          "prerequisiteCourseCodes": [],
          "priorCourseCodes": [
            "IT6015",
            "SC6208"
          ],
          "corequisiteCourseCodes": []
        },
        {
          "courseCode": "IT6044",
          "courseName": "Ứng dụng thuật toán",
          "credits": 3,
          "knowledgeBlock": "II. KIẾN THỨC GIÁO DỤC CHUYÊN NGHIỆP",
          "suggestedSemester": 4,
          "mandatory": false,
          "prerequisiteCourseCodes": [],
          "priorCourseCodes": [
            "IT6002",
            "IT6015"
          ],
          "corequisiteCourseCodes": []
        },
        {
          "courseCode": "IT6067",
          "courseName": "Kiến trúc máy tính và hệ điều hành",
          "credits": 3,
          "knowledgeBlock": "II. KIẾN THỨC GIÁO DỤC CHUYÊN NGHIỆP",
          "suggestedSemester": 3,
          "mandatory": false,
          "prerequisiteCourseCodes": [],
          "priorCourseCodes": [
            "IT6015"
          ],
          "corequisiteCourseCodes": []
        },
        {
          "courseCode": "IT6083",
          "courseName": "Mạng máy tính",
          "credits": 3,
          "knowledgeBlock": "II. KIẾN THỨC GIÁO DỤC CHUYÊN NGHIỆP",
          "suggestedSemester": 5,
          "mandatory": false,
          "prerequisiteCourseCodes": [],
          "priorCourseCodes": [
            "IT6067",
            "IT6203"
          ],
          "corequisiteCourseCodes": []
        },
        {
          "courseCode": "LP6010",
          "courseName": "Triết học Mác-Lênin",
          "credits": 3,
          "knowledgeBlock": "I. KIẾN THỨC GIÁO DỤC ĐẠI CƯƠNG",
          "suggestedSemester": 1,
          "mandatory": false,
          "prerequisiteCourseCodes": [],
          "priorCourseCodes": [],
          "corequisiteCourseCodes": []
        },
        {
          "courseCode": "LP6011",
          "courseName": "Kinh tế chính trị Mác-Lênin",
          "credits": 2,
          "knowledgeBlock": "I. KIẾN THỨC GIÁO DỤC ĐẠI CƯƠNG",
          "suggestedSemester": 2,
          "mandatory": false,
          "prerequisiteCourseCodes": [],
          "priorCourseCodes": [
            "LP6010"
          ],
          "corequisiteCourseCodes": []
        },
        {
          "courseCode": "LP6004",
          "courseName": "Tư tưởng Hồ Chí Minh",
          "credits": 2,
          "knowledgeBlock": "I. KIẾN THỨC GIÁO DỤC ĐẠI CƯƠNG",
          "suggestedSemester": 6,
          "mandatory": false,
          "prerequisiteCourseCodes": [],
          "priorCourseCodes": [
            "LP6010",
            "LP6011"
          ],
          "corequisiteCourseCodes": []
        },
        {
          "courseCode": "DC6006",
          "courseName": "Quân sự chung",
          "credits": 1.5,
          "knowledgeBlock": "I. KIẾN THỨC GIÁO DỤC ĐẠI CƯƠNG",
          "suggestedSemester": 1,
          "mandatory": false,
          "prerequisiteCourseCodes": [],
          "priorCourseCodes": [],
          "corequisiteCourseCodes": []
        },
        {
          "courseCode": "IT6096",
          "courseName": "Thiết kế phần mềm",
          "credits": 3,
          "knowledgeBlock": "II. KIẾN THỨC GIÁO DỤC CHUYÊN NGHIỆP",
          "suggestedSemester": 5,
          "mandatory": false,
          "prerequisiteCourseCodes": [],
          "priorCourseCodes": [
            "IT6097"
          ],
          "corequisiteCourseCodes": []
        }
      ]
    },
    "consumers": [
      "TV2"
    ]
  },
  "transcript": {
    "operationId": "getTranscript",
    "method": "GET",
    "path": "/academic/transcript",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "TranscriptResponse",
    "response": {
      "studentId": "2024604757",
      "transcriptStatus": "CONFIRMED",
      "sourceType": "DEMO_SEED",
      "importSessionId": null,
      "confirmedAt": "2026-10-01T08:00:00Z",
      "dataRevision": "REV-2024604757-001",
      "attempts": [
        {
          "courseCode": "BS6001",
          "courseName": "Đại số tuyến tính",
          "credits": 3,
          "semesterCode": "2024_1",
          "attemptNumber": 1,
          "score10": 7,
          "letterGrade": "B"
        },
        {
          "courseCode": "BS6002",
          "courseName": "Giải tích",
          "credits": 3,
          "semesterCode": "2024_1",
          "attemptNumber": 1,
          "score10": 7,
          "letterGrade": "B"
        },
        {
          "courseCode": "DC6004",
          "courseName": "Đường lối QP&AN của ĐCS Việt Nam",
          "credits": 3,
          "semesterCode": "2024_1",
          "attemptNumber": 1,
          "score10": 8.2,
          "letterGrade": "B+"
        },
        {
          "courseCode": "DC6005",
          "courseName": "Công tác quốc phòng và an ninh",
          "credits": 2,
          "semesterCode": "2024_1",
          "attemptNumber": 1,
          "score10": 8,
          "letterGrade": "B+"
        },
        {
          "courseCode": "DC6006",
          "courseName": "Quân sự chung",
          "credits": 1.5,
          "semesterCode": "2024_1",
          "attemptNumber": 1,
          "score10": 8.7,
          "letterGrade": "A"
        },
        {
          "courseCode": "DC6007",
          "courseName": "Kỹ thuật chiến đấu bộ binh và chiến thuật",
          "credits": 2,
          "semesterCode": "2024_1",
          "attemptNumber": 1,
          "score10": 8.7,
          "letterGrade": "A"
        },
        {
          "courseCode": "IT6011",
          "courseName": "Nhập môn về kỹ thuật",
          "credits": 2,
          "semesterCode": "2024_1",
          "attemptNumber": 1,
          "score10": 7.9,
          "letterGrade": "B+"
        },
        {
          "courseCode": "IT6015",
          "courseName": "Kỹ thuật lập trình",
          "credits": 3,
          "semesterCode": "2024_1",
          "attemptNumber": 1,
          "score10": 9.3,
          "letterGrade": "A"
        },
        {
          "courseCode": "LP6010",
          "courseName": "Triết học Mác-Lênin",
          "credits": 3,
          "semesterCode": "2024_1",
          "attemptNumber": 1,
          "score10": 5.4,
          "letterGrade": "D+"
        },
        {
          "courseCode": "BS6018",
          "courseName": "Giao tiếp liên văn hóa",
          "credits": 2,
          "semesterCode": "2024_2",
          "attemptNumber": 1,
          "score10": 6.4,
          "letterGrade": "C+"
        },
        {
          "courseCode": "IT6035",
          "courseName": "Toán rời rạc",
          "credits": 3,
          "semesterCode": "2024_2",
          "attemptNumber": 1,
          "score10": 6.6,
          "letterGrade": "C+"
        },
        {
          "courseCode": "LP6004",
          "courseName": "Tư tưởng Hồ Chí Minh",
          "credits": 2,
          "semesterCode": "2024_2",
          "attemptNumber": 1,
          "score10": 0,
          "letterGrade": "F"
        },
        {
          "courseCode": "LP6011",
          "courseName": "Kinh tế chính trị Mác-Lênin",
          "credits": 2,
          "semesterCode": "2024_2",
          "attemptNumber": 1,
          "score10": 5.6,
          "letterGrade": "C"
        },
        {
          "courseCode": "LP6012",
          "courseName": "Chủ nghĩa xã hội khoa học",
          "credits": 2,
          "semesterCode": "2024_2",
          "attemptNumber": 1,
          "score10": 5.3,
          "letterGrade": "D+"
        },
        {
          "courseCode": "IT6002",
          "courseName": "Cấu trúc dữ liệu và giải thuật",
          "credits": 3,
          "semesterCode": "2025_1",
          "attemptNumber": 1,
          "score10": 6.6,
          "letterGrade": "C+"
        },
        {
          "courseCode": "IT6067",
          "courseName": "Kiến trúc máy tính và hệ điều hành",
          "credits": 3,
          "semesterCode": "2025_1",
          "attemptNumber": 1,
          "score10": 7.7,
          "letterGrade": "B+"
        },
        {
          "courseCode": "IT6082",
          "courseName": "Nhập môn công nghệ phần mềm",
          "credits": 3,
          "semesterCode": "2025_1",
          "attemptNumber": 1,
          "score10": 8.8,
          "letterGrade": "A"
        },
        {
          "courseCode": "IT6120",
          "courseName": "Lập trình hướng đối tượng",
          "credits": 3,
          "semesterCode": "2025_1",
          "attemptNumber": 1,
          "score10": 8.9,
          "letterGrade": "A"
        },
        {
          "courseCode": "IT6126",
          "courseName": "Hệ thống cơ sở dữ liệu",
          "credits": 4,
          "semesterCode": "2025_1",
          "attemptNumber": 1,
          "score10": 8.5,
          "letterGrade": "A"
        },
        {
          "courseCode": "IT6017",
          "courseName": "Lập trình .NET",
          "credits": 3,
          "semesterCode": "2025_2",
          "attemptNumber": 1,
          "score10": 7.8,
          "letterGrade": "B+"
        },
        {
          "courseCode": "IT6019",
          "courseName": "Lập trình Java",
          "credits": 3,
          "semesterCode": "2025_2",
          "attemptNumber": 1,
          "score10": 8.4,
          "letterGrade": "B+"
        },
        {
          "courseCode": "IT6094",
          "courseName": "Trí tuệ nhân tạo",
          "credits": 3,
          "semesterCode": "2025_2",
          "attemptNumber": 1,
          "score10": 9.1,
          "letterGrade": "A"
        },
        {
          "courseCode": "IT6097",
          "courseName": "Phân tích và đặc tả yêu cầu phần mềm",
          "credits": 3,
          "semesterCode": "2025_2",
          "attemptNumber": 1,
          "score10": 8.5,
          "letterGrade": "A"
        }
      ]
    },
    "consumers": [
      "TV2",
      "TV4"
    ]
  },
  "transcript-import-list": {
    "operationId": "listTranscriptImports",
    "method": "GET",
    "path": "/academic/transcript/imports",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "TranscriptImportListResponse",
    "response": {
      "sessions": [
        {
          "importSessionId": "imp-2024604757-20261014-01",
          "status": "REVIEW_REQUIRED",
          "sourceType": "PDF_TEXT",
          "fileName": "BangDiem_2024604757.pdf",
          "fileSizeBytes": 48213,
          "pageCount": 2,
          "sessionVersion": 1,
          "rows": [
            {
              "rowId": "row-001",
              "sourceText": "IT6015 Ky thuat lap trinh 3 9.3 A",
              "courseCode": "IT6015",
              "courseName": "Kỹ thuật lập trình",
              "documentCourseName": "Ky thuat lap trinh",
              "credits": 3,
              "semesterCode": "2024_1",
              "score10": 9.3,
              "letterGrade": "A",
              "included": true,
              "confidence": null,
              "issues": [
                {
                  "code": "COURSE_NAME_DIFFERS",
                  "blocking": false,
                  "message": "Tên trên tài liệu \"Ky thuat lap trinh\" khác tên trong CTĐT \"Kỹ thuật lập trình\"; khi xác nhận sẽ dùng tên CTĐT."
                }
              ]
            },
            {
              "rowId": "row-002",
              "sourceText": "IT6002 Cấu trúc dữ liệu và giải thuật 3 6.8 C+",
              "courseCode": "IT6002",
              "courseName": "Cấu trúc dữ liệu và giải thuật",
              "documentCourseName": "Cấu trúc dữ liệu và giải thuật",
              "credits": 3,
              "semesterCode": "2025_1",
              "score10": 6.8,
              "letterGrade": "C+",
              "included": true,
              "confidence": null,
              "issues": []
            },
            {
              "rowId": "row-003",
              "sourceText": "IT6O35 Toán rời rạc 3 6.6 C+",
              "courseCode": "IT6O35",
              "courseName": null,
              "documentCourseName": "Toán rời rạc",
              "credits": null,
              "semesterCode": "2024_2",
              "score10": 6.6,
              "letterGrade": "C+",
              "included": true,
              "confidence": null,
              "issues": [
                {
                  "code": "UNKNOWN_COURSE_CODE",
                  "blocking": true,
                  "message": "Mã IT6O35 không có trong CTĐT. Sửa mã học phần hoặc bỏ chọn dòng."
                }
              ]
            },
            {
              "rowId": "row-004",
              "sourceText": "IT6126 Hệ thống cơ sở dữ liệu 4",
              "courseCode": "IT6126",
              "courseName": "Hệ thống cơ sở dữ liệu",
              "documentCourseName": "Hệ thống cơ sở dữ liệu",
              "credits": 4,
              "semesterCode": "2026_1",
              "score10": null,
              "letterGrade": null,
              "included": true,
              "confidence": null,
              "issues": [
                {
                  "code": "MISSING_GRADE",
                  "blocking": false,
                  "message": "Chưa có điểm; học phần được ghi nhận là đang học."
                }
              ]
            }
          ],
          "documentSummary": {
            "studentIdOnDocument": "2024604757",
            "fullNameOnDocument": "Lê Việt Hùng",
            "reportedCpa": 3.18,
            "reportedAccumulatedCredits": 61
          },
          "warnings": [
            "CPA và số tín chỉ in trên tài liệu chỉ để đối chiếu; CPA chính thức do hệ thống tính từ bảng điểm sau khi bạn xác nhận."
          ],
          "blockingIssueCount": 1,
          "createdAt": "2026-10-14T02:10:00Z",
          "updatedAt": "2026-10-14T02:10:00Z",
          "expiresAt": "2026-10-15T02:10:00Z",
          "confirmedAt": null
        }
      ]
    },
    "consumers": [
      "TV2"
    ]
  },
  "transcript-import-upload": {
    "operationId": "uploadTranscript",
    "method": "POST",
    "path": "/academic/transcript/imports",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "TranscriptImportResponse",
    "response": {
      "importSessionId": "imp-2024604757-20261014-01",
      "status": "REVIEW_REQUIRED",
      "sourceType": "PDF_TEXT",
      "fileName": "BangDiem_2024604757.pdf",
      "fileSizeBytes": 48213,
      "pageCount": 2,
      "sessionVersion": 1,
      "rows": [
        {
          "rowId": "row-001",
          "sourceText": "IT6015 Ky thuat lap trinh 3 9.3 A",
          "courseCode": "IT6015",
          "courseName": "Kỹ thuật lập trình",
          "documentCourseName": "Ky thuat lap trinh",
          "credits": 3,
          "semesterCode": "2024_1",
          "score10": 9.3,
          "letterGrade": "A",
          "included": true,
          "confidence": null,
          "issues": [
            {
              "code": "COURSE_NAME_DIFFERS",
              "blocking": false,
              "message": "Tên trên tài liệu \"Ky thuat lap trinh\" khác tên trong CTĐT \"Kỹ thuật lập trình\"; khi xác nhận sẽ dùng tên CTĐT."
            }
          ]
        },
        {
          "rowId": "row-002",
          "sourceText": "IT6002 Cấu trúc dữ liệu và giải thuật 3 6.8 C+",
          "courseCode": "IT6002",
          "courseName": "Cấu trúc dữ liệu và giải thuật",
          "documentCourseName": "Cấu trúc dữ liệu và giải thuật",
          "credits": 3,
          "semesterCode": "2025_1",
          "score10": 6.8,
          "letterGrade": "C+",
          "included": true,
          "confidence": null,
          "issues": []
        },
        {
          "rowId": "row-003",
          "sourceText": "IT6O35 Toán rời rạc 3 6.6 C+",
          "courseCode": "IT6O35",
          "courseName": null,
          "documentCourseName": "Toán rời rạc",
          "credits": null,
          "semesterCode": "2024_2",
          "score10": 6.6,
          "letterGrade": "C+",
          "included": true,
          "confidence": null,
          "issues": [
            {
              "code": "UNKNOWN_COURSE_CODE",
              "blocking": true,
              "message": "Mã IT6O35 không có trong CTĐT. Sửa mã học phần hoặc bỏ chọn dòng."
            }
          ]
        },
        {
          "rowId": "row-004",
          "sourceText": "IT6126 Hệ thống cơ sở dữ liệu 4",
          "courseCode": "IT6126",
          "courseName": "Hệ thống cơ sở dữ liệu",
          "documentCourseName": "Hệ thống cơ sở dữ liệu",
          "credits": 4,
          "semesterCode": "2026_1",
          "score10": null,
          "letterGrade": null,
          "included": true,
          "confidence": null,
          "issues": [
            {
              "code": "MISSING_GRADE",
              "blocking": false,
              "message": "Chưa có điểm; học phần được ghi nhận là đang học."
            }
          ]
        }
      ],
      "documentSummary": {
        "studentIdOnDocument": "2024604757",
        "fullNameOnDocument": "Lê Việt Hùng",
        "reportedCpa": 3.18,
        "reportedAccumulatedCredits": 61
      },
      "warnings": [
        "CPA và số tín chỉ in trên tài liệu chỉ để đối chiếu; CPA chính thức do hệ thống tính từ bảng điểm sau khi bạn xác nhận."
      ],
      "blockingIssueCount": 1,
      "createdAt": "2026-10-14T02:10:00Z",
      "updatedAt": "2026-10-14T02:10:00Z",
      "expiresAt": "2026-10-15T02:10:00Z",
      "confirmedAt": null
    },
    "consumers": [
      "TV2",
      "TV3"
    ]
  },
  "transcript-import-upload-too-large": {
    "operationId": "uploadTranscript",
    "method": "POST",
    "path": "/academic/transcript/imports",
    "httpStatus": 413,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "ApiErrorResponse",
    "response": {
      "code": "UPLOAD_TOO_LARGE",
      "message": "File vượt giới hạn 5 MB hoặc 10 trang.",
      "requestId": "req-2026-10-14-0006",
      "timestamp": "2026-10-14T02:14:00Z",
      "details": []
    },
    "consumers": [
      "TV2"
    ]
  },
  "transcript-import-upload-unsupported": {
    "operationId": "uploadTranscript",
    "method": "POST",
    "path": "/academic/transcript/imports",
    "httpStatus": 415,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "ApiErrorResponse",
    "response": {
      "code": "UNSUPPORTED_FILE_TYPE",
      "message": "Chỉ nhận PDF, PNG hoặc JPEG. Hãy tải lại file hoặc nhập tay từng học phần.",
      "requestId": "req-2026-10-14-0007",
      "timestamp": "2026-10-14T02:15:00Z",
      "details": []
    },
    "consumers": [
      "TV2"
    ]
  },
  "transcript-import-upload-limit": {
    "operationId": "uploadTranscript",
    "method": "POST",
    "path": "/academic/transcript/imports",
    "httpStatus": 429,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "ApiErrorResponse",
    "response": {
      "code": "IMPORT_LIMIT_REACHED",
      "message": "Bạn đang có 3 phiên nhập chờ xem lại. Hãy xác nhận hoặc hủy bớt trước khi tải file mới.",
      "requestId": "req-2026-10-14-0008",
      "timestamp": "2026-10-14T02:16:00Z",
      "details": []
    },
    "consumers": [
      "TV2"
    ]
  },
  "transcript-import-manual": {
    "operationId": "startManualTranscriptImport",
    "method": "POST",
    "path": "/academic/transcript/imports/manual",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "TranscriptImportResponse",
    "response": {
      "importSessionId": "imp-2024604757-20261014-02",
      "status": "MANUAL_ENTRY_REQUIRED",
      "sourceType": "MANUAL",
      "fileName": null,
      "fileSizeBytes": null,
      "pageCount": null,
      "sessionVersion": 1,
      "rows": [],
      "documentSummary": null,
      "warnings": [
        "Nhập từng học phần đã học, sau đó xem lại và xác nhận."
      ],
      "blockingIssueCount": 0,
      "createdAt": "2026-10-14T02:20:00Z",
      "updatedAt": "2026-10-14T02:20:00Z",
      "expiresAt": "2026-10-15T02:20:00Z",
      "confirmedAt": null
    },
    "consumers": [
      "TV2"
    ]
  },
  "transcript-import-get": {
    "operationId": "getTranscriptImport",
    "method": "GET",
    "path": "/academic/transcript/imports/{importSessionId}",
    "httpStatus": 200,
    "pathParams": {
      "importSessionId": "imp-2024604757-20261014-01"
    },
    "requestSchema": null,
    "request": null,
    "responseSchema": "TranscriptImportResponse",
    "response": {
      "importSessionId": "imp-2024604757-20261014-01",
      "status": "REVIEW_REQUIRED",
      "sourceType": "PDF_TEXT",
      "fileName": "BangDiem_2024604757.pdf",
      "fileSizeBytes": 48213,
      "pageCount": 2,
      "sessionVersion": 1,
      "rows": [
        {
          "rowId": "row-001",
          "sourceText": "IT6015 Ky thuat lap trinh 3 9.3 A",
          "courseCode": "IT6015",
          "courseName": "Kỹ thuật lập trình",
          "documentCourseName": "Ky thuat lap trinh",
          "credits": 3,
          "semesterCode": "2024_1",
          "score10": 9.3,
          "letterGrade": "A",
          "included": true,
          "confidence": null,
          "issues": [
            {
              "code": "COURSE_NAME_DIFFERS",
              "blocking": false,
              "message": "Tên trên tài liệu \"Ky thuat lap trinh\" khác tên trong CTĐT \"Kỹ thuật lập trình\"; khi xác nhận sẽ dùng tên CTĐT."
            }
          ]
        },
        {
          "rowId": "row-002",
          "sourceText": "IT6002 Cấu trúc dữ liệu và giải thuật 3 6.8 C+",
          "courseCode": "IT6002",
          "courseName": "Cấu trúc dữ liệu và giải thuật",
          "documentCourseName": "Cấu trúc dữ liệu và giải thuật",
          "credits": 3,
          "semesterCode": "2025_1",
          "score10": 6.8,
          "letterGrade": "C+",
          "included": true,
          "confidence": null,
          "issues": []
        },
        {
          "rowId": "row-003",
          "sourceText": "IT6O35 Toán rời rạc 3 6.6 C+",
          "courseCode": "IT6O35",
          "courseName": null,
          "documentCourseName": "Toán rời rạc",
          "credits": null,
          "semesterCode": "2024_2",
          "score10": 6.6,
          "letterGrade": "C+",
          "included": true,
          "confidence": null,
          "issues": [
            {
              "code": "UNKNOWN_COURSE_CODE",
              "blocking": true,
              "message": "Mã IT6O35 không có trong CTĐT. Sửa mã học phần hoặc bỏ chọn dòng."
            }
          ]
        },
        {
          "rowId": "row-004",
          "sourceText": "IT6126 Hệ thống cơ sở dữ liệu 4",
          "courseCode": "IT6126",
          "courseName": "Hệ thống cơ sở dữ liệu",
          "documentCourseName": "Hệ thống cơ sở dữ liệu",
          "credits": 4,
          "semesterCode": "2026_1",
          "score10": null,
          "letterGrade": null,
          "included": true,
          "confidence": null,
          "issues": [
            {
              "code": "MISSING_GRADE",
              "blocking": false,
              "message": "Chưa có điểm; học phần được ghi nhận là đang học."
            }
          ]
        }
      ],
      "documentSummary": {
        "studentIdOnDocument": "2024604757",
        "fullNameOnDocument": "Lê Việt Hùng",
        "reportedCpa": 3.18,
        "reportedAccumulatedCredits": 61
      },
      "warnings": [
        "CPA và số tín chỉ in trên tài liệu chỉ để đối chiếu; CPA chính thức do hệ thống tính từ bảng điểm sau khi bạn xác nhận."
      ],
      "blockingIssueCount": 1,
      "createdAt": "2026-10-14T02:10:00Z",
      "updatedAt": "2026-10-14T02:10:00Z",
      "expiresAt": "2026-10-15T02:10:00Z",
      "confirmedAt": null
    },
    "consumers": [
      "TV2"
    ]
  },
  "transcript-import-rows": {
    "operationId": "updateTranscriptImportRows",
    "method": "PUT",
    "path": "/academic/transcript/imports/{importSessionId}/rows",
    "httpStatus": 200,
    "pathParams": {
      "importSessionId": "imp-2024604757-20261014-01"
    },
    "requestSchema": "UpdateImportRowsRequest",
    "request": {
      "sessionVersion": 1,
      "rows": [
        {
          "rowId": "row-001",
          "sourceText": null,
          "courseCode": "IT6015",
          "courseName": null,
          "documentCourseName": null,
          "credits": null,
          "semesterCode": "2024_1",
          "score10": 9.3,
          "letterGrade": "A",
          "included": true,
          "confidence": null,
          "issues": []
        },
        {
          "rowId": "row-002",
          "sourceText": null,
          "courseCode": "IT6002",
          "courseName": null,
          "documentCourseName": null,
          "credits": null,
          "semesterCode": "2025_1",
          "score10": 6.8,
          "letterGrade": "C+",
          "included": true,
          "confidence": null,
          "issues": []
        },
        {
          "rowId": "row-003",
          "sourceText": null,
          "courseCode": "IT6035",
          "courseName": null,
          "documentCourseName": null,
          "credits": null,
          "semesterCode": "2024_2",
          "score10": 6.6,
          "letterGrade": "C+",
          "included": true,
          "confidence": null,
          "issues": []
        },
        {
          "rowId": "row-004",
          "sourceText": null,
          "courseCode": "IT6126",
          "courseName": null,
          "documentCourseName": null,
          "credits": null,
          "semesterCode": "2026_1",
          "score10": null,
          "letterGrade": null,
          "included": true,
          "confidence": null,
          "issues": []
        }
      ]
    },
    "responseSchema": "TranscriptImportResponse",
    "response": {
      "importSessionId": "imp-2024604757-20261014-01",
      "status": "REVIEW_REQUIRED",
      "sourceType": "PDF_TEXT",
      "fileName": "BangDiem_2024604757.pdf",
      "fileSizeBytes": 48213,
      "pageCount": 2,
      "sessionVersion": 2,
      "rows": [
        {
          "rowId": "row-001",
          "sourceText": "IT6015 Ky thuat lap trinh 3 9.3 A",
          "courseCode": "IT6015",
          "courseName": "Kỹ thuật lập trình",
          "documentCourseName": "Ky thuat lap trinh",
          "credits": 3,
          "semesterCode": "2024_1",
          "score10": 9.3,
          "letterGrade": "A",
          "included": true,
          "confidence": null,
          "issues": [
            {
              "code": "COURSE_NAME_DIFFERS",
              "blocking": false,
              "message": "Tên trên tài liệu \"Ky thuat lap trinh\" khác tên trong CTĐT \"Kỹ thuật lập trình\"; khi xác nhận sẽ dùng tên CTĐT."
            }
          ]
        },
        {
          "rowId": "row-002",
          "sourceText": "IT6002 Cấu trúc dữ liệu và giải thuật 3 6.8 C+",
          "courseCode": "IT6002",
          "courseName": "Cấu trúc dữ liệu và giải thuật",
          "documentCourseName": "Cấu trúc dữ liệu và giải thuật",
          "credits": 3,
          "semesterCode": "2025_1",
          "score10": 6.8,
          "letterGrade": "C+",
          "included": true,
          "confidence": null,
          "issues": []
        },
        {
          "rowId": "row-003",
          "sourceText": "IT6O35 Toán rời rạc 3 6.6 C+",
          "courseCode": "IT6035",
          "courseName": "Toán rời rạc",
          "documentCourseName": "Toán rời rạc",
          "credits": 3,
          "semesterCode": "2024_2",
          "score10": 6.6,
          "letterGrade": "C+",
          "included": true,
          "confidence": null,
          "issues": []
        },
        {
          "rowId": "row-004",
          "sourceText": "IT6126 Hệ thống cơ sở dữ liệu 4",
          "courseCode": "IT6126",
          "courseName": "Hệ thống cơ sở dữ liệu",
          "documentCourseName": "Hệ thống cơ sở dữ liệu",
          "credits": 4,
          "semesterCode": "2026_1",
          "score10": null,
          "letterGrade": null,
          "included": true,
          "confidence": null,
          "issues": [
            {
              "code": "MISSING_GRADE",
              "blocking": false,
              "message": "Chưa có điểm; học phần được ghi nhận là đang học."
            }
          ]
        }
      ],
      "documentSummary": {
        "studentIdOnDocument": "2024604757",
        "fullNameOnDocument": "Lê Việt Hùng",
        "reportedCpa": 3.18,
        "reportedAccumulatedCredits": 61
      },
      "warnings": [
        "CPA và số tín chỉ in trên tài liệu chỉ để đối chiếu; CPA chính thức do hệ thống tính từ bảng điểm sau khi bạn xác nhận."
      ],
      "blockingIssueCount": 0,
      "createdAt": "2026-10-14T02:10:00Z",
      "updatedAt": "2026-10-14T02:15:00Z",
      "expiresAt": "2026-10-15T02:10:00Z",
      "confirmedAt": null
    },
    "consumers": [
      "TV2"
    ]
  },
  "transcript-import-confirm": {
    "operationId": "confirmTranscriptImport",
    "method": "POST",
    "path": "/academic/transcript/imports/{importSessionId}/confirm",
    "httpStatus": 200,
    "pathParams": {
      "importSessionId": "imp-2024604757-20261014-01"
    },
    "requestSchema": "ConfirmTranscriptImportRequest",
    "request": {
      "sessionVersion": 2,
      "dataRevision": "REV-2024604757-001"
    },
    "responseSchema": "TranscriptResponse",
    "response": {
      "studentId": "2024604757",
      "transcriptStatus": "CONFIRMED",
      "sourceType": "PDF_TEXT",
      "importSessionId": "imp-2024604757-20261014-01",
      "confirmedAt": "2026-10-14T02:16:00Z",
      "dataRevision": "REV-2024604757-002",
      "attempts": [
        {
          "courseCode": "IT6015",
          "courseName": "Kỹ thuật lập trình",
          "credits": 3,
          "semesterCode": "2024_1",
          "attemptNumber": 1,
          "score10": 9.3,
          "letterGrade": "A"
        },
        {
          "courseCode": "IT6035",
          "courseName": "Toán rời rạc",
          "credits": 3,
          "semesterCode": "2024_2",
          "attemptNumber": 1,
          "score10": 6.6,
          "letterGrade": "C+"
        },
        {
          "courseCode": "IT6002",
          "courseName": "Cấu trúc dữ liệu và giải thuật",
          "credits": 3,
          "semesterCode": "2025_1",
          "attemptNumber": 1,
          "score10": 6.8,
          "letterGrade": "C+"
        },
        {
          "courseCode": "IT6126",
          "courseName": "Hệ thống cơ sở dữ liệu",
          "credits": 4,
          "semesterCode": "2026_1",
          "attemptNumber": 1,
          "score10": null,
          "letterGrade": null
        }
      ]
    },
    "consumers": [
      "TV2"
    ]
  },
  "transcript-import-confirm-blocked": {
    "operationId": "confirmTranscriptImport",
    "method": "POST",
    "path": "/academic/transcript/imports/{importSessionId}/confirm",
    "httpStatus": 422,
    "pathParams": {
      "importSessionId": "imp-2024604757-20261014-01"
    },
    "requestSchema": null,
    "request": null,
    "responseSchema": "ApiErrorResponse",
    "response": {
      "code": "IMPORT_HAS_BLOCKING_ISSUES",
      "message": "Còn dòng cần sửa trước khi xác nhận bảng điểm.",
      "requestId": "req-2026-10-14-0005",
      "timestamp": "2026-10-14T02:13:00Z",
      "details": [
        "row-003: Mã IT6O35 không có trong CTĐT. Sửa mã học phần hoặc bỏ chọn dòng."
      ]
    },
    "consumers": [
      "TV2"
    ]
  },
  "transcript-import-cancel": {
    "operationId": "cancelTranscriptImport",
    "method": "POST",
    "path": "/academic/transcript/imports/{importSessionId}/cancel",
    "httpStatus": 200,
    "pathParams": {
      "importSessionId": "imp-2024604757-20261014-01"
    },
    "requestSchema": null,
    "request": null,
    "responseSchema": "TranscriptImportResponse",
    "response": {
      "importSessionId": "imp-2024604757-20261014-01",
      "status": "CANCELLED",
      "sourceType": "PDF_TEXT",
      "fileName": "BangDiem_2024604757.pdf",
      "fileSizeBytes": 48213,
      "pageCount": 2,
      "sessionVersion": 1,
      "rows": [
        {
          "rowId": "row-001",
          "sourceText": "IT6015 Ky thuat lap trinh 3 9.3 A",
          "courseCode": "IT6015",
          "courseName": "Kỹ thuật lập trình",
          "documentCourseName": "Ky thuat lap trinh",
          "credits": 3,
          "semesterCode": "2024_1",
          "score10": 9.3,
          "letterGrade": "A",
          "included": true,
          "confidence": null,
          "issues": [
            {
              "code": "COURSE_NAME_DIFFERS",
              "blocking": false,
              "message": "Tên trên tài liệu \"Ky thuat lap trinh\" khác tên trong CTĐT \"Kỹ thuật lập trình\"; khi xác nhận sẽ dùng tên CTĐT."
            }
          ]
        },
        {
          "rowId": "row-002",
          "sourceText": "IT6002 Cấu trúc dữ liệu và giải thuật 3 6.8 C+",
          "courseCode": "IT6002",
          "courseName": "Cấu trúc dữ liệu và giải thuật",
          "documentCourseName": "Cấu trúc dữ liệu và giải thuật",
          "credits": 3,
          "semesterCode": "2025_1",
          "score10": 6.8,
          "letterGrade": "C+",
          "included": true,
          "confidence": null,
          "issues": []
        },
        {
          "rowId": "row-003",
          "sourceText": "IT6O35 Toán rời rạc 3 6.6 C+",
          "courseCode": "IT6O35",
          "courseName": null,
          "documentCourseName": "Toán rời rạc",
          "credits": null,
          "semesterCode": "2024_2",
          "score10": 6.6,
          "letterGrade": "C+",
          "included": true,
          "confidence": null,
          "issues": [
            {
              "code": "UNKNOWN_COURSE_CODE",
              "blocking": true,
              "message": "Mã IT6O35 không có trong CTĐT. Sửa mã học phần hoặc bỏ chọn dòng."
            }
          ]
        },
        {
          "rowId": "row-004",
          "sourceText": "IT6126 Hệ thống cơ sở dữ liệu 4",
          "courseCode": "IT6126",
          "courseName": "Hệ thống cơ sở dữ liệu",
          "documentCourseName": "Hệ thống cơ sở dữ liệu",
          "credits": 4,
          "semesterCode": "2026_1",
          "score10": null,
          "letterGrade": null,
          "included": true,
          "confidence": null,
          "issues": [
            {
              "code": "MISSING_GRADE",
              "blocking": false,
              "message": "Chưa có điểm; học phần được ghi nhận là đang học."
            }
          ]
        }
      ],
      "documentSummary": {
        "studentIdOnDocument": "2024604757",
        "fullNameOnDocument": "Lê Việt Hùng",
        "reportedCpa": 3.18,
        "reportedAccumulatedCredits": 61
      },
      "warnings": [
        "CPA và số tín chỉ in trên tài liệu chỉ để đối chiếu; CPA chính thức do hệ thống tính từ bảng điểm sau khi bạn xác nhận."
      ],
      "blockingIssueCount": 1,
      "createdAt": "2026-10-14T02:10:00Z",
      "updatedAt": "2026-10-14T02:12:00Z",
      "expiresAt": "2026-10-15T02:10:00Z",
      "confirmedAt": null
    },
    "consumers": [
      "TV2"
    ]
  },
  "certificates": {
    "operationId": "listCertificates",
    "method": "GET",
    "path": "/academic/certificates",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "CertificateListResponse",
    "response": {
      "certificates": [
        {
          "requirementCode": "FOREIGN_LANGUAGE",
          "category": "NGOẠI NGỮ",
          "name": "Chuẩn đầu ra Ngoại ngữ (TOEIC 550)",
          "status": "ACHIEVED",
          "verification": "DEMO_SEED",
          "evidenceNote": "Đã hoàn thành chuẩn đầu ra ngoại ngữ TOEIC",
          "achievedOn": null,
          "updatedAt": "2026-10-01T08:00:00Z"
        },
        {
          "requirementCode": "IT_SKILLS",
          "category": "TIN HỌC",
          "name": "Chuẩn đầu ra Tin học (MOS/IC3)",
          "status": "NOT_ACHIEVED",
          "verification": "DEMO_SEED",
          "evidenceNote": "Chưa nộp chứng chỉ kỹ năng CNTT",
          "achievedOn": null,
          "updatedAt": "2026-10-01T08:00:00Z"
        },
        {
          "requirementCode": "DEFENSE_EDUCATION",
          "category": "GDQP_AN",
          "name": "Chứng chỉ Giáo dục Quốc phòng - An ninh",
          "status": "ACHIEVED",
          "verification": "DEMO_SEED",
          "evidenceNote": "Đã tích lũy đủ 4 học phần GDQP-AN",
          "achievedOn": null,
          "updatedAt": "2026-10-01T08:00:00Z"
        },
        {
          "requirementCode": "PHYSICAL_EDUCATION",
          "category": "GDTC",
          "name": "Chứng chỉ Giáo dục Thể chất",
          "status": "ACHIEVED",
          "verification": "DEMO_SEED",
          "evidenceNote": "Đã hoàn thành các học phần thể chất",
          "achievedOn": null,
          "updatedAt": "2026-10-01T08:00:00Z"
        }
      ]
    },
    "consumers": [
      "TV2",
      "TV3"
    ]
  },
  "certificate-declare": {
    "operationId": "declareCertificate",
    "method": "PUT",
    "path": "/academic/certificates/{requirementCode}",
    "httpStatus": 200,
    "pathParams": {
      "requirementCode": "IT_SKILLS"
    },
    "requestSchema": "DeclareCertificateRequest",
    "request": {
      "status": "ACHIEVED",
      "evidenceNote": "Đạt MOS Word, Excel, PowerPoint (thi tháng 9/2026)",
      "achievedOn": "2026-09-20",
      "dataRevision": "REV-2024604757-001"
    },
    "responseSchema": "CertificateStatusItem",
    "response": {
      "requirementCode": "IT_SKILLS",
      "category": "TIN HỌC",
      "name": "Chuẩn đầu ra Tin học (MOS/IC3)",
      "status": "ACHIEVED",
      "verification": "SELF_DECLARED",
      "evidenceNote": "Đạt MOS Word, Excel, PowerPoint (thi tháng 9/2026)",
      "achievedOn": "2026-09-20",
      "updatedAt": "2026-10-14T02:30:00Z"
    },
    "consumers": [
      "TV2",
      "TV3"
    ]
  },
  "certificate-declare-not-found": {
    "operationId": "declareCertificate",
    "method": "PUT",
    "path": "/academic/certificates/{requirementCode}",
    "httpStatus": 404,
    "pathParams": {
      "requirementCode": "TOEIC_900"
    },
    "requestSchema": null,
    "request": null,
    "responseSchema": "ApiErrorResponse",
    "response": {
      "code": "REQUIREMENT_NOT_FOUND",
      "message": "Không có chuẩn đầu ra với mã này.",
      "requestId": "req-2026-10-14-0009",
      "timestamp": "2026-10-14T02:31:00Z",
      "details": [
        "requirementCode: TOEIC_900"
      ]
    },
    "consumers": [
      "TV2"
    ]
  },
  "academic-status": {
    "operationId": "getAcademicStatus",
    "method": "GET",
    "path": "/academic/status",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": "AcademicStatusRequest",
    "request": {
      "studentId": "2024604757",
      "dataRevision": "REV-2024604757-001"
    },
    "responseSchema": "AcademicStatusResponse",
    "response": {
      "studentId": "2024604757",
      "gpa": 3.42,
      "cpa": 3.18,
      "accumulatedCredits": 61,
      "totalCreditsRequired": 150,
      "riskLevel": "NORMAL",
      "warnings": [
        "Còn nợ học phần LP6004 - Tư tưởng Hồ Chí Minh (điểm F), cần đăng ký học lại"
      ],
      "dataRevision": "REV-2024604757-001"
    },
    "consumers": [
      "TV2",
      "TV3",
      "TV1",
      "TV4"
    ]
  },
  "academic-status-missing-data": {
    "operationId": "getAcademicStatus",
    "method": "GET",
    "path": "/academic/status",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": "AcademicStatusRequest",
    "request": {
      "studentId": "std-missing-unknown-v1",
      "dataRevision": "REV-std-missing-unknown-v1-001"
    },
    "responseSchema": "AcademicStatusResponse",
    "response": {
      "studentId": "std-missing-unknown-v1",
      "gpa": null,
      "cpa": null,
      "accumulatedCredits": null,
      "totalCreditsRequired": 150,
      "riskLevel": null,
      "warnings": [
        "Chưa có bảng điểm đã xác nhận: GPA/CPA/tín chỉ tích lũy chưa xác định (UNKNOWN)"
      ],
      "dataRevision": "REV-std-missing-unknown-v1-001"
    },
    "consumers": [
      "TV2",
      "TV3",
      "TV4"
    ]
  },
  "course-eligibility": {
    "operationId": "checkCourseEligibility",
    "method": "POST",
    "path": "/academic/eligibility",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": "CourseEligibilityRequest",
    "request": {
      "studentId": "2024604757",
      "courseCode": "IT6083",
      "targetSemester": "2026_1",
      "dataRevision": "REV-2024604757-001"
    },
    "responseSchema": "CourseEligibilityResponse",
    "response": {
      "courseCode": "IT6083",
      "eligible": false,
      "missingPrerequisites": [
        "IT6203 (chưa đăng ký học phần học trước)"
      ],
      "warnings": [],
      "dataRevision": "REV-2024604757-001"
    },
    "consumers": [
      "TV2",
      "TV1",
      "TV4"
    ]
  },
  "generate-study-plan": {
    "operationId": "generateStudyPlan",
    "method": "POST",
    "path": "/planner/generate",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": "GenerateStudyPlanRequest",
    "request": {
      "studentId": "2024604757",
      "targetGraduationSemester": "2028_1",
      "targetCpa": 3.4,
      "maxCreditsPerSemester": 20,
      "includeSummerSemesters": false,
      "selectedRetakeCourseCodes": [
        "LP6010"
      ],
      "dataRevision": "REV-2024604757-001"
    },
    "responseSchema": "GenerateStudyPlanResponse",
    "response": {
      "proposalId": "proposal-2024604757-20261013-01",
      "studentId": "2024604757",
      "planName": "Đề xuất lộ trình KTPM K19 - mục tiêu CPA 3.40",
      "status": "DRAFT",
      "targetCpa": 3.4,
      "totalCredits": 28,
      "projectedCpa": 3.26,
      "semesters": [
        {
          "semesterOrder": 1,
          "semesterCode": "2026_1",
          "semesterName": "Học kỳ 1 năm học 2026-2027",
          "courses": [
            {
              "courseCode": "LP6004",
              "courseName": "Tư tưởng Hồ Chí Minh",
              "credits": 2,
              "targetGrade": "B",
              "rationale": "Học lại môn điểm F để giải tỏa nợ học phần",
              "courseType": "RETAKE",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6039",
              "courseName": "Thiết kế Web",
              "credits": 3,
              "targetGrade": "A",
              "rationale": "Học kỳ gợi ý 4 trong CTĐT",
              "courseType": "STANDARD",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6044",
              "courseName": "Ứng dụng thuật toán",
              "credits": 3,
              "targetGrade": "B+",
              "rationale": "Đã học IT6002 và IT6015 (học phần học trước)",
              "courseType": "STANDARD",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6096",
              "courseName": "Thiết kế phần mềm",
              "credits": 3,
              "targetGrade": "A",
              "rationale": "Đã học IT6097 (học phần học trước)",
              "courseType": "STANDARD",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6095",
              "courseName": "Tối ưu hóa",
              "credits": 3,
              "targetGrade": "B+",
              "rationale": "Học kỳ gợi ý 5 trong CTĐT",
              "courseType": "STANDARD",
              "status": "PLANNED"
            }
          ],
          "totalCredits": 14,
          "expectedGpa": 3.45
        },
        {
          "semesterOrder": 2,
          "semesterCode": "2026_2",
          "semesterName": "Học kỳ 2 năm học 2026-2027",
          "courses": [
            {
              "courseCode": "LP6010",
              "courseName": "Triết học Mác-Lênin",
              "credits": 3,
              "targetGrade": "B+",
              "rationale": "Học cải thiện từ D+ lên B+, hiệu quả CPA cao nhất",
              "courseType": "IMPROVEMENT",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6151",
              "courseName": "Phát triển phần mềm hướng dịch vụ",
              "credits": 3,
              "targetGrade": "A",
              "rationale": "Đã học IT6019 (học phần học trước)",
              "courseType": "STANDARD",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6084",
              "courseName": "Kiểm thử phần mềm",
              "credits": 3,
              "targetGrade": "B+",
              "rationale": "Đã học IT6002 và IT6082 (học phần học trước)",
              "courseType": "STANDARD",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6020",
              "courseName": "Lập trình Java nâng cao",
              "credits": 3,
              "targetGrade": "A",
              "rationale": "Đã học IT6019 và IT6120 (học phần học trước)",
              "courseType": "STANDARD",
              "status": "PLANNED"
            },
            {
              "courseCode": "LP6013",
              "courseName": "Lịch sử Đảng Cộng sản Việt Nam",
              "credits": 2,
              "targetGrade": "B",
              "rationale": "Đã học LP6011 (học phần học trước)",
              "courseType": "STANDARD",
              "status": "PLANNED"
            }
          ],
          "totalCredits": 14,
          "expectedGpa": 3.5
        }
      ],
      "actions": [
        {
          "actionType": "RETAKE_IMPROVEMENT",
          "label": "Xem tác động học cải thiện",
          "targetRoute": "/what-if",
          "payloadJson": "{\"courseCode\":\"LP6010\"}",
          "description": "Học cải thiện Triết học Mác-Lênin từ D+ lên B+ giúp CPA tăng khoảng 0.08",
          "priority": 1
        }
      ],
      "warnings": [
        "Lộ trình dựa trên quy chế demo (DEMO_UNVERIFIED), cần đối chiếu thông báo mở lớp chính thức"
      ],
      "dataRevision": "REV-2024604757-001"
    },
    "consumers": [
      "TV3",
      "TV1",
      "TV4"
    ]
  },
  "validate-study-plan": {
    "operationId": "validateStudyPlan",
    "method": "POST",
    "path": "/planner/validate",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": "ValidateStudyPlanRequest",
    "request": {
      "planId": null,
      "studentId": "2024604757",
      "semesters": [
        {
          "semesterOrder": 1,
          "semesterCode": "2026_1",
          "semesterName": "Học kỳ 1 năm học 2026-2027",
          "courses": [
            {
              "courseCode": "LP6004",
              "courseName": "Tư tưởng Hồ Chí Minh",
              "credits": 2,
              "targetGrade": "B",
              "rationale": "Học lại môn điểm F",
              "courseType": "RETAKE",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6039",
              "courseName": "Thiết kế Web",
              "credits": 3,
              "targetGrade": "A",
              "rationale": "Học kỳ gợi ý 4 trong CTĐT",
              "courseType": "STANDARD",
              "status": "PLANNED"
            }
          ],
          "totalCredits": 5,
          "expectedGpa": 3.2
        }
      ],
      "planVersion": null,
      "dataRevision": "REV-2024604757-001"
    },
    "responseSchema": "ValidateStudyPlanResponse",
    "response": {
      "valid": false,
      "status": "DRAFT",
      "violations": [
        "Học kỳ 2026_1 có 5 TC, thấp hơn mức tối thiểu 10 TC của học kỳ chính"
      ],
      "warnings": [
        "Cần điều chỉnh số lượng tín chỉ theo đúng quy chế đào tạo"
      ],
      "planVersion": null,
      "dataRevision": "REV-2024604757-001",
      "validationMode": "REAL",
      "policyVersion": "policy-haui-demo-2026@0.0.1-v0"
    },
    "consumers": [
      "TV3",
      "TV1",
      "TV4"
    ]
  },
  "list-study-plans": {
    "operationId": "listStudyPlans",
    "method": "GET",
    "path": "/planner/plans",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "StudyPlanListResponse",
    "response": {
      "plans": [
        {
          "planId": "plan-2024604757-0003",
          "planName": "Kế hoạch KTPM K19 - thêm môn cải thiện",
          "planVersion": 1,
          "status": "DRAFT",
          "sourcePlanId": "plan-2024604757-0002",
          "totalCredits": 28,
          "projectedCpa": 3.26,
          "updatedAt": "2026-10-12T09:15:00Z"
        },
        {
          "planId": "plan-2024604757-0002",
          "planName": "Kế hoạch KTPM K19 - mục tiêu CPA 3.20",
          "planVersion": 2,
          "status": "ACTIVE",
          "sourcePlanId": null,
          "totalCredits": 14,
          "projectedCpa": 3.21,
          "updatedAt": "2026-09-20T02:00:00Z"
        },
        {
          "planId": "plan-2024604757-0001",
          "planName": "Kế hoạch KTPM K19 - bản đầu",
          "planVersion": 3,
          "status": "ARCHIVED",
          "sourcePlanId": null,
          "totalCredits": 14,
          "projectedCpa": 3.15,
          "updatedAt": "2026-08-30T03:30:00Z"
        }
      ]
    },
    "consumers": [
      "TV3"
    ]
  },
  "save-study-plan": {
    "operationId": "saveStudyPlan",
    "method": "POST",
    "path": "/planner/plans",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": "SaveStudyPlanRequest",
    "request": {
      "planId": "plan-2024604757-0003",
      "planName": "Kế hoạch KTPM K19 - thêm môn cải thiện",
      "planVersion": 1,
      "dataRevision": "REV-2024604757-001",
      "targetCpa": 3.4,
      "targetGraduationSemester": "2028_1",
      "maxCreditsPerSemester": 20,
      "semesters": [
        {
          "semesterOrder": 1,
          "semesterCode": "2026_1",
          "semesterName": "Học kỳ 1 năm học 2026-2027",
          "courses": [
            {
              "courseCode": "LP6004",
              "courseName": "Tư tưởng Hồ Chí Minh",
              "credits": 2,
              "targetGrade": "B",
              "rationale": "Học lại môn điểm F để giải tỏa nợ học phần",
              "courseType": "RETAKE",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6039",
              "courseName": "Thiết kế Web",
              "credits": 3,
              "targetGrade": "A",
              "rationale": "Học kỳ gợi ý 4 trong CTĐT",
              "courseType": "STANDARD",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6044",
              "courseName": "Ứng dụng thuật toán",
              "credits": 3,
              "targetGrade": "B+",
              "rationale": "Đã học IT6002 và IT6015 (học phần học trước)",
              "courseType": "STANDARD",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6096",
              "courseName": "Thiết kế phần mềm",
              "credits": 3,
              "targetGrade": "A",
              "rationale": "Đã học IT6097 (học phần học trước)",
              "courseType": "STANDARD",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6095",
              "courseName": "Tối ưu hóa",
              "credits": 3,
              "targetGrade": "B+",
              "rationale": "Học kỳ gợi ý 5 trong CTĐT",
              "courseType": "STANDARD",
              "status": "PLANNED"
            }
          ],
          "totalCredits": 14,
          "expectedGpa": 3.45
        },
        {
          "semesterOrder": 2,
          "semesterCode": "2026_2",
          "semesterName": "Học kỳ 2 năm học 2026-2027",
          "courses": [
            {
              "courseCode": "LP6010",
              "courseName": "Triết học Mác-Lênin",
              "credits": 3,
              "targetGrade": "B+",
              "rationale": "Học cải thiện từ D+ lên B+, hiệu quả CPA cao nhất",
              "courseType": "IMPROVEMENT",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6151",
              "courseName": "Phát triển phần mềm hướng dịch vụ",
              "credits": 3,
              "targetGrade": "A",
              "rationale": "Đã học IT6019 (học phần học trước)",
              "courseType": "STANDARD",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6084",
              "courseName": "Kiểm thử phần mềm",
              "credits": 3,
              "targetGrade": "B+",
              "rationale": "Đã học IT6002 và IT6082 (học phần học trước)",
              "courseType": "STANDARD",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6020",
              "courseName": "Lập trình Java nâng cao",
              "credits": 3,
              "targetGrade": "A",
              "rationale": "Đã học IT6019 và IT6120 (học phần học trước)",
              "courseType": "STANDARD",
              "status": "PLANNED"
            },
            {
              "courseCode": "LP6013",
              "courseName": "Lịch sử Đảng Cộng sản Việt Nam",
              "credits": 2,
              "targetGrade": "B",
              "rationale": "Đã học LP6011 (học phần học trước)",
              "courseType": "STANDARD",
              "status": "PLANNED"
            }
          ],
          "totalCredits": 14,
          "expectedGpa": 3.5
        }
      ],
      "actions": [
        {
          "actionType": "RETAKE_IMPROVEMENT",
          "label": "Xem tác động học cải thiện",
          "targetRoute": "/what-if",
          "payloadJson": "{\"courseCode\":\"LP6010\"}",
          "description": "Học cải thiện Triết học Mác-Lênin từ D+ lên B+ giúp CPA tăng khoảng 0.08",
          "priority": 1
        },
        {
          "actionType": "CERTIFICATE",
          "label": "Xem điều kiện tốt nghiệp",
          "targetRoute": "/audit",
          "payloadJson": "{\"certificateType\":\"MOS\"}",
          "description": "Đăng ký thi và nộp chứng chỉ MOS trước đợt xét tốt nghiệp",
          "priority": 2
        }
      ]
    },
    "responseSchema": "SaveStudyPlanResponse",
    "response": {
      "planId": "plan-2024604757-0003",
      "planName": "Kế hoạch KTPM K19 - thêm môn cải thiện",
      "status": "DRAFT",
      "planVersion": 2,
      "sourcePlanId": "plan-2024604757-0002",
      "dataRevision": "REV-2024604757-001",
      "updatedAt": "2026-10-13T08:00:00Z",
      "message": "Đã lưu nháp. Kế hoạch đang theo dõi không thay đổi."
    },
    "consumers": [
      "TV3"
    ]
  },
  "get-study-plan": {
    "operationId": "getStudyPlan",
    "method": "GET",
    "path": "/planner/plans/{planId}",
    "httpStatus": 200,
    "pathParams": {
      "planId": "plan-2024604757-0002"
    },
    "requestSchema": null,
    "request": null,
    "responseSchema": "StudyPlanDetailResponse",
    "response": {
      "planId": "plan-2024604757-0002",
      "studentId": "2024604757",
      "planName": "Kế hoạch KTPM K19 - mục tiêu CPA 3.20",
      "status": "ACTIVE",
      "planVersion": 2,
      "sourcePlanId": null,
      "dataRevision": "REV-2024604757-001",
      "targetCpa": 3.2,
      "targetGraduationSemester": "2028_1",
      "maxCreditsPerSemester": 20,
      "totalCredits": 14,
      "projectedCpa": 3.21,
      "semesters": [
        {
          "semesterOrder": 1,
          "semesterCode": "2026_1",
          "semesterName": "Học kỳ 1 năm học 2026-2027",
          "courses": [
            {
              "courseCode": "LP6004",
              "courseName": "Tư tưởng Hồ Chí Minh",
              "credits": 2,
              "targetGrade": "B",
              "rationale": "Học lại môn điểm F để giải tỏa nợ học phần",
              "courseType": "RETAKE",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6039",
              "courseName": "Thiết kế Web",
              "credits": 3,
              "targetGrade": "A",
              "rationale": "Học kỳ gợi ý 4 trong CTĐT",
              "courseType": "STANDARD",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6044",
              "courseName": "Ứng dụng thuật toán",
              "credits": 3,
              "targetGrade": "B+",
              "rationale": "Đã học IT6002 và IT6015 (học phần học trước)",
              "courseType": "STANDARD",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6096",
              "courseName": "Thiết kế phần mềm",
              "credits": 3,
              "targetGrade": "A",
              "rationale": "Đã học IT6097 (học phần học trước)",
              "courseType": "STANDARD",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6095",
              "courseName": "Tối ưu hóa",
              "credits": 3,
              "targetGrade": "B+",
              "rationale": "Học kỳ gợi ý 5 trong CTĐT",
              "courseType": "STANDARD",
              "status": "PLANNED"
            }
          ],
          "totalCredits": 14,
          "expectedGpa": 3.45
        }
      ],
      "actions": [
        {
          "actionType": "CERTIFICATE",
          "label": "Xem điều kiện tốt nghiệp",
          "targetRoute": "/audit",
          "payloadJson": "{\"certificateType\":\"MOS\"}",
          "description": "Đăng ký thi và nộp chứng chỉ MOS trước đợt xét tốt nghiệp",
          "priority": 2
        }
      ],
      "warnings": [],
      "createdAt": "2026-09-15T08:00:00Z",
      "updatedAt": "2026-09-20T02:00:00Z",
      "activatedAt": "2026-09-20T02:05:00Z",
      "validatedAt": "2026-09-20T02:04:00Z"
    },
    "consumers": [
      "TV3",
      "TV2"
    ]
  },
  "activate-study-plan": {
    "operationId": "activateStudyPlan",
    "method": "POST",
    "path": "/planner/plans/{planId}/activate",
    "httpStatus": 200,
    "pathParams": {
      "planId": "plan-2024604757-0003"
    },
    "requestSchema": "ActivateStudyPlanRequest",
    "request": {
      "planVersion": 2,
      "dataRevision": "REV-2024604757-001"
    },
    "responseSchema": "ActivateStudyPlanResponse",
    "response": {
      "planId": "plan-2024604757-0003",
      "status": "ACTIVE",
      "activatedAt": "2026-10-13T08:10:00Z",
      "archivedPlanIds": [
        "plan-2024604757-0002"
      ],
      "message": "Đã kích hoạt kế hoạch. Kế hoạch đang theo dõi trước đó đã được lưu trữ."
    },
    "consumers": [
      "TV3"
    ]
  },
  "activate-study-plan-not-validated": {
    "operationId": "activateStudyPlan",
    "method": "POST",
    "path": "/planner/plans/{planId}/activate",
    "httpStatus": 422,
    "pathParams": {
      "planId": "plan-2024604757-0003"
    },
    "requestSchema": null,
    "request": null,
    "responseSchema": "ApiErrorResponse",
    "response": {
      "code": "PLAN_NOT_VALIDATED",
      "message": "Chỉ kích hoạt được kế hoạch đã thẩm định hợp lệ. Hãy bấm \"Kiểm tra điều kiện\" trước.",
      "requestId": "req-2026-10-13-0003",
      "timestamp": "2026-10-13T08:13:00Z",
      "details": [
        "Trạng thái hiện tại: DRAFT"
      ]
    },
    "consumers": [
      "TV3"
    ]
  },
  "activate-study-plan-validation-failed": {
    "operationId": "activateStudyPlan",
    "method": "POST",
    "path": "/planner/plans/{planId}/activate",
    "httpStatus": 422,
    "pathParams": {
      "planId": "plan-2024604757-0003"
    },
    "requestSchema": null,
    "request": null,
    "responseSchema": "ApiErrorResponse",
    "response": {
      "code": "PLAN_VALIDATION_FAILED",
      "message": "Kế hoạch vi phạm quy chế khi thẩm định lại lúc kích hoạt.",
      "requestId": "req-2026-10-13-0004",
      "timestamp": "2026-10-13T08:14:00Z",
      "details": [
        "Học kỳ 2026_1 có 5 TC, thấp hơn mức tối thiểu 10 TC của học kỳ chính"
      ]
    },
    "consumers": [
      "TV3"
    ]
  },
  "save-study-plan-version-conflict": {
    "operationId": "saveStudyPlan",
    "method": "POST",
    "path": "/planner/plans",
    "httpStatus": 409,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "ApiErrorResponse",
    "response": {
      "code": "PLAN_VERSION_CONFLICT",
      "message": "Kế hoạch đã được lưu ở nơi khác. Vui lòng tải lại kế hoạch trước khi tiếp tục.",
      "requestId": "req-2026-10-13-0002",
      "timestamp": "2026-10-13T08:12:00Z",
      "details": [
        "planVersion hiện hành: 3",
        "planVersion client gửi: 2"
      ]
    },
    "consumers": [
      "TV3"
    ]
  },
  "activate-study-plan-stale-revision": {
    "operationId": "activateStudyPlan",
    "method": "POST",
    "path": "/planner/plans/{planId}/activate",
    "httpStatus": 409,
    "pathParams": {
      "planId": "plan-2024604757-0003"
    },
    "requestSchema": null,
    "request": null,
    "responseSchema": "ApiErrorResponse",
    "response": {
      "code": "DATA_REVISION_STALE",
      "message": "Dữ liệu học vụ đã thay đổi. Vui lòng tải lại dữ liệu mới nhất rồi thực hiện lại.",
      "requestId": "req-2026-10-13-0001",
      "timestamp": "2026-10-13T08:11:00Z",
      "details": [
        "Revision hiện hành: REV-2024604757-002",
        "Revision client gửi: REV-2024604757-001"
      ]
    },
    "consumers": [
      "TV3",
      "TV2"
    ]
  },
  "restore-study-plan": {
    "operationId": "restoreStudyPlan",
    "method": "POST",
    "path": "/planner/plans/{planId}/restore",
    "httpStatus": 200,
    "pathParams": {
      "planId": "plan-2024604757-0001"
    },
    "requestSchema": "RestoreStudyPlanRequest",
    "request": {
      "planName": "Bản sao từ Kế hoạch KTPM K19 - bản đầu"
    },
    "responseSchema": "StudyPlanDetailResponse",
    "response": {
      "planId": "plan-2024604757-0004",
      "studentId": "2024604757",
      "planName": "Bản sao từ Kế hoạch KTPM K19 - bản đầu",
      "status": "DRAFT",
      "planVersion": 1,
      "sourcePlanId": "plan-2024604757-0001",
      "dataRevision": "REV-2024604757-001",
      "targetCpa": 3.2,
      "targetGraduationSemester": "2028_1",
      "maxCreditsPerSemester": 20,
      "totalCredits": 14,
      "projectedCpa": 3.15,
      "semesters": [
        {
          "semesterOrder": 1,
          "semesterCode": "2026_1",
          "semesterName": "Học kỳ 1 năm học 2026-2027",
          "courses": [
            {
              "courseCode": "LP6004",
              "courseName": "Tư tưởng Hồ Chí Minh",
              "credits": 2,
              "targetGrade": "B",
              "rationale": "Học lại môn điểm F để giải tỏa nợ học phần",
              "courseType": "RETAKE",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6039",
              "courseName": "Thiết kế Web",
              "credits": 3,
              "targetGrade": "B+",
              "rationale": "Học kỳ gợi ý 4 trong CTĐT",
              "courseType": "STANDARD",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6044",
              "courseName": "Ứng dụng thuật toán",
              "credits": 3,
              "targetGrade": "B",
              "rationale": "Đã học IT6002 và IT6015 (học phần học trước)",
              "courseType": "STANDARD",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6040",
              "courseName": "Thực tập cơ sở ngành",
              "credits": 3,
              "targetGrade": "B+",
              "rationale": "Học kỳ gợi ý 5 trong CTĐT",
              "courseType": "STANDARD",
              "status": "PLANNED"
            },
            {
              "courseCode": "IT6123",
              "courseName": "Tương tác người máy",
              "credits": 3,
              "targetGrade": "B",
              "rationale": "Học kỳ gợi ý 6 trong CTĐT",
              "courseType": "STANDARD",
              "status": "PLANNED"
            }
          ],
          "totalCredits": 14,
          "expectedGpa": 3.1
        }
      ],
      "actions": [],
      "warnings": [],
      "createdAt": "2026-10-13T08:20:00Z",
      "updatedAt": "2026-10-13T08:20:00Z",
      "activatedAt": null,
      "validatedAt": null
    },
    "consumers": [
      "TV3"
    ]
  },
  "reconcile-study-plan": {
    "operationId": "reconcileStudyPlan",
    "method": "POST",
    "path": "/planner/reconcile",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": "ReconcileStudyPlanRequest",
    "request": {
      "planId": "plan-2024604757-0002",
      "studentId": "2024604757",
      "completedSemester": "2026_1",
      "planVersion": 2,
      "dataRevision": "REV-2024604757-002"
    },
    "responseSchema": "ReconcileStudyPlanResponse",
    "response": {
      "planId": "plan-2024604757-0002",
      "studentId": "2024604757",
      "onTrack": false,
      "completedCourses": [
        "LP6004 - Tư tưởng Hồ Chí Minh: B (đạt mục tiêu B)",
        "IT6039 - Thiết kế Web: A (đạt mục tiêu A)",
        "IT6044 - Ứng dụng thuật toán: B (mục tiêu B+)",
        "IT6096 - Thiết kế phần mềm: A (đạt mục tiêu A)"
      ],
      "missedOrFailedCourses": [
        "IT6095 - Tối ưu hóa: F"
      ],
      "adjustmentsRecommended": [
        "Xếp học lại IT6095 - Tối ưu hóa vào học kỳ 2026_2 hoặc kỳ hè 2026_SUMMER"
      ],
      "planVersion": 2,
      "dataRevision": "REV-2024604757-002"
    },
    "consumers": [
      "TV3",
      "TV4"
    ]
  },
  "simulate-grades": {
    "operationId": "simulateGrades",
    "method": "POST",
    "path": "/simulation/grades",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": "SimulateGradesRequest",
    "request": {
      "studentId": "2024604757",
      "courses": [
        {
          "courseCode": "IT6039",
          "credits": 3,
          "expectedGrade": "A",
          "expectedGradePoints": 4
        },
        {
          "courseCode": "IT6044",
          "credits": 3,
          "expectedGrade": "B+",
          "expectedGradePoints": 3.5
        }
      ],
      "dataRevision": "REV-2024604757-001"
    },
    "responseSchema": "SimulateGradesResponse",
    "response": {
      "studentId": "2024604757",
      "currentCpa": 3.18,
      "expectedGpa": 3.75,
      "projectedCpa": 3.23,
      "cpaDelta": 0.05,
      "dataRevision": "REV-2024604757-001"
    },
    "consumers": [
      "TV3",
      "TV1",
      "TV4"
    ]
  },
  "rank-retake-courses": {
    "operationId": "rankRetakeCourses",
    "method": "POST",
    "path": "/simulation/retake-ranking",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": "RankRetakeCoursesRequest",
    "request": {
      "studentId": "2024604757",
      "maxSuggestions": 2,
      "dataRevision": "REV-2024604757-001"
    },
    "responseSchema": "RankRetakeCoursesResponse",
    "response": {
      "studentId": "2024604757",
      "recommendations": [
        {
          "courseCode": "LP6010",
          "courseName": "Triết học Mác-Lênin",
          "credits": 3,
          "currentGrade": "D+",
          "currentGradePoints": 1.5,
          "targetGrade": "B+",
          "targetGradePoints": 3.5,
          "cpaDelta": 0.08,
          "rank": 1,
          "rationale": "Môn 3 tín chỉ điểm D+, cải thiện lên B+ cho mức tăng CPA cao nhất"
        },
        {
          "courseCode": "LP6012",
          "courseName": "Chủ nghĩa xã hội khoa học",
          "credits": 2,
          "currentGrade": "D+",
          "currentGradePoints": 1.5,
          "targetGrade": "A",
          "targetGradePoints": 4,
          "cpaDelta": 0.07,
          "rank": 2,
          "rationale": "Môn 2 tín chỉ điểm D+, cải thiện lên A"
        }
      ],
      "dataRevision": "REV-2024604757-001"
    },
    "consumers": [
      "TV3",
      "TV1",
      "TV4"
    ]
  },
  "calculate-target-grades": {
    "operationId": "calculateTargetGrades",
    "method": "POST",
    "path": "/simulation/target-grades",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": "CalculateTargetGradesRequest",
    "request": {
      "studentId": "2024604757",
      "targetCpa": 3.4,
      "targetGraduationSemester": "2028_1",
      "dataRevision": "REV-2024604757-001"
    },
    "responseSchema": "CalculateTargetGradesResponse",
    "response": {
      "studentId": "2024604757",
      "currentCpa": 3.18,
      "targetCpa": 3.4,
      "remainingCredits": 89,
      "requiredAverageGpa": 3.55,
      "courseRequirements": [
        {
          "courseCode": "IT6096",
          "courseName": "Thiết kế phần mềm",
          "credits": 3,
          "requiredGrade": "A",
          "requiredGradePoints": 4,
          "rationale": "Môn chuyên ngành 3 tín chỉ, cần đạt A để bù phần chênh CPA"
        }
      ],
      "warnings": [
        "Mục tiêu yêu cầu GPA trung bình các kỳ còn lại >= 3.55 (mức thử thách)"
      ],
      "dataRevision": "REV-2024604757-001"
    },
    "consumers": [
      "TV3",
      "TV1",
      "TV4"
    ]
  },
  "graduation-audit": {
    "operationId": "runGraduationAudit",
    "method": "GET",
    "path": "/audit/graduation",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": "GraduationAuditRequest",
    "request": {
      "studentId": "2024604757",
      "dataRevision": "REV-2024604757-001"
    },
    "responseSchema": "GraduationAuditResponse",
    "response": {
      "studentId": "2024604757",
      "eligibleForGraduation": false,
      "completedPercentage": 41,
      "accumulatedCredits": 61,
      "totalCreditsRequired": 150,
      "checklist": [
        {
          "category": "TÍN CHỈ TÍCH LŨY",
          "name": "Tổng số tín chỉ tích lũy",
          "completed": false,
          "totalCreditsRequired": 150,
          "accumulatedCredits": 61,
          "statusMessage": "Còn thiếu 89 tín chỉ"
        },
        {
          "category": "NGOẠI NGỮ",
          "name": "Chuẩn đầu ra Ngoại ngữ (TOEIC 550)",
          "completed": true,
          "totalCreditsRequired": null,
          "accumulatedCredits": null,
          "statusMessage": "Đã hoàn thành chuẩn đầu ra ngoại ngữ TOEIC"
        },
        {
          "category": "TIN HỌC",
          "name": "Chuẩn đầu ra Tin học (MOS/IC3)",
          "completed": false,
          "totalCreditsRequired": null,
          "accumulatedCredits": null,
          "statusMessage": "Chưa nộp chứng chỉ kỹ năng CNTT"
        },
        {
          "category": "GDQP_AN",
          "name": "Chứng chỉ Giáo dục Quốc phòng - An ninh",
          "completed": true,
          "totalCreditsRequired": null,
          "accumulatedCredits": null,
          "statusMessage": "Đã tích lũy đủ 4 học phần GDQP-AN"
        },
        {
          "category": "GDTC",
          "name": "Chứng chỉ Giáo dục Thể chất",
          "completed": true,
          "totalCreditsRequired": null,
          "accumulatedCredits": null,
          "statusMessage": "Đã hoàn thành các học phần thể chất"
        }
      ],
      "pendingActions": [
        {
          "certificateType": "MOS",
          "requiredStandard": "Chuẩn đầu ra Tin học (MOS/IC3)",
          "actionDescription": "Đăng ký thi và nộp chứng chỉ MOS trước đợt xét tốt nghiệp",
          "deadline": "2028-03-31",
          "status": "PENDING"
        }
      ],
      "dataRevision": "REV-2024604757-001"
    },
    "consumers": [
      "TV2",
      "TV1",
      "TV4"
    ]
  },
  "chat-advisor": {
    "operationId": "chatAdvisor",
    "method": "POST",
    "path": "/advisor/chat",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": "ChatRequest",
    "request": {
      "conversationId": "6f1c2b9e-1d4a-4c55-9a51-2b7f0e8c4d21",
      "message": "Kỳ tới em nên học những môn nào để vẫn tốt nghiệp đúng hạn?",
      "clientTimestamp": "2026-10-13T07:55:00Z"
    },
    "responseSchema": "ChatResponse",
    "response": {
      "answer": "Kỳ 2026_1 bạn nên ưu tiên học lại LP6004 - Tư tưởng Hồ Chí Minh để giải tỏa nợ học phần, kết hợp các môn chuyên ngành đã đủ học phần học trước. Tổng 14 tín chỉ, nằm trong giới hạn 10-24 tín chỉ của học kỳ chính. Đây là phương án dự kiến, bạn có thể mở Planner để xem và lưu.",
      "sources": [
        {
          "sourceId": "REG-HAUI-01",
          "title": "Quy chế đào tạo theo hệ thống tín chỉ — Trường Đại học Công nghiệp Hà Nội (HaUI)",
          "section": "1. Tổ chức Đào tạo và Kế hoạch Học tập > 2. Giới hạn Đăng ký Tín chỉ (Credit Limits)",
          "version": "gitblob:cab439dd3364",
          "referenceUrl": "https://sv.haui.edu.vn/quy-che/reg-haui-01"
        }
      ],
      "actions": [
        {
          "actionType": "OPEN_PLANNER",
          "label": "Mở Planner với phương án đề xuất",
          "targetRoute": "/planner",
          "payloadJson": "{\"proposalId\":\"proposal-2024604757-20261013-01\"}",
          "description": null,
          "priority": 1
        }
      ],
      "planProposal": {
        "proposalId": "proposal-2024604757-20261013-01",
        "summary": "Đề xuất 2 học kỳ tới: học lại LP6004, cải thiện LP6010 và các môn chuyên ngành đúng tiến độ",
        "semesters": [
          {
            "semesterOrder": 1,
            "semesterCode": "2026_1",
            "semesterName": "Học kỳ 1 năm học 2026-2027",
            "courses": [
              {
                "courseCode": "LP6004",
                "courseName": "Tư tưởng Hồ Chí Minh",
                "credits": 2,
                "targetGrade": "B",
                "rationale": "Học lại môn điểm F để giải tỏa nợ học phần",
                "courseType": "RETAKE",
                "status": "PLANNED"
              },
              {
                "courseCode": "IT6039",
                "courseName": "Thiết kế Web",
                "credits": 3,
                "targetGrade": "A",
                "rationale": "Học kỳ gợi ý 4 trong CTĐT",
                "courseType": "STANDARD",
                "status": "PLANNED"
              },
              {
                "courseCode": "IT6044",
                "courseName": "Ứng dụng thuật toán",
                "credits": 3,
                "targetGrade": "B+",
                "rationale": "Đã học IT6002 và IT6015 (học phần học trước)",
                "courseType": "STANDARD",
                "status": "PLANNED"
              },
              {
                "courseCode": "IT6096",
                "courseName": "Thiết kế phần mềm",
                "credits": 3,
                "targetGrade": "A",
                "rationale": "Đã học IT6097 (học phần học trước)",
                "courseType": "STANDARD",
                "status": "PLANNED"
              },
              {
                "courseCode": "IT6095",
                "courseName": "Tối ưu hóa",
                "credits": 3,
                "targetGrade": "B+",
                "rationale": "Học kỳ gợi ý 5 trong CTĐT",
                "courseType": "STANDARD",
                "status": "PLANNED"
              }
            ],
            "totalCredits": 14,
            "expectedGpa": 3.45
          },
          {
            "semesterOrder": 2,
            "semesterCode": "2026_2",
            "semesterName": "Học kỳ 2 năm học 2026-2027",
            "courses": [
              {
                "courseCode": "LP6010",
                "courseName": "Triết học Mác-Lênin",
                "credits": 3,
                "targetGrade": "B+",
                "rationale": "Học cải thiện từ D+ lên B+, hiệu quả CPA cao nhất",
                "courseType": "IMPROVEMENT",
                "status": "PLANNED"
              },
              {
                "courseCode": "IT6151",
                "courseName": "Phát triển phần mềm hướng dịch vụ",
                "credits": 3,
                "targetGrade": "A",
                "rationale": "Đã học IT6019 (học phần học trước)",
                "courseType": "STANDARD",
                "status": "PLANNED"
              },
              {
                "courseCode": "IT6084",
                "courseName": "Kiểm thử phần mềm",
                "credits": 3,
                "targetGrade": "B+",
                "rationale": "Đã học IT6002 và IT6082 (học phần học trước)",
                "courseType": "STANDARD",
                "status": "PLANNED"
              },
              {
                "courseCode": "IT6020",
                "courseName": "Lập trình Java nâng cao",
                "credits": 3,
                "targetGrade": "A",
                "rationale": "Đã học IT6019 và IT6120 (học phần học trước)",
                "courseType": "STANDARD",
                "status": "PLANNED"
              },
              {
                "courseCode": "LP6013",
                "courseName": "Lịch sử Đảng Cộng sản Việt Nam",
                "credits": 2,
                "targetGrade": "B",
                "rationale": "Đã học LP6011 (học phần học trước)",
                "courseType": "STANDARD",
                "status": "PLANNED"
              }
            ],
            "totalCredits": 14,
            "expectedGpa": 3.5
          }
        ],
        "projectedCpa": 3.26
      },
      "warnings": [
        "Quy tắc tín chỉ dựa trên quy chế demo (DEMO_UNVERIFIED), cần đối chiếu thông báo mở lớp chính thức"
      ]
    },
    "consumers": [
      "TV3",
      "TV1"
    ]
  },
  "not-implemented": {
    "operationId": "getAcademicStatus",
    "method": "GET",
    "path": "/academic/status",
    "httpStatus": 501,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "ApiErrorResponse",
    "response": {
      "code": "NOT_IMPLEMENTED",
      "message": "Chức năng chưa được nối ở runtime hiện tại.",
      "requestId": "req-2026-10-13-0005",
      "timestamp": "2026-10-13T08:15:00Z",
      "details": [
        "Capability getAcademicStatus sẽ được nối với AcademicFacade ở Phase 4"
      ]
    },
    "consumers": [
      "TV2",
      "TV3"
    ]
  },
  "validate-study-plan-mock": {
    "operationId": "validateStudyPlan",
    "method": "POST",
    "path": "/planner/validate",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "ValidateStudyPlanResponse",
    "response": {
      "valid": true,
      "status": "DRAFT",
      "violations": [],
      "warnings": [
        "Kết quả thẩm định thử (MOCK): công cụ thẩm định thật chưa sẵn sàng, kế hoạch chưa đủ điều kiện kích hoạt."
      ],
      "planVersion": 2,
      "dataRevision": "REV-2024604757-001",
      "validationMode": "MOCK",
      "policyVersion": "policy-haui-demo-2026@0.0.1-v0"
    },
    "consumers": [
      "TV3"
    ]
  },
  "validate-study-plan-tool-not-ready": {
    "operationId": "validateStudyPlan",
    "method": "POST",
    "path": "/planner/validate",
    "httpStatus": 503,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "ApiErrorResponse",
    "response": {
      "code": "TOOL_NOT_READY",
      "message": "Công cụ thẩm định kế hoạch chưa sẵn sàng. Kế hoạch được lưu nháp nhưng chưa thể kiểm tra điều kiện hay kích hoạt.",
      "requestId": "req-2026-10-15-0001",
      "timestamp": "2026-10-15T02:00:00Z",
      "details": [
        "capability: VALIDATE_STUDY_PLAN"
      ]
    },
    "consumers": [
      "TV3"
    ]
  },
  "activate-study-plan-tool-not-ready": {
    "operationId": "activateStudyPlan",
    "method": "POST",
    "path": "/planner/plans/{planId}/activate",
    "httpStatus": 503,
    "pathParams": {
      "planId": "plan-2024604757-0003"
    },
    "requestSchema": null,
    "request": null,
    "responseSchema": "ApiErrorResponse",
    "response": {
      "code": "TOOL_NOT_READY",
      "message": "Công cụ thẩm định kế hoạch chưa sẵn sàng. Kế hoạch được lưu nháp nhưng chưa thể kiểm tra điều kiện hay kích hoạt.",
      "requestId": "req-2026-10-15-0001",
      "timestamp": "2026-10-15T02:00:00Z",
      "details": [
        "capability: VALIDATE_STUDY_PLAN"
      ]
    },
    "consumers": [
      "TV3"
    ]
  },
  "conversation-list": {
    "operationId": "listConversations",
    "method": "GET",
    "path": "/advisor/conversations",
    "httpStatus": 200,
    "pathParams": null,
    "requestSchema": null,
    "request": null,
    "responseSchema": "ConversationListResponse",
    "response": {
      "conversations": [
        {
          "conversationId": "6f1c2b9e-1d4a-4c55-9a51-2b7f0e8c4d21",
          "title": "Kỳ tới em nên học những môn nào?",
          "createdAt": "2026-10-13T07:55:00Z",
          "updatedAt": "2026-10-13T07:56:10Z"
        }
      ]
    },
    "consumers": [
      "TV3",
      "TV1"
    ]
  },
  "conversation-get": {
    "operationId": "getConversation",
    "method": "GET",
    "path": "/advisor/conversations/{conversationId}",
    "httpStatus": 200,
    "pathParams": {
      "conversationId": "6f1c2b9e-1d4a-4c55-9a51-2b7f0e8c4d21"
    },
    "requestSchema": null,
    "request": null,
    "responseSchema": "ConversationRecord",
    "response": {
      "conversationId": "6f1c2b9e-1d4a-4c55-9a51-2b7f0e8c4d21",
      "studentId": "2024604757",
      "title": "Kỳ tới em nên học những môn nào?",
      "createdAt": "2026-10-13T07:55:00Z",
      "updatedAt": "2026-10-13T07:56:10Z",
      "messagesJson": "[{\"role\":\"user\",\"content\":\"Kỳ tới em nên học những môn nào để vẫn tốt nghiệp đúng hạn?\",\"at\":\"2026-10-13T07:55:00Z\"},{\"role\":\"assistant\",\"content\":\"Kỳ 2026_1 bạn nên ưu tiên học lại LP6004 - Tư tưởng Hồ Chí Minh...\",\"at\":\"2026-10-13T07:56:10Z\"}]"
    },
    "consumers": [
      "TV3",
      "TV1"
    ]
  },
  "conversation-not-found": {
    "operationId": "getConversation",
    "method": "GET",
    "path": "/advisor/conversations/{conversationId}",
    "httpStatus": 404,
    "pathParams": {
      "conversationId": "00000000-0000-0000-0000-000000000000"
    },
    "requestSchema": null,
    "request": null,
    "responseSchema": "ApiErrorResponse",
    "response": {
      "code": "CONVERSATION_NOT_FOUND",
      "message": "Không tìm thấy hội thoại.",
      "requestId": "req-2026-10-15-0002",
      "timestamp": "2026-10-15T02:01:00Z",
      "details": [
        "conversationId: 00000000-0000-0000-0000-000000000000"
      ]
    },
    "consumers": [
      "TV3"
    ]
  }
});
