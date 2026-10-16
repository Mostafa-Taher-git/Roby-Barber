/**
 * ROBY BARBER MANAGEMENT SYSTEM - LOCAL SINGLE-SALON EDITION
 * Owner Console & Customer Booking Portal
 * Offline Local-Storage Enabled | Zero Missing Images
 */

const LOCAL_STORAGE_KEY = 'roby_barber_local_db_v2';

// ================= OFFLINE SVG FALLBACK GENERATORS =================
function getSvgAvatar(name = 'حلاق', color = '#f5b842') {
  const cleanName = name.replace(/الأسطى|كابتن|د\/|م\//g, '').trim();
  const initial = cleanName.charAt(0) || '✂';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="av_${initial}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e2638"/>
        <stop offset="100%" stop-color="#141a26"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="50" fill="url(#av_${initial})"/>
    <circle cx="50" cy="50" r="46" fill="none" stroke="${color}" stroke-width="2.5"/>
    <text x="50" y="55" font-family="Cairo, sans-serif" font-weight="800" font-size="38" fill="${color}" text-anchor="middle" dominant-baseline="central">${initial}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function getSvgService(title = 'خدمة حلاقة', cat = 'hair') {
  let icon = '✂️';
  let badge = 'صالون روبي';
  if (cat === 'beard') { icon = '🧔'; badge = 'تحديد لحية'; }
  else if (cat === 'skin') { icon = '🧖‍♂️'; badge = 'عناية وبخار'; }
  else if (cat === 'packages') { icon = '👑'; badge = 'باقة VIP'; }
  else if (cat === 'retail') { icon = '🧴'; badge = 'منتج بيع'; }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 180" width="300" height="180">
    <defs>
      <linearGradient id="srv_${cat}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="300" height="180" rx="10" fill="url(#srv_${cat})"/>
    <rect x="4" y="4" width="292" height="172" rx="8" fill="none" stroke="rgba(245, 184, 66, 0.25)" stroke-width="1.5"/>
    <text x="50%" y="38%" font-size="44" text-anchor="middle" dominant-baseline="central">${icon}</text>
    <text x="50%" y="68%" font-family="Cairo, sans-serif" font-weight="800" font-size="14" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${title}</text>
    <text x="50%" y="86%" font-family="Cairo, sans-serif" font-weight="600" font-size="11" fill="#f5b842" text-anchor="middle" dominant-baseline="central">${badge}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function getSvgOffer(title = 'عرض خاص') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="off_grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2a2012"/>
        <stop offset="100%" stop-color="#1a140a"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="10" fill="url(#off_grad)"/>
    <rect x="2" y="2" width="96" height="96" rx="8" fill="none" stroke="#f5b842" stroke-width="1.5"/>
    <text x="50" y="42" font-size="28" text-anchor="middle" dominant-baseline="central">✂️</text>
    <text x="50" y="76" font-family="Cairo, sans-serif" font-weight="bold" font-size="10" fill="#f5b842" text-anchor="middle" dominant-baseline="central">عرض روبي</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// Global Image Error Handler to prevent missing/broken image icons
window.handleImgError = function(imgElement, type, arg1, arg2) {
  imgElement.onerror = null;
  if (type === 'roby') {
    imgElement.src = getSvgAvatar('روبي', '#f5b842');
  } else if (type === 'avatar') {
    imgElement.src = getSvgAvatar(arg1 || 'حلاق', '#f5b842');
  } else if (type === 'service') {
    imgElement.src = getSvgService(arg1 || 'خدمة', arg2 || 'hair');
  } else if (type === 'offer') {
    imgElement.src = getSvgOffer(arg1 || 'عرض');
  } else {
    imgElement.src = getSvgAvatar('روبي', '#f5b842');
  }
};

// ================= DEFAULT INITIAL STATE =================
const defaultState = {
  currentMode: 'admin', // 'admin' | 'customer'

  salon: {
    nameAr: 'صالون روبي باربر للرجال',
    nameEn: 'Roby Barber Salon',
    address: 'شارع جامعة الدول العربية - المهندسين، الجيزة',
    phone: '01023456789',
    instapay: 'roby.barber@instapay',
    vodafone: '01099887766',
    todaySales: 7500,
    todayAppointments: 12,
    inProgressCount: 2,
    stockAlerts: 3,
    staffOnDuty: 8,
    drawerCash: 3850,
    drawerOnline: 3650
  },

  staff: [
    {
      id: 'ahmed',
      nameAr: 'الأسطى أحمد خليل',
      nameEn: 'Ahmed Khalil',
      role: 'كوافير محترف أول',
      commPct: 20,
      servicesDone: 21,
      tips: 450,
      fixedSalary: 5000,
      estimatedPay: 7500,
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      rating: '4.9 ★★★★★'
    },
    {
      id: 'anwar',
      nameAr: 'الأسطى أنور عسران',
      nameEn: 'Anwar Sran',
      role: 'مصفف لحية وتدريج',
      commPct: 20,
      servicesDone: 16,
      tips: 320,
      fixedSalary: 5000,
      estimatedPay: 6800,
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      rating: '4.8 ★★★★★'
    },
    {
      id: 'jasem',
      nameAr: 'الأسطى جاسم كيتش',
      nameEn: 'Jasem Ketsh',
      role: 'أخصائي تنظيف بشرة وبخار',
      commPct: 20,
      servicesDone: 40,
      tips: 600,
      fixedSalary: 5000,
      estimatedPay: 9200,
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      rating: '5.0 ★★★★★'
    },
    {
      id: 'roby',
      nameAr: 'كابتن روبي باربر',
      nameEn: 'Robyi Raber',
      role: 'الماستر باربر وصاحب الصالون',
      commPct: 10,
      servicesDone: 23,
      tips: 500,
      fixedSalary: 8000,
      estimatedPay: 11500,
      photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80',
      rating: '5.0 ★★★★★'
    },
    {
      id: 'ibrahim',
      nameAr: 'الأسطى إبراهيم سعد',
      nameEn: 'Ibrahim Saad',
      role: 'كوافير قصات حديثة وفيد',
      commPct: 25,
      servicesDone: 18,
      tips: 280,
      fixedSalary: 4500,
      estimatedPay: 6400,
      photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80',
      rating: '4.7 ★★★★☆'
    }
  ],

  services: [
    {
      id: 'srv_1',
      title: 'قص شعر استايل وفيد + سشوار',
      cat: 'hair',
      price: 120,
      duration: '35 دقيقة',
      desc: 'قص وتدريج حديث مع غسيل وسشوار ومثبت',
      img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300&auto=format&fit=crop&q=80'
    },
    {
      id: 'srv_2',
      title: 'تظبيط وتحديد دقن بالموس والخيط',
      cat: 'beard',
      price: 70,
      duration: '20 دقيقة',
      desc: 'تحديد دقيق بموس شفرة ليزر + خيط وفوطة سخنة مع زيت اللحية',
      img: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300&auto=format&fit=crop&q=80'
    },
    {
      id: 'srv_3',
      title: 'كومبو شياكة: شعر + لحية كاملة',
      cat: 'packages',
      price: 170,
      originalPrice: 190,
      duration: '50 دقيقة',
      desc: 'الباكيدج الأكثر طلباً: حلاقة شعر استايلنج وتظبيط لحية كاملة',
      img: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300&auto=format&fit=crop&q=80'
    },
    {
      id: 'srv_4',
      title: 'تنظيف بشرة هيدرافاشيل وبخار',
      cat: 'skin',
      price: 200,
      duration: '40 دقيقة',
      desc: 'جلسة بخار ساخن + إزالة رؤوس سوداء + ماسك طمي مغربي وقناع كولاجين',
      img: 'https://images.unsplash.com/photo-1512290900672-1f5be4ac4a64?w=300&auto=format&fit=crop&q=80'
    },
    {
      id: 'srv_5',
      title: 'ماسك فحم أسود لإزالة الدهون',
      cat: 'skin',
      price: 60,
      duration: '15 دقيقة',
      desc: 'ماسك الفحم النشط الكوري لإزالة الشوائب وتنقية المسام',
      img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&auto=format&fit=crop&q=80'
    },
    {
      id: 'srv_6',
      title: 'فرد بروتين / فيلر علاجي للشعر',
      cat: 'hair',
      price: 450,
      duration: '75 دقيقة',
      desc: 'بروتين برازيلي أصلي زيرو فورمالين لعلاج الهيشان والتنعيم',
      img: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=300&auto=format&fit=crop&q=80'
    },
    {
      id: 'srv_7',
      title: 'باقة العريس الملكية (VIP Groom)',
      cat: 'packages',
      price: 1200,
      originalPrice: 1500,
      duration: '150 دقيقة',
      desc: 'تجهيز عريس كامل: حلاقة + لحية + بخار + ماسكات + باديكير + سشوار وميكاب خفيف',
      img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80'
    },
    {
      id: 'srv_8',
      title: 'واكس مثبت شعر مات بريميوم',
      cat: 'retail',
      price: 130,
      duration: 'منتج بيع',
      desc: 'واكس احترافي ثبات قوي ومظهر طبيعي مط بدون لمعان 150 مل',
      img: 'https://images.unsplash.com/photo-1594913785162-e678a0c23ddb?w=300&auto=format&fit=crop&q=80'
    },
    {
      id: 'srv_9',
      title: 'زيت لحية طبيعي بالروزماري',
      cat: 'retail',
      price: 160,
      duration: 'منتج بيع',
      desc: 'مغذي لتكثيف وتنعيم شعر اللحية برائحة العود والخشب 50 مل',
      img: 'https://images.unsplash.com/photo-1608248597359-009c9509425d?w=300&auto=format&fit=crop&q=80'
    }
  ],

  salonChairs: [
    {
      id: 1,
      num: 1,
      barber: 'الأسطى أحمد خليل',
      barberImg: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      status: 'busy',
      customer: 'م/ طارق عبد العزيز',
      service: 'قص شعر + تظبيط لحية',
      remMins: 10
    },
    {
      id: 2,
      num: 2,
      barber: 'الأسطى أنور عسران',
      barberImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      status: 'free',
      customer: '-',
      service: 'الكرسي شاغر وجاهز للاستقبال',
      remMins: 0
    },
    {
      id: 3,
      num: 3,
      barber: 'الأسطى جاسم كيتش',
      barberImg: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      status: 'busy',
      customer: 'د/ شريف رمزي',
      service: 'جلسة هيدرافاشيل وبخار بشرة',
      remMins: 25
    },
    {
      id: 4,
      num: 4,
      barber: 'كابتن روبي باربر',
      barberImg: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80',
      status: 'free',
      customer: '-',
      service: 'متاح للحجز VIP',
      remMins: 0
    },
    {
      id: 5,
      num: 5,
      barber: 'الأسطى إبراهيم سعد',
      barberImg: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80',
      status: 'free',
      customer: '-',
      service: 'جاهز لاستقبال الزبون التالي',
      remMins: 0
    }
  ],

  appointments: [
    {
      id: 'RB-1082',
      name: 'محمد طارق الشريف',
      phone: '01012345678',
      service: 'كومبو شياكة (شعر + لحية)',
      barber: 'الأسطى أحمد خليل',
      time: '04:00 م',
      status: 'waiting', // waiting, in_chair, done
      payment: 'إنستاباي InstaPay',
      price: 170
    },
    {
      id: 'RB-1083',
      name: 'حسام حسن الدالي',
      phone: '01123456789',
      service: 'قص شعر وتدريج فيد',
      barber: 'الأسطى إبراهيم سعد',
      time: '04:30 م',
      status: 'waiting',
      payment: 'كاش في الصالون',
      price: 120
    },
    {
      id: 'RB-1084',
      name: 'طارق عبد العزيز',
      phone: '01234567890',
      service: 'قص شعر + تظبيط لحية',
      barber: 'الأسطى أحمد خليل',
      time: '03:30 م',
      status: 'in_chair',
      payment: 'كاش نقدية',
      price: 170
    },
    {
      id: 'RB-1085',
      name: 'د/ شريف رمزي',
      phone: '01099881122',
      service: 'تنظيف بشرة هيدرافاشيل وبخار',
      barber: 'الأسطى جاسم كيتش',
      time: '03:45 م',
      status: 'in_chair',
      payment: 'فيزا كارت',
      price: 200
    },
    {
      id: 'RB-1080',
      name: 'كريم محمود يونس',
      phone: '01511223344',
      service: 'باقة العريس الملكية (VIP)',
      barber: 'كابتن روبي باربر',
      time: '01:00 م',
      status: 'done',
      payment: 'إنستاباي InstaPay',
      price: 1200
    },
    {
      id: 'RB-1081',
      name: 'عمر عثمان',
      phone: '01044556677',
      service: 'حلاقة دقن وتحديد ليزر',
      barber: 'الأسطى أنور عسران',
      time: '02:15 م',
      status: 'done',
      payment: 'فودافون كاش',
      price: 70
    }
  ],

  inventory: [
    { id: 'inv_1', name: 'شمع وواكس شعر مات إيطالي', type: 'retail', cost: 75, price: 130, qty: 18, minQty: 10, status: 'good' },
    { id: 'inv_2', name: 'شفرات دوركو بلاتينيوم (باكت 100)', type: 'salon', cost: 120, price: 0, qty: 3, minQty: 8, status: 'critical' },
    { id: 'inv_3', name: 'زيت لحية بالروزماري 50 مل', type: 'retail', cost: 90, price: 160, qty: 12, minQty: 5, status: 'good' },
    { id: 'inv_4', name: 'كريم سنفرة بالخوخ والمشمش 1 كجم', type: 'salon', cost: 85, price: 0, qty: 2, minQty: 5, status: 'critical' },
    { id: 'inv_5', name: 'فوط تواليت صحية استعمال مرة واحدة', type: 'salon', cost: 150, price: 0, qty: 4, minQty: 10, status: 'critical' },
    { id: 'inv_6', name: 'كولونيا وتونيك بعد الحلاقة بالليمون', type: 'salon', cost: 65, price: 0, qty: 14, minQty: 6, status: 'good' },
    { id: 'inv_7', name: 'صبغة لحية وشعر بدون أمونيا بيجن', type: 'salon', cost: 110, price: 180, qty: 9, minQty: 6, status: 'good' }
  ],

  customers: [
    { code: 'CUST-301', name: 'محمد طارق الشريف', phone: '01012345678', visits: 14, points: 280, favBarber: 'الأسطى أحمد خليل', lastVisit: 'اليوم', vip: true },
    { code: 'CUST-302', name: 'حسام حسن الدالي', phone: '01123456789', visits: 6, points: 120, favBarber: 'الأسطى إبراهيم سعد', lastVisit: 'منذ أسبوع', vip: false },
    { code: 'CUST-303', name: 'د/ شريف رمزي', phone: '01099881122', visits: 22, points: 490, favBarber: 'الأسطى جاسم كيتش', lastVisit: 'اليوم', vip: true },
    { code: 'CUST-304', name: 'كريم محمود يونس (عريس)', phone: '01511223344', visits: 8, points: 350, favBarber: 'كابتن روبي باربر', lastVisit: 'اليوم', vip: true },
    { code: 'CUST-305', name: 'أحمد علاء عبد القادر', phone: '01299887766', visits: 4, points: 80, favBarber: 'الأسطى أنور عسران', lastVisit: 'منذ 3 أسابيع', vip: false }
  ],

  expenses: [
    { no: 'EXP-101', time: '10:30 ص', title: 'طلبات بوفيه وشاي وسكر وقهوة تركي للزبائن', cat: 'بوفيه وضيافة', person: 'كابتن روبي', method: 'كاش من الدرج', amount: 180 },
    { no: 'EXP-102', time: '11:45 ص', title: 'شراء كحول ومطهرات ديتول ومناديل ورق', cat: 'نظافة ومطهرات', person: 'الأسطى أنور', method: 'كاش من الدرج', amount: 220 },
    { no: 'EXP-103', time: '01:15 م', title: 'شحن رصيد باقة راوتر الإنترنت وكاميرات المراقبة', cat: 'فواتير وكهرباء', person: 'كابتن روبي', method: 'محفظة كاش', amount: 280 }
  ],

  activityFeed: [
    { text: 'الأسطى أحمد خليل خلص حلاقة كومبو VIP للزبون كريم', time: 'منذ 5 دقائق' },
    { text: 'تم استلام دفعة 1,200 ج.م باقة عريس عبر إنستاباي InstaPay', time: 'منذ 22 دقيقة' },
    { text: 'حجز أونلاين جديد عبر الموقع من الزبون عمر عثمان', time: 'منذ 45 دقيقة' },
    { text: 'كابتن روبي باربر بدأ جلسة استايلنج وتجهيز عريس', time: 'منذ 1 ساعة' }
  ],

  offers: [
    { title: 'خصم 15% كومبو الحلاقة واللحية', sub: 'Cut & Shave Combo', badge: 'عرض حصري', img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=100&auto=format&fit=crop&q=80' },
    { title: 'باقة العريس الملكية (VIP)', sub: 'خصم 20% + هدية زيت اللحية', badge: 'عرسان مصر', img: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=100&auto=format&fit=crop&q=80' },
    { title: 'كارت الولاء (احلق 5 والسادسة هدية)', sub: 'متاح لجميع زبائن الصالون', badge: 'مجاناً', img: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=100&auto=format&fit=crop&q=80' }
  ],

  // POS State
  cart: [],
  cartTip: 20,
  posSelectedPayment: 'cash',

  // Customer Booking Wizard State (4 Steps)
  customerWizard: {
    step: 1,
    services: ['srv_3'],
    barber: 'ahmed',
    day: 'اليوم',
    time: '04:00 م',
    name: 'محمد طارق',
    phone: '01012345678',
    payment: 'cash',
    notes: ''
  }
};

// Main Active State
let AppState = JSON.parse(JSON.stringify(defaultState));

// Save to LocalStorage
function saveLocalDB() {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(AppState));
  } catch (err) {
    console.error('LocalStorage write failed:', err);
  }
}

// Load from LocalStorage
function loadLocalDB() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      AppState = Object.assign({}, defaultState, parsed);
    }
  } catch (err) {
    console.error('LocalStorage read failed:', err);
  }
}

// Reset Demo Data
function resetDemoData() {
  if (confirm('هل تريد استعادة البيانات الافتراضية للصالون؟ سيتم إعادة ضبط الحجوزات والمبيعات للوضع الأصلي.')) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    AppState = JSON.parse(JSON.stringify(defaultState));
    saveLocalDB();
    location.reload();
  }
}

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  loadLocalDB();

  renderOverviewGauges();
  renderStaffOverviewTable();
  renderActivityFeed();
  renderInventoryBars();
  renderOffersList();
  renderChairsGrid();
  renderBookingsTable();
  renderWaitingQueue();
  renderPOSCatalog();
  renderStaffRoster();
  renderDetailedPayroll();
  renderInventoryTable();
  renderCustomersTable();
  renderExpensesTable();
  renderSettingsPricing();
  renderCustomerServices();
  renderCustomerBarbers();
  initCCTVClock();

  // Keyboard shortcut Ctrl+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('globalSearchInput')?.focus();
    }
  });
});

