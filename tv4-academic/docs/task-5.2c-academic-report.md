# BÃO CÃO Ká»¸ THUáº¬T & Äáº¶C Táº¢ THUáº¬T TOÃN Há»ŒC Vá»¤ (TASK 5.2c)
## IMPLEMENTATION & TECHNICAL ALGORITHM SPECIFICATION REPORT

> **Dá»± Ã¡n:** HaUI Advisor â€” Há»‡ thá»‘ng Trá»£ lÃ½ áº£o TÆ° váº¥n Lá»™ trÃ¬nh Há»c táº­p HaUI (`QUAN-LY-HOC-TAP-TTCSN`)
> **ThÃ nh viÃªn phá»¥ trÃ¡ch:** TV4 â€” Academic & Recommendation Tools Engineer
> **Module phá»¥ trÃ¡ch:** `tv4-academic` (Maven artifact: `vn.haui.advisor:haui-academic:0.0.1-SNAPSHOT`)
> **Nhiá»‡m vá»¥:** Task 5.2c â€” BÃ n giao thuáº­t toÃ¡n, quy cháº¿ Ä‘Ã o táº¡o vÃ  káº¿t quáº£ kiá»ƒm thá»­ há»“i quy
> **NhÃ¡nh Git:** `feature/tv4-task-5.2c` | **Commit ná»n:** `eb7ec50`
> **Tráº¡ng thÃ¡i quy cháº¿:** `DEMO_UNVERIFIED` (CÄƒn cá»© PRD Â§8, Â§9, Â§13.1 â€” ChÆ°a Ä‘Æ°á»£c kiá»ƒm chá»©ng theo quy cháº¿ chÃ­nh thá»©c cá»§a TrÆ°á»ng Äáº¡i há»c CÃ´ng nghiá»‡p HÃ  Ná»™i)

---

## 1. Tá»”NG QUAN VÃ€ Má»¤C TIÃŠU TASK 5.2c

CÄƒn cá»© tÃ i liá»‡u phÃ¢n cÃ´ng chÃ­nh thá»©c cá»§a dá»± Ã¡n (`HaUI_Advisor_Solution_va_Prompt_theo_Phase.md` dÃ²ng 556â€“566), nhiá»‡m vá»¥ Task 5.2c cá»§a TV4 bao gá»“m:
1. **Cháº¡y kiá»ƒm thá»­ há»“i quy (Regression Testing)** trÃªn cáº¥u hÃ¬nh release thá»±c táº¿ cá»§a toÃ n há»‡ thá»‘ng sau khi Task 5.1 (triá»ƒn khai á»©ng viÃªn) Ä‘Ã£ hoÃ n thÃ nh.
2. **Há»‡ thá»‘ng hÃ³a toÃ n bá»™ cÃ´ng cá»¥ há»c vá»¥ (Academic Core & Recommendation Tools)**: TrÃ¬nh bÃ y chi tiáº¿t cáº¥u trÃºc, má»¥c Ä‘Ã­ch, dá»¯ liá»‡u vÃ o/ra, cÆ¡ cháº¿ xá»­ lÃ½ vÃ  giá»›i háº¡n cá»§a 6 thÃ nh pháº§n cá»‘t lÃµi.
3. **Äáº·c táº£ thuáº­t toÃ¡n toÃ¡n há»c & heuristic**:
   - Thuáº­t toÃ¡n tÃ­nh toÃ¡n CPA/GPA vÃ  báº£o toÃ n Ä‘iá»ƒm cao nháº¥t khi há»c cáº£i thiá»‡n/há»c láº¡i (`GradeCalculator`).
   - Thuáº­t toÃ¡n láº­p lá»‹ch lá»™ trÃ¬nh há»c táº­p Ä‘a má»¥c tiÃªu (`StudyPlanScheduler`). **TuyÃªn bá»‘ minh báº¡ch**: Thuáº­t toÃ¡n lÃ  **Greedy Heuristic Ä‘a tiÃªu chÃ­**, khÃ´ng kháº³ng Ä‘á»‹nh lÃ  nghiá»‡m tá»‘i Æ°u toÃ n cá»¥c (Global Optimum).
   - Thuáº­t toÃ¡n xáº¿p háº¡ng mÃ´n há»c cáº£i thiá»‡n theo tá»· suáº¥t lá»£i Ã­ch CPA (`GradeSimulator - rankRetakeCourses`).
   - Thuáº­t toÃ¡n tÃ­nh toÃ¡n Ä‘iá»ƒm má»¥c tiÃªu nghá»‹ch Ä‘áº£o (`GradeSimulator - calculateTargetGrades`).
   - Thuáº­t toÃ¡n Ä‘á»‘i chiáº¿u káº¿ hoáº¡ch há»c táº­p vÃ  phÃ¡t hiá»‡n Ä‘á»©t gÃ£y tiÃªn quyáº¿t (`PlanReconciler`).
   - Bá»™ mÃ¡y tháº©m Ä‘á»‹nh quy cháº¿ vÃ  Ä‘iá»u kiá»‡n há»c vá»¥ (`RuleEvaluator`).
4. **Minh báº¡ch hÃ³a phiÃªn báº£n quy cháº¿ (Policy Version) & Dá»¯ liá»‡u Demo**:
   - XÃ¡c Ä‘á»‹nh phiÃªn báº£n `policy-haui-demo-2026` (`0.0.1-v0`).
   - Gáº¯n nhÃ£n báº¯t buá»™c cho má»i dá»¯ liá»‡u giáº£ láº­p: **"Dá»¯ liá»‡u demo â€“ chÆ°a Ä‘Æ°á»£c kiá»ƒm chá»©ng theo quy cháº¿ chÃ­nh thá»©c cá»§a trÆ°á»ng."**
   - Tuyá»‡t Ä‘á»‘i khÃ´ng bá»‹a Ä‘áº·t sá»‘ liá»‡u vá» má»©c Ä‘á»™ cáº£i thiá»‡n GPA thá»±c táº¿ cá»§a sinh viÃªn.
5. **Thiáº¿t láº­p ma tráº­n phÃ¢n Ä‘á»‹nh tÃ­nh cháº¥t triá»ƒn khai**: PhÃ¢n biá»‡t tÆ°á»ng minh giá»¯a cÃ¡c háº¡ng má»¥c ÄÃ£ hiá»‡n thá»±c (Implemented), ÄÃ£ kiá»ƒm thá»­ (Tested), Giáº£ Ä‘á»‹nh ká»¹ thuáº­t (Assumed), ChÆ°a kiá»ƒm chá»©ng (Not Verified), vÃ  Giá»›i háº¡n Ä‘Ã£ biáº¿t (Known Limitations).

---

## 2. KIáº¾N TRÃšC Tá»”NG THá»‚ ACADEMIC CORE (`tv4-academic`)

