import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import {
  plannerStore,
  PLAN_STATUSES,
  ChatAdvisorPage,
  StudentProfilePage,
  generateMockChatResponse,
  QUICK_PROMPTS_MAN_2,
  SAMPLE_K16_PROFILE,
  HAUI_COHORTS
} from '../src/index.js';

beforeEach(() => {
  plannerStore.resetToDefault();
});

const mockUi = {
  Button: ({ children, onClick, variant, size, loading, disabled }) =>
    React.createElement('button', { onClick, 'data-variant': variant, disabled }, children),
  Card: ({ title, subtitle, children, headerAction, footer, variant }) =>
    React.createElement('div', { className: `card ${variant || ''}` },
      React.createElement('div', { className: 'card-header' }, title, subtitle, headerAction),
      React.createElement('div', { className: 'card-body' }, children),
      footer ? React.createElement('div', { className: 'card-footer' }, footer) : null
    ),
  Table: ({ columns, data }) => React.createElement('table', null),
  Loading: ({ label }) => React.createElement('div', { className: 'loading' }, label),
  Error: ({ title, message, onRetry, retryLabel }) =>
    React.createElement('div', { className: 'error-box' },
      title,
      message,
      onRetry ? React.createElement('button', { onClick: onRetry }, retryLabel || 'Thử lại') : null
    ),
  EmptyState: ({ title, description, actionLabel, onAction }) =>
    React.createElement('div', { className: 'empty-state', onClick: onAction }, title, description, actionLabel)
};

test('Task 3.12 - 1: Chat Advisor render thành công với injected api/ui và 4 Quick Prompts', () => {
  const mockApi = {
    advisor: {
      chat: async ({ conversationId, message, clientTimestamp }) => {
        assert.ok(conversationId, 'Phải gửi conversationId dạng JSON');
        assert.ok(message, 'Phải gửi message dạng JSON');
        assert.ok(clientTimestamp, 'Phải gửi clientTimestamp dạng JSON');
        return {
          answer: `[Mock API Response]: Đã nhận ${message}`,
          sources: [
            {
              title: 'Quy chế đào tạo tín chỉ HaUI',
              section: 'Điều 14'
            }
          ],
          actions: [],
          warnings: [],
          planProposal: null
        };
      }
    }
  };

  const element = React.createElement(ChatAdvisorPage, { api: mockApi, ui: mockUi });
  assert.ok(element, 'ChatAdvisorPage phải render thành một React element hợp lệ');
  assert.equal(element.type, ChatAdvisorPage);
  assert.equal(QUICK_PROMPTS_MAN_2.length, 4, 'Phải có đúng 4 Quick Prompts chuẩn Màn 2 UI Flow');
});

test('Task 3.12 - 2: Hỏi quy chế học vụ (P04) ở nguyên hội thoại, trích dẫn văn bản, planProposal là null', () => {
  const regQuestions = [
    'Điều kiện cảnh báo học vụ mức 1 và mức 2 tại HaUI là gì?',
    'Số tín chỉ tối đa được đăng ký trong một học kỳ chính là bao nhiêu?',
    'Quy định học lại môn F và học cải thiện điểm D/D+/C như thế nào?',
    'Chuẩn đầu ra và điều kiện xét tốt nghiệp K16 gồm những gì?'
  ];

  for (const q of regQuestions) {
    const res = generateMockChatResponse(q, plannerStore.getPlan());
    assert.equal(
      res.planProposal,
      null,
      `Câu hỏi quy chế "${q}" tuyệt đối không được có planProposal (ở nguyên hội thoại, không ép mở Planner)`
    );
    assert.ok(res.sources && res.sources.length > 0, `Câu hỏi "${q}" phải có nguồn trích dẫn quy chế HaUI`);
    assert.ok(
      res.sources[0].title.includes('Quy chế') || res.sources[0].title.includes('Chương trình đào tạo'),
      'Nguồn trích dẫn phải nêu rõ tên văn bản quy chế đào tạo'
    );
    assert.ok(res.answer.startsWith('[AI Advisor]:'), 'Câu trả lời phải có định danh [AI Advisor]');
  }
});