// ================= VIEW MODE SWITCHER (Admin Owner vs Customer App) =================
function switchViewMode(mode) {
  AppState.currentMode = mode;
  const adminInterface = document.getElementById('adminInterface');
  const customerInterface = document.getElementById('customerInterface');
  const btnAdmin = document.getElementById('btnAdminMode');
  const btnCustomer = document.getElementById('btnCustomerMode');

  if (mode === 'admin') {
    adminInterface.style.display = 'flex';
    customerInterface.style.display = 'none';
    btnAdmin.classList.add('active');
    btnCustomer.classList.remove('active');
    showToast('تم فتح لوحة تحكم إدارة الصالون (المالك)', 'success');
  } else {
    adminInterface.style.display = 'none';
    customerInterface.style.display = 'flex';
    btnAdmin.classList.remove('active');
    btnCustomer.classList.add('active');
    showToast('أهلاً بك في شاشة حجز الزبائن', 'success');
  }
}

// ================= SIDEBAR NAVIGATION =================
function navigateTab(tabId) {
  const tabs = document.querySelectorAll('.tab-page');
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');

  tabs.forEach(tab => tab.classList.remove('active'));
  navItems.forEach(item => item.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabId}`);
  const targetNav = document.querySelector(`.sidebar-nav [data-tab="${tabId}"]`);

  if (targetTab) targetTab.classList.add('active');
  if (targetNav) targetNav.classList.add('active');

  if (tabId === 'pos') renderPOSCatalog();
  if (tabId === 'appointments') renderChairsGrid();
}

// ================= OVERVIEW RENDERING =================
function renderOverviewGauges() {
  document.getElementById('gaugeTodaySales').textContent = `EGP ${AppState.salon.todaySales.toLocaleString()}`;
  document.getElementById('gaugeAppointments').textContent = `${AppState.salon.todayAppointments} booked`;
  document.getElementById('gaugeStockAlerts').textContent = `${AppState.salon.stockAlerts} critical`;
  document.getElementById('gaugeStaffDuty').textContent = `${AppState.salon.staffOnDuty} أفراد`;
  document.getElementById('sidebarDrawerCash').textContent = `${AppState.salon.drawerCash.toLocaleString()} ج.م`;
  document.getElementById('sidebarOnlinePay').textContent = `${AppState.salon.drawerOnline.toLocaleString()} ج.م`;
}

function renderStaffOverviewTable() {
  const tbody = document.getElementById('staffOverviewTbody');
  if (!tbody) return;

  tbody.innerHTML = AppState.staff.map(s => `
    <tr>
      <td><img src="${s.photo}" alt="${s.nameAr}" class="staff-table-avatar" onerror="handleImgError(this, 'avatar', '${s.nameAr}')"></td>
      <td><strong>${s.nameAr}</strong><br><small style="color:#64748b">${s.nameEn}</small></td>
      <td><strong class="gold-text">${s.commPct}%</strong></td>
      <td>${s.servicesDone} زبون</td>
      <td class="text-emerald">${s.tips} ج.م</td>
      <td>${s.fixedSalary.toLocaleString()} ج.م</td>
      <td><strong class="gold-text">${s.estimatedPay.toLocaleString()} ج.م</strong></td>
      <td>
        <div style="display:flex; gap:4px;">
          <button class="btn-table-action" onclick="openPaySlipModal('${s.id}')">كشف الحساب</button>
          <button class="btn-table-action finalize" onclick="finalizeStaffPayment('${s.id}')">صرف</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderActivityFeed() {
  const container = document.getElementById('activityFeedList');
  if (!container) return;

  container.innerHTML = AppState.activityFeed.map(item => `
    <div class="feed-item">
      <div class="feed-dot"></div>
      <div class="feed-content">
        <span>${item.text}</span>
        <span class="feed-time">${item.time}</span>
      </div>
    </div>
  `).join('');
}

function renderInventoryBars() {
  const container = document.getElementById('inventoryBars');
  if (!container) return;

  const barData = [
    { label: 'شمع واكس', pct: 85, icon: 'fa-pump-soap', isCrit: false },
    { label: 'زيت لحية', pct: 60, icon: 'fa-bottle-droplet', isCrit: false },
    { label: 'شفرات موس', pct: 25, icon: 'fa-scissors', isCrit: true },
    { label: 'كريم سنفرة', pct: 20, icon: 'fa-spa', isCrit: true },
    { label: 'فوط تواليت', pct: 30, icon: 'fa-rug', isCrit: true },
    { label: 'كولونيا', pct: 75, icon: 'fa-spray-can', isCrit: false }
  ];

  container.innerHTML = barData.map(b => `
    <div class="inv-bar-item">
      <div class="inv-bar-pill ${b.isCrit ? 'critical' : ''}" style="height: ${b.pct}%;"></div>
      <i class="fa-solid ${b.icon} inv-bar-icon"></i>
      <span class="inv-bar-label">${b.label}</span>
    </div>
  `).join('');
}

function renderOffersList() {
  const container = document.getElementById('activeOffersList');
  if (!container) return;

  container.innerHTML = AppState.offers.map(o => `
    <div class="offer-card-item">
      <img src="${o.img}" alt="${o.title}" class="offer-thumb-img" onerror="handleImgError(this, 'offer', '${o.title}')">
      <div class="offer-info">
        <span class="offer-badge">${o.badge}</span>
        <span class="offer-title">${o.title}</span>
        <span class="offer-desc">${o.sub}</span>
      </div>
    </div>
  `).join('');
}

// ================= APPOINTMENTS & SALON CHAIRS =================
function renderChairsGrid() {
  const container = document.getElementById('salonChairsGrid');
  if (!container) return;

  container.innerHTML = AppState.salonChairs.map(c => `
    <div class="chair-card ${c.status}">
      <div class="chair-header">
        <span class="chair-num"><i class="fa-solid fa-chair text-gold"></i> كرسي رقم ${c.num}</span>
        <span class="chair-badge ${c.status}">${c.status === 'busy' ? 'مشغول حالياً' : 'شاغر ومتاح'}</span>
      </div>
      <div class="chair-body">
        <div class="chair-barber-info">
          <img src="${c.barberImg}" class="chair-barber-img" onerror="handleImgError(this, 'avatar', '${c.barber}')">
          <strong>${c.barber}</strong>
        </div>
        ${c.status === 'busy' ? `
          <div class="chair-customer-line"><i class="fa-solid fa-user"></i> الزبون: <strong>${c.customer}</strong></div>
          <div class="chair-service-line"><i class="fa-solid fa-scissors"></i> ${c.service}</div>
          <div class="chair-timer-line"><i class="fa-regular fa-clock"></i> فاضل حوالي: <strong>${c.remMins} دقائق</strong></div>
        ` : `
          <div class="chair-service-line text-emerald">${c.service}</div>
        `}
      </div>
      <div class="chair-actions">
        ${c.status === 'busy' ? `
          <button class="btn-chair-action primary" onclick="finishChairSession(${c.id})"><i class="fa-solid fa-check"></i> إنهاء ومحاسبة</button>
        ` : `
          <button class="btn-chair-action" onclick="seatWaitingCustomerOnChair(${c.id})"><i class="fa-solid fa-arrow-down"></i> إجلاس زبون</button>
        `}
      </div>
    </div>
  `).join('');
}

function renderBookingsTable(filter = 'all') {
  const tbody = document.getElementById('bookingsTbody');
  if (!tbody) return;

  let items = AppState.appointments;
  if (filter !== 'all') {
    items = items.filter(a => a.status === filter);
  }

  tbody.innerHTML = items.map(a => `
    <tr>
      <td><strong>${a.id}</strong></td>
      <td>${a.name}</td>
      <td dir="ltr" style="text-align:right;">${a.phone}</td>
      <td>${a.service}</td>
      <td><strong class="gold-text">${a.barber}</strong></td>
      <td>${a.time}</td>
      <td>
        <span class="badge-status ${a.status === 'done' ? 'open' : a.status === 'in_chair' ? 'busy' : ''}">
          ${a.status === 'waiting' ? '⏳ في الانتظار' : a.status === 'in_chair' ? '✂️ على الكرسي' : '✅ تم الحساب'}
        </span>
      </td>
      <td><small>${a.payment}</small></td>
      <td>
        ${a.status === 'waiting' ? `
          <button class="btn-table-action finalize" onclick="seatCustomerBooking('${a.id}')">إجلاس على الكرسي</button>
        ` : a.status === 'in_chair' ? `
          <button class="btn-table-action" onclick="checkoutBookingToPOS('${a.id}')">كاشير ودفع</button>
        ` : `
          <button class="btn-table-action" onclick="viewReceiptDirect('${a.id}')"><i class="fa-solid fa-receipt"></i> البون</button>
        `}
      </td>
    </tr>
  `).join('');
}

function renderWaitingQueue() {
  const container = document.getElementById('waitingListContainer');
  if (!container) return;

  const waiting = AppState.appointments.filter(a => a.status === 'waiting');
  document.getElementById('waitingRoomCount').textContent = `${waiting.length} في الانتظار`;

  if (waiting.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 20px; color:#64748b;">لا يوجد زبائن في صالة الانتظار حالياً</div>`;
    return;
  }

  container.innerHTML = waiting.map((w, idx) => `
    <div class="waiting-queue-item">
      <div class="queue-num-pill">${idx + 1}</div>
      <div class="waiting-info">
        <div class="waiting-name">${w.name}</div>
        <div class="waiting-meta">${w.service} • ${w.barber}</div>
      </div>
      <button class="btn-seat-now" onclick="seatCustomerBooking('${w.id}')">إدخال للكرسي</button>
    </div>
  `).join('');
}

function filterBookingsTable(filter) {
  document.querySelectorAll('.filter-tabs .tab-filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  renderBookingsTable(filter);
}

function finishChairSession(chairId) {
  const chair = AppState.salonChairs.find(c => c.id === chairId);
  if (!chair) return;

  showToast(`تم إنهاء خدمة الزبون: ${chair.customer}، نقله للكاشير للدفع`, 'success');
  chair.status = 'free';
  chair.customer = '-';
  chair.service = 'الكرسي شاغر وجاهز للاستقبال';
  chair.remMins = 0;
  saveLocalDB();
  renderChairsGrid();
}

function seatWaitingCustomerOnChair(chairId) {
  const chair = AppState.salonChairs.find(c => c.id === chairId);
  const nextWaiting = AppState.appointments.find(a => a.status === 'waiting');

  if (!nextWaiting) {
    showToast('لا يوجد زبائن في الانتظار حالياً', 'error');
    return;
  }

  nextWaiting.status = 'in_chair';
  chair.status = 'busy';
  chair.customer = nextWaiting.name;
  chair.service = nextWaiting.service;
  chair.remMins = 30;

  saveLocalDB();
  renderChairsGrid();
  renderBookingsTable();
  renderWaitingQueue();
  showToast(`تم إجلاس ${nextWaiting.name} على كرسي رقم ${chair.num}`, 'success');
}

function seatCustomerBooking(bookingId) {
  const booking = AppState.appointments.find(a => a.id === bookingId);
  if (!booking) return;

  const freeChair = AppState.salonChairs.find(c => c.status === 'free');
  if (!freeChair) {
    showToast('جميع الكراسي مشغولة حالياً! يرجى الانتظار لحين انتهاء أحد الكراسي', 'error');
    return;
  }

  booking.status = 'in_chair';
  freeChair.status = 'busy';
  freeChair.customer = booking.name;
  freeChair.service = booking.service;
  freeChair.remMins = 35;

  saveLocalDB();
  renderChairsGrid();
  renderBookingsTable();
  renderWaitingQueue();
  showToast(`تم توجيه الزبون ${booking.name} إلى كرسي رقم ${freeChair.num}`, 'success');
}

function callNextCustomer() {
  const waiting = AppState.appointments.find(a => a.status === 'waiting');
  if (!waiting) {
    showToast('لا يوجد زبائن في الانتظار للنداء عليهم', 'error');
    return;
  }
  showToast(`🔔 نداء صوتي في الصالة: دور الزبون الأستاذ ${waiting.name}!`, 'success');
}

// ================= POS CASHIER & CHECKOUT =================
function renderPOSCatalog(catFilter = 'all') {
  const grid = document.getElementById('posItemsGrid');
  if (!grid) return;

  let items = AppState.services;
  if (catFilter !== 'all') {
    items = items.filter(s => s.cat === catFilter);
  }

  grid.innerHTML = items.map(s => `
    <div class="pos-card-item" onclick="addItemToCart('${s.id}')">
      <img src="${s.img}" alt="${s.title}" class="pos-card-thumb" onerror="handleImgError(this, 'service', '${s.title}', '${s.cat}')">
      <div>
        <h4 class="pos-item-title">${s.title}</h4>
        <p class="pos-item-desc">${s.desc}</p>
      </div>
      <div class="pos-item-footer">
        <span class="pos-item-price">${s.price} ج.م</span>
        <span class="pos-item-duration"><i class="fa-regular fa-clock"></i> ${s.duration}</span>
      </div>
    </div>
  `).join('');
}

function filterPOSCatalog(category) {
  document.querySelectorAll('#posCategoryTabs .pos-cat-btn').forEach(btn => btn.classList.remove('active'));
  event.currentTarget.classList.add('active');
  renderPOSCatalog(category);
}

function handlePOSSearch(query) {
  const q = query.toLowerCase().trim();
  const filtered = AppState.services.filter(s => 
    s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)
  );
  const grid = document.getElementById('posItemsGrid');
  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:30px; color:#64748b;">لا توجد خدمات مطابقة لبحثك</div>`;
    return;
  }
  grid.innerHTML = filtered.map(s => `
    <div class="pos-card-item" onclick="addItemToCart('${s.id}')">
      <img src="${s.img}" alt="${s.title}" class="pos-card-thumb" onerror="handleImgError(this, 'service', '${s.title}', '${s.cat}')">
      <div>
        <h4 class="pos-item-title">${s.title}</h4>
        <p class="pos-item-desc">${s.desc}</p>
      </div>
      <div class="pos-item-footer">
        <span class="pos-item-price">${s.price} ج.م</span>
        <span class="pos-item-duration">${s.duration}</span>
      </div>
    </div>
  `).join('');
}