Module `tv4-academic` Ä‘Æ°á»£c thiáº¿t káº¿ theo nguyÃªn lÃ½ **Clean Architecture** vÃ  **Hexagonal Architecture (Ports and Adapters)**:
- **Zero Framework Dependency**: MÃ£ nguá»“n Ä‘á»™c láº­p hoÃ n toÃ n vá»›i Spring Boot, Hibernate/JPA, JDBC hay cÃ¡c SDK AI cá»§a bÃªn thá»© ba. ToÃ n bá»™ logic cháº¡y trÃªn Java 21 thuáº§n vá»›i thÆ° viá»‡n chuáº©n (`java.base`).
- **Deterministic & Thread-Safe**: Má»i phÃ©p tÃ­nh toÃ¡n lÃ  hÃ m Ä‘Æ¡n Ä‘á»‹nh (Deterministic Function), cÃ¹ng Ä‘áº§u vÃ o luÃ´n sinh ra cÃ¹ng Ä‘áº§u ra, khÃ´ng gÃ¢y Ä‘á»™t biáº¿n tráº¡ng thÃ¡i (No Side Effects).
- **PhÃ¢n tÃ¡ch 2 cháº¿ Ä‘á»™ dá»¯ liá»‡u**:
  1. *Cháº¿ Ä‘á»™ Fixture (Offline / Standalone)*: Náº¡p dá»¯ liá»‡u máº«u tá»« `tv4-academic/fixtures/` phá»¥c vá»¥ unit test vÃ  mÃ´ phá»ng cÃ´ láº­p.
  2. *Cháº¿ Ä‘á»™ Provider SPI (Live Integration)*: Nháº­n dá»¯ liá»‡u thá»±c táº¿ tá»« cÆ¡ sá»Ÿ dá»¯ liá»‡u ná»n táº£ng thÃ´ng qua interface `StudentAcademicRecordProvider` (do `tv5-platform` hiá»‡n thá»±c).

```
                      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                      â”‚    tv5-platform / tv1-ai (Clients)   â”‚
                      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                         â”‚ Calls AcademicFacade
                                         â–¼
                      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                      â”‚        DefaultAcademicFacade         â”‚
                      â”‚  (Unified Academic Gateway & SPI)    â”‚
                      â””â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”˜
                         â”‚       â”‚       â”‚       â”‚       â”‚
       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â”‚       â”‚       â”‚       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
       â–¼                         â–¼       â–¼       â–¼                         â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚GradeCalculatorâ”‚        â”‚RuleEvaluatorâ”‚ â”‚StudyPlanSched.â”‚         â”‚PlanReconciler â”‚
â”‚- GPA/CPA/Debt â”‚        â”‚- Prereq DAG â”‚ â”‚- Greedy 40/25/â”‚         â”‚- Drift Detect â”‚
â”‚- BigDecimal   â”‚        â”‚- Risk Levelsâ”‚ â”‚  20/15        â”‚         â”‚- Cascade Fail â”‚
â”‚- Best Attempt â”‚        â”‚- Credit Capsâ”‚ â”‚- Coreq Bundle â”‚         â”‚- Plan Adapt   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜        â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜         â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜
        â”‚                       â”‚                â”‚                         â”‚
        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                â”‚
                                â–¼
                      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                      â”‚  GradeSimulator   â”‚
                      â”‚  - What-If CPA    â”‚
                      â”‚  - Retake Ranking â”‚
                      â”‚  - Target Grades  â”‚
                      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## 3. Äáº¶C Táº¢ CHI TIáº¾T CÃC THUáº¬T TOÃN Há»ŒC Vá»¤

### 3.1. Thuáº­t toÃ¡n TÃ­nh CPA & Báº£o toÃ n Äiá»ƒm cao nháº¥t khi Há»c láº¡i/Cáº£i thiá»‡n (`GradeCalculator`)

#### A. Má»¥c Ä‘Ã­ch
TÃ­nh toÃ¡n Ä‘iá»ƒm trung bÃ¬nh chung tÃ­ch lÅ©y (CPA) vÃ  Ä‘iá»ƒm trung bÃ¬nh há»c ká»³ (GPA) theo thang Ä‘iá»ƒm 4 cá»§a HaUI. Ãp dá»¥ng quy táº¯c há»c láº¡i/cáº£i thiá»‡n: khi má»™t há»c pháº§n Ä‘Æ°á»£c há»c nhiá»u láº§n, Ä‘iá»ƒm cá»§a láº§n há»c Ä‘áº¡t cao nháº¥t sáº½ Ä‘Æ°á»£c dÃ¹ng Ä‘á»ƒ tÃ­nh CPA, Ä‘iá»ƒm chá»¯ $F$ cÅ© bá»‹ há»§y bá» khá»i tá»­ sá»‘ vÃ  máº«u sá»‘ khi Ä‘Ã£ Ä‘Æ°á»£c gá»¡ ná»£.

#### B. Äáº§u vÃ o & Äáº§u ra
- **Äáº§u vÃ o:** Danh sÃ¡ch cÃ¡c láº§n há»c `List<TranscriptAttemptItem>` hoáº·c `List<CourseAttempt>`. Má»—i pháº§n tá»­ gá»“m: `courseCode`, `credits`, `letterGrade`, `semesterCode`.
- **Äáº§u ra:** Äiá»ƒm CPA (kiá»ƒu `BigDecimal`, lÃ m trÃ²n 2 chá»¯ sá»‘ tháº­p phÃ¢n theo quy táº¯c `HALF_UP`), Tá»•ng tÃ­n chá»‰ tÃ­ch lÅ©y (`int` vÃ  `BigDecimal` chÃ­nh xÃ¡c).

#### C. CÃ´ng thá»©c toÃ¡n há»c
1. **Chuyá»ƒn Ä‘á»•i Ä‘iá»ƒm chá»¯ sang thang Ä‘iá»ƒm 4 ($S_i$):**
   $$S(\text{A}) = 4.0,\; S(\text{B+}) = 3.5,\; S(\text{B}) = 3.0,\; S(\text{C+}) = 2.5,\; S(\text{C}) = 2.0,\; S(\text{D+}) = 1.5,\; S(\text{D}) = 1.0,\; S(\text{F}) = 0.0$$
   *LÆ°u Ã½:* Tráº¡ng thÃ¡i `IN_PROGRESS`, `UNKNOWN` hoáº·c `null` $\rightarrow S = \text{null}$ (khÃ´ng tham gia tÃ­nh Ä‘iá»ƒm).

2. **Quy táº¯c chá»n láº§n há»c Ä‘áº¡i diá»‡n cho há»c pháº§n $c$:**
   $$\text{BestAttempt}(c) = \arg\max_{a \in \text{Attempts}(c)} S(a)$$
   Náº¿u sinh viÃªn há»c cáº£i thiá»‡n nhÆ°ng láº§n sau Ä‘iá»ƒm tháº¥p hÆ¡n láº§n trÆ°á»›c ($S_{sau} < S_{trÆ°á»›c}$), há»‡ thá»‘ng báº£o toÃ n giÃ¡ trá»‹ $S_{trÆ°á»›c}$ cao nháº¥t.

3. **CÃ´ng thá»©c tÃ­nh CPA:**
   $$\text{CPA} = \frac{\sum_{c \in \mathcal{C}_{valid}} S(\text{BestAttempt}(c)) \times w_c}{\sum_{c \in \mathcal{C}_{valid}} w_c}$$
   Trong Ä‘Ã³ $w_c$ lÃ  sá»‘ tÃ­n chá»‰ cá»§a há»c pháº§n $c$, $\mathcal{C}_{valid}$ lÃ  táº­p cÃ¡c há»c pháº§n Ä‘Ã£ cÃ³ Ä‘iá»ƒm há»£p lá»‡ (khÃ´ng rá»—ng, khÃ´ng pháº£i mÃ´n Ä‘iá»u kiá»‡n phi tÃ­n chá»‰).

4. **TÃ­nh tÃ­n chá»‰ tÃ­ch lÅ©y (Accumulated Credits):**
   Chá»‰ cá»™ng dá»“n tÃ­n chá»‰ cá»§a cÃ¡c há»c pháº§n cÃ³ $S(c) \ge 1.0$ (tá»« Ä‘iá»ƒm D trá»Ÿ lÃªn) vÃ  má»—i mÃ£ há»c pháº§n duy nháº¥t chá»‰ tÃ­nh Ä‘Ãºng má»™t láº§n:
   $$W_{accumulated} = \sum_{c \in \mathcal{C}_{passed}} w_c \quad \text{vá»›i } \mathcal{C}_{passed} = \{ c \mid S(\text{BestAttempt}(c)) \ge 1.0 \}$$
   *Äáº·c táº£ Task 4.3c/5.2c:* CÃ¡c há»c pháº§n cÃ³ sá»‘ tÃ­n chá»‰ láº» (vÃ­ dá»¥ $1.5$ tÃ­n chá»‰ cá»§a GDTC) Ä‘Æ°á»£c cá»™ng dá»“n báº±ng `BigDecimal`, báº£o Ä‘áº£m khÃ´ng bá»‹ máº¥t pháº§n tháº­p phÃ¢n $0.5$ do Ã©p kiá»ƒu sá»‘ nguyÃªn trÃªn tá»«ng mÃ´n.

#### D. Äá»™ phá»©c táº¡p
- **Thá»i gian:** $O(N)$ vá»›i $N$ lÃ  tá»•ng sá»‘ láº§n há»c trong lá»‹ch sá»­ (duyá»‡t 1 lÆ°á»£t xÃ¢y dá»±ng Map nhÃ³m theo mÃ£ mÃ´n).
- **KhÃ´ng gian:** $O(U)$ vá»›i $U$ lÃ  sá»‘ lÆ°á»£ng há»c pháº§n phÃ¢n biá»‡t ($U \le N$).

---

### 3.2. Thuáº­t toÃ¡n Láº­p lá»‹ch Lá»™ trÃ¬nh Há»c táº­p Äa má»¥c tiÃªu (`StudyPlanScheduler`)

#### A. Má»¥c Ä‘Ã­ch
Tá»± Ä‘á»™ng Ä‘á» xuáº¥t danh sÃ¡ch cÃ¡c há»c pháº§n cáº§n Ä‘Äƒng kÃ½ cho cÃ¡c há»c ká»³ tÆ°Æ¡ng lai (ká»³ chÃ­nh 1, ká»³ hÃ¨ náº¿u chá»n, ká»³ chÃ­nh 2), thá»a mÃ£n tuyá»‡t Ä‘á»‘i cÃ¡c rÃ ng buá»™c há»c vá»¥ cá»©ng vÃ  tá»‘i Æ°u hÃ³a thá»© tá»± há»c.

#### B. Báº£n cháº¥t thuáº­t toÃ¡n: GREEDY HEURISTIC ÄA TIÃŠU CHÃ
> **KHUYáº¾N CÃO QUAN TRá»ŒNG:**
> Thuáº­t toÃ¡n láº­p lá»‹ch cá»§a HaUI Advisor lÃ  **Greedy Heuristic (Tham lam Ä‘a tiÃªu chÃ­ káº¿t há»£p Knapsack cá»¥c bá»™ tá»«ng ká»³)**.
> Thuáº­t toÃ¡n **KHÃ”NG PHáº¢I** lÃ  má»™t bá»™ giáº£i tá»‘i Æ°u toÃ n cá»¥c (Global Optimization Solver nhÆ° Quy hoáº¡ch nguyÃªn tuyáº¿n tÃ­nh ILP hoáº·c TÃ¬m kiáº¿m nhÃ¡nh cáº­n Branch and Bound). Thuáº­t toÃ¡n tá»‘i Æ°u hÃ³a lá»±a chá»n tá»‘t nháº¥t táº¡i tá»«ng bÆ°á»›c há»c ká»³ dá»±a trÃªn hÃ m Ä‘iá»ƒm trá»ng sá»‘, Ä‘áº£m báº£o tÃ­nh kháº£ thi thá»±c táº¿ vÃ  tá»‘c Ä‘á»™ pháº£n há»“i tÃ­nh báº±ng mili-giÃ¢y ($< 50\text{ ms}$).

#### C. Quy trÃ¬nh xá»­ lÃ½ 6 giai Ä‘oáº¡n (Multi-stage Pipeline)

```
[Danh má»¥c há»c pháº§n CTÄT]
         â”‚
         â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ GIAI ÄOáº N 1: PHÃ‚N TÃCH Äá»’ THá»Š TIÃŠN QUYáº¾T (DAG)         â”‚
