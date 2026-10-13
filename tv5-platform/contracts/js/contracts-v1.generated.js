// GENERATED — KHÔNG SỬA TAY. Sinh bởi `npm run contracts:build` từ tv5-platform/contracts (openapi-v1.yaml, examples/*.json, enum Java).
export const CONTRACT_VERSION = "1.0.0";
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
    "NOT_IMPLEMENTED"
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
  "chatAdvisor": {
    "method": "POST",
    "path": "/advisor/chat"
  },
  "checkCourseEligibility": {
    "method": "POST",
    "path": "/academic/eligibility"
  },
  "generateStudyPlan": {
    "method": "POST",
    "path": "/planner/generate"
  },
  "getAcademicStatus": {
    "method": "GET",
    "path": "/academic/status"
  },
  "getBootstrapInfo": {
    "method": "GET",
    "path": "/system/bootstrap"
  },
  "getStudyPlan": {
    "method": "GET",
    "path": "/planner/plans/{planId}"
  },
  "getSystemHealth": {
    "method": "GET",
    "path": "/system/health"
  },
  "listStudyPlans": {
    "method": "GET",
    "path": "/planner/plans"
  },
  "rankRetakeCourses": {
    "method": "POST",
    "path": "/simulation/retake-ranking"
  },
  "reconcileStudyPlan": {
    "method": "POST",
    "path": "/planner/reconcile"
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
  "validateStudyPlan": {
    "method": "POST",
    "path": "/planner/validate"
  }
});
export const FIXTURES = Object.freeze({
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
      "dataRevision": "REV-2024604757-001"
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
      "activatedAt": "2026-09-20T02:05:00Z"
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
      "activatedAt": null
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
          "name": "Tiếng Anh TOEIC 500+",
          "completed": true,
          "totalCreditsRequired": null,
          "accumulatedCredits": null,
          "statusMessage": "Đã hoàn thành chuẩn đầu ra ngoại ngữ TOEIC"
        },
        {
          "category": "TIN HỌC",
          "name": "Chuẩn kỹ năng CNTT nâng cao (MOS)",
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
          "requiredStandard": "Chuẩn kỹ năng CNTT nâng cao (MOS)",
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
  }
});