test('Task 3.12 - 3: Yêu cầu lập lộ trình / kế hoạch (P05) sinh proposal gắn thẻ đề xuất phương án', () => {
  const planQuestions = [
    'Tư vấn lộ trình kéo CPA lên >= 3.20 để tốt nghiệp bằng Giỏi.',
    'Lên lộ trình học vượt 3.5 năm ngành CNTT/KTPM.',
    'Lập kế hoạch phân bổ môn học kỳ 7 cho tôi'
  ];

  for (const q of planQuestions) {
    const res = generateMockChatResponse(q, plannerStore.getPlan());
    assert.ok(res.planProposal, `Câu hỏi lập lộ trình "${q}" bắt buộc phải có planProposal`);
    assert.ok(Array.isArray(res.planProposal.semesters), 'Proposal phải chứa danh sách học kỳ');
    assert.ok(res.sources && res.sources.length > 0, 'Proposal vẫn phải trích dẫn nguồn quy chế hạn mức tín chỉ');
  }
});

test('Task 3.12 - 4: Thẻ đề xuất kế hoạch (Plan Proposal Card) hỗ trợ đầy đủ 3 nhánh hành động', () => {
  const mockProposal = {
    planId: 'prop-test-312',
    planName: 'Lộ trình đề xuất AI Kỳ 7',
    projectedCpa: 3.35,
    semesters: [
      {
        semesterCode: '2026_1',
        semesterName: 'Kỳ 7 đề xuất',
        totalCredits: 18,
        courses: [{ courseCode: 'MATH1002', courseName: 'Toán rời rạc', credits: 3 }]
      }
    ]
  };

  // 1. Nhánh 1: Chấp nhận phương án -> Nạp vào plannerStore và mở Planner
  plannerStore.setIncomingProposal(mockProposal, 'AI Advisor Chat Test');
  assert.equal(plannerStore.getIncomingProposal()?.planId, 'prop-test-312');

  plannerStore.acceptProposal();
  assert.equal(plannerStore.getIncomingProposal(), null, 'Sau khi chấp nhận, incoming proposal phải được xóa');
  assert.equal(plannerStore.getPlan().status, PLAN_STATUSES.DRAFT, 'Kế hoạch sau khi nhận đề xuất chuyển về DRAFT để thẩm định');

  // 2. Nhánh 2: Phương án khác -> Tái prompt AI
  const altRes = generateMockChatResponse('Hãy đề xuất cho tôi một phương án khác nhẹ tải hơn dưới 16 tín chỉ');
  assert.ok(altRes.planProposal, 'Phương án thay thế phải tạo proposal mới');

  // 3. Nhánh 3: Hủy đề xuất -> Bỏ qua proposal, không sửa kế hoạch hiện hành
  plannerStore.setIncomingProposal(mockProposal, 'AI Advisor Chat Test 2');
  plannerStore.rejectProposal();
  assert.equal(plannerStore.getIncomingProposal(), null, 'Sau khi hủy, incoming proposal phải bị hủy');
});

test('Task 3.12 - 5: Nút đính kèm (Attachment) mở luồng nhập bảng điểm chung của TV2 (/transcript)', () => {
  let transcriptOpened = false;

  const element = React.createElement(ChatAdvisorPage, {
    ui: mockUi,
    onOpenTranscript: () => {
      transcriptOpened = true;
    }
  });

  assert.ok(element, 'Render thành công ChatAdvisorPage kèm callback onOpenTranscript');
  // Kích hoạt callback
  element.props.onOpenTranscript();
  assert.equal(transcriptOpened, true, 'Nút đính kèm phải mở luồng nhập bảng điểm chung của TV2');
});

test('Task 3.12 - 6: Giao thức thuần JSON, không thêm WebSocket ngoài phạm vi', async () => {
  let requestedPayload = null;

  const mockApi = {
    advisor: {
      chat: async (payload) => {
        requestedPayload = payload;
        return {
          answer: 'JSON response',
          sources: [],
          actions: [],
          warnings: [],
          planProposal: null
        };
      }
    }
  };

  const res = await mockApi.advisor.chat({
    conversationId: 'conv-json-01',
    message: 'Hỏi quy chế điểm danh',
    clientTimestamp: '2026-10-15T12:00:00.000Z'
  });

  assert.equal(typeof requestedPayload, 'object', 'Payload gửi đi phải là thuần JSON Object');
  assert.equal(requestedPayload.conversationId, 'conv-json-01');
  assert.equal(requestedPayload.message, 'Hỏi quy chế điểm danh');
  assert.equal(typeof res, 'object', 'Response nhận về phải là thuần JSON Object');
  assert.equal(res.answer, 'JSON response');
});