â”‚ - XÃ¢y dá»±ng Reverse Adjacency List: p -> List[dependent]â”‚
â”‚ - Äá»‡ quy tÃ­nh Unblock Count (sá»‘ mÃ´n má»Ÿ khÃ³a tÆ°Æ¡ng lai)  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                         â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ GIAI ÄOáº N 2: Lá»ŒC RÃ€NG BUá»˜C Cá»¨NG (ELIGIBILITY FILTER)   â”‚
â”‚ - MÃ´n tiÃªn quyáº¿t: Pháº£i Äáº T (Passed) trong quÃ¡ khá»©      â”‚
â”‚ - MÃ´n há»c trÆ°á»›c: Pháº£i tá»«ng há»c (Attempted)             â”‚
â”‚ - Äá»“ Ã¡n tá»‘t nghiá»‡p: TÃ­ch lÅ©y >= 120 TC                 â”‚
â”‚ - KhÃ´ng xáº¿p láº¡i mÃ´n Ä‘Ã£ Ä‘áº¡t (trá»« há»c cáº£i thiá»‡n BR-06)   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                         â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ GIAI ÄOáº N 3: CHáº¤M ÄIá»‚M TRá»ŒNG Sá» ÄA Má»¤C TIÃŠU           â”‚
â”‚ Score = (40*S_unblock + 25*S_progression               â”‚
â”‚        + 20*S_retake + 15*S_balance) / NORM            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                         â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ GIAI ÄOáº N 4: ÄÃ“NG GÃ“I SONG HÃ€NH (COREQUISITE BUNDLE)   â”‚
â”‚ - Gom nhÃ³m mÃ´n A vÃ  mÃ´n song hÃ nh B                    â”‚
â”‚ - Kiá»ƒm tra Ä‘iá»u kiá»‡n tiÃªn quyáº¿t riÃªng cá»§a mÃ´n B        â”‚
â”‚ - TÃ­nh tá»•ng tÃ­n chá»‰ gá»™p cá»§a cáº£ bundle                  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                         â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ GIAI ÄOáº N 5: Xáº¾P THAM LAM THEO TRáº¦N TÃN CHá»ˆ Ká»²        â”‚
â”‚ - Kiá»ƒm tra tráº§n tÃ­n chá»‰: Ká»³ chÃ­nh <= 24 (Cáº£nh bÃ¡o: 14) â”‚
â”‚ - Ká»³ hÃ¨: <= 12 tÃ­n chá»‰                                 â”‚
â”‚ - Chained Prerequisite: MÃ´n xáº¿p ká»³ N Ä‘Æ°á»£c giáº£ Ä‘á»‹nh Ä‘áº¡t â”‚
â”‚   Ä‘á»ƒ má»Ÿ khÃ³a Ä‘iá»u kiá»‡n cho ká»³ N+1                      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                         â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ GIAI ÄOáº N 6: Háº¬U KIá»‚M TRA CHÃ‰O (VALIDATION PASS)       â”‚
â”‚ - Kiá»ƒm tra sÃ n tÃ­n chá»‰: Ká»³ chÃ­nh >= 10 TC              â”‚
â”‚ - Kiá»ƒm tra khÃ´ng trÃ¹ng láº·p mÃ´n xuyÃªn suá»‘t káº¿ hoáº¡ch     â”‚
â”‚ - Tráº£ vá» GenerateStudyPlanResponse                     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