function addItemToCart(serviceId) {
  const srv = AppState.services.find(s => s.id === serviceId);
  if (!srv) return;

  const existing = AppState.cart.find(item => item.id === serviceId);
  if (existing) {
    existing.qty += 1;
  } else {
    AppState.cart.push({
      id: srv.id,
      title: srv.title,
      price: srv.price,
      qty: 1
    });
  }

  renderCart();
  showToast(`تمت إضافة "${srv.title}" إلى بون الكاشير`, 'success');
}

function removeItemFromCart(serviceId) {
  AppState.cart = AppState.cart.filter(item => item.id !== serviceId);
  renderCart();
}

function clearCart() {
  AppState.cart = [];
  renderCart();
}

function adjustTip(amount) {
  const input = document.getElementById('posTipAmount');
  let current = parseInt(input.value) || 0;
  current = Math.max(0, current + amount);
  input.value = current;
  AppState.cartTip = current;
  calcCartTotal();
}

function renderCart() {
  const container = document.getElementById('cartItemsList');
  if (!container) return;

  if (AppState.cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart-state">
        <i class="fa-solid fa-basket-shopping"></i>
        <p>لم يتم اختيار أي خدمة بعد</p>
        <span>اضغط على أي خدمة لإضافتها للفاتورة</span>
      </div>
    `;
  } else {
    container.innerHTML = AppState.cart.map(item => `
      <div class="cart-row-item">
        <div class="cart-row-info">
          <span class="cart-row-name">${item.title}</span>
          <span class="cart-row-price">${item.price} ج.م × ${item.qty} = <strong>${item.price * item.qty} ج.م</strong></span>
        </div>
        <div class="cart-row-actions">
          <button class="btn-remove-item" onclick="removeItemFromCart('${item.id}')" title="حذف">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  calcCartTotal();
}

function calcCartTotal() {
  const subtotal = AppState.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const tipInput = document.getElementById('posTipAmount');
  const tip = parseInt(tipInput?.value) || 0;
  const discount = 0;
  const finalTotal = subtotal - discount + tip;

  document.getElementById('posSubtotal').textContent = `${subtotal.toLocaleString()} ج.م`;
  document.getElementById('posDiscount').textContent = `${discount.toLocaleString()} ج.م`;
  document.getElementById('posFinalTotal').textContent = `${finalTotal.toLocaleString()} ج.م`;

  return { subtotal, discount, tip, finalTotal };
}

function handlePaymentMethodChange(method) {
  AppState.posSelectedPayment = method;
  const refWrapper = document.getElementById('electronicRefWrapper');
  if (method === 'instapay' || method === 'vodafone_cash') {
    refWrapper.style.display = 'block';
  } else {
    refWrapper.style.display = 'none';
  }
}

function processPOSCheckout() {
  if (AppState.cart.length === 0) {
    showToast('البون فارغ! اختر خدمة واحدة على الأقل قبل إتمام الفاتورة', 'error');
    return;
  }

  const totals = calcCartTotal();
  const customerName = document.getElementById('posCustomerName').value || 'زبون صالون مباشر';
  const barberSelect = document.getElementById('posBarberSelect');
  const barberName = barberSelect.options[barberSelect.selectedIndex].text;
  const payMethod = AppState.posSelectedPayment;
  const payLabel = payMethod === 'cash' ? 'كاش نقدية' : payMethod === 'instapay' ? 'إنستاباي InstaPay' : payMethod === 'vodafone_cash' ? 'فودافون كاش' : 'فيزا كارت';
  const refNumber = document.getElementById('electronicRefNumber')?.value || '';

  // Open the Egyptian Thermal Receipt Modal
  document.getElementById('receiptNo').textContent = `#RB-${Math.floor(1000 + Math.random() * 9000)}`;
  document.getElementById('receiptDate').textContent = new Date().toLocaleString('ar-EG');
  document.getElementById('receiptCustomer').textContent = customerName;
  document.getElementById('receiptBarber').textContent = barberName;
  document.getElementById('receiptBranchText').textContent = AppState.salon.address;

  const receiptItemsBody = document.getElementById('receiptItemsBody');
  receiptItemsBody.innerHTML = AppState.cart.map(item => `
    <div class="receipt-row">
      <span>${item.title}</span>
      <span>${item.qty}</span>
      <span>${item.price * item.qty} ج.م</span>
    </div>
  `).join('');

  document.getElementById('receiptSubtotal').textContent = `${totals.subtotal} ج.م`;
  document.getElementById('receiptDiscount').textContent = `${totals.discount} ج.م`;
  document.getElementById('receiptTip').textContent = `${totals.tip} ج.م`;
  document.getElementById('receiptGrandTotal').textContent = `${totals.finalTotal} ج.م`;
  document.getElementById('receiptPayMethod').textContent = payLabel;

  const refRow = document.getElementById('receiptRefRow');
  if (refNumber) {
    refRow.style.display = 'flex';
    document.getElementById('receiptRefVal').textContent = refNumber;
  } else {
    refRow.style.display = 'none';
  }

  // Update Salon Sales
  AppState.salon.todaySales += totals.finalTotal;
  if (payMethod === 'cash') {
    AppState.salon.drawerCash += totals.finalTotal;
  } else {
    AppState.salon.drawerOnline += totals.finalTotal;
  }

  saveLocalDB();
  renderOverviewGauges();

  openModal('receiptModal');
  showToast('تم إصدار الفاتورة وتحديث حسابات الوردية بنجاح!', 'success');
}

function checkoutBookingToPOS(bookingId) {
  const booking = AppState.appointments.find(a => a.id === bookingId);
  if (!booking) return;

  navigateTab('pos');
  document.getElementById('posCustomerName').value = booking.name;

  const srv = AppState.services.find(s => booking.service.includes(s.title)) || AppState.services[0];
  AppState.cart = [{
    id: srv.id,
    title: booking.service,
    price: booking.price,
    qty: 1
  }];
  renderCart();
  booking.status = 'done';
  saveLocalDB();
  renderBookingsTable();
  showToast(`تم تحميل حجز ${booking.name} في شاشة الكاشير`, 'success');
}

function viewReceiptDirect(bookingId) {
  const booking = AppState.appointments.find(a => a.id === bookingId);
  if (!booking) return;

  document.getElementById('receiptNo').textContent = `#${booking.id}`;
  document.getElementById('receiptDate').textContent = `${booking.time} - اليوم`;
  document.getElementById('receiptCustomer').textContent = booking.name;
  document.getElementById('receiptBarber').textContent = booking.barber;
  document.getElementById('receiptBranchText').textContent = AppState.salon.address;

  const receiptItemsBody = document.getElementById('receiptItemsBody');
  receiptItemsBody.innerHTML = `
    <div class="receipt-row">
      <span>${booking.service}</span>
      <span>1</span>
      <span>${booking.price} ج.م</span>
    </div>
  `;

  document.getElementById('receiptSubtotal').textContent = `${booking.price} ج.م`;
  document.getElementById('receiptDiscount').textContent = `0 ج.م`;
  document.getElementById('receiptTip').textContent = `0 ج.م`;
  document.getElementById('receiptGrandTotal').textContent = `${booking.price} ج.م`;
  document.getElementById('receiptPayMethod').textContent = booking.payment;

  openModal('receiptModal');
}

// ================= STAFF & PAYROLL =================
function renderStaffRoster() {
  const container = document.getElementById('staffRosterGrid');
  if (!container) return;

  container.innerHTML = AppState.staff.map(s => `
    <div class="staff-profile-card">
      <div class="staff-card-top">
        <img src="${s.photo}" alt="${s.nameAr}" class="staff-card-img" onerror="handleImgError(this, 'avatar', '${s.nameAr}')">
        <div class="staff-card-info">
          <h4>${s.nameAr}</h4>
          <span class="staff-card-role">${s.role}</span>
          <span class="staff-card-branch">${AppState.salon.nameAr}</span>
        </div>
      </div>
      <div class="staff-stats-grid">
        <div class="staff-stat-box">
          <span>الزبائن المنفذة:</span>
          <strong>${s.servicesDone} زبون</strong>
        </div>
        <div class="staff-stat-box">
          <span>نسبة العمولة:</span>
          <strong class="gold-text">${s.commPct}%</strong>
        </div>
        <div class="staff-stat-box">
          <span>التيبس المجموع:</span>
          <strong class="text-emerald">${s.tips} ج.م</strong>
        </div>
        <div class="staff-stat-box">
          <span>المستحق التقديري:</span>
          <strong class="gold-text">${s.estimatedPay.toLocaleString()} ج.م</strong>
        </div>
      </div>
      <div class="staff-card-actions">
        <button class="btn-primary" style="flex:1; justify-content:center;" onclick="openPaySlipModal('${s.id}')">
          <i class="fa-solid fa-file-invoice"></i> كشف حساب
        </button>
        <button class="btn-secondary" onclick="openStaffWhatsApp('${s.nameAr}')">
          <i class="fa-brands fa-whatsapp text-emerald"></i>
        </button>
      </div>
    </div>
  `).join('');
}

function renderDetailedPayroll() {
  const tbody = document.getElementById('detailedPayrollTbody');
  if (!tbody) return;

  tbody.innerHTML = AppState.staff.map(s => {
    const totalRev = Math.round(s.estimatedPay * 2.8);
    const commVal = Math.round((totalRev * s.commPct) / 100);
    const deductions = 200;
    const net = (s.fixedSalary + commVal + s.tips) - deductions;

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <img src="${s.photo}" class="staff-table-avatar" onerror="handleImgError(this, 'avatar', '${s.nameAr}')">
            <strong>${s.nameAr}</strong>
          </div>
        </td>
        <td>${s.role}</td>
        <td><strong>${s.servicesDone}</strong></td>
        <td>${totalRev.toLocaleString()} ج.م</td>
        <td><strong class="gold-text">${s.commPct}%</strong></td>
        <td>${commVal.toLocaleString()} ج.م</td>
        <td class="text-emerald">${s.tips} ج.م</td>
        <td class="text-rose">-${deductions} ج.م (سلفة)</td>
        <td><strong class="gold-text" style="font-size:1rem;">${net.toLocaleString()} ج.م</strong></td>
        <td><span class="badge-status open">جاهز للصرف</span></td>
        <td>
          <button class="btn-table-action finalize" onclick="openPaySlipModal('${s.id}')">مفردات المرتب</button>
        </td>
      </tr>
    `;
  }).join('');
}

function openPaySlipModal(staffId) {
  const staff = AppState.staff.find(s => s.id === staffId);
  if (!staff) return;

  const totalRev = Math.round(staff.estimatedPay * 2.8);
  const commVal = Math.round((totalRev * staff.commPct) / 100);
  const advances = 200;
  const net = (staff.fixedSalary + commVal + staff.tips) - advances;

  const content = document.getElementById('paySlipContent');
  content.innerHTML = `
    <div class="slip-header-box">
      <div style="display:flex; align-items:center; gap:12px;">
        <img src="${staff.photo}" style="width:50px; height:50px; border-radius:50%; border:2px solid var(--gold-primary);" onerror="handleImgError(this, 'avatar', '${staff.nameAr}')">
        <div class="slip-barber-details">
          <h4>الأسطى: ${staff.nameAr} (${staff.nameEn})</h4>
          <span>${staff.role} - صالون روبي باربر</span>
        </div>
      </div>
      <div>
        <span class="badge-status open">شهر أكتوبر 2026</span>
      </div>
    </div>

    <div class="slip-table-rows">
      <div class="slip-row-item">
        <span>الراتب الأساسي الثابت (Fixed Salary):</span>
        <strong>${staff.fixedSalary.toLocaleString()} ج.م</strong>
      </div>
      <div class="slip-row-item">
        <span>إجمالي إيراد الخدمات المنفذة (${staff.servicesDone} زبون):</span>
        <strong>${totalRev.toLocaleString()} ج.م</strong>
      </div>
      <div class="slip-row-item">
        <span>نسبة العمولة المستحقة (${staff.commPct}%):</span>
        <strong class="gold-text">+${commVal.toLocaleString()} ج.م</strong>
      </div>
      <div class="slip-row-item">
        <span>إجمالي الإكراميات المحصلة (Tips):</span>
        <strong class="text-emerald">+${staff.tips.toLocaleString()} ج.م</strong>
      </div>
      <div class="slip-row-item">
        <span>خصومات وسلف سابقة خلال الشهر:</span>
        <strong class="text-rose">-${advances} ج.م</strong>
      </div>
    </div>

    <div class="slip-total-net">
      <div>
        <span style="font-size:0.85rem; color:#fff;">صافي المستحق للصرف النهائي (Net Payable):</span>
        <p style="font-size:0.75rem; color:var(--text-muted); margin:0;">شامل الأساسي + العمولات + التيبس بعد الخصم</p>
      </div>
      <strong>${net.toLocaleString()} EGP</strong>
    </div>
  `;

  openModal('paySlipModal');
}

function finalizeStaffPayment(staffId) {
  const staff = AppState.staff.find(s => s.id === staffId);
  if (!staff) return;
  showToast(`تم تأكيد صرف مستحقات الأسطى ${staff.nameAr} بقيمة ${staff.estimatedPay.toLocaleString()} ج.م`, 'success');
}

// ================= INVENTORY =================
function renderInventoryTable(filter = 'all') {
  const tbody = document.getElementById('inventoryTbody');
  if (!tbody) return;

  let items = AppState.inventory;
  if (filter === 'salon') items = items.filter(i => i.type === 'salon');
  if (filter === 'retail') items = items.filter(i => i.type === 'retail');
  if (filter === 'low') items = items.filter(i => i.qty <= i.minQty);

  tbody.innerHTML = items.map(i => `
    <tr>
      <td><strong>${i.name}</strong></td>
      <td><span class="badge-filter">${i.type === 'salon' ? 'مستهلك صالون' : 'بيع مباشر للزبون'}</span></td>
      <td>${i.cost} ج.م</td>
      <td>${i.price > 0 ? `${i.price} ج.م` : '-'}</td>
      <td><strong style="font-size:1rem; ${i.qty <= i.minQty ? 'color:var(--rose-red);' : ''}">${i.qty}</strong></td>
      <td>${i.minQty}</td>
      <td>
        <span class="badge-status ${i.qty <= i.minQty ? 'busy' : 'open'}" style="${i.qty <= i.minQty ? 'background:rgba(239,68,68,0.15); color:#ef4444;' : ''}">
          ${i.qty <= i.minQty ? '⚠️ ناقص - حرج' : 'متوفر بالمخزن'}
        </span>
      </td>
      <td>
        <button class="btn-table-action" onclick="restockItem('${i.id}')">+ توريد سريع للمخزن</button>
      </td>
    </tr>
  `).join('');
}

function filterStockTable(filter) {
  document.querySelectorAll('#tab-products .tab-filter-btn').forEach(b => b.classList.remove('active'));
  event.currentTarget.classList.add('active');
  renderInventoryTable(filter);
}

function restockItem(itemId) {
  const item = AppState.inventory.find(i => i.id === itemId);
  if (!item) return;
  item.qty += 10;
  item.status = 'good';
  saveLocalDB();
  renderInventoryTable();
  renderInventoryBars();
  showToast(`تم إضافة 10 قطع جديدة لمخزن الصالون: ${item.name}`, 'success');
}

// ================= CUSTOMERS & LOYALTY =================
function renderCustomersTable() {
  const tbody = document.getElementById('customersTbody');
  if (!tbody) return;

  tbody.innerHTML = AppState.customers.map(c => `
    <tr>
      <td><strong>${c.code}</strong></td>
      <td>${c.name}</td>
      <td dir="ltr" style="text-align:right;">${c.phone}</td>
      <td><strong>${c.visits} مرات</strong></td>
      <td><span class="badge-filter gold-text">${c.points} نقطة</span></td>
      <td>${c.favBarber}</td>
      <td>${c.lastVisit}</td>
      <td>${c.vip ? '<span class="badge-status open" style="background:rgba(245,184,66,0.15); color:var(--gold-primary);">👑 زبون VIP</span>' : 'زبون مميز'}</td>
      <td>
        <button class="btn-table-action" onclick="sendCustomerWhatsApp('${c.name}', '${c.phone}')" style="color:#25d366;">
          <i class="fa-brands fa-whatsapp"></i> واتساب
        </button>
      </td>
    </tr>
  `).join('');
}

function handleCustomerSearch(query) {
  const q = query.toLowerCase().trim();
  const filtered = AppState.customers.filter(c => 
    c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.code.toLowerCase().includes(q)
  );

  const tbody = document.getElementById('customersTbody');
  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td><strong>${c.code}</strong></td>
      <td>${c.name}</td>
      <td dir="ltr" style="text-align:right;">${c.phone}</td>
      <td><strong>${c.visits} مرات</strong></td>
      <td><span class="badge-filter gold-text">${c.points} نقطة</span></td>
      <td>${c.favBarber}</td>
      <td>${c.lastVisit}</td>
      <td>${c.vip ? '<span class="badge-status open" style="background:rgba(245,184,66,0.15); color:var(--gold-primary);">👑 زبون VIP</span>' : 'زبون مميز'}</td>
      <td>
        <button class="btn-table-action" onclick="sendCustomerWhatsApp('${c.name}', '${c.phone}')" style="color:#25d366;">
          <i class="fa-brands fa-whatsapp"></i> واتساب
        </button>
      </td>
    </tr>
  `).join('');
}

function sendCustomerWhatsApp(name, phone) {
  const text = `مساء الفل يا أستاذ ${name}، صالون روبي باربر بيصبح عليك! وحشتنا وحلاقتك قرب ميعادها، الكراسي والتكييف في انتظارك في أي وقت، ومعاك 100 نقطة ولاء تخصم بيهم حلاقتك القادمة. نورتنا دائماً يا باشا!`;
  document.getElementById('whatsappBubbleText').innerHTML = `
    <strong>صالون روبي باربر إلى ${name} (${phone}):</strong><br><br>
    ${text}
  `;
  openModal('whatsAppModal');
}

function openRealWhatsApp() {
  showToast('تم نسخ رسالة الواتساب وفتح التطبيق بنجاح', 'success');
  closeModal('whatsAppModal');
}

// ================= CASHBOX & EXPENSES =================
function renderExpensesTable() {
  const tbody = document.getElementById('expensesTbody');
  if (!tbody) return;

  tbody.innerHTML = AppState.expenses.map(e => `
    <tr>
      <td><strong>${e.no}</strong></td>
      <td>${e.time}</td>
      <td>${e.title}</td>
      <td><span class="badge-filter">${e.cat}</span></td>
      <td>${e.person}</td>
      <td>${e.method}</td>
      <td><strong class="text-rose">-${e.amount} ج.م</strong></td>
      <td>
        <button class="btn-table-action" onclick="deleteExpense('${e.no}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');

  calcFinancials();
}

function calcFinancials() {
  const totalExpenses = AppState.expenses.reduce((sum, e) => sum + e.amount, 0);
  const comms = Math.round(AppState.salon.todaySales * 0.20);
  const net = AppState.salon.todaySales - totalExpenses - comms;

  document.getElementById('accTotalIncome').textContent = `${AppState.salon.todaySales.toLocaleString()} ج.م`;
  document.getElementById('accCashPart').textContent = `${AppState.salon.drawerCash.toLocaleString()} ج.م`;
  document.getElementById('accOnlinePart').textContent = `${AppState.salon.drawerOnline.toLocaleString()} ج.م`;
  document.getElementById('accTotalExpenses').textContent = `${totalExpenses.toLocaleString()} ج.م`;
  document.getElementById('accStaffCommissions').textContent = `${comms.toLocaleString()} ج.م`;
  document.getElementById('accNetProfit').textContent = `${net.toLocaleString()} ج.م`;
}

function handleAddExpenseSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('expTitle').value;
  const amount = parseInt(document.getElementById('expAmount').value) || 0;
  const cat = document.getElementById('expCategory').value;
  const method = document.getElementById('expMethod').value;
  const person = document.getElementById('expPerson').value;

  const newExp = {
    no: `EXP-${100 + AppState.expenses.length + 1}`,
    time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    title,
    cat,
    person,
    method,
    amount
  };

  AppState.expenses.unshift(newExp);
  if (method === 'كاش من الدرج') {
    AppState.salon.drawerCash -= amount;
  }

  saveLocalDB();
  renderExpensesTable();
  closeModal('addExpenseModal');
  showToast(`تم قيد المصروف بقيمة ${amount} ج.م في حسابات اليوم`, 'success');
}

function deleteExpense(expNo) {
  AppState.expenses = AppState.expenses.filter(e => e.no !== expNo);
  saveLocalDB();
  renderExpensesTable();
  showToast('تم حذف بند المصروف', 'success');
}

function openShiftCloseModal() {
  const totalExp = AppState.expenses.reduce((sum, e) => sum + e.amount, 0);
  const netInDrawer = AppState.salon.drawerCash;

  const container = document.getElementById('shiftReportBody');
  container.innerHTML = `
    <div style="background:var(--bg-card-inner); padding:16px; border-radius:8px; margin:16px 0; border:1px solid var(--border-color); font-size:0.88rem; line-height:1.7;">
      <h4 style="color:var(--gold-primary); margin-bottom:10px;">ملخص تقفيل الوردية الحالية (#48)</h4>
      <div style="display:flex; justify-content:space-between;"><span>الصالون:</span> <strong>${AppState.salon.nameAr}</strong></div>
      <div style="display:flex; justify-content:space-between;"><span>المسؤول:</span> <strong>كابتن روبي (المالك)</strong></div>
      <div style="display:flex; justify-content:space-between;"><span>إجمالي مبيعات اليوم:</span> <strong class="gold-text">${AppState.salon.todaySales.toLocaleString()} ج.م</strong></div>
      <div style="display:flex; justify-content:space-between;"><span>المقبوضات الكاش الفعلية:</span> <strong>${AppState.salon.drawerCash.toLocaleString()} ج.م</strong></div>
      <div style="display:flex; justify-content:space-between;"><span>المقبوضات إنستاباي ومحافظ:</span> <strong>${AppState.salon.drawerOnline.toLocaleString()} ج.م</strong></div>
      <div style="display:flex; justify-content:space-between;"><span>إجمالي المصروفات والنثريات:</span> <strong class="text-rose">-${totalExp} ج.م</strong></div>
      <hr style="border:none; border-top:1px dashed var(--border-color); margin:10px 0;">
      <div style="display:flex; justify-content:space-between; font-size:1.05rem;">
        <span style="font-weight:bold;">النقدية المطلوب توريدها بالدرج:</span>
        <strong class="gold-text">${netInDrawer.toLocaleString()} ج.م</strong>
      </div>
    </div>
    <div class="form-group">
      <label>عد النقدية الفعلي في الدرج (ج.م):</label>
      <input type="number" id="actualCashCount" value="${netInDrawer}" style="font-size:1.1rem; font-weight:bold; color:var(--emerald-green);">
    </div>
  `;

  openModal('shiftCloseModal');
}

function confirmShiftClose() {
  closeModal('shiftCloseModal');
  showToast('تم تقفيل الوردية وحفظ التقرير Z-Report محلياً بنجاح!', 'success');
}

// ================= CCTV SYSTEM =================
function initCCTVClock() {
  setInterval(() => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);
    const fullStr = `${dateStr} ${timeStr}`;

    const tA = document.getElementById('cctvTimeA');
    const tB = document.getElementById('cctvTimeB');
    if (tA) tA.textContent = fullStr;
    if (tB) tB.textContent = fullStr;

    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById(`cctvFullTime${i}`);
      if (el) el.textContent = fullStr;
    }
  }, 1000);
}

function toggleCCTVGrid(count) {
  const display = document.getElementById('cctvFullDisplay');
  if (count === 2) {
    display.style.gridTemplateColumns = '1fr 1fr';
    display.children[2].style.display = 'none';
    display.children[3].style.display = 'none';
  } else {
    display.style.gridTemplateColumns = '1fr 1fr';
    display.children[2].style.display = 'block';
    display.children[3].style.display = 'block';
  }
}

// ================= SETTINGS =================
function renderSettingsPricing() {
  const list = document.getElementById('settingsPricingList');
  if (!list) return;

  list.innerHTML = AppState.services.slice(0, 5).map(s => `
    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card-inner); padding:10px; border-radius:8px; margin-bottom:8px;">
      <span style="font-size:0.85rem; font-weight:600;">${s.title}</span>
      <div style="display:flex; align-items:center; gap:6px;">
        <input type="number" id="srv_price_${s.id}" value="${s.price}" style="width:70px; text-align:center; padding:4px; border-radius:4px; background:var(--bg-input); border:1px solid var(--border-color); color:var(--gold-primary); font-weight:bold;">
        <span style="font-size:0.78rem;">ج.م</span>
      </div>
    </div>
  `).join('');
}

function saveSettingsNotification() {
  const name = document.getElementById('settingSalonName')?.value;
  const addr = document.getElementById('settingSalonAddress')?.value;
  const phone = document.getElementById('settingSalonPhone')?.value;
  const instapay = document.getElementById('settingSalonInstapay')?.value;
  const vodafone = document.getElementById('settingSalonVodafone')?.value;

  if (name) AppState.salon.nameAr = name;
  if (addr) AppState.salon.address = addr;
  if (phone) AppState.salon.phone = phone;
  if (instapay) AppState.salon.instapay = instapay;
  if (vodafone) AppState.salon.vodafone = vodafone;

  // Update prices
  AppState.services.slice(0, 5).forEach(s => {
    const input = document.getElementById(`srv_price_${s.id}`);
    if (input) s.price = parseInt(input.value) || s.price;
  });

  saveLocalDB();
  renderPOSCatalog();
  renderCustomerServices();
  showToast('تم حفظ كافة الإعدادات والأسعار محلياً بنجاح', 'success');
}

// ================= CUSTOMER BOOKING WIZARD (4 Steps - No Branch Needed) =================
function goToWizardStep(stepNum) {
  AppState.customerWizard.step = stepNum;

  // Update indicators
  for (let i = 1; i <= 4; i++) {
    const ind = document.getElementById(`stepIndicator${i}`);
    if (ind) {
      ind.classList.remove('active', 'completed');
      if (i === stepNum) ind.classList.add('active');
      else if (i < stepNum) ind.classList.add('completed');
    }
  }

  // Update step views
  for (let i = 1; i <= 4; i++) {
    const content = document.getElementById(`wizardStep${i}`);
    if (content) {
      if (i === stepNum) content.classList.add('active');
      else content.classList.remove('active');
    }
  }
}

function renderCustomerServices() {
  const grid = document.getElementById('customerServicesGrid');
  if (!grid) return;

  grid.innerHTML = AppState.services.map(s => {
    const isSelected = AppState.customerWizard.services.includes(s.id);
    return `
      <div class="cust-service-card ${isSelected ? 'selected' : ''}" onclick="toggleCustomerService('${s.id}', this)">
        <div class="cust-service-header">
          <h5>${s.title}</h5>
          <span class="cust-service-price">${s.price} ج.م</span>
        </div>
        <p class="cust-service-desc">${s.desc}</p>
        <div class="cust-service-footer">
          <span><i class="fa-regular fa-clock"></i> ${s.duration}</span>
          <span class="service-check"><i class="fa-solid ${isSelected ? 'fa-square-check gold-text' : 'fa-square'}"></i></span>
        </div>
      </div>
    `;
  }).join('');

  updateCustomerServicesSummary();
}

function toggleCustomerService(serviceId, element) {
  const idx = AppState.customerWizard.services.indexOf(serviceId);
  if (idx > -1) {
    if (AppState.customerWizard.services.length > 1) {
      AppState.customerWizard.services.splice(idx, 1);
      element.classList.remove('selected');
      element.querySelector('.service-check i').className = 'fa-solid fa-square';
    } else {
      showToast('يجب اختيار خدمة واحدة على الأقل', 'error');
    }
  } else {
    AppState.customerWizard.services.push(serviceId);
    element.classList.add('selected');
    element.querySelector('.service-check i').className = 'fa-solid fa-square-check gold-text';
  }

  updateCustomerServicesSummary();
}

function updateCustomerServicesSummary() {
  const count = AppState.customerWizard.services.length;
  const totalPrice = AppState.customerWizard.services.reduce((sum, sId) => {
    const s = AppState.services.find(srv => srv.id === sId);
    return sum + (s ? s.price : 0);
  }, 0);

  document.getElementById('custSelectedCount').textContent = `${count} خدمة مختارة`;
  document.getElementById('custSelectedPrice').textContent = `${totalPrice} ج.م`;
}

function renderCustomerBarbers() {
  const grid = document.getElementById('customerBarbersGrid');
  if (!grid) return;

  grid.innerHTML = AppState.staff.map(b => `
    <div class="barber-pick-card ${AppState.customerWizard.barber === b.id ? 'selected' : ''}" onclick="selectCustomerBarber('${b.id}', this)">
      <img src="${b.photo}" alt="${b.nameAr}" class="barber-pick-img" onerror="handleImgError(this, 'avatar', '${b.nameAr}')">
      <span class="barber-pick-name">${b.nameAr}</span>
      <span class="barber-pick-rating">${b.rating}</span>
      <span class="barber-pick-title">${b.role}</span>
    </div>
  `).join('');
}

function selectCustomerBarber(barberId, element) {
  document.querySelectorAll('.barber-pick-card').forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');
  AppState.customerWizard.barber = barberId;
}

function selectDayPill(btn, day) {
  document.querySelectorAll('.day-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  AppState.customerWizard.day = day;
}

function selectTimeSlot(btn) {
  document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
  AppState.customerWizard.time = btn.textContent.trim();
}

function confirmCustomerBooking() {
  const name = document.getElementById('custInputName').value.trim();
  const phone = document.getElementById('custInputPhone').value.trim();
  const payMethod = document.getElementById('custInputPayment').value;
  const notes = document.getElementById('custInputNotes').value.trim();

  if (!name || !phone) {
    showToast('يرجى كتابة الاسم ورقم الموبايل بشكل صحيح لتأكيد الحجز', 'error');
    return;
  }

  AppState.customerWizard.name = name;
  AppState.customerWizard.phone = phone;
  AppState.customerWizard.payment = payMethod;
  AppState.customerWizard.notes = notes;

  const selectedServices = AppState.customerWizard.services.map(id => AppState.services.find(s => s.id === id));
  const servicesText = selectedServices.map(s => s.title).join(' + ');
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const barber = AppState.staff.find(s => s.id === AppState.customerWizard.barber) || AppState.staff[0];

  const bookingCode = `ROBY-${Math.floor(1000 + Math.random() * 9000)}`;

  // Populate Digital Ticket
  document.getElementById('ticketCodeVal').textContent = bookingCode;
  document.getElementById('ticketCustName').textContent = name;
  document.getElementById('ticketBarberName').textContent = barber.nameAr;
  document.getElementById('ticketDateTime').textContent = `${AppState.customerWizard.day} - ${AppState.customerWizard.time}`;
  document.getElementById('ticketServices').textContent = servicesText;
  document.getElementById('ticketPrice').textContent = `${totalPrice} ج.م`;
  document.getElementById('ticketQueueNum').textContent = `${AppState.appointments.length + 1}`;

  // Add into Global Appointments List
  AppState.appointments.unshift({
    id: bookingCode,
    name: name,
    phone: phone,
    service: servicesText,
    barber: barber.nameAr,
    time: AppState.customerWizard.time,
    status: 'waiting',
    payment: payMethod === 'cash' ? 'كاش في الصالون' : payMethod === 'instapay' ? 'إنستاباي InstaPay' : 'فودافون كاش',
    price: totalPrice
  });

  AppState.salon.todayAppointments += 1;
  saveLocalDB();
  renderOverviewGauges();
  renderBookingsTable();
  renderWaitingQueue();

  // Move to confirmation step 4
  goToWizardStep(4);
  showToast('تم تأكيد حجزك وإصدار تذكرة الحضور والكود بنجاح!', 'success');
}

function shareTicketViaWhatsApp() {
  const code = document.getElementById('ticketCodeVal').textContent;
  const name = document.getElementById('ticketCustName').textContent;
  const time = document.getElementById('ticketDateTime').textContent;

  const msg = `أهلاً بك في صالون روبي باربر!\nتذكرتك لتأكيد الحجز:\nالكود: ${code}\nالاسم: ${name}\nالميعاد: ${time}\nعنوان الصالون: ${AppState.salon.address}\nتليفون الصالون: ${AppState.salon.phone}\nجاهزين لاستقبالك يا فندم!`;

  document.getElementById('whatsappBubbleText').innerHTML = `
    <strong>تذكرة حجز رقمية - صالون روبي باربر:</strong><br><br>
    ${msg.replace(/\n/g, '<br>')}
  `;
  openModal('whatsAppModal');
}

function resetCustomerBooking() {
  goToWizardStep(1);
}

// ================= MODAL HELPERS =================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function printReceipt() {
  window.print();
  showToast('تم إرسال بون الكاشير لطابعة الإيصالات الحرارية', 'success');
}

function printPaySlip() {
  window.print();
  showToast('تم إرسال كشف حساب الأسطى للطباعة', 'success');
}

function openNewBookingModal() {
  openModal('newBookingModal');
}

function openNewPOSModal() {
  navigateTab('pos');
}

function openNewOfferModal() {
  showToast('خاصية إضافة عروض ترويجية نشطة', 'success');
}

function openAddExpenseModal() {
  openModal('addExpenseModal');
}

function openStaffAdvanceModal() {
  showToast('شاشة تسجيل السلف والخصومات للأسطوات', 'success');
}

function openAddStaffModal() {
  showToast('شاشة إضافة كوافير / أسطى جديد للصالون', 'success');
}

function openAddProductModal() {
  showToast('شاشة إضافة صنف جديد لمخزن الصالون', 'success');
}

function openBroadcastWhatsAppModal() {
  showToast('تم تجهيز حملة واتساب للزبائن النشطين (خصومات العيد)', 'success');
}

function openAddCustomerModal() {
  showToast('شاشة تسجيل زبون جديد في السيستم', 'success');
}

function openShiftModal() {
  openShiftCloseModal();
}

function exportDailyReport() {
  showToast('تم تصدير تقرير الإيرادات والورديات اليومي بصيغة Excel', 'success');
}

function toggleNotifDropdown() {
  const dropdown = document.getElementById('notifDropdown');
  dropdown.classList.toggle('active');

  const notifList = document.getElementById('notifList');
  notifList.innerHTML = `
    <div class="notif-item">
      <i class="fa-solid fa-triangle-exclamation text-rose" style="margin-top:2px;"></i>
      <div>
        <strong>نقص في شفرات الحلاقة دوركو:</strong>
        <p style="color:#94a3b8; font-size:0.72rem;">الكمية الحالية 3 باكت فقط، الحد الأدنى 8</p>
      </div>
    </div>
    <div class="notif-item">
      <i class="fa-solid fa-bolt text-gold" style="margin-top:2px;"></i>
      <div>
        <strong>تحويل إنستاباي جديد:</strong>
        <p style="color:#94a3b8; font-size:0.72rem;">تم استلام 170 ج.م من زبون مباشر</p>
      </div>
    </div>
    <div class="notif-item">
      <i class="fa-solid fa-user-clock text-blue" style="margin-top:2px;"></i>
      <div>
        <strong>حجز أونلاين بعد 30 دقيقة:</strong>
        <p style="color:#94a3b8; font-size:0.72rem;">محمد طارق - كومبو شعر ولحية</p>
      </div>
    </div>
  `;
}

function handleGlobalSearch(query) {
  if (!query || query.length < 2) return;
  const q = query.toLowerCase();

  const matchAppt = AppState.appointments.find(a => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q));
  const matchStaff = AppState.staff.find(s => s.nameAr.includes(q) || s.nameEn.toLowerCase().includes(q));

  if (matchAppt) {
    navigateTab('appointments');
    showToast(`تم العثور على الحجز: ${matchAppt.name} (${matchAppt.id})`, 'success');
  } else if (matchStaff) {
    navigateTab('staff');
    showToast(`تم العثور على الأسطى: ${matchStaff.nameAr}`, 'success');
  }
}

function handleAdminBookingSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('admBookName').value;
  const phone = document.getElementById('admBookPhone').value;
  const barber = document.getElementById('admBookBarber').value;
  const service = document.getElementById('admBookService').value;
  const time = document.getElementById('admBookTime').value;

  const newId = `RB-${Math.floor(1000 + Math.random() * 9000)}`;

  AppState.appointments.unshift({
    id: newId,
    name,
    phone,
    service,
    barber,
    time,
    status: 'waiting',
    payment: 'كاش نقدية',
    price: 170
  });

  saveLocalDB();
  renderBookingsTable();
  renderWaitingQueue();
  closeModal('newBookingModal');
  showToast(`تم حفظ وتأكيد حجز الزبون: ${name} بنجاح!`, 'success');
}

// ================= TOAST NOTIFICATION HELPER =================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check text-emerald' : type === 'error' ? 'fa-triangle-exclamation text-rose' : 'fa-circle-info text-blue'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
