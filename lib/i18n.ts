// Pure i18n module — safe to import from client & server (no next/headers here).
export type Locale = "ko" | "en";

const DICT = {
  ko: {
    shop: "쇼핑", about: "브랜드 소개", coffeeInfo: "커피 정보", blog: "블로그",
    education: "교육 자료", consulting: "컨설팅", contact: "문의", login: "로그인", signup: "회원가입", cart: "장바구니",
    bestsellers: "베스트", newArrivals: "신상품", categories: "카테고리",
    viewAll: "전체 보기", addToCart: "장바구니 담기", soldOut: "품절",
    origin: "원산지", variety: "품종", process: "가공 방식", flavor: "플레이버 노트",
    roast: "로스팅 레벨", weight: "중량", recipe: "추천 추출 & 레시피",
    moreInfo: "more information", philosophy: "철학", wholesaleOnly: "사업자 전용",
    coffee: "커피", from: "부터",
    // 홈
    businessShop: "사업자 전용 쇼핑", businessPricing: "기업회원 가격 적용",
    coffeelogDesc: "Coffeelog 커피 이야기", contactDesc: "납품·컨설팅·교육·제품 문의",
    // 컬렉션 / 검색
    allCoffee: "전체 커피", categoryComingSoon: "해당 카테고리 상품을 준비 중입니다.",
    items: "items", searchPlaceholder: "원두명·풍미·산지 검색",
    searchResults: "검색 결과", searchCount: "건",
    // 카테고리 칩
    catAll: "전체", catBlends: "블렌드", catSingleOrigins: "싱글 오리진",
    catWholesale: "사업자 전용", productCategories: "제품 카테고리",
    // 장바구니
    cartEmpty: "장바구니가 비어 있습니다.", goShopping: "쇼핑하기",
    remove: "삭제", subtotalLabel: "소계", tipLabel: "팁 (바리스타·로스터 응원)",
    tipNone: "없음", tipCustom: "직접%", tipWord: "팁", totalLabel: "합계",
    shippingCalcCheckout: "배송비는 체크아웃에서 계산됩니다.", checkout: "체크아웃",
    addedToCart: "담겼습니다 ✓", optionDefault: "기본",
    // 체크아웃
    ordererInfo: "주문자 정보", emailOrderConfirm: "이메일(주문 확인)",
    shippingAddress: "배송지", recipient: "받는 분", phone: "전화번호", country: "국가",
    countryKR: "대한민국", zipcode: "우편번호", zipSearch: "우편번호 검색",
    addr1Placeholder: "기본 주소", addr2Placeholder: "상세 주소",
    paymentMethod: "결제 수단", pmInicis: "신용카드·계좌이체 (이니시스)",
    pmPaypal: "PayPal (해외·USD)",
    promoCodeLabel: "할인/프로모션 코드", promoCodePlaceholder: "코드 입력(선택)",
    checkoutServerNote: "코드 할인·배송비는 주문 시 서버에서 최종 계산됩니다.",
    processing: "처리 중…", placeOrder: "주문하기",
    checkoutTitle: "체크아웃",
    // 주문 완료
    orderCompleteTitle: "주문 완료", paidTitle: "결제가 완료되었습니다 ✓",
    orderReceivedTitle: "주문이 접수되었습니다", orderNoLabel: "주문번호",
    paidBody: "결제가 정상 승인되었습니다. 가평 로스터리에서 신선하게 준비해 출고해 드립니다. 출고 시 이메일로 안내드립니다.",
    pendingPayBody: "결제가 완료되지 않았습니다. 마이페이지에서 다시 결제하거나 장바구니에서 재시도해 주세요.",
    receivedBody: "주문이 접수되었습니다. 주문 내역은 마이페이지에서 확인하실 수 있습니다.",
    orderHistory: "주문 내역", continueShopping: "쇼핑 계속",
    // 문의
    contactTitle: "문의하기", contactIntro: "납품·컨설팅·교육·제품 등 어떤 문의든 편하게 남겨주세요.",
    name: "이름", email: "이메일", inquiryType: "문의 유형",
    typeGeneral: "일반", typeWholesale: "도매·납품", typeConsulting: "컨설팅",
    typeEducation: "교육", typeProduct: "제품", message: "문의 내용",
    newsletterOptIn: "뉴스레터 수신 동의", send: "보내기",
    // 커피 정보
    coffeeInfoTitle: "커피 정보",
    coffeeInfoIntro: "원두별 산지·플레이버 노트·추천 추출과 인포메이션 카드(이미지)를 제공합니다.",
    roastingLabel: "로스팅", flavorShort: "플레이버", recommendedBrew: "추천 추출",
    brewMethods: "에스프레소 · 핸드드립(V60) · 콜드브루",
    infoCardPng: "인포카드 PNG", cardnewsSvg: "카드뉴스 SVG", noProducts: "등록된 제품이 없습니다.",
    // 블로그
    coffeelogTitle: "Coffeelog 커피로그",
    coffeelogEmpty: "곧 다양한 커피 이야기가 업데이트될 예정입니다.",
    // FAQ
    faqTitle: "자주 묻는 질문", faqEmpty: "등록된 FAQ가 없습니다.",
    faqCatShipping: "배송", faqCatReturn: "교환·환불", faqCatProduct: "제품",
    faqCatWholesale: "사업자(도매)", faqCatOrder: "주문", faqCatAccount: "계정", faqCatGeneral: "일반",
    // 프로모션
    promoCode: "할인 코드", discountSuffix: "할인", shopWithCode: "이 코드로 쇼핑하기",
    promoApplyNote: "체크아웃에서 코드를 입력하면 할인이 적용됩니다.",
    // 계정 - 로그인
    loginTitle: "로그인", password: "비밀번호", newHere: "처음이신가요?",
    // 계정 - 회원가입
    signupTitle: "회원가입", roleIndividual: "일반 회원", roleBusiness: "기업 회원 (사업자)",
    address: "주소", language: "사용 언어", langKo: "한국어", langEn: "English",
    bizInfoApproval: "사업자 정보 (승인 후 도매가 적용)", companyName: "상호",
    bizRegNo: "사업자등록번호", representative: "대표자명", taxInvoiceEmail: "세금계산서 이메일",
    bizRegFile: "사업자등록증 첨부 * (PDF/이미지, 최대 10MB)",
    bizRegFileNote: "※ 사업자 회원은 사업자등록증 첨부가 필수입니다. 관리자 승인 후 도매가가 적용됩니다.",
    securityQuestions: "보안 질문 (아이디/비밀번호 찾기용)",
    questionN: "질문", answerN: "답변", marketingOptIn: "마케팅 정보 수신 동의",
    signupSubmit: "가입하기", alreadyMember: "이미 회원이신가요?",
    continueWithKakao: "카카오로 시작하기", orDivider: "또는",
    kakaoIndividualNote: "카카오 간편가입은 개인 회원 전용입니다. 사업자 회원은 아래 양식으로 신청해 주세요.",
    // 주소 폼
    addNewAddress: "+ 새 배송지 추가", addressDetail: "상세 주소",
    zipLabel: "우편번호", addressLabel: "기본 주소",
    entranceMemo: "출입 메모(공동현관 비밀번호 등, 선택)",
    setDefaultAddress: "기본 배송지로 설정", save: "저장", cancel: "취소",
    addressSearch: "주소 검색",
    // 계정 - 마이페이지
    myPage: "마이페이지", signOut: "로그아웃", memberInfo: "회원 정보",
    memberRole: "등급", languageUsed: "사용 언어", marketingReceive: "마케팅 수신",
    agreed: "동의", notAgreed: "미동의", bizInfo: "사업자 정보",
    marketingOptInNote: "수신동의는 언제든 변경할 수 있습니다.", marketingSaved: "마케팅 수신 설정이 저장되었습니다.",
    approvalStatus: "승인 상태", approved: "승인됨 (도매가 적용)",
    pending: "승인 대기 중", rejected: "반려", addressBook: "배송지 주소록",
    default: "기본", setAsDefault: "기본으로", noAddresses: "저장된 배송지가 없습니다. 아래에서 추가하세요.",
    purchaseHistory: "구매 내역", noOrders: "주문 내역이 없습니다.",
    roleLabelIndividual: "일반 회원", roleLabelBusiness: "기업 회원",
    roleLabelInfluencer: "인플루언서", roleLabelAdmin: "관리자",
    // 계정 - 주문 상세
    orderPrefix: "주문", discountLabel: "할인", shippingFeeLabel: "배송비",
    requestTaxInvoice: "세금계산서 요청",
    // 재주문
    addingToCart: "담는 중…", reorder: "재주문 (장바구니에 담기)",
    // 비밀번호 변경
    changePassword: "비밀번호 변경", newPassword: "새 비밀번호",
    confirmNewPassword: "새 비밀번호 확인", changePasswordSubmit: "변경하기",
    firstLoginNotice: "첫 로그인입니다. 계속하려면 초기 비밀번호(0000)를 변경해 주세요.",
    // 비밀번호 재설정(찾기)
    forgotPassword: "비밀번호를 잊으셨나요?",
    forgotTitle: "비밀번호 재설정",
    forgotIntro: "가입하신 이메일로 6자리 인증코드를 보내드립니다. 코드는 {min}분간 유효합니다.",
    sendCode: "인증코드 받기",
    resetTitle: "새 비밀번호 설정",
    codeSentNotice: "위 주소로 보낸 인증코드를 {min}분 안에 입력해 주세요.",
    codeSentOk: "인증코드를 이메일로 보냈습니다. 메일이 보이지 않으면 스팸함도 확인해 주세요.",
    resetNeedEmail: "이메일 주소가 확인되지 않았습니다. 처음부터 다시 시도해 주세요.",
    verificationCode: "인증코드 (숫자 6자리)",
    resendCode: "인증코드 재발송",
    resetSubmit: "비밀번호 재설정",
    backToLogin: "로그인으로 돌아가기",
    // 제품 상세 - FAQ / 안내
    firstReview: "첫 리뷰를 남겨주세요.", reviewTitlePlaceholder: "제목",
    reviewBodyPlaceholder: "후기를 남겨주세요", submitReview: "리뷰 등록 (로그인 필요)",
    ratingSuffix: "점", loginRequired: "로그인 필요",
  },
  en: {
    shop: "Shop", about: "About", coffeeInfo: "Coffee Info", blog: "Blog",
    education: "Education", consulting: "Consulting", contact: "Contact", login: "Login", signup: "Sign up", cart: "Cart",
    bestsellers: "Best", newArrivals: "New", categories: "Categories",
    viewAll: "View all", addToCart: "Add to cart", soldOut: "Sold out",
    origin: "Origin", variety: "Variety", process: "Process", flavor: "Flavour notes",
    roast: "Roast level", weight: "Weight", recipe: "Recommended brewing & recipe",
    moreInfo: "more information", philosophy: "Philosophy", wholesaleOnly: "Wholesale only",
    coffee: "Coffee", from: "from",
    // Home
    businessShop: "Wholesale Shop", businessPricing: "Business pricing applied",
    coffeelogDesc: "Coffeelog — coffee stories", contactDesc: "Wholesale · consulting · education · product inquiries",
    // Collections / Search
    allCoffee: "All Coffee", categoryComingSoon: "Products for this category are coming soon.",
    items: "items", searchPlaceholder: "Search coffee, flavour or origin",
    searchResults: "results for", searchCount: "",
    // Category chips
    catAll: "All", catBlends: "Blends", catSingleOrigins: "Single Origins",
    catWholesale: "Wholesale", productCategories: "Product categories",
    // Cart
    cartEmpty: "Your cart is empty.", goShopping: "Start shopping",
    remove: "Remove", subtotalLabel: "Subtotal", tipLabel: "Tip (support our baristas & roasters)",
    tipNone: "None", tipCustom: "Custom %", tipWord: "Tip", totalLabel: "Total",
    shippingCalcCheckout: "Shipping is calculated at checkout.", checkout: "Checkout",
    addedToCart: "Added ✓", optionDefault: "Default",
    // Checkout
    ordererInfo: "Customer Details", emailOrderConfirm: "Email (order confirmation)",
    shippingAddress: "Shipping Address", recipient: "Recipient", phone: "Phone", country: "Country",
    countryKR: "South Korea", zipcode: "Postal code", zipSearch: "Find postal code",
    addr1Placeholder: "Address", addr2Placeholder: "Address detail",
    paymentMethod: "Payment Method", pmInicis: "Card · Bank transfer (Inicis)",
    pmPaypal: "PayPal (international · USD)",
    promoCodeLabel: "Discount / promo code", promoCodePlaceholder: "Enter code (optional)",
    checkoutServerNote: "Code discounts and shipping are finalized on the server at checkout.",
    processing: "Processing…", placeOrder: "Place order",
    checkoutTitle: "Checkout",
    // Order complete
    orderCompleteTitle: "Order Complete", paidTitle: "Payment complete ✓",
    orderReceivedTitle: "Your order has been received", orderNoLabel: "Order no.",
    paidBody: "Your payment has been approved. We'll prepare your order fresh at our Gapyeong roastery and ship it out. We'll email you when it ships.",
    pendingPayBody: "Payment was not completed. Please pay again from My Page or retry from your cart.",
    receivedBody: "Your order has been received. You can review it any time on My Page.",
    orderHistory: "Order history", continueShopping: "Continue shopping",
    // Contact
    contactTitle: "Contact Us", contactIntro: "Wholesale, consulting, education, products — feel free to reach out about anything.",
    name: "Name", email: "Email", inquiryType: "Inquiry type",
    typeGeneral: "General", typeWholesale: "Wholesale · supply", typeConsulting: "Consulting",
    typeEducation: "Education", typeProduct: "Product", message: "Message",
    newsletterOptIn: "Subscribe to our newsletter", send: "Send",
    // Coffee Info
    coffeeInfoTitle: "Coffee Info",
    coffeeInfoIntro: "Origin, flavour notes, recommended brewing, and downloadable info cards for each coffee.",
    roastingLabel: "Roast", flavorShort: "Flavour", recommendedBrew: "Recommended brewing",
    brewMethods: "Espresso · Pour-over (V60) · Cold brew",
    infoCardPng: "Info card PNG", cardnewsSvg: "Card news SVG", noProducts: "No products yet.",
    // Blog
    coffeelogTitle: "Coffeelog",
    coffeelogEmpty: "Coffee stories are coming soon.",
    // FAQ
    faqTitle: "Frequently Asked Questions", faqEmpty: "No FAQs yet.",
    faqCatShipping: "Shipping", faqCatReturn: "Returns · Exchanges", faqCatProduct: "Product",
    faqCatWholesale: "Wholesale", faqCatOrder: "Orders", faqCatAccount: "Account", faqCatGeneral: "General",
    // Promo
    promoCode: "Discount code", discountSuffix: "off", shopWithCode: "Shop with this code",
    promoApplyNote: "Enter the code at checkout to apply your discount.",
    // Account - Login
    loginTitle: "Login", password: "Password", newHere: "New here?",
    // Account - Signup
    signupTitle: "Sign up", roleIndividual: "Individual", roleBusiness: "Business (registered)",
    address: "Address", language: "Language", langKo: "한국어", langEn: "English",
    bizInfoApproval: "Business details (wholesale pricing after approval)", companyName: "Company name",
    bizRegNo: "Business registration no.", representative: "Representative", taxInvoiceEmail: "Tax invoice email",
    bizRegFile: "Business registration certificate * (PDF/image, max 10MB)",
    bizRegFileNote: "* Business members must attach a registration certificate. Wholesale pricing applies after admin approval.",
    securityQuestions: "Security questions (for account recovery)",
    questionN: "Question", answerN: "Answer", marketingOptIn: "I agree to receive marketing information",
    signupSubmit: "Create account", alreadyMember: "Already a member?",
    continueWithKakao: "Continue with Kakao", orDivider: "or",
    kakaoIndividualNote: "Kakao sign-up is for individual members only. Business members, please use the form below.",
    // Address form
    addNewAddress: "+ Add new address", addressDetail: "Address detail",
    zipLabel: "Postal code", addressLabel: "Address",
    entranceMemo: "Entrance note (building door code, etc. — optional)",
    setDefaultAddress: "Set as default address", save: "Save", cancel: "Cancel",
    addressSearch: "Search address",
    // Account - My Page
    myPage: "My Page", signOut: "Sign out", memberInfo: "Member Info",
    memberRole: "Membership", languageUsed: "Language", marketingReceive: "Marketing",
    agreed: "Opted in", notAgreed: "Opted out", bizInfo: "Business Info",
    marketingOptInNote: "You can change this preference at any time.", marketingSaved: "Marketing preference saved.",
    approvalStatus: "Status", approved: "Approved (wholesale pricing)",
    pending: "Pending approval", rejected: "Rejected", addressBook: "Address Book",
    default: "Default", setAsDefault: "Set as default", noAddresses: "No saved addresses. Add one below.",
    purchaseHistory: "Order History", noOrders: "No orders yet.",
    roleLabelIndividual: "Individual", roleLabelBusiness: "Business",
    roleLabelInfluencer: "Influencer", roleLabelAdmin: "Admin",
    // Account - Order detail
    orderPrefix: "Order", discountLabel: "Discount", shippingFeeLabel: "Shipping",
    requestTaxInvoice: "Request tax invoice",
    // Reorder
    addingToCart: "Adding…", reorder: "Reorder (add to cart)",
    // Change password
    changePassword: "Change Password", newPassword: "New password",
    confirmNewPassword: "Confirm new password", changePasswordSubmit: "Change password",
    firstLoginNotice: "This is your first login. Please change the initial password (0000) to continue.",
    // Password reset
    forgotPassword: "Forgot your password?",
    forgotTitle: "Reset password",
    forgotIntro: "We'll email a 6-digit verification code to your registered address. The code is valid for {min} minutes.",
    sendCode: "Send code",
    resetTitle: "Set a new password",
    codeSentNotice: "Enter the code we sent to this address within {min} minutes.",
    codeSentOk: "Verification code sent. If you don't see it, please check your spam folder.",
    resetNeedEmail: "No email address was provided. Please start over.",
    verificationCode: "Verification code (6 digits)",
    resendCode: "Resend code",
    resetSubmit: "Reset password",
    backToLogin: "Back to login",
    // Product detail - FAQ / notice
    firstReview: "Be the first to leave a review.", reviewTitlePlaceholder: "Title",
    reviewBodyPlaceholder: "Share your experience", submitReview: "Post review (login required)",
    ratingSuffix: "★", loginRequired: "login required",
  },
} as const;

export function t(locale: Locale) {
  return DICT[locale];
}

export function formatKRW(n: number): string {
  return "₩" + n.toLocaleString("ko-KR");
}