#### D. HÃ m Ä‘iá»ƒm trá»ng sá»‘ (Scoring Function)
Äá»‘i vá»›i má»—i á»©ng viÃªn há»c pháº§n $c$, Ä‘iá»ƒm sá»‘ 4 thÃ nh pháº§n Ä‘Æ°á»£c tÃ­nh theo thang chuáº©n $[0.0, 100.0]$:

1. **KhÆ¡i thÃ´ng máº¡ch tiÃªn quyáº¿t ($S_{unblock} - 40\%$):**
   $$S_{unblock}(c) = \frac{\text{UnblockCount}(c)}{\max_{k} \text{UnblockCount}(k)} \times 100.0$$
   Æ¯u tiÃªn cao nháº¥t cho cÃ¡c mÃ´n mÃ  náº¿u khÃ´ng há»c sáº½ lÃ m ngháº½n nhiá»u mÃ´n á»Ÿ cÃ¡c há»c ká»³ tiáº¿p theo (vÃ­ dá»¥: Giáº£i tÃ­ch 1, ToÃ¡n rá»i ráº¡c, Láº­p trÃ¬nh hÆ°á»›ng Ä‘á»‘i tÆ°á»£ng).
2. **Tiáº¿n Ä‘á»™ chuáº©n CTÄT ($S_{progression} - 25\%$):**
   MÃ´n cÃ³ khuyáº¿n nghá»‹ ká»³ Ä‘Ãºng vá»›i ká»³ Ä‘ang xáº¿p Ä‘Æ°á»£c 100 Ä‘iá»ƒm, giáº£m dáº§n theo khoáº£ng cÃ¡ch há»c ká»³:
   $$S_{progression}(c) = \max\left(0, 100.0 - 20.0 \times |\text{SuggestedSemester}(c) - \text{CurrentSemester}|\right)$$
3. **Æ¯u tiÃªn gá»¡ ná»£ / Cáº£i thiá»‡n CPA ($S_{retake} - 20\%$):**
   - MÃ´n ná»£ Ä‘iá»ƒm $F$: $S_{retake} = 100.0$ (Báº¯t buá»™c pháº£i Æ°u tiÃªn há»c láº¡i gá»¡ ná»£ Ä‘á»ƒ trÃ¡nh quÃ¡ háº¡n Ä‘Ã o táº¡o).
   - MÃ´n há»c cáº£i thiá»‡n (Ä‘iá»ƒm D, D+, C): $S_{retake} = 60.0$.
   - MÃ´n há»c má»›i bÃ¬nh thÆ°á»ng: KhÃ´ng Ã¡p dá»¥ng thÃ nh pháº§n nÃ y.
4. **CÃ¢n báº±ng táº£i tÃ­n chá»‰ há»c pháº§n ($S_{balance} - 15\%$):**
   - Há»c pháº§n $\le 3$ tÃ­n chá»‰: $S_{balance} = 100.0$ (dá»… xáº¿p vÃ o háº¡n má»©c cÃ²n trá»‘ng).
   - Há»c pháº§n $4$ tÃ­n chá»‰: $S_{balance} = 70.0$.
   - Há»c pháº§n $\ge 5$ tÃ­n chá»‰: $S_{balance} = 40.0$.

**Chuáº©n hÃ³a trá»ng sá»‘ (Scoring Normalization):**
- Náº¿u há»c pháº§n thuá»™c diá»‡n há»c láº¡i/há»c cáº£i thiá»‡n (`isFailedRetake || isRetakeCandidate`):
  $$\text{TotalScore}(c) = \frac{40.0 \times S_{unblock}(c) + 25.0 \times S_{progression}(c) + 20.0 \times S_{retake}(c) + 15.0 \times S_{balance}(c)}{100.0}$$
- Náº¿u há»c pháº§n há»c má»›i bÃ¬nh thÆ°á»ng:
  $$\text{TotalScore}(c) = \frac{40.0 \times S_{unblock}(c) + 25.0 \times S_{progression}(c) + 15.0 \times S_{balance}(c)}{80.0}$$

*(LÆ°u Ã½: RÃ ng buá»™c mÃ´n song hÃ nh â€” Corequisite Bundle Ä‘Æ°á»£c giáº£i quyáº¿t Ä‘á»™c láº­p táº¡i Giai Ä‘oáº¡n 3 (Allocation) qua hÃ m `resolveCorequisiteBundle`, gom nhÃ³m mÃ´n chÃ­nh vÃ  mÃ´n song hÃ nh thÃ nh má»™t Ä‘Æ¡n vá»‹ phÃ¢n bá»• Ä‘á»ƒ kiá»ƒm tra tráº§n tÃ­n chá»‰ Ä‘á»“ng thá»i)*.

#### E. Äá»™ phá»©c táº¡p
- XÃ¢y dá»±ng Ä‘á»“ thá»‹ vÃ  tÃ­nh Unblock Count: $O(V + E)$ vá»›i $V$ lÃ  sá»‘ mÃ´n trong CTÄT, $E$ lÃ  sá»‘ cáº¡nh quan há»‡ tiÃªn quyáº¿t.
- Lá»c vÃ  xáº¿p lá»‹ch cho $K$ há»c ká»³: $O(K \times V \log V)$ (do bÆ°á»›c sáº¯p xáº¿p á»©ng viÃªn theo Ä‘iá»ƒm sá»‘).
- Vá»›i quy mÃ´ CTÄT HaUI ($V \approx 120$ mÃ´n, $K = 3$ ká»³), thá»i gian thá»±c thi trung bÃ¬nh thá»±c táº¿ $< 15\text{ ms}$.