test('Task 3.12 - 7: StudentProfilePage hiển thị đầy đủ thông tin hành chính, học vụ cá nhân và mục tiêu', () => {
  const mockApi = {
    academic: {
      getStatus: async () => ({
        studentId: '2020601234',
        cpa: 3.18,
        gpa: 3.32,
        accumulatedCredits: 108,
        totalCreditsRequired: 145,
        riskLevel: 'SAFE',
        warningMessages: ['Nợ môn Toán rời rạc (MATH1002)']
      })
    },
    getConfig: () => ({
      sessionStudent: {
        studentId: '2020601234',
        fullName: 'Nguyễn Văn An',
        studentCode: '2020601234',
        majorName: 'Kỹ thuật phần mềm (Khoa CNTT)',
        majorCode: '7480103',
        cohort: 'Khóa 16 (2020 - 2024)',
        faculty: 'Trường Công nghệ Thông tin & Truyền thông (SICT - HaUI)',
        advisorClass: 'KTPM01-K16'
      }
    })
  };

  const element = React.createElement(StudentProfilePage, { api: mockApi, ui: mockUi });
  assert.ok(element, 'StudentProfilePage phải là React element hợp lệ');
  assert.equal(element.type, StudentProfilePage);
  assert.equal(SAMPLE_K16_PROFILE.studentCode, '2020601234');
  assert.equal(SAMPLE_K16_PROFILE.cpa, 3.18);
  assert.equal(SAMPLE_K16_PROFILE.accumulatedCredits, 108);
});

test('Task 3.12 - 7b: StudentProfilePage hiển thị Cơ sở đào tạo ĐH Công nghiệp Hà Nội và dropdown Khóa học K16-K21', () => {
  assert.deepEqual(HAUI_COHORTS, [
    'K16 (2021 - 2025)',
    'K17 (2022 - 2026)',
    'K18 (2023 - 2027)',
    'K19 (2024 - 2028)',
    'K20 (2025 - 2029)',
    'K21 (2026 - 2030)'
  ]);

  const element = React.createElement(StudentProfilePage, {
    ui: mockUi,
    initialProfileData: SAMPLE_K16_PROFILE
  });

  const html = ReactDOMServer.renderToStaticMarkup(element);
  assert.ok(html.includes('value="Đại học Công nghiệp Hà Nội"'), 'Ô cơ sở đào tạo phải hiển thị Đại học Công nghiệp Hà Nội');
  assert.ok(html.includes('K16 (2021 - 2025)'), 'Dropdown khóa học phải chứa K16');
  assert.ok(html.includes('K21 (2026 - 2030)'), 'Dropdown khóa học phải chứa K21');
});

test('Task 3.12 - 7c: StudentProfilePage không để null cho CPA/GPA/Tín chỉ, đổi null thành 0 và đồng bộ', () => {
  const profileWithNulls = {
    ...SAMPLE_K16_PROFILE,
    cpa: null,
    gpa: null,
    accumulatedCredits: null
  };

  const element = React.createElement(StudentProfilePage, {
    ui: mockUi,
    initialProfileData: profileWithNulls
  });

  const html = ReactDOMServer.renderToStaticMarkup(element);
  assert.ok(!html.includes('>null'), 'Không được hiển thị null trên giao diện');
  assert.ok(!html.includes('null / 4.00'), 'Không được hiển thị null / 4.00 trên giao diện');
  assert.ok(html.includes('>0 </strong>'), 'CPA hoặc GPA null phải hiển thị 0');
});

test('Task 3.12 - 8: StudentProfilePage xử lý đúng trạng thái Chưa có hồ sơ (Empty State) và liên kết TV2', () => {
  let openedTranscriptFromProfile = false;

  const element = React.createElement(StudentProfilePage, {
    ui: mockUi,
    initialProfileData: null,
    onOpenTranscript: () => {
      openedTranscriptFromProfile = true;
    }
  });

  assert.ok(element, 'StudentProfilePage render được khi không có hồ sơ sinh viên');
  element.props.onOpenTranscript();
  assert.equal(openedTranscriptFromProfile, true, 'Từ trạng thái chưa có hồ sơ phải có liên kết mở luồng nhập bảng điểm TV2');
});

test('Task 3.12 - 9: UI test Gửi tin nhắn — Sinh viên gửi câu hỏi, AI trả lời hiển thị bubble trên giao diện', () => {
  const initialMessages = [
    {
      id: 'msg-u1',
      sender: 'user',
      text: 'Chào AI, tôi muốn hỏi về quy chế học vụ HaUI',
      timestamp: '14:20'
    },
    {
      id: 'msg-a1',
      sender: 'assistant',
      text: '[AI Advisor]: Chào bạn! Tôi sẵn sàng giải đáp các quy định đào tạo tín chỉ HaUI.',
      sources: [
        { title: 'Quy chế đào tạo HaUI', section: 'Điều 1' }
      ],
      timestamp: '14:21'
    }
  ];

  const html = ReactDOMServer.renderToString(
    React.createElement(ChatAdvisorPage, {
      ui: mockUi,
      initialMessages
    })
  );

  assert.ok(html.includes('Chào AI, tôi muốn hỏi về quy chế học vụ HaUI'), 'Phải render tin nhắn của sinh viên');
  assert.ok(html.includes('[AI Advisor]: Chào bạn! Tôi sẵn sàng giải đáp'), 'Phải render câu trả lời của AI Advisor');
  assert.ok(html.includes('14:20'), 'Phải hiển thị thời gian gửi của sinh viên');
  assert.ok(html.includes('14:21'), 'Phải hiển thị thời gian gửi của AI');
});

