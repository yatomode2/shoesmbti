import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
    forwardRef,
    createContext,
    useContext,
  } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
  
  /* ============================================================================
   * YATO · Style Check-in
   * Full engine — Landing → Intake → Survey(10Q + CATIE) → Analysis → Result
   * ========================================================================== */
  
  // ---------------------------------------------------------------------------
  // Brand tokens
  // ---------------------------------------------------------------------------
  const BRAND = {
    gold: "#DAD395",
    cream: "#F0F1DF",
    ivory: "#FDFCF8",
    creamSoft: "#FAF8F0",
    ink: "#2B2A26",
    mute: "#8A8578",
    line: "#E3E2D4",
    goldDeep: "#BFA84C",
  };
  
  const FONT_EDITORIAL =
    "'Cormorant Garamond', 'Crimson Text', 'Noto Serif KR', Georgia, serif";
  const FONT_SERIF = "'Crimson Text', 'Noto Serif KR', Georgia, serif";
  const FONT_SANS =
    "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif";
  const LUXE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
  // Imweb header overlap offset (landing/test embedded in Imweb page)
  const IMWEB_HEADER_OFFSET_PX = 84;

  // Parisian editorial system (text + hairlines). Keep background/buttons unchanged.
  const PARIS = {
    ink: "rgba(43, 42, 38, 0.92)",
    body: "rgba(43, 42, 38, 0.78)",
    mute: "rgba(43, 42, 38, 0.56)",
    hairline: "rgba(43, 42, 38, 0.12)",
    hairlineStrong: "rgba(43, 42, 38, 0.18)",
    accent: "rgba(191, 168, 76, 0.95)",
  };

  const PARIS_EDITORIAL =
    "'Playfair Display', 'Cormorant Garamond', 'Crimson Text', 'Noto Serif KR', Georgia, serif";

  function YatoButton({
    children,
    type = "button",
    disabled = false,
    onClick,
    ariaLabel,
    className = "",
    style,
    size = "md", // md | sm
    variant = "pill", // pill | outline
    showArrow = false,
    splitArrow = false,
  }) {
    const [hovered, setHovered] = useState(false);

    const sizeStyle =
      size === "sm"
        ? {
            fontSize: "12px",
            letterSpacing: "0.22em",
            padding: "16px 20px",
            height: "51px",
            borderRadius: "35px",
          }
        : {
            fontSize: "13px",
            letterSpacing: "0.22em",
            width: "340px",
            height: "51px",
            borderRadius: "35px",
          };

    const isOutline = variant === "outline";
    const bg = disabled
      ? BRAND.line
      : hovered
        ? BRAND.creamSoft
        : "#FFFFFF";

    const color = disabled ? BRAND.mute : "rgba(106, 101, 57, 1)";
    const borderColor = disabled
      ? BRAND.line
      : hovered
        ? "rgba(255, 255, 255, 1)"
        : BRAND.line;

    return (
      <button
        type={type}
        disabled={disabled}
        onClick={onClick}
        onMouseEnter={() => !disabled && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => !disabled && setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-label={ariaLabel}
        className={`yato-cta relative inline-flex items-center ${
          splitArrow ? "justify-between" : "justify-center"
        } select-none overflow-hidden ${className}`}
        style={{
          fontFamily: FONT_SANS,
          fontWeight: 500,
          ...sizeStyle,
          backgroundColor: isOutline ? "transparent" : bg,
          color: isOutline ? BRAND.ink : color,
          border: `1px solid ${isOutline ? BRAND.ink : borderColor}`,
          boxShadow: disabled
            ? "none"
            : hovered && !isOutline
              ? "0 18px 40px rgba(43,42,38,0.18)"
              : !isOutline
                ? "0 10px 26px rgba(43,42,38,0.10)"
                : "none",
          transform: disabled ? "translateY(0)" : hovered ? "translateY(-2px)" : "translateY(0)",
          transition: `background-color 700ms ${LUXE_EASE}, color 700ms ${LUXE_EASE}, box-shadow 700ms ${LUXE_EASE}, transform 500ms ${LUXE_EASE}, border-color 700ms ${LUXE_EASE}`,
          cursor: disabled ? "not-allowed" : "pointer",
          ...style,
        }}
      >
        {splitArrow ? (
          <>
            <span style={{ flex: 1, textAlign: "center" }}>{children}</span>
            {showArrow && (
              <span
                aria-hidden
                style={{ marginLeft: "auto", paddingRight: "6px", flex: "0 0 auto" }}
              >
                <span className="yato-arrow-float" style={{ display: "inline-block" }}>
                  →
                </span>
              </span>
            )}
          </>
        ) : (
          <>
            {children}
            {showArrow && (
              <span aria-hidden style={{ marginLeft: "14px" }}>
                <span className="yato-arrow-float" style={{ display: "inline-block" }}>
                  →
                </span>
              </span>
            )}
          </>
        )}
      </button>
    );
  }
  
  // ---------------------------------------------------------------------------
  // 1. Character data (result.csv)
  // ---------------------------------------------------------------------------
  const CHARACTER_KEYS = [
    "LENA",
    "VALENTINE",
    "SIENA",
    "ARIN",
    "SYLVIE",
    "SOFIE",
    "NOA",
    "JULIET",
    "BALLERINA",
    "RINA",
    "MARIA",
    "CATIE",
  ];
  
  // Strategic tie-break priority (+delta added to final score on tie)
  const TIEBREAK_PRIORITY = {
    VALENTINE: 0.11,
    ARIN: 0.1,
    SOFIE: 0.09,
    SYLVIE: 0.08,
    SIENA: 0.07,
    RINA: 0.06,
    JULIET: 0.05,
    NOA: 0.04,
    MARIA: 0.03,
    CATIE: 0.02,
    LENA: 0.01,
    BALLERINA: 0.0,
  };
  
  // Character-linked coupon short codes (YATO-[CODE]-05)
  const COUPON_SHORT = {
    LENA: "LEN",
    VALENTINE: "VAL",
    SIENA: "SIE",
    ARIN: "ARI",
    SYLVIE: "SYL",
    SOFIE: "SOF",
    NOA: "NOA",
    JULIET: "JUL",
    BALLERINA: "BAL",
    RINA: "RIN",
    MARIA: "MAR",
    CATIE: "CAT",
  };
  const buildCouponCode = (charKey) =>
    `YATO-${COUPON_SHORT[charKey] || "OWN"}-05`;

  // Character images (from /public/images) for "Recommended Shoes"
  // NOTE: Some filenames intentionally keep existing typos/casing in the folder.
  const CHARACTER_RECOMMENDED_IMAGE = {
    // LENA: (no matching asset currently found in public/images)
    LENA: null,
    VALENTINE: "Valetine_BK_F_WG.jpg",
    SIENA: "SIENA_WH_F_WG.png",
    ARIN: "ARIN_BK_F_WG.jpg",
    SYLVIE: "Sylvie_LE_F_WG.jpg",
    SOFIE: "SOFIE_GR_F_WG.png",
    NOA: "noas_BK_F_WG.png",
    JULIET: "JULLI_BK_F_WG.jpg",
    BALLERINA: "ballerina_BK_F_WG.jpg",
    // user-requested override
    RINA: "RINAh_BK_F_WG.png",
    CATIE: "CATIE_BK_F_WG.png",
    MARIA: "Maria_GR_F_WG.png",
  };

  // ---------------------------------------------------------------------------
  // Silhouette Profile (Radar chart) — 6 axes (1~5)
  // ---------------------------------------------------------------------------
  const SILHOUETTE_AXES = [
    { key: "edge", label: "엣지" },
    { key: "elegance", label: "우아함" },
    { key: "structure", label: "구조성" },
    { key: "stability", label: "안정성" },
    { key: "classic", label: "클래식" },
    { key: "fluidity", label: "유연성" },
  ];

  const SILHOUETTE_PROFILE_SCORES = {
    LENA: [5, 4, 2, 1, 2, 3],
    VALENTINE: [4, 5, 3, 2, 3, 2],
    SIENA: [4, 2, 5, 3, 4, 1],
    ARIN: [2, 3, 4, 5, 3, 2],
    SYLVIE: [4, 3, 1, 2, 1, 5],
    SOFIE: [1, 5, 1, 3, 2, 5],
    NOA: [2, 4, 3, 2, 3, 4],
    JULIET: [1, 5, 2, 4, 3, 3],
    BALLERINA: [1, 4, 3, 3, 5, 3],
    RINA: [3, 1, 5, 4, 4, 2],
    CATIE: [1, 2, 4, 5, 4, 2],
    MARIA: [1, 1, 3, 5, 5, 2],
  };

  const DEFAULT_SILHOUETTE_PROFILE = [3, 3, 3, 3, 3, 3];
  
  // Build purchase URL with UTM parameters
  const buildPurchaseUrl = (shopUrl, charKey) => {
    if (!shopUrl) return shopUrl;
    try {
      const url = new URL(shopUrl);
      url.searchParams.set("utm_source", "style_test");
      url.searchParams.set("utm_content", charKey);
      return url.toString();
    } catch {
      const sep = shopUrl.includes("?") ? "&" : "?";
      return `${shopUrl}${sep}utm_source=style_test&utm_content=${encodeURIComponent(
        charKey
      )}`;
    }
  };
  
  // Home URL for the "invite a friend" share
  const getHomeUrl = () => {
    if (typeof window === "undefined") return "https://www.yatomode.com";
    const { hostname, pathname, search, hash } = window.location;
    // Always prefer the www host on production domain (even if user landed on apex).
    if (hostname === "yatomode.com") {
      return `https://www.yatomode.com${pathname}${search}${hash}`;
    }
    return `${window.location.origin}${pathname}${search}${hash}`;
  };
  
  const CHARACTERS = {
    LENA: {
      key: "LENA",
      name: "LENA",
      title: "The Muse",
      tagline: "She attracts without asking. Defined by line, not noise.",
      summary: "조용해도, 시선은 머문다.",
      keywords: ["매혹", "선명함", "시선", "자신감"],
      diagnosis:
        "당신은 지금 자신을 숨기지 않고 세상 앞에 당당히 드러내는 단계에 있습니다. 타인의 시선을 피하기보다 오히려 그 시선을 즐길 줄 아는 여유가 생겼으며, 과하지 않지만 분명한 선을 선택함으로써 자신의 매력을 선명하게 확장해 나가고 있습니다.",
      brandMessage:
        "당신이 걷는 길은 곧 런웨이가 됩니다. Lena는 당신의 내면에 숨겨진 매혹적인 아우라를 가장 선명하고 엣지 있게 끌어올려 줄 것입니다.",
      moment: "특별한 날, 특별한 아이템으로.",
      productDescription:
        "얇고 우아한 스트랩 디테일의 LENA는 하이힐이 가진 특유의 긴장감과 엣지를 플랫슈즈의 형태로 구현했습니다. 단순히 발을 감싸는 것을 넘어, 발등 위의 선 하나로 전체적인 무드를 장악하는 이 슈즈는 특별한 날, 당신을 더욱 돋보이게 만드는 특별한 아이템이 됩니다.",
      shopUrl: "https://www.yatomode.com/shop/?idx=29",
    },
    VALENTINE: {
      key: "VALENTINE",
      name: "VALENTINE",
      title: "The Charmer",
      tagline:
        "She calibrates softness and tension. Never loud, never forgotten.",
      summary: "은은하지만, 또렷하다.",
      keywords: ["절제된 카리스마", "여성스러움", "세련됨"],
      diagnosis:
        "당신은 이제 자신을 감추거나 수동적으로 반응하는 단계를 지나, 자신의 매력을 자연스럽게 확장하는 '인상 관리 단계'에 있습니다. 타인의 시선이 부담이 되기보다, 흐르는 듯한 여유 속에서 나만의 엣지를 보여주는 것을 즐깁니다. 지금은 당신의 이미지를 더 넓고 선명하게 구축하기에 가장 완벽한 시기입니다.",
      brandMessage:
        "당신은 드러내지 않아도 깊은 잔상을 남기는 사람입니다.\n포인트 토의 플랫슈즈는 당신의 부드러운 카리스마가 가장 세련되게 각인될 수 있도록 당신의 걸음을 완성할 것입니다.",
      moment: "반복되는 일상을 특별하게.",
      productDescription:
        "슬림한 실루엣과 세련된 디자인의 VALENTINE은 여성스러움과 강인함이 공존하는 당신의 매력을 극대화합니다. 가는 스트랩 탈부착으로 조절 가능한 긴장감은, 상황에 따라 유연하면서도 힘 있게 자신을 드러낼 줄 아는 당신의 스마트한 안목을 상징합니다. 억지로 과시하지 않아도 시선을 사로잡는 또렷한 인상을 남깁니다.",
      shopUrl: "https://www.yatomode.com/shop/?idx=30",
    },
    SIENA: {
      key: "SIENA",
      name: "SIENA",
      title: "The Director",
      tagline: "She values structure over spectacle. Precision is her language.",
      summary: "말보다 완성도로 남는다.",
      keywords: ["커리어", "감각", "완성도", "조용한 자신감"],
      diagnosis:
        "당신은 책임감이라는 무게 때문에 늘 조심스러웠지만, 사실 그 내면에는 누구보다 당당하고 압도적인 존재감을 드러내고 싶어 하는 리더입니다. 이제 스스로를 증명하려 애쓰지 않아도 괜찮습니다. 당신이 딛고 서 있는 확신과 정돈된 아우라 자체가 이미 당신의 가치를 충분히 말해주고 있기 때문입니다.",
      brandMessage:
        "당당한 직장인 여성, 시원시원한 느낌의 당신을 위하여. Siena는 당신의 명확한 기준과 리더로서의 품격을 가장 완벽한 실루엣으로 지지할 것입니다.",
      moment: "감각적인 나를 보여주고 싶은 날.",
      productDescription:
        "세련된 화이트 톤과 시원시원한 라인을 가진 SIENA는 당당한 커리어를 가진 여성의 여유를 담고 있습니다. 자잘한 장식에 연연하기보다 제품 본연의 완성도를 추구하는 디자인은, 이미 자신만의 명확한 기준을 가진 당신의 안목을 대변합니다. 시선을 사로잡는 선명한 존재감으로 당신의 비즈니스와 일상을 완성해 줍니다.",
      shopUrl: "https://www.yatomode.com/shop/?idx=61",
    },
    ARIN: {
      key: "ARIN",
      name: "ARIN",
      title: "The Balancer",
      tagline: "She moves fast but never loses composure.",
      summary: "바쁘지만, 흐트러지지 않는다.",
      keywords: ["균형", "역할", "안정", "멀티플레이어", "단정"],
      diagnosis:
        "당신은 현재 수많은 사회적, 개인적 역할을 완벽하게 해내려 애쓰는 '역할 균형기'에 있습니다. 바쁜 일상 때문에 가끔은 나를 돌보는 일을 뒷순위로 미뤄두기도 하지만, 그 와중에도 최소한의 정갈함을 유지하려는 당신의 태도는 스스로에 대한 깊은 존중을 의미합니다. 당신은 많은 짐을 지고서도 아름다움을 놓지 않는, 충분히 대단한 사람입니다.",
      brandMessage:
        "직장인으로서, 가족의 구성원으로서, 그리고 '나'로서. 당신의 모든 발걸음이 무겁지 않기를 바랍니다. Arin는 당신의 분주한 하루가 끝날 때까지 단정한 품격을 지켜줄 것입니다.",
      moment: "바쁜 일상 속에서도,\n흐트러짐 없는 단정함을 유지하고 싶은 날",
      productDescription:
        "부드러운 라운드토, 숨겨진 힐, 균형감 있는 두께의 스트랩으로 안정감을 가진 ARIN은, 일과 가정 등 수많은 역할 사이에서 균형을 잡아야 하는 당신을 위해 설계되었습니다. 활동적인 움직임이 필요한 순간에도 흐트러짐 없는 실루엣을 유지해주며, 가장 일상적인 순간에도 당신의 단아함을 잃지 않게 돕는 든든한 조력자입니다.",
      shopUrl: "https://www.yatomode.com/shop/?idx=60",
    },
    SYLVIE: {
      key: "SYLVIE",
      name: "SYLVIE",
      title: "The Airy Freedom",
      tagline: "Refine by free spirit.",
      summary: "진지하지만 자유분방하다.",
      keywords: ["자유분방", "리듬", "긍정", "가벼움", "반전미"],
      diagnosis:
        "당신은 겉으로 보기엔 누구보다 자신의 역할을 진지하게 수행하는 사람이지만, 내면에는 언제든 무대 위를 날아오르는 무용수와 같은 자유분방함을 간직하고 있습니다. 뻔한 규칙보다 자신만의 독특한 캐릭터를 표현할 때 살아있음을 느끼며, 예상치 못한 지점에서 드러나는 '반전미'를 즐길 줄 아는 감각적인 영혼입니다.",
      brandMessage:
        "활동적인 당신의 하루가 실크처럼 매끄럽고 자유롭기를. Sylvie는 당신의 내면에 숨겨진 특별한 캐릭터를 가장 아름답게 해방해 줄 것입니다.",
      moment: "자유분방하고 리드미컬하게, 기분 좋은 하루를 시작하고 싶은 날.",
      productDescription:
        "무용수의 토슈즈에서 영감을 받은 Sylvie의 교차 스트랩과 실크 원단의 은은한 광택은 당신의 발걸음에 우아한 리듬감을 부여합니다. 워크웨어와 같은 직선적인 일상복 아래, 예술적인 곡선과 고급스러운 소재를 매치하는 당신의 선택은 \"나는 어디에도 구속되지 않는 특별한 사람\"이라는 선언과도 같습니다.",
      shopUrl: "https://www.yatomode.com/shop/?idx=77",
    },
    SOFIE: {
      key: "SOFIE",
      name: "SOFIE",
      title: "The Poet",
      tagline: "Refine by fluidity.",
      summary: "완벽한 구조보다, 부드러움으로 말하다.",
      keywords: ["부드러움", "유연함", "여백", "자아수용"],
      diagnosis:
        "당신은 이제 누군가에게 자신을 증명하려 애쓰는 단계에서 벗어났습니다. 타인의 기준에 맞춘 완벽함보다 자신의 리듬과 컨디션을 더 소중히 여기는 법을 깨달았기 때문입니다. 있는 그대로의 자신을 부드럽게 받아들이는 당신의 발걸음은 그 자체로 우아한 휴식이 됩니다.",
      brandMessage:
        "나를 가두지 않는 편안함 속에서도 잃지 않는 우아함. Sofie은 당신이 걷는 모든 길을 한 편의 아름다운 시로 만들어줄 것입니다.",
      moment: "여유로운 발걸음으로,\n편안함과 우아함을 동시에 잡고 싶은 날",
      productDescription:
        "형태를 잡아 고정하지 않은 Sofie의 유연함은, 삶을 하나의 시(詩)처럼 부드럽게 관조하는 당신의 태도를 닮았습니다. 강한 힘으로 세상을 압도하기보다, 있는 그대로의 흐름에 몸을 맡길 줄 아는 당신에게서 풍겨 나오는 은은한 우아함. 그 여유로운 서사를 슈즈의 부드러운 질감에 담았습니다.",
      shopUrl: "https://www.yatomode.com/shop/?idx=79",
    },
    NOA: {
      key: "NOA",
      name: "NOA",
      title: "The Young Lady",
      tagline: "She looks gentle, but her spine is straight.",
      summary: "소녀 같지만, 이미 단단하다.",
      keywords: ["단아함", "소녀", "생동감", "선명함"],
      diagnosis:
        "당신은 여전히 소녀 같은 맑은 감성을 가지고 있지만, 동시에 자신이 무엇을 좋아하는지 선명하게 알아가고 있는 단계에 있습니다. 수줍음 뒤에 숨겨진 당당함, 그리고 일상의 사소한 즐거움을 발견하는 당신의 밝은 시선은 주변을 환하게 만듭니다. 완벽히 성숙하지 않아 더 아름다운, 지금 이 순간의 '나'를 가장 단아하고 생기 있게 긍정할 줄 아는 사람입니다.",
      brandMessage:
        "당신은 여전히 소녀 같지만, 이미 충분히 단단합니다. Noa의 선명한 실루엣은 당신의 가장 빛나는 시절을 함께 걷는 든든한 파트너가 될 것입니다.",
      moment: "생동감 넘치는 에너지로, 새로운 시작을 준비하는 날.",
      productDescription:
        "Noa의 스퀘어 토와 메리제인 스트랩은 고전적인 단아함을 유지하면서도, 어디로든 가볍게 뛰어갈 것 같은 대학생의 생기 넘치는 에너지를 담고 있습니다. 정해진 틀에 갇히지 않고 자신만의 색깔을 덧입히는 통통 튀는 감각, 그리고 그 내면에 자리 잡기 시작한 기분 좋은 강인함을 상징합니다.",
      shopUrl: "https://www.yatomode.com/shop/?idx=85",
    },
    JULIET: {
      key: "JULIET",
      name: "JULIET",
      title: "The Gentle",
      tagline: "She softens the room without trying.",
      summary: "가장 조용하게, 우아해진다.",
      keywords: ["부드러운 우아함", "섬세함", "여성스러움"],
      diagnosis:
        "당신은 부드럽지만 결코 약하지 않은 내면을 가집니다. 타인을 배려하는 다정한 태도 뒤에는 자신만의 가치를 묵묵히 지켜내는 단단함이 자리 잡고 있습니다. 화려한 외침보다 정제된 몸짓으로 자신의 취향을 드러낼 줄 알며, 현재 자신의 여성성을 가장 편안하고 단아한 방식으로 재정립해 나가는 단계에 있습니다.",
      brandMessage:
        "당신은 가장 조용한 방식으로 우아함을 표현합니다. Juliet은 당신이 가진 본연의 부드러움이 일상 속에서 가장 아름다운 힘이 되도록 돕습니다.",
      moment: "섬세한 디테일로, 은은한 여성성을 드러내고 싶은 날.",
      productDescription:
        "라운드 토의 곡선과 아주 얇은 엑스 스트랩으로 완성된 JULIET은 섬세하고 여리여리한 여성스러운 이미지를 극대화합니다. 아주 부드러운 양가죽 소재는 발을 압박하지 않고 유연하게 감싸며, 조용하지만 분명한 존재감으로 당신의 걸음을 우아하게 물들입니다.",
      shopUrl: "https://www.yatomode.com/shop/?idx=62",
    },
    BALLERINA: {
      key: "BALLERINA",
      name: "BALLERINA",
      title: "The Classic",
      tagline: "She doesn't chase relevance. She is timeless by default.",
      summary: "과하지 않아도 충분하다.",
      keywords: ["클래식", "여성", "발레", "기본", "자연스러움"],
      diagnosis:
        "당신은 억지로 꾸며낸 모습보다 있는 그대로의 정갈한 상태에서 편안함을 느끼는 '자연스러운 안정기'에 있습니다. 복잡한 수식어보다는 기본이 주는 힘을 믿으며, 본질을 선택할 줄 아는 확고한 안목을 가졌습니다. 당신은 이미 그 자체로 충분히 아름답기에, 과한 장식은 필요하지 않습니다.",
      brandMessage:
        "본연의 아름다움은 화려한 장식 너머에 있습니다. Ballerina는 가장 기본에 충실한 실루엣으로 당신이 가진 고유의 선을 가장 우아하게 증명합니다.",
      moment: "무심한 듯 여성스럽게, 클래식한 캐주얼을 연출하고 싶은 날.",
      productDescription:
        "클래식 플랫의 정석인 BALLERINA는 유행에 따라 변하는 화려한 장식보다, 발의 곡선을 가장 아름답게 보여주는 본연의 실루엣에 집중합니다. 가장 캐주얼하면서도 품격을 잃지 않는 이 슈즈는, 당신이 가진 본래의 여성성을 가장 자연스럽게 드러내 줍니다.",
      shopUrl: "https://www.yatomode.com/shop/?idx=70",
    },
    RINA: {
      key: "RINA",
      name: "RINA",
      title: "The Minimalist",
      tagline: "She edits ruthlessly. Nothing unnecessary survives.",
      summary: "장식 없이, 선으로 말한다.",
      keywords: ["격식", "중성적", "선", "구조"],
      diagnosis:
        "당신은 현재 자신의 삶을 명확한 구조 중심으로 정립해 나가는 단계에 있습니다. 복잡한 수식어나 타인의 평가보다 스스로가 정한 기준과 태도를 더 중요하게 생각합니다. 겉으로 드러나는 화려함보다 내면의 힘과 단단함을 선호하는 당신에게, 형태가 곧 태도가 되는 리나의 미학은 가장 닮아있는 자아의 모습입니다.",
      brandMessage:
        "RINA는 가장 명확한 실루엣로 당신의 기준을 드러냅니다. 장식에 의지하지 않는 구조가 당신의 태도를 가장 또렷하게 완성해 줄 것입니다.",
      moment:
        "감각적인 스타일은 물론, 활동적인 역할까지 완벽히 완수해야 하는 날.",
      productDescription:
        "플랫폼 굽을 가진 페니 로퍼 RINA는 중성적이면서도 힘 있는 실루엣을 제안합니다. 화려한 장식 대신 선명한 구조와 매끄러운 선에 집중한 디자인은, 당신의 확고한 취향과 태도를 대변합니다. 정장이나 스쿨룩 어디에나 매치해도 흔들림 없는 단정함은 당신의 일상에 묵직한 존재감을 더해줍니다.",
      shopUrl: "https://www.yatomode.com/shop/?idx=78",
    },
    MARIA: {
      key: "MARIA",
      name: "MARIA",
      title: "The Keeper",
      tagline: "She chooses comfort without abandoning dignity.",
      summary: "편안해도, 품위는 남는다.",
      keywords: ["신뢰", "품위", "편안함", "교양"],
      diagnosis:
        "당신은 현재 소중한 것들을 지켜내기 위해 누구보다 성실히 살아온 '편안한 안정기'에 머물고 있습니다. 이제 타인의 기준이나 화려한 겉모습에 휘둘리기보다, 나만의 기준을 지키며 내면의 평온을 유지하는 데 집중합니다. 격식을 갖추면서도 편안함을 놓치지 않으려는 당신의 선택은, 자신을 소중히 여기는 가장 성숙한 형태의 자기애입니다.",
      brandMessage:
        "소중한 것들을 지켜내느라 고단했던 당신의 발을 깊은 믿음으로 감싸 안습니다. 견고한 신뢰와 격식 있는 편안함이 당신의 품격을 묵묵히 완성해 줄 것입니다.",
      moment: "온전한 휴식처럼, 편안하고 품위 있는 나를 만나고 싶은 날.",
      productDescription:
        "둥근 기본 플랫의 안정감 위에 구조적인 디테일을 더한 MARIA는, 삶의 여러 풍파 속에서도 자신을 흐트러뜨리지 않는 당신의 단단한 내면을 닮았습니다. 과장된 화려함보다는 균형 잡힌 실루엣을 통해, 일상의 고단함을 깊은 믿음으로 감싸 안는 가장 신뢰감 있는 우아함을 제안합니다.",
      shopUrl: "https://www.yatomode.com/shop/?idx=83",
    },
    CATIE: {
      key: "CATIE",
      name: "CATIE",
      title: "The Essential",
      tagline: "Refine by essential value.",
      summary: "불필요함을 덜어낸 모습으로, 가장 나다운 단단함을 증명하다.",
      keywords: ["안정", "일상의 안식", "본질"],
      diagnosis:
        "당신은 보여지는 '매력'보다 지켜야 할 '본질'이 무엇인지 아는 사람입니다. 세월이 선물한 지혜는 당신의 발걸음을 더욱 정갈하고 단단하게 만들었습니다. 남들의 시선에서 자유로워진 지금, 당신에게 필요한 것은 오직 나를 위한 가장 정직한 편안함입니다.",
      brandMessage:
        "남들이 정한 '매력'의 기준에 당신을 맞추지 마세요. 당신의 성실한 하루와 정갈한 태도 자체가 이미 가장 깊은 품격입니다.",
      moment: "오랜 시간의 움직임에도, 변함없는 단정함을 유지해야 하는 날.",
      productDescription:
        "화려한 기교보다 발을 감싸는 정직한 편안함에 집중했습니다. 오랜 시간 타인을 위해, 혹은 자신의 삶을 위해 묵묵히 걸어온 당신의 수고를 알기에, CATIE는 유행에 흔들리지 않는 가장 단정한 실루엣으로 당신의 하루를 지탱합니다.",
      shopUrl: "https://www.yatomode.com/shop/?idx=84",
    },
  };
  
  // ---------------------------------------------------------------------------
  // 2. Question data (question_score_logic.csv) — verbatim
  // ---------------------------------------------------------------------------
  const QUESTIONS = [
    {
      id: "Q1",
      step: "STEP 1. 삶의 흐름을 묻다 (현재의 상태 파악)",
      prompt: "Q1. 최근 1년, 당신의 일상은 어디에 더 가까웠나요?",
      options: [
        {
          text: "사회적 역할이 커져 앞만 보고 달려온 시기",
          weights: { RINA: 1, ARIN: 1, SIENA: 1, CATIE: 1 },
        },
        {
          text: "관계와 환경의 변화로 나를 돌아보게 된 시기",
          weights: { NOA: 1, SOFIE: 1, JULIET: 1, VALENTINE: 2 },
        },
        {
          text: "육아나 가족 등 소중한 것들을 지켜온 시기",
          weights: { BALLERINA: 1, ARIN: 2, SYLVIE: 1 },
        },
        {
          text: "큰 변화는 없지만, 내면에서 무언가 달라지고 싶은 시기",
          weights: { SYLVIE: 2, VALENTINE: 2, JULIET: 1, LENA: 1 },
        },
        {
          text: "가족을 위한 긴 여정을 지나, 비로소 나를 마주하기 시작한 시기",
          weights: { MARIA: 2, CATIE: 2, SOFIE: 1 },
        },
      ],
    },
    {
      id: "Q2",
      prompt: "Q2. 지금 가장 집중하고 있는 '나'의 모습은 무엇인가요?",
      options: [
        {
          text: "새로운 나를 발견하고 존재감을 드러내는 나",
          weights: { LENA: 1, VALENTINE: 2 },
        },
        {
          text: "타인에게 신뢰와 단단함을 주는 나",
          weights: { ARIN: 2, SIENA: 1, RINA: 1 },
        },
        {
          text: "여러 역할 사이에서 중심을 잡으려는 나",
          weights: { ARIN: 2, SYLVIE: 1, BALLERINA: 1 },
        },
        {
          text: "과거의 나를 회복하고 스스로를 보듬는 나",
          weights: { SOFIE: 2, JULIET: 1 },
        },
        {
          text: "타인의 시선에서 벗어나, 오직 나의 몸과 마음이 편안한 상태에 집중하는 나",
          weights: { MARIA: 1, CATIE: 1, BALLERINA: 1 },
        },
      ],
    },
    {
      id: "Q3",
      prompt: "Q3. 지금 당신의 스타일은 어느 단계에 있나요?",
      options: [
        {
          text: "나만의 안목으로 망설임 없이 선택한다",
          weights: { CATIE: 1, LENA: 1, RINA: 1 },
        },
        {
          text: "아직은 나만의 색깔을 정의하기보다, 정답을 찾아가는 중이다.",
          weights: { BALLERINA: 2, MARIA: 1 },
        },
        {
          text: "무난함에서 조금 벗어나 나만의 색을 찾고 싶다",
          weights: { NOA: 1, SYLVIE: 1, VALENTINE: 1, JULIET: 1 },
        },
        {
          text: "내가 좋아하는 것을 선명하게 알고 더 확장하고 싶다",
          weights: { LENA: 1, VALENTINE: 1 },
        },
      ],
    },
    {
      id: "Q4",
      prompt: "Q4. 신발을 고를 때 가장 깊게 고민하는 지점은?",
      options: [
        {
          text: "나의 개성과 유니크한 캐릭터를 표현해주는가",
          weights: { SYLVIE: 2, LENA: 2, VALENTINE: 1 },
          catie: -1,
        },
        {
          text: "어떤 상황에서도 격식을 잃지 않는 단정함",
          weights: { ARIN: 1, MARIA: 1, RINA: 1 },
        },
        {
          text: "너무 과하지 않으면서도 세련된 인상을 남기는가",
          weights: { VALENTINE: 1, SYLVIE: 1, SIENA: 1 },
        },
        {
          text: "하루 종일 신어도 부담스럽지 않은 편안함을 주는가",
          weights: { SOFIE: 2, CATIE: 1, MARIA: 2 },
        },
        {
          text: "인위적이지 않고 자연스러운 아름다움을 주는가",
          weights: { SOFIE: 2, BALLERINA: 1 },
          catie: -1,
        },
      ],
    },
    {
      id: "Q5",
      prompt: "Q5. 당신의 감각이 머물고 싶은 공간은?",
      options: [
        {
          text: "정갈하고 구조적인 미니멀한 공간",
          weights: { RINA: 1, VALENTINE: 1 },
        },
        {
          text: "부드러운 여백이 느껴지는 고요한 공간",
          weights: { SOFIE: 1 },
        },
        {
          text: "선이 또렷하고 현대적인 세련된 공간",
          weights: { VALENTINE: 2, LENA: 1, SIENA: 2 },
          catie: -1,
        },
        {
          text: "고급스럽고 절제된 우아한 공간",
          weights: { SIENA: 1, MARIA: 1, SOFIE: 2, JULIET: 1 },
        },
        {
          text: "실용적인 균형감있는 공간",
          weights: { ARIN: 2, BALLERINA: 1 },
        },
        {
          text: "가볍고 유연하며 리듬감이 느껴지는 공간",
          weights: { SYLVIE: 2, BALLERINA: 1, NOA: 1 },
        },
      ],
    },
    {
      id: "Q6",
      prompt: "Q6. 평소 당신이 가장 자주 입거나 선호하는 실루엣은?",
      options: [
        {
          text: "몸의 선이 드러나는 엣지 있는 룩",
          weights: { LENA: 1, VALENTINE: 1, SIENA: 1 },
          catie: -1,
        },
        {
          text: "단정한 테일러링이나 구조적인 룩",
          weights: { ARIN: 1, RINA: 1, MARIA: 1, SIENA: 1 },
        },
        {
          text: "소녀스러운 디테일이나 부드러운 실루엣",
          weights: { JULIET: 1, NOA: 1, BALLERINA: 1, SOFIE: 1 },
        },
        {
          text: "여유롭고 편안한 이지 캐주얼 룩",
          weights: { SOFIE: 2, BALLERINA: 1, SYLVIE: 1 },
        },
        {
          text: "격식과 편안함 사이, 유연한 세미-포멀 룩",
          weights: { CATIE: 1, ARIN: 2, RINA: 1 },
        },
      ],
    },
    {
      id: "Q7",
      prompt: "Q7. 요즘 당신의 일상에서 가장 덜어내고 싶은 것은 무엇인가요?",
      options: [
        {
          text: "남들에게 보여주기 위한 과장됨",
          weights: { CATIE: 1, BALLERINA: 1 },
        },
        {
          text: "반복되는 일상 속 단조로움",
          weights: { SYLVIE: 1, VALENTINE: 1, JULIET: 1 },
          catie: -1,
        },
        {
          text: "애매모호한 나의 스타일과 태도",
          weights: { RINA: 1, VALENTINE: 1, SIENA: 1 },
        },
        {
          text: "나를 억눌러온 긴장감과 피로감",
          weights: { SOFIE: 2, SYLVIE: 1, BALLERINA: 1 },
        },
      ],
    },
    {
      id: "Q8",
      prompt: "Q8. 1년 후의 당신은 어떤 이미지에 더 가까워지고 싶나요?",
      options: [
        {
          text: "밝고 긍정적인 에너지를 주는 싱그러움",
          weights: { NOA: 1, SYLVIE: 1 },
        },
        {
          text: "감각이 잘 정리된 세련된 전문성",
          weights: { VALENTINE: 2, SIENA: 1, ARIN: 1 },
        },
        {
          text: "자연스럽게 배어 나오는 우아한 기품",
          weights: { JULIET: 1, SOFIE: 2, MARIA: 1, CATIE: 1 },
        },
        {
          text: "말하지 않아도 느껴지는 강한 카리스마",
          weights: { RINA: 1, SIENA: 2, LENA: 1 },
          catie: -1,
        },
      ],
    },
    {
      id: "Q9",
      prompt: "Q9. 첫 만남, 당신은 사람들에게 어떻게 기억되고 싶나요?",
      options: [
        {
          text: "조용히 시선이 머무는, 여운이 깊은 사람",
          weights: { SOFIE: 1, JULIET: 1 },
        },
        {
          text: "신뢰가 느껴지는, 단단하고 깊은 사람",
          weights: { MARIA: 1, ARIN: 2, RINA: 1 },
        },
        {
          text: "부드럽게 빛나는, 다정한 감각의 사람",
          weights: { JULIET: 1, SOFIE: 1, BALLERINA: 1, SYLVIE: 1 },
        },
        {
          text: "또렷하게 각인되는, 존재감이 확실한 사람",
          weights: { LENA: 2, VALENTINE: 1, SIENA: 1 },
          catie: -1,
        },
      ],
    },
    {
      id: "Q10",
      prompt: "Q10. 지금의 당신에게 가장 필요한 '한 문장'은 무엇인가요?",
      options: [
        {
          text: "\"당신은 선명한 이미지를 가질 자격이 있어요\"",
          weights: { VALENTINE: 2, LENA: 2 },
          catie: -1,
        },
        {
          text: "\"당신의 단단한 안정감이 주변을 빛나게 합니다\"",
          weights: { MARIA: 1, ARIN: 1, RINA: 1, CATIE: 1 },
        },
        {
          text: "\"긴장을 내려놓고 부드러운 여백을 즐겨보세요\"",
          weights: { SOFIE: 2, JULIET: 1, BALLERINA: 1 },
        },
        {
          text: "\"당신의 본질은 세련됨 그 자체입니다\"",
          weights: { SYLVIE: 1, SIENA: 1 },
          catie: -1,
        },
      ],
    },
  ];
  
  // ---------------------------------------------------------------------------
  // 3. Scoring engine
  // ---------------------------------------------------------------------------
  function scoreAnswers(answers) {
    // answers: { [questionId]: optionRef }
    const scores = Object.fromEntries(CHARACTER_KEYS.map((k) => [k, 0]));
    Object.values(answers).forEach((opt) => {
      if (!opt) return;
      Object.entries(opt.weights || {}).forEach(([char, w]) => {
        if (scores[char] !== undefined) scores[char] += w;
      });
      // CATIE 필터링 — 해당 선택지가 -1을 가지면 CATIE 점수에서 누적 감점
      if (typeof opt.catie === "number") {
        scores.CATIE += opt.catie;
      }
    });
    return scores;
  }
  
  function rankCharacters(scores) {
    return Object.entries(scores)
      .map(([char, score]) => ({
        char,
        score,
        adjusted: score + (TIEBREAK_PRIORITY[char] || 0),
      }))
      .sort((a, b) => b.adjusted - a.adjusted);
  }
  
  function determineResult(answers) {
    const scores = scoreAnswers(answers);
    const ranked = rankCharacters(scores);
    return {
      scores,
      ranked,
      winner: ranked[0],
      second: ranked[1],
      third: ranked[2],
    };
  }
  
  // ---------------------------------------------------------------------------
  // 4. Tracking architecture (Supabase-ready)
  // ---------------------------------------------------------------------------
  const TrackingContext = createContext(null);
  
  function useTracking() {
    const ctx = useContext(TrackingContext);
    if (!ctx) throw new Error("useTracking must be used inside TrackingProvider");
    return ctx;
  }
  
  function captureUtm() {
    if (typeof window === "undefined") return {};
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get("utm_source") || "direct",
      utm_medium: params.get("utm_medium") || null,
      utm_campaign: params.get("utm_campaign") || null,
      utm_content: params.get("utm_content") || null,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      landing_path:
        typeof window !== "undefined" ? window.location.pathname : "/",
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : null,
    };
  }
  
  // Supabase save handler structure. Wire to `supabase.from('results').insert(row)`
  // in production. Schema: [name, age, answers[], final_result, second_result,
  // third_result, coupon_clicked, duration_seconds, session_id, utm..., created_at]
  async function saveResultToSupabase(row) {
    // TODO(supabase):
    //   const { error } = await supabase.from('results').insert(row);
    //   if (error) throw error;
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.log("[YATO:results.insert]", row);
    }
    return row;
  }
  
  function TrackingProvider({ children }) {
    const session = useMemo(() => {
      const sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      return {
        session_id: sid,
        started_at: new Date().toISOString(),
        ...captureUtm(),
      };
    }, []);
  
    const trackEvent = useCallback(
      (stage, meta = {}) => {
        const payload = {
          session_id: session.session_id,
          stage,
          occurred_at: new Date().toISOString(),
          meta,
        };
        // TODO(supabase): await supabase.from('funnel_events').insert(payload)
        if (typeof window !== "undefined") {
          // eslint-disable-next-line no-console
          console.log("[YATO:funnel]", payload);
        }
        return payload;
      },
      [session.session_id]
    );
  
    const trackConversion = useCallback(
      (productId, meta = {}) => {
        const payload = {
          session_id: session.session_id,
          product_id: productId,
          occurred_at: new Date().toISOString(),
          meta: { ...meta, utm: session },
        };
        // TODO(supabase): await supabase.from('conversions').insert(payload)
        if (typeof window !== "undefined") {
          // eslint-disable-next-line no-console
          console.log("[YATO:conversion]", payload);
        }
        return payload;
      },
      [session]
    );
  
    useEffect(() => {
      // TODO(supabase): await supabase.from('sessions').insert(session)
      // eslint-disable-next-line no-console
      console.log("[YATO:session]", session);
    }, [session]);
  
    const value = useMemo(
      () => ({ session, trackEvent, trackConversion }),
      [session, trackEvent, trackConversion]
    );
  
    return (
      <TrackingContext.Provider value={value}>
        {children}
      </TrackingContext.Provider>
    );
  }
  
  // ---------------------------------------------------------------------------
  // 5. Decorative — sand ripple with mouse parallax
  // ---------------------------------------------------------------------------
  const SandRipple = forwardRef(function SandRipple(_, ref) {
    return (
      <svg
        ref={ref}
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 800 1400"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        style={{
          willChange: "transform",
          transform: "translate3d(0,0,0) scale(1.06)",
          transition: `transform 1400ms ${LUXE_EASE}`,
        }}
      >
        <defs>
          <radialGradient id="yatoGlow" cx="50%" cy="18%" r="75%">
            <stop offset="0%" stopColor={BRAND.gold} stopOpacity="0.26" />
            <stop offset="55%" stopColor={BRAND.ivory} stopOpacity="0.06" />
            <stop offset="100%" stopColor={BRAND.ivory} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="yatoFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND.creamSoft} stopOpacity="0" />
            <stop offset="100%" stopColor={BRAND.gold} stopOpacity="0.07" />
          </linearGradient>
        </defs>
        <rect width="800" height="1400" fill="url(#yatoGlow)" />
        <rect width="800" height="1400" fill="url(#yatoFade)" />
        {Array.from({ length: 20 }).map((_, i) => {
          const y = 60 + i * 68;
          const drift = (i % 2 === 0 ? 1 : -1) * 38;
          return (
            <path
              key={i}
              d={`M -60 ${y} Q 200 ${y - 28 + drift} 400 ${y + 8} T 860 ${y}`}
              fill="none"
              stroke={BRAND.goldDeep}
              strokeWidth="0.5"
              strokeOpacity={0.08 + (i % 4) * 0.025}
            />
          );
        })}
      </svg>
    );
  });
  
  // ---------------------------------------------------------------------------
  // 6. Landing hero
  // ---------------------------------------------------------------------------
  function LandingHero() {
    const { trackEvent } = useTracking();
    const [mounted, setMounted] = useState(false);
  
    useEffect(() => {
      setMounted(true);
      trackEvent("landing_view");
    }, [trackEvent]);
  
    const handleStart = () => {
      trackEvent("intake_cta_click");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("yato:goto-intake"));
      }
    };
  
    const fadeUp = (delay = 0) => ({
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0)" : "translateY(14px)",
      transition: `opacity 1100ms ${LUXE_EASE} ${delay}ms, transform 1100ms ${LUXE_EASE} ${delay}ms`,
    });
  
    return (
      <main
        className="relative z-10 px-6 max-w-xl mx-auto flex flex-col items-center"
        style={{
          minHeight: "100vh",
          paddingTop: 0,
          paddingBottom: "68px",
        }}
      >
        {/* Center copy */}
        <div className="flex-1 w-full flex items-center justify-center">
          <div className="w-full flex flex-col items-center text-center">
            <div
              aria-hidden="true"
              style={{
                width: "84px",
                height: "84px",
                borderRadius: "999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255, 255, 255, 0.42)",
                border: "1px solid rgba(255, 255, 255, 0.55)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                marginBottom: "14px",
                ...fadeUp(120),
              }}
            >
              <img
                src="/images/symbol_icon_350_350.png"
                alt=""
                aria-hidden="true"
                style={{
                  width: "64px",
                  height: "64px",
                  objectFit: "contain",
                  filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.22))",
                }}
              />
            </div>
            <div style={{ color: BRAND.ink, marginBottom: "8px" }}>
              <div
                style={{
                  fontFamily: "'Jost', system-ui, sans-serif",
                  fontStyle: "normal",
                  fontWeight: 500,
                  fontSize: "36px",
                  letterSpacing: "0.03em",
                  textAlign: "center",
                  ...fadeUp(220),
                  whiteSpace: "nowrap",
                }}
              >
                Find your silhouette.
                <br />
                Define your attitude.
              </div>
            </div>

            <h1
              style={{
                fontFamily: FONT_SANS,
                fontSize: "18px",
                fontWeight: 300,
                color: PARIS.mute,
                letterSpacing: "0.02em",
                lineHeight: 1.6,
                ...fadeUp(900),
                marginTop: 0,
                marginBottom: 0,
              }}
            >
            지금의 나와 가장 닮은 실루엣을 찾아보세요.
            </h1>
          </div>
        </div>

        {/* Bottom copy + CTA */}
        <div className="w-full flex flex-col items-center text-center">
          <div style={fadeUp(1500)}>
            <YatoButton
              onClick={handleStart}
              ariaLabel="나다움을 찾는 여정 시작하기"
              showArrow
            >
              <span>나다움을 찾는 여정 시작하기</span>
            </YatoButton>
          </div>
        </div>
      </main>
    );
  }
  
  // ---------------------------------------------------------------------------
  // 8. Intake form (name + age + disclaimer)
  // ---------------------------------------------------------------------------
  function IntakeForm({ onSubmit }) {
    const { trackEvent } = useTracking();
    const [name, setName] = useState("");
    const [age, setAge] = useState("");
    const [focused, setFocused] = useState(null);
    const [mounted, setMounted] = useState(false);
  
    useEffect(() => {
      setMounted(true);
      trackEvent("intake_view");
    }, [trackEvent]);
  
    const canSubmit = name.trim().length > 0 && age.trim().length > 0;
  
    const handleSubmit = (e) => {
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      if (!canSubmit) return;
      const payload = { name: name.trim(), age: Number(age) };
      trackEvent("intake_submit", payload);
      // Go to survey (Q1) via parent router
      onSubmit?.(payload);
    };
  
    const fadeUp = (delay = 0) => ({
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0)" : "translateY(10px)",
      transition: `opacity 700ms ${LUXE_EASE} ${delay}ms, transform 700ms ${LUXE_EASE} ${delay}ms`,
    });
  
    const field = (key) => ({
      width: "100%",
      padding: "14px 0 12px",
      fontSize: "16px",
      fontFamily: FONT_SANS,
      color: "#6A6539",
      background: "transparent",
      border: "none",
      borderBottom: `1px solid ${
        focused === key ? PARIS.hairlineStrong : PARIS.hairline
      }`,
      outline: "none",
      transition: "border-color 400ms ease",
      letterSpacing: "0.01em",
      textAlign: "left",
    });
  
    return (
      <section
        className="relative z-10 max-w-md mx-auto px-6 pt-6 pb-12"
        style={{
          fontFamily: FONT_SANS,
          minHeight: "calc(100vh - 120px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-9">
          <div style={fadeUp(120)}>
            <label
              className="block mb-1 text-[10px] tracking-[0.32em] uppercase"
              style={{ color: PARIS.mute }}
            >
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused(null)}
              placeholder="어떻게 불러드릴까요?"
              maxLength={30}
              autoComplete="off"
              style={field("name")}
            />
          </div>
  
          <div style={fadeUp(220)}>
            <label
              className="block mb-1 text-[10px] tracking-[0.32em] uppercase"
              style={{ color: PARIS.mute }}
            >
              Age
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ""))}
              onFocus={() => setFocused("age")}
              onBlur={() => setFocused(null)}
              placeholder="나이"
              maxLength={3}
              autoComplete="off"
              style={field("age")}
            />
          </div>
  
          <div className="flex justify-center pt-4 mt-[120px]" style={fadeUp(340)}>
            <YatoButton
              type="submit"
              disabled={!canSubmit}
              onClick={handleSubmit}
              showArrow
              style={{
                backgroundColor: "#FFFFFF",
                boxShadow: "none",
              }}
            >
              <span>START</span>
            </YatoButton>
          </div>
        </form>
  
        <div
          className="mt-24 pt-10"
          style={{ borderTop: `1px solid ${PARIS.hairline}`, ...fadeUp(460) }}
        >
          <p
            className="text-[11px] leading-[1.8] text-center"
            style={{
              color: PARIS.mute,
              letterSpacing: "0.03em",
              position: "absolute",
              left: "-4px",
              top: "92px",
            }}
          >
            본 테스트는 학술적 척도와 데이터를 기반으로 설계된 YATO 스타일
            알고리즘을 통해 나의 가장 나다운 모습을 도출합니다. 모든 응답은
            익명으로 처리되며, 오직 서비스 개선 및 연구 목적으로만 소중히
            활용됩니다.
          </p>
        </div>
      </section>
    );
  }
  
  // ---------------------------------------------------------------------------
  // 9. Survey (TestContainer) — real 10-question flow with CATIE filter,
  //    progress bar, keyboard advance, back button
  // ---------------------------------------------------------------------------
  function TestContainer({ onComplete, onExitBack }) {
    const { trackEvent } = useTracking();
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { [qid]: optionRef }
    const [direction, setDirection] = useState(1); // 1 forward / -1 back
  
    const current = QUESTIONS[index];
    const total = QUESTIONS.length;
    const answeredCount = Object.keys(answers).length;
    const progress = Math.max(
      ((index + (answers[current?.id] ? 1 : 0)) / total) * 100,
      (answeredCount / total) * 100
    );
  
    useEffect(() => {
      trackEvent("survey_view", { step: index + 1, question_id: current.id });
    }, [index, current?.id, trackEvent]);
  
    // Select an option — always overwrites the prior choice so score recomputes correctly.
    const handleSelect = (option) => {
      setAnswers((prev) => ({ ...prev, [current.id]: option }));
      trackEvent("survey_progress", {
        question_id: current.id,
        step: index + 1,
        total,
        has_catie_penalty: typeof option.catie === "number",
      });
      // Auto-advance immediately after choosing an option
      setTimeout(() => {
        if (index + 1 < total) {
          setDirection(1);
          setIndex((prev) => Math.min(prev + 1, total - 1));
        } else {
          // Ensure latest selection is included
          onComplete?.({ ...answers, [current.id]: option });
        }
      }, 0);
    };
  
    const handleBack = () => {
      if (index === 0) {
        onExitBack?.();
        return;
      }
      setDirection(-1);
      setIndex(index - 1);
    };
  
    const handleNext = () => {
      if (!answers[current.id]) return;
      if (index + 1 < total) {
        setDirection(1);
        setIndex(index + 1);
      } else {
        onComplete?.(answers);
      }
    };
  
    const selectedText = answers[current.id]?.text;
    const isLast = index + 1 === total;
    const canAdvance = !!answers[current.id];
    const isImageQuestion = current.id === "Q5" || current.id === "Q6";
    const q5Images = [
      "/images/q5_1.jpg",
      "/images/q5_2.jpg",
      "/images/q5_3.jpg",
      "/images/q5_4.jpg",
      "/images/q5_5.jpg",
      "/images/q5_6.jpg",
    ];
    const q6Images = [
      "/images/q6_1.jpg",
      "/images/q6_2.jpg",
      "/images/q6_3.jpg",
      "/images/q6_4.jpg",
      "/images/q6_5.jpg",
    ];
    const optionImages = current.id === "Q5" ? q5Images : q6Images;
  
    return (
      <section
        className="relative z-10 max-w-xl mx-auto px-6 pt-4 pb-16"
        style={{ fontFamily: FONT_SANS, color: BRAND.ink }}
      >
        {/* Progress */}
        <div className="flex items-center justify-center mb-3">
          <span
            className="text-[10px] tracking-[0.38em] uppercase"
            style={{ color: PARIS.mute }}
          >
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>
        <div
          className="w-full rounded-full overflow-hidden mb-10"
          style={{ height: "2px", backgroundColor: PARIS.hairline }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              backgroundColor: BRAND.goldDeep,
              transition: `width 700ms ${LUXE_EASE}`,
            }}
          />
        </div>
  
        {/* Prompt */}
        <div
          key={current.id}
          className="yato-slide-in"
          style={{
            animation: `yato-slide-${direction > 0 ? "right" : "left"} 620ms ${LUXE_EASE} both`,
          }}
        >
          <h2
            style={{
              fontFamily: "'Jost', system-ui, sans-serif",
              fontSize: "20px",
              fontWeight: 500,
              color: PARIS.ink,
              lineHeight: 1.42,
              letterSpacing: "0.008em",
              marginBottom: "28px",
            }}
          >
            {current.prompt}
          </h2>
  
          {/* Options */}
          {isImageQuestion ? (
            <div
              className={`grid grid-cols-1 ${current.id === "Q6" ? "" : "gap-3"}`}
              style={current.id === "Q6" ? { gap: "25px" } : undefined}
            >
              {current.options.map((opt, i) => {
                const isSelected = selectedText === opt.text;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`yato-img-choice relative overflow-hidden text-left ${
                      isSelected ? "is-selected" : ""
                    }`}
                    aria-pressed={isSelected}
                  >
                    <img
                      src={
                        optionImages[i] || optionImages[optionImages.length - 1]
                      }
                      alt=""
                      aria-hidden="true"
                      className="yato-img-choice__img"
                      loading="lazy"
                    />
                    <span className="yato-img-choice__shade" aria-hidden="true" />
                    <span className="yato-img-choice__label">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {current.options.map((opt, i) => {
                const isSelected = selectedText === opt.text;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => handleSelect(opt)}
                      className="w-full text-left transition-all"
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: "15px",
                        color: PARIS.body,
                        lineHeight: 1.65,
                        padding: "18px 22px",
                        borderRadius: "2px",
                        backgroundColor: isSelected ? BRAND.gold : BRAND.creamSoft,
                        border: `1px solid ${
                          isSelected ? PARIS.hairlineStrong : PARIS.hairline
                        }`,
                        cursor: "pointer",
                        transition: `background-color 420ms ${LUXE_EASE}, border-color 420ms ${LUXE_EASE}, transform 420ms ${LUXE_EASE}`,
                      }}
                      onMouseEnter={(e) => {
                        if (isSelected) return;
                        e.currentTarget.style.backgroundColor = BRAND.cream;
                        e.currentTarget.style.borderColor = PARIS.hairlineStrong;
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        if (isSelected) return;
                        e.currentTarget.style.backgroundColor = BRAND.creamSoft;
                        e.currentTarget.style.borderColor = PARIS.hairline;
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {opt.text}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
  
          {/* Prev / Next navigation */}
          <div
            className="mt-10 flex items-center justify-center"
            style={{ borderTop: `1px solid ${PARIS.hairline}`, paddingTop: "20px" }}
          >
            <YatoButton
              type="button"
              onClick={handleBack}
              size="sm"
              className="yato-nav-btn"
              style={{
                width: "auto",
                minWidth: "140px",
                height: "44px",
                padding: "12px 18px",
                letterSpacing: "0.24em",
                transform: "translateY(0)",
                boxShadow: "none",
              }}
              ariaLabel="이전 질문"
            >
              ← PREV
            </YatoButton>
          </div>
        </div>
      </section>
    );
  }
  
  // ---------------------------------------------------------------------------
  // 10. Analysis loading — 3 seconds elegant pause
  // ---------------------------------------------------------------------------
  function LoadingAnalysis({ onDone, durationMs = 3000 }) {
    const { trackEvent } = useTracking();
    useEffect(() => {
      trackEvent("analysis_loading");
      const id = setTimeout(() => onDone?.(), durationMs);
      return () => clearTimeout(id);
    }, [durationMs, onDone, trackEvent]);
  
    return (
      <section
        className="relative z-10 max-w-md mx-auto px-6"
        style={{
          minHeight: "calc(100vh - 120px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="text-center"
          style={{ fontFamily: FONT_SANS, transform: "translateY(-40px)" }}
        >
          <div
            className="mx-auto mb-8"
            style={{
              width: "42px",
              height: "42px",
              border: `1px solid ${BRAND.line}`,
              borderTopColor: BRAND.goldDeep,
              borderRadius: "50%",
              animation: "yato-spin 1.6s linear infinite",
            }}
          />
          <div
            style={{
              fontFamily: "'Jost', system-ui, sans-serif",
              fontStyle: "normal",
              fontWeight: 500,
              fontSize: "20px",
              letterSpacing: "0.1em",
              color: BRAND.ink,
              marginBottom: "8px",
            }}
          >
            Analyzing your silhouette
          </div>
          <div
            className="text-[13px]"
            style={{ color: BRAND.mute, letterSpacing: "0.05em" }}
          >
            실루엣을 분석하고 있습니다…
          </div>
        </div>
      </section>
    );
  }
  
  // ---------------------------------------------------------------------------
  // 11. Result page with 2nd / 3rd recommendations
  // ---------------------------------------------------------------------------
  function ResultPage({
    respondent,
    answers,
    result,
    selectedKey,
    onSelectKey,
    onShareResult,
    onInviteFriend,
    onBuyClicked,
    onRestart,
  }) {
    const { trackEvent, trackConversion } = useTracking();
    const char = CHARACTERS[selectedKey] || CHARACTERS[result.winner.char];
    const [mounted, setMounted] = useState(false);
  
    useEffect(() => {
      setMounted(true);
    }, []);
  
    useEffect(() => {
      trackEvent("result_view", {
        character: selectedKey,
        name: respondent?.name,
        is_primary: selectedKey === result.winner.char,
      });
    }, [selectedKey, respondent?.name, result.winner.char, trackEvent]);

    useEffect(() => {
      if (typeof document === "undefined") return;
      document.title = `YATO · ${char.name}`;
    }, [char.name]);
  
    const fadeUp = (delay = 0) => ({
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0)" : "translateY(12px)",
      transition: `opacity 900ms ${LUXE_EASE} ${delay}ms, transform 900ms ${LUXE_EASE} ${delay}ms`,
    });
  
    const purchaseUrl = buildPurchaseUrl(char.shopUrl, char.key);
  
    const handlePurchase = () => {
      trackConversion(char.key, {
        character: char.key,
        shop_url: purchaseUrl,
        name: respondent?.name,
      });
      onBuyClicked?.(char.key);
      if (typeof window !== "undefined") {
        window.open(purchaseUrl, "_blank", "noopener,noreferrer");
      }
    };
  
    const altKeys = [result.second?.char, result.third?.char].filter(
      (k) => k && k !== selectedKey
    );
  
    return (
      <section
        key={selectedKey}
        className="relative z-10 max-w-xl mx-auto px-6 pt-4 pb-14"
        style={{ fontFamily: FONT_SANS, color: BRAND.ink }}
      >
        {/* Hello — personalized */}
        <div className="text-center mb-6" style={fadeUp(0)}>
        </div>
  
        {/* Above-the-fold: keep centered until tagline */}
        <div
          style={{
            // Use svh to better center on mobile browser UI
            minHeight: "calc(100svh - 220px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingTop: "4px",
            paddingBottom: "24px",
            position: "relative",
          }}
        >
          {/* Character emblem */}
          <div className="text-center" style={fadeUp(120)}>
            <div
              style={{
                fontFamily: "'Jost', system-ui, sans-serif",
                fontStyle: "normal",
                fontWeight: 500,
                fontSize: "14px",
                letterSpacing: "0.22em",
                color: BRAND.goldDeep,
                marginBottom: "10px",
              }}
            >
              {char.title}
            </div>
            <h1
              style={{
                fontFamily: FONT_EDITORIAL,
                fontWeight: 500,
                fontStyle: "italic",
                fontSize: "48px",
                letterSpacing: "0.07em",
                color: BRAND.ink,
                lineHeight: 1.1,
              }}
            >
              {char.name}
            </h1>
            <div
              className="h-px w-12 mx-auto mt-5 mb-5"
              style={{ backgroundColor: BRAND.gold }}
            />
            <p
              style={{
                fontFamily: FONT_SANS,
                fontSize: "14px",
                color: BRAND.goldDeep,
                letterSpacing: "0.005em",
                lineHeight: 1.5,
              }}
            >
              {char.summary}
            </p>
            <p
              className="mt-3"
              style={{
                fontFamily: "'Jost', system-ui, sans-serif",
                fontStyle: "normal",
                fontWeight: 500,
                fontSize: "14px",
                color: BRAND.mute,
                letterSpacing: "0.03em",
                lineHeight: 1.6,
              }}
            >
              {char.tagline}
            </p>
          </div>

          {/* Scroll down indicator */}
          <div
            aria-hidden="true"
            className="yato-scroll-indicator"
            style={{
              position: "absolute",
              left: "50%",
              bottom: "10px",
              transform: "translateX(-50%)",
              width: "24px",
              height: "44px",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <span
              className="yato-scroll-line"
              style={{
                display: "block",
                width: "1px",
                height: "34px",
                background:
                  "linear-gradient(180deg, rgba(43,42,38,0.00) 0%, rgba(43,42,38,0.35) 35%, rgba(43,42,38,0.22) 100%)",
              }}
            />
          </div>
        </div>
  
        {/* Keywords */}
        <div className="mt-16" style={fadeUp(260)}>
          <div
            className="text-[10px] tracking-[0.38em] uppercase text-center mb-4"
            style={{ color: BRAND.mute }}
          >
            Style
          </div>
          <div className="flex flex-wrap justify-center gap-2">
          {char.keywords.map((k) => (
            <span
              key={k}
              className="text-[11px]"
              style={{
                padding: "6px 12px",
                border: `1px solid ${BRAND.line}`,
                borderRadius: "999px",
                color: BRAND.mute,
                letterSpacing: "0.06em",
                backgroundColor: BRAND.ivory,
              }}
            >
              #{k}
            </span>
          ))}
          </div>
        </div>
  
        {/* Silhouette Profile */}
        <div className="mt-12" style={fadeUp(320)}>
          <div
            className="text-[10px] tracking-[0.38em] uppercase text-center mb-4"
            style={{ color: BRAND.mute }}
          >
            Silhouette Profile
          </div>
          <div
            style={{
              width: "100%",
              height: "260px",
              backgroundColor: "rgba(253, 252, 248, 0.6)",
              border: `1px solid ${BRAND.line}`,
              borderRadius: "2px",
              padding: "12px 10px",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={SILHOUETTE_AXES.map((a, i) => ({
                  axis: a.label,
                  value:
                    (SILHOUETTE_PROFILE_SCORES[char.key] ||
                      DEFAULT_SILHOUETTE_PROFILE)[i] ?? 3,
                  fullMark: 5,
                }))}
              >
                <PolarGrid stroke="rgba(43, 42, 38, 0.14)" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: "rgba(43, 42, 38, 0.62)", fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 5]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  dataKey="value"
                  stroke={BRAND.gold}
                  fill={BRAND.gold}
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Diagnosis */}
        <div className="mt-12" style={fadeUp(380)}>
          <div
            className="text-[10px] tracking-[0.38em] uppercase text-center mb-4"
            style={{ color: BRAND.mute }}
          >
            Diagnosis
          </div>
          <p
            className="text-[15px] leading-[1.95]"
            style={{
              color: "#3F3E37",
              letterSpacing: "0.005em",
              paddingLeft: "10px",
              paddingRight: "10px",
            }}
          >
            {char.diagnosis}
          </p>
        </div>
  
        {/* Brand message */}
        <div className="mt-12" style={fadeUp(500)}>
          <div
            className="h-px w-8 mx-auto mb-6"
            style={{ backgroundColor: BRAND.gold }}
          />
          <p
            className="text-center"
            style={{
              fontFamily: FONT_SERIF,
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: "17px",
              lineHeight: 1.75,
              color: BRAND.ink,
              letterSpacing: "0.005em",
              paddingTop: "15px",
              paddingBottom: "15px",
            }}
          >
            “
            {String(char.brandMessage || "")
              .split("\n")
              .map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < String(char.brandMessage || "").split("\n").length - 1 && (
                    <br />
                  )}
                </React.Fragment>
              ))}
            ”
          </p>
          <div
            className="h-px w-8 mx-auto mt-6"
            style={{ backgroundColor: BRAND.gold }}
          />

          {/* Product name 강조 (브랜드 메세지 아래) */}
          <div className="text-center mt-8">
          </div>
        </div>
  
        {/* Product */}
        <div
          className="mt-8 p-7"
          style={{
            backgroundColor: BRAND.creamSoft,
            border: `1px solid ${BRAND.line}`,
            borderRadius: "2px",
            ...fadeUp(620),
          }}
        >
          <div
            className="text-[10px] tracking-[0.38em] uppercase mb-3 text-center"
            style={{ color: BRAND.mute }}
          >
            The Recommended Shoes
          </div>
          <div
            className="mb-5 text-center"
            style={{
              fontFamily: FONT_EDITORIAL,
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: "20px",
              letterSpacing: "0.12em",
              color: BRAND.goldDeep,
            }}
          >
            {char.name}
          </div>
          <div className="mb-5">
            <img
              src={
                CHARACTER_RECOMMENDED_IMAGE[char.key]
                  ? `/images/${CHARACTER_RECOMMENDED_IMAGE[char.key]}`
                  : "/images/symbol_icon_350_350.png"
              }
              alt={`${char.name} recommended`}
              loading="lazy"
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "2px",
                border: `1px solid ${BRAND.line}`,
                backgroundColor: "rgba(255,255,255,0.35)",
              }}
            />
          </div>
          <div
            style={{
              fontFamily: FONT_EDITORIAL,
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: "13px",
              color: BRAND.goldDeep,
              letterSpacing: "0.1em",
              marginBottom: "14px",
              textAlign: "center",
            }}
          >
            {String(char.moment || "")
              .split("\n")
              .map((line, i, arr) => (
                <React.Fragment key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </React.Fragment>
              ))}
          </div>
          <p
            className="text-[14px] leading-[1.9]"
            style={{ color: "#3F3E37" }}
          >
            {char.productDescription}
          </p>
  
          <div style={fadeUp(0)}>
            <YatoButton
              type="button"
              onClick={handlePurchase}
              ariaLabel="구매하기"
              showArrow
              className="mt-8 w-full"
              style={{
                width: "100%",
                backgroundColor: BRAND.gold,
                borderColor: BRAND.gold,
                color: BRAND.ink,
              }}
            >
              <span>구매하기</span>
            </YatoButton>
          </div>
        </div>
  
        {/* Share (personalized) — dual CTA */}
        <div className="mt-10" style={fadeUp(740)}>
          <p
            className="text-center"
            style={{
              fontFamily: FONT_SERIF,
              fontSize: "15px",
              color: BRAND.ink,
              letterSpacing: "0.005em",
              lineHeight: 1.45,
            }}
          >
            {respondent?.name
              ? `${respondent.name}님만을 위한 특별한 선물을 확인하세요`
              : "당신만을 위한 특별한 선물을 확인하세요"}
          </p>
          <div
            className="text-center mt-1 text-[11px]"
            style={{ color: BRAND.mute, letterSpacing: "0.12em", lineHeight: 1.35 }}
          >
            공유시, Gift Card 제공됩니다.
          </div>
  
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <YatoButton
              type="button"
              onClick={onShareResult}
              ariaLabel="나의 실루엣 공유하기"
              size="sm"
              style={{
                flex: 1,
                width: "100%",
                height: "38px",
                padding: "10px 14px",
                borderRadius: "15px",
                backgroundColor: BRAND.creamSoft,
                border: "none",
                boxShadow: "none",
                color: BRAND.ink,
              }}
            >
              나의 실루엣 공유하기
            </YatoButton>
            <YatoButton
              type="button"
              onClick={onInviteFriend}
              ariaLabel="친구 초대하기"
              size="sm"
              style={{
                flex: 1,
                width: "100%",
                height: "38px",
                padding: "10px 14px",
                borderRadius: "15px",
                backgroundColor: BRAND.creamSoft,
                border: "none",
                boxShadow: "none",
                color: BRAND.ink,
              }}
            >
              친구 초대하기
            </YatoButton>
          </div>
        </div>
  
        {/* 2·3순위 추천 */}
        {altKeys.length > 0 && (
          <div className="mt-16" style={fadeUp(880)}>
            <div className="text-center mb-6">
              <div
                className="text-[10px] tracking-[0.38em] uppercase"
                style={{ color: BRAND.mute }}
              >
                Also yours
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {altKeys.map((k) => {
                const c = CHARACTERS[k];
                if (!c) return null;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => onSelectKey?.(k)}
                    className="text-left p-5"
                    style={{
                      backgroundColor: BRAND.ivory,
                      border: `1px solid ${BRAND.line}`,
                      borderRadius: "2px",
                      cursor: "pointer",
                      transition: `border-color 500ms ${LUXE_EASE}, transform 400ms ${LUXE_EASE}, background-color 500ms ${LUXE_EASE}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = BRAND.goldDeep;
                      e.currentTarget.style.backgroundColor = BRAND.creamSoft;
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = BRAND.line;
                      e.currentTarget.style.backgroundColor = BRAND.ivory;
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div className="flex items-stretch gap-4">
                      <div
                        style={{
                          width: "96px",
                          flex: "0 0 96px",
                          borderRadius: "2px",
                          overflow: "hidden",
                          border: `1px solid ${BRAND.line}`,
                          backgroundColor: "rgba(255,255,255,0.35)",
                        }}
                      >
                        <img
                          src={
                            CHARACTER_RECOMMENDED_IMAGE[c.key]
                              ? `/images/${CHARACTER_RECOMMENDED_IMAGE[c.key]}`
                              : "/images/symbol_icon_350_350.png"
                          }
                          alt={c.name}
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: FONT_EDITORIAL,
                            fontStyle: "italic",
                            fontWeight: 300,
                            fontSize: "12px",
                            letterSpacing: "0.18em",
                            color: BRAND.goldDeep,
                            marginBottom: "6px",
                          }}
                        >
                          {c.title}
                        </div>
                        <div
                          style={{
                            fontFamily: FONT_EDITORIAL,
                            fontStyle: "italic",
                            fontSize: "26px",
                            letterSpacing: "0.06em",
                            color: BRAND.ink,
                            marginBottom: "8px",
                          }}
                        >
                          {c.name}
                        </div>
                        <div
                          className="text-[13px]"
                          style={{ color: "#3F3E37", lineHeight: 1.6 }}
                        >
                          {c.summary}
                        </div>
                        <div
                          className="mt-3 text-[11px] tracking-[0.22em] uppercase"
                          style={{ color: BRAND.mute }}
                        >
                          View →
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
  
        {/* Restart — circular arrow */}
        <div
          className="mt-20 flex flex-col items-center"
          style={fadeUp(1000)}
        >
          <div
            className="h-px w-8"
            style={{ backgroundColor: BRAND.gold, marginBottom: "20px" }}
          />
          <YatoButton
            type="button"
            onClick={onRestart}
            ariaLabel="Restart the silhouette journey"
            variant="outline"
            size="sm"
            style={{
              width: "56px",
              height: "56px",
              padding: 0,
              borderRadius: "999px",
              backgroundColor: "rgba(255, 255, 255, 0.55)",
              border: `1px solid ${BRAND.line}`,
              color: BRAND.ink,
              boxShadow: "none",
              transform: "rotate(0)",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 12a9 9 0 1 0 3.2-6.9" />
              <polyline points="3 3 3 8 8 8" />
            </svg>
          </YatoButton>
          <div
            className="mt-4 text-[10px] tracking-[0.38em] uppercase"
            style={{ color: BRAND.mute }}
          >
            Restart
          </div>
        </div>
      </section>
    );
  }
  
  // ---------------------------------------------------------------------------
  // 12. Coupon modal
  // ---------------------------------------------------------------------------
  function CouponToast({
    open,
    onClose,
    code = "YATO-OWN-STYLE",
    name,
  }) {
    const [copied, setCopied] = useState(false);
  
    useEffect(() => {
      if (!open) setCopied(false);
    }, [open]);

    if (!open) return null;

    const handleCopy = async () => {
      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.clipboard?.writeText
        ) {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }
      } catch {
        /* noop */
      }
    };
  
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center px-6"
        style={{
          backgroundColor: "rgba(43,42,38,0.52)",
          animation: `yato-fade-in 400ms ${LUXE_EASE} both`,
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm"
          style={{
            backgroundColor: BRAND.ivory,
            padding: "40px 32px 32px",
            borderRadius: "2px",
            border: `1px solid ${BRAND.goldDeep}`,
            boxShadow: "0 24px 60px rgba(43,42,38,0.18)",
            animation: `yato-rise 560ms ${LUXE_EASE} both`,
            backgroundImage: `linear-gradient(180deg, ${BRAND.ivory} 0%, #FBF7E8 100%)`,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              width: "34px",
              height: "34px",
              borderRadius: "999px",
              border: `1px solid ${PARIS.hairline}`,
              backgroundColor: "rgba(253, 252, 248, 0.65)",
              color: BRAND.ink,
              fontFamily: FONT_SANS,
              fontSize: "18px",
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              zIndex: 2,
            }}
          >
            ×
          </button>

          {/* Corner filigree */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              right: "10px",
              bottom: "10px",
              border: `1px solid ${BRAND.gold}`,
              pointerEvents: "none",
              opacity: 0.55,
            }}
          />
  
          <div className="text-center" style={{ position: "relative" }}>
            <div
              className="h-px w-8 mx-auto mb-5"
                style={{ backgroundColor: BRAND.gold }}
            />
            <div
              style={{
                fontFamily: FONT_EDITORIAL,
                fontStyle: "italic",
                fontWeight: 300,
                fontSize: "12px",
                letterSpacing: "0.34em",
                color: BRAND.goldDeep,
                textTransform: "uppercase",
              }}
            >
              {name ? `Exclusively for ${name}` : "Exclusively for you"}
            </div>
            <div
              className="mt-5"
              style={{
                fontFamily: FONT_SERIF,
                fontStyle: "normal",
                fontSize: "24px",
                color: BRAND.ink,
                letterSpacing: "0.01em",
                lineHeight: 1.35,
              }}
            >
              Gift Card
            </div>
            <div
              className="mt-7 px-5 py-6"
              style={{
                backgroundColor: BRAND.cream,
                border: `1px dashed ${BRAND.goldDeep}`,
                borderRadius: "2px",
              }}
            >
              <div
                className="text-[10px] tracking-[0.34em] uppercase"
                style={{ color: BRAND.mute }}
              >
                Your Coupon · 5% OFF
              </div>
              <div
                className="mt-2"
                style={{
                  fontFamily: FONT_EDITORIAL,
                  fontWeight: 500,
                  fontSize: "22px",
                  letterSpacing: "0.02em",
                  color: BRAND.ink,
                }}
              >
                {code}
              </div>
              <div
                className="mt-3 text-[11px] text-center"
                style={{
                  fontFamily: FONT_SANS,
                  color: BRAND.mute,
                  letterSpacing: "0.06em",
                  lineHeight: 1.7,
                }}
              >
                세일 상품 제외 전 상품에 사용 가능합니다.
                <br />
                유효기간 | 2026.05.23
              </div>
              <div className="mt-4 flex justify-center">
                <YatoButton
                  type="button"
                  onClick={handleCopy}
                  ariaLabel="쿠폰 코드 복사"
                  variant="outline"
                  size="sm"
                  style={{
                    width: "220px",
                    height: "38px",
                    padding: "10px 14px",
                    fontSize: "11px",
                    borderRadius: "15px",
                    transform: "translateY(0)",
                    boxShadow: "none",
                    border: "none",
                    backgroundColor: BRAND.creamSoft,
                    color: BRAND.ink,
                    gap: "8px",
                  }}
                >
                  {copied ? (
                    "COPIED"
                  ) : (
                    <>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        style={{ display: "block", opacity: 0.72 }}
                      >
                        <path
                          d="M8 7h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h1"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span style={{ letterSpacing: "0.22em" }}>COPY CODE</span>
                    </>
                  )}
                </YatoButton>
              </div>
            </div>
  
            <p
              className="mt-6 text-[11px] leading-[1.8] text-center"
              style={{ color: BRAND.mute, letterSpacing: "0.04em" }}
            >
              본 쿠폰은{" "}
              <a
                href="https://www.yatomode.com"
                target="_blank"
                rel="noopener noreferrer"
                className="yato-link"
              >
                www.yatomode.com
              </a>{" "}
              에서 사용 가능합니다.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // ---------------------------------------------------------------------------
  // 13. Root — routing across phases + Supabase save + share/coupon handlers
  // ---------------------------------------------------------------------------
  export default function YatoStyleCheckIn() {
    // landing → intake → survey → analysis → result
    const [phase, setPhase] = useState("landing");
    const [respondent, setRespondent] = useState(null);
    const [answers, setAnswers] = useState(null);
    const [result, setResult] = useState(null);
    const [selectedKey, setSelectedKey] = useState(null);
    const [couponOpen, setCouponOpen] = useState(false);
    const [couponClicked, setCouponClicked] = useState(false);
    const [isBuyClicked, setIsBuyClicked] = useState(false);
    const startedAtRef = useRef(null);
    const rippleRef = useRef(null);
    const savedRef = useRef(false);
  
    // Coupon code is always tied to the CURRENTLY viewed character
    const couponCode = selectedKey ? buildCouponCode(selectedKey) : "YATO-OWN-05";
  
    // Landing CTA → intake
    useEffect(() => {
      const onIntake = () => setPhase("intake");
      window.addEventListener("yato:goto-intake", onIntake);
      return () => window.removeEventListener("yato:goto-intake", onIntake);
    }, []);
  
    // Mouse parallax on ripple (rAF-throttled, respects reduced-motion)
    useEffect(() => {
      if (typeof window === "undefined") return;
      const reduced =
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      if (reduced) return;
      let raf = null;
      let latest = { x: 0, y: 0 };
      const onMove = (e) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        latest = { x: nx * 14, y: ny * 10 };
        if (raf == null) {
          raf = requestAnimationFrame(() => {
            if (rippleRef.current) {
              rippleRef.current.style.transform = `translate3d(${latest.x}px, ${latest.y}px, 0) scale(1.06)`;
            }
            raf = null;
          });
        }
      };
      window.addEventListener("mousemove", onMove, { passive: true });
      return () => {
        window.removeEventListener("mousemove", onMove);
        if (raf) cancelAnimationFrame(raf);
      };
    }, []);
  
    const handleIntakeSubmit = (profile) => {
      setRespondent(profile);
      startedAtRef.current = Date.now();
      setPhase("survey");
    };
  
    const handleSurveyComplete = (allAnswers) => {
      setAnswers(allAnswers);
      const r = determineResult(allAnswers);
      setResult(r);
      setSelectedKey(r.winner.char);
      setPhase("analysis");
    };
  
    const handleAnalysisDone = () => setPhase("result");
  
    // Persist result once (when reaching result phase)
    useEffect(() => {
      if (phase !== "result" || savedRef.current || !result || !respondent) return;
      savedRef.current = true;
      const durationSeconds = startedAtRef.current
        ? Math.round((Date.now() - startedAtRef.current) / 1000)
        : null;
      const row = {
        name: respondent.name,
        age: respondent.age,
        answers: Object.entries(answers || {}).map(([qid, opt]) => ({
          question_id: qid,
          option_text: opt.text,
          catie_penalty: opt.catie || 0,
        })),
        final_result: result.winner.char,
        second_result: result.second?.char || null,
        third_result: result.third?.char || null,
        coupon_clicked: couponClicked,
        coupon_code_issued: buildCouponCode(result.winner.char),
        is_buy_clicked: isBuyClicked,
        duration_seconds: durationSeconds,
        scores: result.scores,
        created_at: new Date().toISOString(),
      };
      saveResultToSupabase(row);
    }, [phase, result, respondent, answers, couponClicked, isBuyClicked]);
  
    // Full reset — returns to landing and wipes all state
    const handleRestart = () => {
      setPhase("landing");
      setRespondent(null);
      setAnswers(null);
      setResult(null);
      setSelectedKey(null);
      setCouponOpen(false);
      setCouponClicked(false);
      setIsBuyClicked(false);
      startedAtRef.current = null;
      savedRef.current = false;
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
  
    // Track purchase intent for Supabase
    const handleBuyClicked = (charKey) => {
      setIsBuyClicked(true);
      // TODO(supabase): update results set is_buy_clicked = true where session = :sid
      // Character-aware purchase event
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("yato:buy-clicked", { detail: { charKey } })
        );
      }
    };
  
    // Shared: open the native share dialog (with clipboard fallback) and —
    //   ONLY after the dialog is actually invoked — show the personalized coupon.
    const invokeShare = async ({ title, text, url }) => {
      let shareInvoked = false;
      try {
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({ title, text, url });
          shareInvoked = true;
        } else if (
          typeof navigator !== "undefined" &&
          navigator.clipboard?.writeText
        ) {
          await navigator.clipboard.writeText(`${text}\n${url}`);
          shareInvoked = true; // desktop: clipboard copy counts as share-invoked
        } else {
          window.prompt("링크를 복사하세요:", `${text}\n${url}`);
          shareInvoked = true;
        }
      } catch {
        /* user cancelled the native share sheet — do NOT show coupon */
        shareInvoked = false;
      }
      if (shareInvoked) {
        setCouponClicked(true);
        setCouponOpen(true);
      }
    };
  
    // [나의 실루엣 공유하기] — share the current result URL
    const handleShareResult = async () => {
      if (!result || !selectedKey) return;
      const char = CHARACTERS[selectedKey];
      const resultUrl =
        typeof window !== "undefined"
          ? window.location.href
          : "https://www.yatomode.com";
      await invokeShare({
        title: `YATO · ${char.name}`,
        text: `나의 실루엣은 ${char.name} — ${char.summary}`,
        url: resultUrl,
      });
    };
  
    // [친구 초대하기] — share the home URL (test start page)
    const handleInviteFriend = async () => {
      await invokeShare({
        title: "YATO · Style Check-in",
        text: "나의 실루엣을 찾는 여정, 함께해요.",
        url: getHomeUrl(),
      });
    };
  
    return (
      <TrackingProvider>
        <div
          className="relative min-h-screen w-full overflow-hidden"
          style={{
            background:
              // From survey onward, keep the same intro image background.
              `url(/images/background_intro.png) center / cover no-repeat`,
            fontFamily: FONT_SANS,
            color: BRAND.ink,
            paddingTop: `${IMWEB_HEADER_OFFSET_PX}px`,
          }}
        >
          {phase !== "landing" && <SandRipple ref={rippleRef} />}
  
          {phase === "landing" && <LandingHero />}
          {phase === "intake" && <IntakeForm onSubmit={handleIntakeSubmit} />}
          {phase === "survey" && (
            <TestContainer
              onComplete={handleSurveyComplete}
              onExitBack={() => setPhase("intake")}
            />
          )}
          {phase === "analysis" && (
            <LoadingAnalysis onDone={handleAnalysisDone} />
          )}
          {phase === "result" && result && selectedKey && (
            <ResultPage
              respondent={respondent}
              answers={answers}
              result={result}
              selectedKey={selectedKey}
              onSelectKey={(k) => {
                setSelectedKey(k);
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              onShareResult={handleShareResult}
              onInviteFriend={handleInviteFriend}
              onBuyClicked={handleBuyClicked}
              onRestart={handleRestart}
            />
          )}
  
          <CouponToast
            open={couponOpen}
            onClose={() => setCouponOpen(false)}
            code={couponCode}
            name={respondent?.name}
          />
  
          {/* Google Fonts + Pretendard loader */}
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..700;1,400..700&display=swap');
            @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
  
            html, body, #root { background-color: ${
              phase === "landing" ? "transparent" : BRAND.ivory
            }; }

            /* Survey navigation buttons (PREV / NEXT) */
            .yato-nav-btn {
              background-color: transparent !important;
              border: none !important;
              box-shadow: none !important;
              color: rgba(43, 42, 38, 0.78) !important;
              font-weight: 400 !important;
              font-size: 12px !important;
              letter-spacing: 0.24em !important;
              transition: font-size 220ms ${LUXE_EASE}, font-weight 220ms ${LUXE_EASE},
                color 220ms ${LUXE_EASE}, transform 220ms ${LUXE_EASE};
            }
            .yato-nav-btn:hover {
              font-weight: 700 !important;
              font-size: 13px !important;
              color: rgba(43, 42, 38, 0.92) !important;
            }

            /* Q5 image choices (hover reveal label) */
            .yato-img-choice {
              border-radius: 2px;
              border: 1px solid rgba(43, 42, 38, 0.12);
              background: rgba(255, 255, 255, 0.35);
              cursor: pointer;
              padding: 0;
              transition: transform 280ms ${LUXE_EASE}, border-color 280ms ${LUXE_EASE};
            }
            .yato-img-choice:hover {
              transform: translateY(-1px);
              border-color: rgba(43, 42, 38, 0.18);
            }
            .yato-img-choice.is-selected {
              border-color: rgba(43, 42, 38, 0.28);
            }
            .yato-img-choice__img {
              width: 100%;
              height: auto;
              display: block;
              transform: scale(1.02);
              transition: transform 420ms ${LUXE_EASE};
            }
            .yato-img-choice:hover .yato-img-choice__img {
              transform: scale(1.06);
            }
            .yato-img-choice__shade {
              position: absolute;
              inset: 0;
              background: linear-gradient(
                180deg,
                rgba(0, 0, 0, 0.0) 40%,
                rgba(0, 0, 0, 0.55) 100%
              );
              opacity: 0;
              transition: opacity 260ms ${LUXE_EASE};
            }
            .yato-img-choice:hover .yato-img-choice__shade,
            .yato-img-choice:focus-visible .yato-img-choice__shade,
            .yato-img-choice.is-selected .yato-img-choice__shade {
              opacity: 1;
            }
            /* Selected state: clear 40% black overlay so click is obvious */
            .yato-img-choice.is-selected .yato-img-choice__shade {
              opacity: 1 !important;
              background: rgba(0, 0, 0, 0.4) !important;
            }
            .yato-img-choice__label {
              position: absolute;
              left: 14px;
              right: 14px;
              bottom: 12px;
              color: rgba(255, 255, 255, 0.96);
              font-family: ${FONT_SANS};
              font-size: 12px;
              line-height: 1.45;
              letter-spacing: 0.02em;
              opacity: 0;
              transform: translateY(4px);
              transition: opacity 260ms ${LUXE_EASE}, transform 260ms ${LUXE_EASE};
              text-shadow: 0 6px 18px rgba(0,0,0,0.35);
            }
            .yato-img-choice:hover .yato-img-choice__label,
            .yato-img-choice:focus-visible .yato-img-choice__label,
            .yato-img-choice.is-selected .yato-img-choice__label {
              opacity: 1;
              transform: translateY(0);
            }
  
            @keyframes yato-arrow-float {
              0%, 100% { transform: translateX(-3px); }
              50% { transform: translateX(3px); }
            }
            .yato-arrow-float {
              animation: yato-arrow-float 2.4s ${LUXE_EASE} infinite;
            }
            .yato-cta:hover .yato-arrow-float,
            .yato-cta:focus-visible .yato-arrow-float {
              animation-play-state: paused;
            }

            @keyframes yato-scroll-line {
              0% { transform: translateY(-2px) scaleY(0.85); opacity: 0.45; }
              50% { transform: translateY(8px) scaleY(1.05); opacity: 0.95; }
              100% { transform: translateY(-2px) scaleY(0.85); opacity: 0.45; }
            }
            .yato-scroll-line {
              animation: yato-scroll-line 1.8s ${LUXE_EASE} infinite;
              transform-origin: top;
            }

            .yato-link {
              color: inherit;
              text-decoration: none;
              text-underline-offset: 3px;
            }
            .yato-link:hover {
              text-decoration: underline;
            }

            /* Intake placeholders */
            input::placeholder {
              color: rgba(43, 42, 38, 0.56);
              opacity: 1;
            }
  
            @keyframes yato-slide-right {
              from { opacity: 0; transform: translateX(16px); }
              to   { opacity: 1; transform: translateX(0); }
            }
            @keyframes yato-slide-left {
              from { opacity: 0; transform: translateX(-16px); }
              to   { opacity: 1; transform: translateX(0); }
            }
            @keyframes yato-fade-in {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes yato-rise {
              from { opacity: 0; transform: translateY(16px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes yato-spin {
              to { transform: rotate(360deg); }
            }
  
            @media (prefers-reduced-motion: reduce) {
              *, *::before, *::after {
                animation-duration: 0.001ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.001ms !important;
              }
            }
          `}</style>
        </div>
      </TrackingProvider>
    );
  }
  
  /* ============================================================================
   * Supabase schema reference
   * ----------------------------------------------------------------------------
   *   create table results (
   *     id uuid primary key default gen_random_uuid(),
   *     session_id text,
   *     name text,
   *     age integer,
   *     answers jsonb,
   *     final_result text,
   *     second_result text,
   *     third_result text,
   *     coupon_clicked boolean default false,
   *     coupon_code_issued text,       -- e.g. YATO-VAL-05
   *     is_buy_clicked boolean default false,
   *     duration_seconds integer,
   *     scores jsonb,
   *     created_at timestamptz default now()
   *   );
   *
   *   create table funnel_events (
   *     id uuid primary key default gen_random_uuid(),
   *     session_id text,
   *     stage text,
   *     meta jsonb,
   *     occurred_at timestamptz default now()
   *   );
   *
   *   create table conversions (
   *     id uuid primary key default gen_random_uuid(),
   *     session_id text,
   *     product_id text,
   *     meta jsonb,
   *     occurred_at timestamptz default now()
   *   );
   * ========================================================================== */