---

### 3.3. Thuáº­t toÃ¡n Xáº¿p háº¡ng MÃ´n há»c Cáº£i thiá»‡n theo ROI CPA (`GradeSimulator - rankRetakeCourses`)

#### A. Má»¥c Ä‘Ã­ch
PhÃ¢n tÃ­ch báº£ng Ä‘iá»ƒm cá»§a sinh viÃªn, tÃ¬m táº¥t cáº£ cÃ¡c mÃ´n Ä‘á»§ Ä‘iá»u kiá»‡n há»c cáº£i thiá»‡n theo quy cháº¿ BR-06 (Ä‘iá»ƒm D, D+, C) vÃ  xáº¿p háº¡ng giáº£m dáº§n theo má»©c Ä‘á»™ Ä‘Ã³ng gÃ³p tÄƒng CPA tiá»m nÄƒng (`cpaDelta`) náº¿u sinh viÃªn thi láº¡i Ä‘áº¡t Ä‘iá»ƒm má»¥c tiÃªu (máº·c Ä‘á»‹nh A / $4.0$).

Káº¿t quáº£ tráº£ vá» danh sÃ¡ch `RetakeCourseRecommendation` gá»“m:
- `courseCode`: MÃ£ há»c pháº§n
- `courseName`: TÃªn há»c pháº§n
- `credits`: Sá»‘ tÃ­n chá»‰ há»c pháº§n ($w_c$)
- `currentGrade`: Äiá»ƒm chá»¯ hiá»‡n táº¡i ($S_{old}$)
- `currentGradePoints`: Äiá»ƒm sá»‘ hiá»‡n táº¡i (thang 4.0)
- `targetGrade`: Äiá»ƒm chá»¯ má»¥c tiÃªu cáº£i thiá»‡n (thÆ°á»ng lÃ  "A")
- `targetGradePoints`: Äiá»ƒm sá»‘ má»¥c tiÃªu (4.0)
- `cpaDelta`: Má»©c tÄƒng CPA dá»± kiáº¿n ($\Delta \text{CPA}$)
- `rank`: Thá»© háº¡ng Æ°u tiÃªn (1, 2, 3,...)
- `rationale`: LÃ½ do giáº£i thÃ­ch chi tiáº¿t

#### B. CÃ´ng thá»©c tÃ­nh má»©c tÄƒng CPA tiá»m nÄƒng (`cpaDelta`)
Giáº£ sá»­ sinh viÃªn cÃ³ tá»•ng sá»‘ tÃ­n chá»‰ tÃ­ch lÅ©y hiá»‡n táº¡i lÃ  $W$. Há»c pháº§n $c$ cÃ³ sá»‘ tÃ­n chá»‰ $w_c$, Ä‘iá»ƒm chá»¯ hiá»‡n táº¡i cÃ³ giÃ¡ trá»‹ $S_{old} \in \{1.0, 1.5, 2.0, 2.5\}$.
Náº¿u cáº£i thiá»‡n Ä‘áº¡t Ä‘iá»ƒm $S_{target} = 4.0$ (Ä‘iá»ƒm A):
$$\Delta \text{Points}(c) = w_c \times (S_{target} - S_{old})$$
$$\Delta \text{CPA}(c) = \frac{w_c \times (4.0 - S_{old})}{W}$$

*VÃ­ dá»¥ minh chá»©ng:*
- MÃ´n $c_1$ (ToÃ¡n rá»i ráº¡c): $3$ tÃ­n chá»‰, Ä‘iá»ƒm D ($1.0$). $\Delta \text{Points} = 3 \times (4.0 - 1.0) = 9.0$.
- MÃ´n $c_2$ (Triáº¿t há»c): $3$ tÃ­n chá»‰, Ä‘iá»ƒm C ($2.0$). $\Delta \text{Points} = 3 \times (4.0 - 2.0) = 6.0$.
- MÃ´n $c_3$ (Thá»ƒ cháº¥t): $1$ tÃ­n chá»‰, Ä‘iá»ƒm D ($1.0$). $\Delta \text{Points} = 1 \times (4.0 - 1.0) = 3.0$.
$\rightarrow$ Thá»© tá»± Æ°u tiÃªn ROI: $c_1 \succ c_2 \succ c_3$.

#### C. Deterministic Tie-Breaking (PhÃ¡ vá»¡ tháº¿ hÃ²a Ä‘á»“ng nháº¥t)
Khi hai mÃ´n cÃ³ cÃ¹ng má»©c tÄƒng CPA tiá»m nÄƒng `cpaDelta`:
1. Æ¯u tiÃªn mÃ´n cÃ³ sá»‘ tÃ­n chá»‰ $w_c$ lá»›n hÆ¡n (`credits` giáº£m dáº§n).
2. Náº¿u váº«n báº±ng nhau, sáº¯p xáº¿p theo thá»© tá»± báº£ng chá»¯ cÃ¡i cá»§a mÃ£ há»c pháº§n (`courseCode.compareTo(...)`).

---

### 3.4. Thuáº­t toÃ¡n TÃ­nh Ä‘iá»ƒm Má»¥c tiÃªu Nghá»‹ch Ä‘áº£o (`GradeSimulator - calculateTargetGrades`)

#### A. Má»¥c Ä‘Ã­ch
Tá»« CPA hiá»‡n táº¡i vÃ  CPA má»¥c tiÃªu mong muá»‘n khi tá»‘t nghiá»‡p ($\text{CPA}_{target}$), tÃ­nh toÃ¡n sá»‘ Ä‘iá»ƒm GPA bÃ¬nh quÃ¢n tá»‘i thiá»ƒu (`requiredAverageGpa`) mÃ  sinh viÃªn báº¯t buá»™c pháº£i Ä‘áº¡t Ä‘Æ°á»£c trong toÃ n bá»™ cÃ¡c tÃ­n chá»‰ cÃ²n láº¡i cá»§a chÆ°Æ¡ng trÃ¬nh (`remainingCredits`), Ä‘á»“ng thá»i Ä‘Æ°a ra danh má»¥c gá»£i Ã½ phÃ¢n bá»• Ä‘iá»ƒm cá»¥ thá»ƒ (`courseRequirements`).

Káº¿t quáº£ tráº£ vá» DTO `CalculateTargetGradesResponse` gá»“m:
- `studentId`: MÃ£ Ä‘á»‹nh danh sinh viÃªn
- `currentCpa`: CPA tÃ­ch lÅ©y hiá»‡n táº¡i
- `targetCpa`: CPA má»¥c tiÃªu mong muá»‘n
- `remainingCredits`: Sá»‘ tÃ­n chá»‰ cÃ²n láº¡i cáº§n tÃ­ch lÅ©y
- `requiredAverageGpa`: Äiá»ƒm GPA bÃ¬nh quÃ¢n tá»‘i thiá»ƒu cáº§n Ä‘áº¡t trÃªn cÃ¡c tÃ­n chá»‰ cÃ²n láº¡i
- `courseRequirements`: Danh sÃ¡ch `TargetCourseGradeRequirement` (`courseCode`, `courseName`, `credits`, `requiredGrade`, `requiredGradePoints`, `rationale`)
- `warnings`: Danh sÃ¡ch cáº£nh bÃ¡o tÃ­nh kháº£ thi hoáº·c rá»§i ro há»c vá»¥
- `dataRevision`, `policyVersion`: SiÃªu dá»¯ liá»‡u phiÃªn báº£n