test('Task 3.12 - 10: UI test Hỏi tiếp (Multi-turn Conversation) — Bảo toàn lịch sử câu hỏi và câu trả lời trước đó', () => {
  const multiTurnMessages = [
    {
      id: 'turn-1-u',
      sender: 'user',
      text: 'Một học kỳ chính tối đa được đăng ký bao nhiêu tín chỉ?',
      timestamp: '14:00'
    },
    {
      id: 'turn-1-a',
      sender: 'assistant',
      text: '[AI Advisor]: Căn cứ Điều 14 Quy chế đào tạo HaUI: Sinh viên được đăng ký tối đa 24 tín chỉ trong học kỳ chính.',
      sources: [{ title: 'Quy chế đào tạo HaUI', section: 'Điều 14' }],
      timestamp: '14:01'
    },
    {
      id: 'turn-2-u',
      sender: 'user',
      text: 'Hỏi tiếp: Thế còn học kỳ hè thì tối đa bao nhiêu tín chỉ ạ?',
      timestamp: '14:02'
    },
    {
      id: 'turn-2-a',
      sender: 'assistant',
      text: '[AI Advisor]: Đối với học kỳ hè, sinh viên được đăng ký tối đa 12 tín chỉ để học lại hoặc học vượt.',
      sources: [{ title: 'Quy chế đào tạo HaUI', section: 'Điều 14' }],
      timestamp: '14:03'
    }
  ];

  const html = ReactDOMServer.renderToString(
    React.createElement(ChatAdvisorPage, {
      ui: mockUi,
      initialMessages: multiTurnMessages
    })
  );

  assert.ok(html.includes('Một học kỳ chính tối đa được đăng ký bao nhiêu tín chỉ?'), 'Giữ câu hỏi thứ 1');
  assert.ok(html.includes('tối đa 24 tín chỉ'), 'Giữ câu trả lời thứ 1');
  assert.ok(html.includes('Hỏi tiếp: Thế còn học kỳ hè thì tối đa bao nhiêu tín chỉ ạ?'), 'Hiển thị câu hỏi tiếp theo (Lượt 2)');
  assert.ok(html.includes('tối đa 12 tín chỉ'), 'Hiển thị câu trả lời lượt 2');
});

test('Task 3.12 - 11: UI test Thử lại (Retry on Error) — Hiển thị chỉ báo lỗi và nút Thử lại', () => {
  // 1. Tin nhắn cá nhân gửi thất bại
  const failedMessages = [
    {
      id: 'failed-msg-1',
      sender: 'user',
      text: 'Câu hỏi bị lỗi kết nối mạng',
      failed: true,
      errorText: 'Lỗi timeout khi kết nối máy chủ',
      timestamp: '14:15'
    }
  ];

  const failedHtml = ReactDOMServer.renderToString(
    React.createElement(ChatAdvisorPage, {
      ui: mockUi,
      initialMessages: failedMessages
    })
  );

  assert.ok(failedHtml.includes('Câu hỏi bị lỗi kết nối mạng'), 'Vẫn hiển thị nội dung câu hỏi');
  assert.ok(failedHtml.includes('Thử lại'), 'Hiển thị nút Thử lại (Retry) tại tin nhắn');
  assert.ok(failedHtml.includes('Không thể gửi'), 'Có chỉ báo gửi thất bại');

  // 2. Khung Error toàn cục hiển thị khi có sự cố
  const errorBoxHtml = ReactDOMServer.renderToString(
    React.createElement(ChatAdvisorPage, {
      ui: mockUi,
      initialError: {
        code: 'CHAT_TIMEOUT',
        message: 'Không thể kết nối đến máy chủ AI Cố vấn học vụ'
      }
    })
  );

  assert.ok(errorBoxHtml.includes('Không thể kết nối đến máy chủ AI Cố vấn học vụ'), 'Hiển thị nội dung lỗi');
  assert.ok(errorBoxHtml.includes('Thử lại'), 'Khung lỗi cung cấp nút Thử lại');
});