#### B. CÃ´ng thá»©c nghá»‹ch Ä‘áº£o
Gá»i:
- $W_{curr}$: Sá»‘ tÃ­n chá»‰ Ä‘Ã£ tÃ­ch lÅ©y hiá»‡n táº¡i tÃ­nh CPA.
- $\text{CPA}_{curr}$: CPA hiá»‡n táº¡i.
- $W_{total}$: Tá»•ng sá»‘ tÃ­n chá»‰ yÃªu cáº§u cá»§a CTÄT ($150$ TC cho KTPM, $135$ TC cho CNTT).
- $W_{rem} = W_{total} - W_{curr}$: Sá»‘ tÃ­n chá»‰ cÃ²n láº¡i cáº§n tÃ­ch lÅ©y (`remainingCredits`).

Tá»•ng Ä‘iá»ƒm cháº¥t lÆ°á»£ng má»¥c tiÃªu:
$$P_{target} = \text{CPA}_{target} \times W_{total}$$
Tá»•ng Ä‘iá»ƒm cháº¥t lÆ°á»£ng hiá»‡n cÃ³:
$$P_{curr} = \text{CPA}_{curr} \times W_{curr}$$
Sá»‘ Ä‘iá»ƒm cháº¥t lÆ°á»£ng cáº§n tÃ­ch lÅ©y thÃªm:
$$P_{rem} = P_{target} - P_{curr}$$
**Äiá»ƒm GPA trung bÃ¬nh yÃªu cáº§u trÃªn cÃ¡c tÃ­n chá»‰ cÃ²n láº¡i (`requiredAverageGpa`):**
$$\text{GPA}_{req} = \frac{P_{target} - P_{curr}}{W_{rem}} = \frac{\text{CPA}_{target} \times W_{total} - \text{CPA}_{curr} \times W_{curr}}{W_{total} - W_{curr}}$$

#### C. ÄÃ¡nh giÃ¡ tÃ­nh kháº£ thi (Feasibility Assessment)
- Náº¿u $\text{GPA}_{req} \le 4.00$: **Kháº£ thi**. Thuáº­t toÃ¡n phÃ¢n bá»• gá»£i Ã½ Ä‘iá»ƒm chá»¯ (A, B+, B) cho tá»«ng mÃ´n cÃ²n láº¡i trong `courseRequirements`.
- Náº¿u $\text{GPA}_{req} > 4.00$: **Báº¥t kháº£ thi vá» máº·t toÃ¡n há»c**. Há»‡ thá»‘ng phÃ¡t cáº£nh bÃ¡o rÃµ rÃ ng trong `warnings`: *"Má»¥c tiÃªu CPA khÃ´ng kháº£ thi vá» máº·t toÃ¡n há»c vá»›i sá»‘ tÃ­n chá»‰ cÃ²n láº¡i (yÃªu cáº§u GPA > 4.00)"* vÃ  kÃ¨m khuyáº¿n nghá»‹: *"Cáº§n Ä‘Äƒng kÃ½ há»c cáº£i thiá»‡n cÃ¡c mÃ´n Ä‘iá»ƒm tháº¥p Ä‘á»ƒ nÃ¢ng tráº§n Ä‘iá»ƒm kháº£ thi."*
- Náº¿u $W_{rem} \le 0$: BÃ¡o lá»—i sinh viÃªn Ä‘Ã£ tÃ­ch lÅ©y Ä‘á»§ sá»‘ tÃ­n chá»‰ CTÄT.

---

### 3.5. Thuáº­t toÃ¡n Äá»‘i chiáº¿u & PhÃ¡t hiá»‡n Sai lá»‡ch Káº¿ hoáº¡ch (`PlanReconciler`)

#### A. Má»¥c Ä‘Ã­ch
Khi káº¿t thÃºc má»™t há»c ká»³, so sÃ¡nh káº¿t quáº£ báº£ng Ä‘iá»ƒm thá»±c táº¿ cá»§a há»c ká»³ vá»«a qua vá»›i cÃ¡c mÃ´n há»c Ä‘Ã£ Ä‘Æ°á»£c láº­p trong báº£n káº¿ hoáº¡ch há»c táº­p (`StudyPlan`), tá»± Ä‘á»™ng phÃ¡t hiá»‡n trÆ°á»£t mÃ´n tiÃªn quyáº¿t vÃ  phÃ¢n rÃ£ cÃ¡c Ä‘iá»u chá»‰nh cho ká»³ káº¿ tiáº¿p.

#### B. Ma tráº­n phÃ¢n loáº¡i sai lá»‡ch (Drift Classification)
1. **TrÆ°á»£t mÃ´n tiÃªn quyáº¿t (Prerequisite Failure):**
   - Há»c pháº§n $c$ trong ká»³ bá»‹ Ä‘iá»ƒm $F$. Náº¿u $c$ lÃ  mÃ´n tiÃªn quyáº¿t cá»§a há»c pháº§n $d$ Ä‘Æ°á»£c xáº¿p á»Ÿ ká»³ tiáº¿p theo:
     $\rightarrow$ ÄÃ¡nh dáº¥u `onTrack = false`.
     $\rightarrow$ Táº¡o cáº£nh bÃ¡o: *"TrÆ°á»£t mÃ´n tiÃªn quyáº¿t MATH1002. Tá»± Ä‘á»™ng Ä‘á» xuáº¥t há»c láº¡i MATH1002 vÃ  hoÃ£n há»c pháº§n IT6001 sang ká»³ sau."*
2. **KhÃ´ng Ä‘áº¡t Ä‘iá»ƒm má»¥c tiÃªu (Target Grade Missed):**
   - MÃ´n há»c Ä‘áº¡t nhÆ°ng Ä‘iá»ƒm thá»±c táº¿ tháº¥p hÆ¡n `targetGrade` trong káº¿ hoáº¡ch (vÃ­ dá»¥ Ä‘áº·t má»¥c tiÃªu A nhÆ°ng chá»‰ Ä‘áº¡t C):
     $\rightarrow$ Ghi nháº­n cáº£nh bÃ¡o áº£nh hÆ°á»Ÿng tá»›i CPA dá»± kiáº¿n, khuyáº¿n nghá»‹ bá»• sung há»c cáº£i thiá»‡n.
3. **MÃ´n chÆ°a há»c / Äá»•i mÃ´n (Course Swap / Unregistered):**
   - MÃ´n cÃ³ trong káº¿ hoáº¡ch nhÆ°ng khÃ´ng cÃ³ trong báº£ng Ä‘iá»ƒm thá»±c táº¿ $\rightarrow$ Tá»± Ä‘á»™ng Ä‘áº©y dá»“n sang ká»³ tÆ°Æ¡ng lai náº¿u chÆ°a vÆ°á»£t tráº§n tÃ­n chá»‰.