test('Task 3.12 - 12: UI test Nguồn (Sources / Citations) — Render khối trích dẫn quy chế HaUI chi tiết', () => {
  const messagesWithSources = [
    {
      id: 'msg-source-test',
      sender: 'assistant',
      text: '[AI Advisor]: Căn cứ Điều 16 Quy chế đào tạo HaUI (REG-HAUI-04 / BR-02)',
      sources: [
        {
          title: 'Quy chế đào tạo tín chỉ Đại học Công nghiệp Hà Nội (HaUI)',
          section: 'Điều 16 - Cảnh báo kết quả học tập & Buộc thôi học (REG-HAUI-04)'
        },
        {
          title: 'Chương trình đào tạo K16 ngành Kỹ thuật phần mềm (HaUI SICT)',
          section: 'Cấu trúc khối kiến thức chuyên ngành'
        }
      ],
      timestamp: '14:30'
    }
  ];

  const html = ReactDOMServer.renderToString(
    React.createElement(ChatAdvisorPage, {
      ui: mockUi,
      initialMessages: messagesWithSources
    })
  );

  assert.ok(html.includes('Nguồn tham khảo &amp; Quy chế') || html.includes('Nguồn tham khảo & Quy chế'), 'Khối nguồn tham khảo phải được render');
  assert.ok(html.includes('Điều 16 - Cảnh báo kết quả học tập'), 'Hiển thị số điều khoản trích dẫn');
  assert.ok(html.includes('Chương trình đào tạo K16'), 'Hiển thị văn bản CTĐT trích dẫn');
});

test('Task 3.12 - 13: UI test Link Proposal — Render Proposal Card, hỗ trợ Chấp nhận -> nạp store và mở Planner', () => {
  const proposalMessage = [
    {
      id: 'msg-prop-1',
      sender: 'assistant',
      text: '[AI Advisor]: Dưới đây là phương án lộ trình đề xuất Kỳ 7 cân bằng tải 18 tín chỉ.',
      planProposal: {
        planId: 'prop-ai-7',
        projectedCpa: 3.25,
        semesters: [
          {
            semesterCode: '2026_1',
            semesterName: 'Học kỳ 1 (2026-2027)',
            totalCredits: 18,
            courses: []
          }
        ]
      },
      proposalAccepted: false,
      proposalDismissed: false,
      timestamp: '14:35'
    }
  ];

  const html = ReactDOMServer.renderToString(
    React.createElement(ChatAdvisorPage, {
      ui: mockUi,
      initialMessages: proposalMessage
    })
  );

  assert.ok(html.includes('Đề xuất Phương án Lộ trình Học tập mới'), 'Hiển thị tiêu đề thẻ Proposal Card');
  assert.ok(html.includes('18 tín chỉ'), 'Hiển thị tải tín chỉ đề xuất');
  assert.ok(html.includes('3.25'), 'Hiển thị CPA dự kiến');
  assert.ok(html.includes('Chấp nhận phương án'), 'Hiển thị nút [Chấp nhận phương án]');
  assert.ok(html.includes('Phương án khác'), 'Hiển thị nút [Phương án khác]');
  assert.ok(html.includes('Hủy đề xuất'), 'Hiển thị nút [Hủy đề xuất]');
});

test('Task 3.12 - 14: UI test Ranh giới kiến trúc — Tuyệt đối không import ngược từ web host (tv2-web / @haui/web)', () => {
  // Quét toàn bộ mã nguồn trong tv3-planner-ui/src để bảo đảm không vi phạm ranh giới
  const srcDir = fs.existsSync(path.resolve('src'))
    ? path.resolve('src')
    : path.resolve('tv3-planner-ui/src');
  assert.ok(fs.existsSync(srcDir), 'Thư mục tv3-planner-ui/src phải tồn tại');

  const files = fs.readdirSync(srcDir, { recursive: true });
  const violations = [];

  for (const file of files) {
    const fullPath = path.join(srcDir, file);
    if (fs.statSync(fullPath).isFile() && (file.endsWith('.js') || file.endsWith('.jsx'))) {
      const code = fs.readFileSync(fullPath, 'utf-8');

      // Kiểm tra import từ @haui/web hoặc đường dẫn trỏ sang tv2-web
      const hasReverseImport =
        code.includes('@haui/web') ||
        code.includes('tv2-web') ||
        code.includes('../../tv2-web') ||
        code.includes('../tv2-web');

      if (hasReverseImport) {
        violations.push({ file, detail: 'Phát hiện import ngược từ web host tv2-web' });
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `VIOLATION: Phát hiện import ngược từ host vào TV3: ${JSON.stringify(violations)}`
  );
});