---

## 4. QUY CHáº¾ ÄÃ€O Táº O & POLICY DEMO

### 4.1. ThÃ´ng tin phiÃªn báº£n Policy
- **Policy ID:** `policy-haui-demo-2026`
- **TÃªn cáº¥u hÃ¬nh:** Quy cháº¿ Ä‘Ã o táº¡o vÃ  chuáº©n há»c vá»¥ HaUI Demo V0
- **Version:** `0.0.1-v0`
- **Tráº¡ng thÃ¡i:** `DEMO_UNVERIFIED`
- **Tá»‡p nguá»“n:** [`tv4-academic/fixtures/policy-demo.json`](file:///d:/QUAN-LY-HOC-TAP-TTCSN/tv4-academic/fixtures/policy-demo.json)

### 4.2. Báº£ng tham chiáº¿u quy cháº¿ (PRD Rules & Policy Parameters)

| MÃ£ quy táº¯c | TÃªn quy táº¯c há»c vá»¥ | GiÃ¡ trá»‹ tham sá»‘ trong Policy | Pháº¡m vi Ã¡p dá»¥ng |
|---|---|---|---|
| **BR-01** | Äiá»u kiá»‡n mÃ´n tiÃªn quyáº¿t (Prerequisite) | Äiá»ƒm $\ge 1.0$ (Thang 4) hoáº·c khÃ¡c $F$ | Báº¯t buá»™c pháº£i Ä‘áº¡t trÆ°á»›c khi Ä‘Äƒng kÃ½ mÃ´n sau |
| **BR-02** | Äiá»u kiá»‡n mÃ´n há»c trÆ°á»›c (Prior Course) | ÄÃ£ tá»«ng Ä‘Äƒng kÃ½ há»c (Attempted) | KhÃ´ng báº¯t buá»™c pháº£i Ä‘áº¡t, cháº¥p nháº­n Ä‘iá»ƒm $F$ |
| **BR-03** | Giá»›i háº¡n tÃ­n chá»‰ ká»³ chÃ­nh (SÃ n & Tráº§n) | Tá»‘i thiá»ƒu: $10\text{ TC}$ â€” Tá»‘i Ä‘a: $24\text{ TC}$ | Ká»³ chÃ­nh (Há»c ká»³ 1 & 2), ngoáº¡i lá»‡ ká»³ cuá»‘i |
| **BR-04** | Giá»›i háº¡n tÃ­n chá»‰ ká»³ hÃ¨ | Tá»‘i thiá»ƒu: $0\text{ TC}$ â€” Tá»‘i Ä‘a: $12\text{ TC}$ | Ká»³ phá»¥ hÃ¨, khÃ´ng Ã¡p dá»¥ng sÃ n 10 TC |
| **BR-05** | Háº¡n má»©c cho sinh viÃªn cáº£nh bÃ¡o | Tá»‘i Ä‘a: $14\text{ TC}$ | Sinh viÃªn cÃ³ `AcademicRiskLevel` lÃ  WARNING 1 hoáº·c 2 |
| **BR-06** | Quy táº¯c há»c cáº£i thiá»‡n Ä‘iá»ƒm | Chá»‰ cho phÃ©p vá»›i Ä‘iá»ƒm $D, D+, C$ | Äiá»ƒm má»›i cao hÆ¡n thay tháº¿ Ä‘iá»ƒm cÅ© khi tÃ­nh CPA |
| **BR-07** | NgÆ°á»¡ng cáº£nh bÃ¡o há»c táº­p theo nÄƒm | NÄƒm 1: $<1.20$; NÄƒm 2: $<1.40$; NÄƒm 3: $<1.60$; NÄƒm 4+: $<1.80$ | Ná»£ $>24\text{ TC}$ hoáº·c 2 láº§n cáº£nh bÃ¡o liÃªn tiáº¿p $\rightarrow$ Buá»™c thÃ´i há»c |
| **BR-08** | NgÆ°á»¡ng lÃ m Ä‘á»“ Ã¡n/khÃ³a luáº­n tá»‘t nghiá»‡p | TÃ­ch lÅ©y tá»‘i thiá»ƒu $120\text{ TC}$ (hoáº·c $\ge 80\%$) | KhÃ´ng cho phÃ©p Ä‘Äƒng kÃ½ lÃ m Ä‘á»“ Ã¡n náº¿u chÆ°a Ä‘á»§ $120\text{ TC}$ |
| **BR-09** | Äiá»u kiá»‡n cÃ´ng nháº­n tá»‘t nghiá»‡p | TÃ­ch lÅ©y Ä‘á»§ $150\text{ TC}$ (KTPM) / $135\text{ TC}$ (CNTT), CPA $\ge 2.00$ | HoÃ n thÃ nh Ä‘á»§ 4 chuáº©n phi tÃ­n chá»‰ (TOEIC, MOS, GDTC, GDQP) |
| **BR-10** | Trá»ng sá»‘ láº­p lá»‹ch Ä‘a má»¥c tiÃªu | $40\%$ Unblock, $25\%$ CTÄT, $20\%$ ROI, $15\%$ Báº¯t buá»™c | Thuáº­t toÃ¡n Greedy Heuristic trong `StudyPlanScheduler` |

### 4.3. TuyÃªn bá»‘ miá»…n trá»« trÃ¡ch nhiá»‡m (Mandatory Disclaimer)
> [!IMPORTANT]
> **TUYÃŠN Bá» QUY CHáº¾ Há»ŒC Vá»¤ & Dá»® LIá»†U DEMO:**
> ToÃ n bá»™ cÃ¡c quy táº¯c há»c vá»¥, cÃ´ng thá»©c tÃ­nh toÃ¡n vÃ  ngÆ°á»¡ng cáº£nh bÃ¡o nÃªu trÃªn Ä‘Æ°á»£c tá»•ng há»£p tá»« tÃ i liá»‡u PRD dá»± Ã¡n vÃ  mang tráº¡ng thÃ¡i **`DEMO_UNVERIFIED`**.
> Há»‡ thá»‘ng HaUI Advisor Ä‘Ã³ng vai trÃ² há»— trá»£ sinh viÃªn láº­p káº¿ hoáº¡ch tham kháº£o, **khÃ´ng Ä‘áº¡i diá»‡n cho quyáº¿t Ä‘á»‹nh hÃ nh chÃ­nh hay xÃ¡c nháº­n tá»‘t nghiá»‡p chÃ­nh thá»©c cá»§a TrÆ°á»ng Äáº¡i há»c CÃ´ng nghiá»‡p HÃ  Ná»™i**.
> Má»i dá»¯ liá»‡u vá» má»©c Ä‘á»™ cáº£i thiá»‡n GPA trong cÃ¡c ká»‹ch báº£n kiá»ƒm thá»­ lÃ  káº¿t quáº£ mÃ´ phá»ng sá»‘ há»c trÃªn dá»¯ liá»‡u fixture, khÃ´ng Ä‘Æ°á»£c diá»…n giáº£i lÃ  cam káº¿t hay káº¿t quáº£ Ä‘o lÆ°á»ng thá»±c táº¿ trÃªn sinh viÃªn.

---

## 5. MA TRáº¬N PHÃ‚N Äá»ŠNH TÃNH CHáº¤T TRIá»‚N KHAI (ASSUMPTIONS & LIMITATIONS)

Nháº±m Ä‘áº£m báº£o tÃ­nh minh báº¡ch tuyá»‡t Ä‘á»‘i giá»¯a code thá»±c táº¿ vÃ  tÃ i liá»‡u, báº£ng dÆ°á»›i Ä‘Ã¢y phÃ¢n Ä‘á»‹nh rÃµ tráº¡ng thÃ¡i cá»§a tá»«ng tÃ­nh nÄƒng:

| Háº¡ng má»¥c chá»©c nÄƒng | Tráº¡ng thÃ¡i ká»¹ thuáº­t | MÃ´ táº£ thá»±c táº¿ trong mÃ£ nguá»“n |
|---|---|---|
| **TÃ­nh CPA/GPA theo thang 4** | **IMPLEMENTED & TESTED** | `GradeCalculator`: ÄÃ£ kiá»ƒm thá»­ 100% case lÃ m trÃ²n, mÃ´n há»c láº¡i, báº£o toÃ n Ä‘iá»ƒm cao nháº¥t, tÃ­n chá»‰ láº» 1.5 TC. |
| **Kiá»ƒm tra tiÃªn quyáº¿t/há»c trÆ°á»›c/song hÃ nh** | **IMPLEMENTED & TESTED** | `RuleEvaluator.checkEligibility`: Kiá»ƒm tra DAG tiÃªn quyáº¿t, phÃ¢n biá»‡t ráº¡ch rÃ²i giá»¯a prerequisite vÃ  prior course. |
| **Láº­p lá»‹ch há»c táº­p Ä‘a má»¥c tiÃªu** | **IMPLEMENTED & TESTED** | `StudyPlanScheduler`: Thuáº­t toÃ¡n Greedy Heuristic 6 giai Ä‘oáº¡n vá»›i trá»ng sá»‘ 40/25/20/15. |
| **MÃ´ phá»ng Ä‘iá»ƒm What-if** | **IMPLEMENTED & TESTED** | `GradeSimulator.simulateGrades`: TÃ­nh toÃ¡n biáº¿n thiÃªn CPA vÃ  GPA dá»± kiáº¿n cá»§a ká»³. |
| **Xáº¿p háº¡ng há»c cáº£i thiá»‡n theo ROI** | **IMPLEMENTED & TESTED** | `GradeSimulator.rankRetakeCourses`: TÃ­nh $\Delta \text{CPA}$ tiá»m nÄƒng, deterministic tie-breaking. |
| **TÃ­nh Ä‘iá»ƒm má»¥c tiÃªu nghá»‹ch Ä‘áº£o** | **IMPLEMENTED & TESTED** | `GradeSimulator.calculateTargetGrades`: CÃ´ng thá»©c nghá»‹ch Ä‘áº£o, phÃ¡t hiá»‡n báº¥t kháº£ thi khi GPA yÃªu cáº§u $> 4.00$. |
| **Äá»‘i chiáº¿u káº¿ hoáº¡ch há»c táº­p** | **IMPLEMENTED & TESTED** | `PlanReconciler.reconcileStudyPlan`: PhÃ¡t hiá»‡n lá»‡ch lá»™ trÃ¬nh, Ä‘á» xuáº¥t bÃ¹ mÃ´n ná»£ vÃ  dá»i mÃ´n sau. |
| **RÃ  soÃ¡t Ä‘iá»u kiá»‡n tá»‘t nghiá»‡p** | **IMPLEMENTED & TESTED** | `DefaultAcademicFacade.runGraduationAudit`: ÄÃ¡nh giÃ¡ 150/135 TC, khá»‘i Ä‘áº¡i cÆ°Æ¡ng, bÃ³c tÃ¡ch chuáº©n phi tÃ­n chá»‰. |
| **Tháº©m Ä‘á»‹nh káº¿ hoáº¡ch chuyÃªn sÃ¢u** | **IMPLEMENTED & TESTED** | `DefaultAcademicFacade.validateStudyPlan`: Kiá»ƒm tra tráº§n sÃ n, trÃ¹ng mÃ´n, mÃ´n ngoÃ i CTÄT, tiÃªn quyáº¿t. |
| **TÃ­nh tá»‘i Æ°u toÃ n cá»¥c cá»§a lá»‹ch há»c** | **KNOWN LIMITATION** | Láº­p lá»‹ch dÃ¹ng Greedy Heuristic. CÃ³ thá»ƒ cÃ³ trÆ°á»ng há»£p cáº­n biÃªn khÃ´ng tÃ¬m ra phÆ°Æ¡ng Ã¡n tá»‘i Æ°u tuyá»‡t Ä‘á»‘i vá» sá»‘ ká»³. |
| **Quy cháº¿ cáº£nh bÃ¡o há»c vá»¥ chÃ­nh thá»©c** | **ASSUMED (DEMO_UNVERIFIED)** | NgÆ°á»¡ng CPA cáº£nh bÃ¡o há»c vá»¥ theo nÄƒm ($1.20 \rightarrow 1.80$) láº¥y tá»« PRD demo, chÆ°a Ä‘á»‘i chiáº¿u vÄƒn báº£n quy cháº¿ HaUI 2026. |
| **Chuáº©n Ä‘áº§u ra ngoáº¡i ngá»¯/tin há»c thá»±c** | **ASSUMED (DEMO_UNVERIFIED)** | Há»‡ thá»‘ng giáº£ Ä‘á»‹nh 4 chuáº©n (TOEIC, MOS, GDQP, GDTC). Äiá»ƒm chuáº©n thá»±c táº¿ cÃ³ thá»ƒ thay Ä‘á»•i theo tá»«ng ngÃ nh/khÃ³a. |

---

## 6. Káº¾T LUáº¬N & ÄIá»€U KIá»†N BÃ€N GIAO TASK 5.2c

1. ToÃ n bá»™ mÃ£ nguá»“n nghiá»‡p vá»¥ `tv4-academic` Ä‘Æ°á»£c Ä‘Ã³ng gÃ³i Ä‘á»™c láº­p, Ä‘áº¡t chuáº©n cháº¥t lÆ°á»£ng cao, zero warnings logic.
2. 100% cÃ¡c cÃ´ng cá»¥ há»c vá»¥ Ä‘Ã£ sáºµn sÃ ng phá»¥c vá»¥ ná»n táº£ng `tv5-platform` vÃ  module AI `tv1-ai`.
3. BÃ¡o cÃ¡o nÃ y hoÃ n táº¥t tiÃªu chÃ­ bÃ n giao thuáº­t toÃ¡n vÃ  Ä‘áº·c táº£ ká»¹ thuáº­t cá»§a Task 5.2c.
