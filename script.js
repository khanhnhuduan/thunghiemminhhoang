// ============================================================================
// 1. CẤU HÌNH HỆ THỐNG, TÀI KHOẢN MÁY CHỦ & THUẬT TOÁN ĐỊNH TUYẾN
// ============================================================================
const SERVER_ADMIN_ACCOUNT = {
    username: "minhhoang",
    password: "1234"
};

const ROUTING_RULES = {
    transport: {
        categoryName: "Trễ xe / Sự cố vận tải",
        department: "Đội Điều Độ Vận Tải",
        actionNote: "Tự động phân luồng về Đội Điều Độ Vận Tải"
    },
    customs: {
        categoryName: "Vướng hải quan / Sự cố tờ khai",
        department: "Bộ Phận Hải Quan",
        actionNote: "Tự động phân luồng về Bộ Phận Hải Quan"
    },
    document: {
        categoryName: "Sai sót chứng từ (B/L, Invoice, C/O)",
        department: "Bộ Phận Chứng Từ & CSKH",
        actionNote: "Tự động phân luồng về Bộ Phận Chứng Từ & CSKH"
    },
    damage: {
        categoryName: "Hư hỏng hàng hóa",
        department: "Ban Quản Lý Kho",
        actionNote: "Tự động phân luồng về Ban Quản Lý Kho"
    },
    warehouse: {
        categoryName: "Sự cố lưu kho / Xuất nhập kho",
        department: "Ban Quản Lý Kho",
        actionNote: "Tự động phân luồng về Ban Quản Lý Kho"
    }
};

const STATUS_STEPS = [
    "Đã tiếp nhận",
    "Đang xử lý",
    "Đã giải quyết hoàn tất"
];

const DEPARTMENTS_LIST = [
    "all",
    "Đội Điều Độ Vận Tải",
    "Bộ Phận Hải Quan",
    "Ban Quản Lý Kho",
    "Bộ Phận Chứng Từ & CSKH"
];

// Khóa lưu trữ & Kênh đồng bộ đám mây đa thiết bị (Multi-Device Cloud Relay)
const STORAGE_KEY = "UIL_MULTI_MACHINE_TICKETS_V8";
const META_SYNC_KEY = "UIL_LAST_EVENT_META_V8";
const OUTBOX_QUEUE_KEY = "UIL_OUTBOX_QUEUE_V8";
const CHANNEL_NAME = "UIL_LIVE_SYNC_V8";
const CLOUD_TOPIC = "uil_logistics_cskh_sync_2026_v8";
const CLOUD_URL = `https://ntfy.sh/${CLOUD_TOPIC}`;

// Khóa lưu trữ tài khoản & ghi nhớ đăng nhập
const CUST_ACCOUNTS_KEY = "UIL_CUSTOMER_ACCOUNTS_V8";
const CUST_SESSION_KEY = "UIL_CUSTOMER_SESSION_V8";
const CUST_REMEMBER_KEY = "UIL_CUSTOMER_REMEMBER_V8";
const SERVER_SESSION_KEY = "UIL_SERVER_SESSION_V8";
const SERVER_REMEMBER_KEY = "UIL_SERVER_REMEMBER_V8";

const PORTAL_TYPE = document.body.getAttribute("data-portal") || "auth";
const VALID_PAGES = PORTAL_TYPE === "customer"
    ? ["report", "tracking", "guide"]
    : ["inbox", "departments", "analytics"];

// Định danh duy nhất cho mỗi máy/tab để không tự xử lý lặp lại gói tin của chính mình
const CLIENT_NODE_ID = "NODE-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 7);
const syncChannel = ("BroadcastChannel" in window) ? new BroadcastChannel(CHANNEL_NAME) : null;
const processedPacketIds = new Set();

const DEFAULT_CUSTOMERS = [
    {
        username: "khachhang",
        password: "1234",
        companyName: "Công ty TNHH Xuất Nhập Khẩu Minh Phát",
        contact: "0909 888 777 | ops@minhphat.vn"
    }
];

const DEFAULT_TICKETS = [
    {
        id: "#UIL-8492",
        createdAtMs: 1760000002000,
        lastModified: 1760000002000,
        customer: "Công ty CP Gỗ An Cường",
        contact: "0903 882 119 | xnk@ancuong.com",
        waybill: "UIL-BL2026105",
        booking: "BK-774120",
        typeKey: "customs",
        categoryName: "Vướng hải quan / Sự cố tờ khai",
        department: "Bộ Phận Hải Quan",
        priority: "Khẩn cấp",
        description: "Tờ khai luồng đỏ tại Cảng Cát Lái cần bổ sung chứng từ C/O Form E và đăng ký kiểm hóa thực tế.",
        attachments: [
            { name: "To_Khai_Hai_Quan_105.pdf", size: "420 KB", isImage: false, previewUrl: null },
            { name: "Anh_Seal_Container.jpg", size: "1.2 MB", isImage: true, previewUrl: null }
        ],
        statusIndex: 1,
        stepTimestamps: ["08:30 - Hôm nay", "08:32 (SLA: 02 phút)", "Đang chờ nghiệm thu"],
        stepNotes: [
            "Hệ thống tiếp nhận từ Cổng Khách Hàng và tự động phân luồng về Bộ Phận Hải Quan.",
            "Bộ phận Hải quan hiện trường đang phối hợp kiểm hóa tại bãi Cát Lái.",
            ""
        ],
        slaDuration: "02 phút 15 giây"
    },
    {
        id: "#UIL-8491",
        createdAtMs: 1760000001000,
        lastModified: 1760000001000,
        customer: "Tập đoàn Dệt May Việt Tiến",
        contact: "0918 220 411 | logistics@viettien.vn",
        waybill: "UIL-BL2026098",
        booking: "BK-773905",
        typeKey: "transport",
        categoryName: "Trễ xe / Sự cố vận tải",
        department: "Đội Điều Độ Vận Tải",
        priority: "Cao",
        description: "Xe đầu kéo 51C-889.12 gặp sự cố giao thông trên Xa lộ Hà Nội, nguy cơ trễ giờ đóng hàng tại KCN Sóng Thần.",
        attachments: [
            { name: "Lenh_Dieu_Dong_Xe.pdf", size: "310 KB", isImage: false, previewUrl: null }
        ],
        statusIndex: 2,
        stepTimestamps: ["07:45 - Hôm nay", "07:47 (SLA: 02 phút)", "08:15 - Hoàn tất"],
        stepNotes: [
            "Hệ thống khởi tạo Ticket #UIL-8491 và chuyển thẳng về Đội Điều Độ Vận Tải.",
            "Đội điều độ đã điều xe đầu kéo dự phòng 51D-992.05 hỗ trợ.",
            "Xe dự phòng đã đóng hàng đúng giờ Cut-off, giải quyết hoàn tất."
        ],
        slaDuration: "01 phút 45 giây"
    }
];

function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getCurrentTimeStr() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function showToast(message, isError = false) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    if (isError) toast.style.borderLeftColor = "#ef4444";
    toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> <span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

window.togglePasswordVisibility = function (inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === "password") {
        input.type = "text";
        btnEl.innerHTML = `<i class="fa-regular fa-eye-slash"></i>`;
    } else {
        input.type = "password";
        btnEl.innerHTML = `<i class="fa-regular fa-eye"></i>`;
    }
};

window.logoutPortal = function () {
    sessionStorage.removeItem(CUST_SESSION_KEY);
    sessionStorage.removeItem(SERVER_SESSION_KEY);
    window.location.href = "index.html";
};

// ============================================================================
// 2. XỬ LÝ TRANG CỔNG CHÀO XÁC THỰC (index.html)
// ============================================================================
function loadCustomerAccounts() {
    try {
        const raw = localStorage.getItem(CUST_ACCOUNTS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_CUSTOMERS));
}

function saveCustomerAccounts(list) {
    try {
        localStorage.setItem(CUST_ACCOUNTS_KEY, JSON.stringify(list));
    } catch (e) {}
}

if (PORTAL_TYPE === "auth") {
    const roleSelectionView = document.getElementById("role-selection-view");
    const customerAuthView = document.getElementById("customer-auth-view");
    const serverAuthView = document.getElementById("server-auth-view");

    const custLoginForm = document.getElementById("customer-login-form");
    const custRegForm = document.getElementById("customer-register-form");
    const serverLoginForm = document.getElementById("server-login-form");

    function loadRememberedCredentials() {
        try {
            const savedServer = JSON.parse(localStorage.getItem(SERVER_REMEMBER_KEY));
            if (savedServer && savedServer.username) {
                document.getElementById("serverUsername").value = savedServer.username;
                document.getElementById("serverPassword").value = savedServer.password || "";
                document.getElementById("serverRememberMe").checked = true;
            }
            const savedCust = JSON.parse(localStorage.getItem(CUST_REMEMBER_KEY));
            if (savedCust && savedCust.username) {
                document.getElementById("custLoginUser").value = savedCust.username;
                document.getElementById("custLoginPass").value = savedCust.password || "";
                document.getElementById("custRememberMe").checked = true;
            }
        } catch (e) {}
    }

    loadRememberedCredentials();

    window.showRoleSelection = function () {
        roleSelectionView.hidden = false;
        customerAuthView.hidden = true;
        serverAuthView.hidden = true;
    };

    document.getElementById("btnChooseCustomer").addEventListener("click", () => {
        roleSelectionView.hidden = true;
        customerAuthView.hidden = false;
        serverAuthView.hidden = true;
    });

    document.getElementById("btnChooseServer").addEventListener("click", () => {
        roleSelectionView.hidden = true;
        customerAuthView.hidden = true;
        serverAuthView.hidden = false;
        document.getElementById("serverUsername").focus();
    });

    window.switchCustomerAuthTab = function (tab) {
        const isLogin = tab === "login";
        document.getElementById("tabBtnCustLogin").classList.toggle("active", isLogin);
        document.getElementById("tabBtnCustRegister").classList.toggle("active", !isLogin);
        custLoginForm.hidden = !isLogin;
        custRegForm.hidden = isLogin;
    };

    custLoginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const userInp = document.getElementById("custLoginUser").value.trim();
        const passInp = document.getElementById("custLoginPass").value.trim();
        const remember = document.getElementById("custRememberMe").checked;
        const errEl = document.getElementById("custLoginError");

        const accounts = loadCustomerAccounts();
        const matched = accounts.find(
            a => (a.username.toLowerCase() === userInp.toLowerCase() || a.contact.toLowerCase().includes(userInp.toLowerCase())) && a.password === passInp
        );

        if (!matched) {
            errEl.textContent = "Tên tài khoản hoặc mật khẩu khách hàng không đúng!";
            errEl.classList.add("visible");
            return;
        }

        errEl.classList.remove("visible");
        sessionStorage.setItem(CUST_SESSION_KEY, JSON.stringify(matched));
        if (remember) {
            localStorage.setItem(CUST_REMEMBER_KEY, JSON.stringify({ username: userInp, password: passInp, profile: matched }));
        } else {
            localStorage.removeItem(CUST_REMEMBER_KEY);
        }

        window.location.href = "khachhang.html";
    });

    custRegForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const companyName = document.getElementById("regCompanyName").value.trim();
        const contact = document.getElementById("regContact").value.trim();
        const username = document.getElementById("regUsername").value.trim();
        const password = document.getElementById("regPassword").value.trim();
        const remember = document.getElementById("regRememberMe").checked;
        const errEl = document.getElementById("custRegError");

        if (!companyName || !contact || !username || !password) {
            errEl.textContent = "Vui lòng điền đầy đủ thông tin đăng ký!";
            errEl.classList.add("visible");
            return;
        }

        const accounts = loadCustomerAccounts();
        if (accounts.some(a => a.username.toLowerCase() === username.toLowerCase())) {
            errEl.textContent = "Tên tài khoản đã tồn tại, vui lòng chọn tên khác!";
            errEl.classList.add("visible");
            return;
        }

        const newAccount = { username, password, companyName, contact };
        accounts.push(newAccount);
        saveCustomerAccounts(accounts);

        sessionStorage.setItem(CUST_SESSION_KEY, JSON.stringify(newAccount));
        if (remember) {
            localStorage.setItem(CUST_REMEMBER_KEY, JSON.stringify({ username, password, profile: newAccount }));
        }

        window.location.href = "khachhang.html";
    });

    serverLoginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const userInp = document.getElementById("serverUsername").value.trim();
        const passInp = document.getElementById("serverPassword").value.trim();
        const remember = document.getElementById("serverRememberMe").checked;
        const errEl = document.getElementById("serverLoginError");

        if (userInp !== SERVER_ADMIN_ACCOUNT.username || passInp !== SERVER_ADMIN_ACCOUNT.password) {
            errEl.textContent = "Sai thông tin máy chủ! (Yêu cầu TK: minhhoang / MK: 1234)";
            errEl.classList.add("visible");
            return;
        }

        errEl.classList.remove("visible");
        sessionStorage.setItem(SERVER_SESSION_KEY, JSON.stringify({ username: SERVER_ADMIN_ACCOUNT.username, role: "server_admin" }));
        if (remember) {
            localStorage.setItem(SERVER_REMEMBER_KEY, JSON.stringify({
                username: SERVER_ADMIN_ACCOUNT.username,
                password: SERVER_ADMIN_ACCOUNT.password
            }));
        } else {
            localStorage.removeItem(SERVER_REMEMBER_KEY);
        }

        window.location.href = "cskh.html";
    });
}

// ============================================================================
// 3. ENGINE HỢP NHẤT DỮ LIỆU CHỐNG XUNG ĐỘT & ĐỒNG BỘ ĐA MÁY TRỰC TUYẾN
// ============================================================================
let tickets = loadTicketsFromStorage();
let selectedTicketId = tickets[0] ? tickets[0].id : null;
let currentFilterDept = "all";
let currentStatusFilter = "all";
let currentSearchQuery = "";
let cskhSearchQuery = "";
let uploadedFiles = [];
let pendingModalTicketId = null;
let latestHighlightedTicketId = null;
let lastProcessedEventTime = Date.now();

function loadTicketsFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_TICKETS));
}

function writeTicketsToLocalStorage(list) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
        const slim = list.map(t => ({
            ...t,
            attachments: (t.attachments || []).map(a => ({ ...a, previewUrl: null }))
        }));
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
        } catch (err) {}
    }
}

// HÀM HỢP NHẤT NGUYÊN TỬ (ATOMIC UPSERT): Đảm bảo nhiều máy tạo cùng lúc không bao giờ ghi đè mất Ticket của nhau
function atomicUpsertTicket(incomingTicket) {
    if (!incomingTicket || !incomingTicket.id) return;
    const latestList = loadTicketsFromStorage();
    const map = new Map();

    latestList.forEach(t => map.set(t.id, t));
    tickets.forEach(t => {
        const existing = map.get(t.id);
        if (!existing || (t.lastModified || 0) >= (existing.lastModified || 0)) {
            map.set(t.id, t);
        }
    });

    const currentInMap = map.get(incomingTicket.id);
    if (!currentInMap || (incomingTicket.lastModified || 0) >= (currentInMap.lastModified || 0)) {
        map.set(incomingTicket.id, incomingTicket);
    }

    tickets = Array.from(map.values()).sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    writeTicketsToLocalStorage(tickets);
}

// Hợp nhất cả danh sách Ticket (Khi đồng bộ toàn trạng thái giữa các máy)
function atomicMergeTicketList(incomingArray) {
    if (!Array.isArray(incomingArray)) return;
    const latestList = loadTicketsFromStorage();
    const map = new Map();

    latestList.forEach(t => map.set(t.id, t));
    tickets.forEach(t => map.set(t.id, t));

    incomingArray.forEach(inc => {
        if (!inc || !inc.id) return;
        const cur = map.get(inc.id);
        if (!cur || (inc.lastModified || 0) >= (cur.lastModified || 0)) {
            map.set(inc.id, inc);
        }
    });

    tickets = Array.from(map.values()).sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    writeTicketsToLocalStorage(tickets);
}

// PHÁT GÓI TIN ĐỒNG BỘ QUA CẢ 3 TẦNG (LocalStorage + BroadcastChannel + Cloud Relay Đa Máy)
function broadcastSyncPacket(eventType, ticketObj = null) {
    const packetId = "PKT-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
    processedPacketIds.add(packetId);

    // Tạo bản sao gọn nhẹ cho đường truyền đám mây
    let cloudTicket = null;
    if (ticketObj) {
        cloudTicket = {
            ...ticketObj,
            attachments: (ticketObj.attachments || []).map(a => ({
                name: a.name,
                size: a.size,
                isImage: a.isImage,
                // Chỉ truyền ảnh đã nén gọn nhẹ (< 20KB) qua đường truyền đám mây
                previewUrl: (a.previewUrl && a.previewUrl.length < 28000) ? a.previewUrl : null
            }))
        };
    }

    const packet = {
        packetId,
        senderNode: CLIENT_NODE_ID,
        type: eventType,
        ticket: cloudTicket,
        timestamp: Date.now()
    };

    lastProcessedEventTime = packet.timestamp;

    try {
        localStorage.setItem(META_SYNC_KEY, JSON.stringify(packet));
    } catch (e) {}

    if (syncChannel) {
        syncChannel.postMessage(packet);
    }

    sendPacketToCloudRelay(packet);
}

// Gửi gói tin lên Cloud Relay kèm cơ chế Hàng đợi tự động thử lại nếu rớt mạng
async function sendPacketToCloudRelay(packet) {
    try {
        const res = await fetch(CLOUD_URL, {
            method: "POST",
            body: JSON.stringify(packet)
        });
        if (!res.ok) throw new Error("Cloud HTTP error");
    } catch (e) {
        enqueueOutboxPacket(packet);
    }
}

function enqueueOutboxPacket(packet) {
    try {
        const raw = localStorage.getItem(OUTBOX_QUEUE_KEY);
        const queue = raw ? JSON.parse(raw) : [];
        queue.push(packet);
        localStorage.setItem(OUTBOX_QUEUE_KEY, JSON.stringify(queue.slice(-20)));
    } catch (e) {}
}

async function flushOutboxQueue() {
    try {
        const raw = localStorage.getItem(OUTBOX_QUEUE_KEY);
        if (!raw) return;
        const queue = JSON.parse(raw);
        if (!Array.isArray(queue) || queue.length === 0) return;

        localStorage.removeItem(OUTBOX_QUEUE_KEY);
        for (const pkt of queue) {
            await sendPacketToCloudRelay(pkt);
        }
    } catch (e) {}
}

function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
}

function handleIncomingPacket(packet) {
    if (PORTAL_TYPE === "auth" || !packet) return;
    if (packet.packetId && processedPacketIds.has(packet.packetId)) return;
    if (packet.senderNode === CLIENT_NODE_ID) return;

    if (packet.packetId) processedPacketIds.add(packet.packetId);
    if (packet.timestamp) lastProcessedEventTime = Math.max(lastProcessedEventTime, packet.timestamp);

    if (packet.type === "NEW_TICKET" && packet.ticket) {
        atomicUpsertTicket(packet.ticket);
        if (!selectedTicketId) selectedTicketId = packet.ticket.id;

        if (PORTAL_TYPE === "cskh") {
            latestHighlightedTicketId = packet.ticket.id;
            playNotificationSound();
            showIncomingBannerOnCSKH(packet.ticket);
            showToast(`🔔 Yêu cầu mới ${packet.ticket.id} từ "${packet.ticket.customer}" vừa gửi đến ${packet.ticket.department}!`);
        }
    } else if (packet.type === "STATUS_UPDATED" && packet.ticket) {
        atomicUpsertTicket(packet.ticket);
        if (PORTAL_TYPE === "customer") {
            selectedTicketId = packet.ticket.id;
            playNotificationSound();
            showToast(`📢 U&I Logistics vừa cập nhật Ticket ${packet.ticket.id} sang: "${STATUS_STEPS[packet.ticket.statusIndex]}"!`);
        }
    } else if (packet.type === "RESET") {
        localStorage.removeItem(STORAGE_KEY);
        tickets = JSON.parse(JSON.stringify(DEFAULT_TICKETS));
        selectedTicketId = tickets[0] ? tickets[0].id : null;
    } else {
        tickets = loadTicketsFromStorage();
    }

    renderAll();
}

// Lắng nghe đồng bộ qua BroadcastChannel & Storage (Cùng máy)
if (syncChannel) {
    syncChannel.onmessage = (ev) => handleIncomingPacket(ev.data);
}

window.addEventListener("storage", (ev) => {
    if (ev.key === META_SYNC_KEY && ev.newValue) {
        try {
            handleIncomingPacket(JSON.parse(ev.newValue));
        } catch (e) {}
    } else if (ev.key === STORAGE_KEY) {
        tickets = loadTicketsFromStorage();
        renderAll();
    }
});

// Lắng nghe đồng bộ qua Cloud SSE Stream (Nhiều máy tính / điện thoại khác nhau qua Internet)
let cloudEventSource = null;
function initMultiMachineCloudStream() {
    if (PORTAL_TYPE === "auth" || !("EventSource" in window)) return;
    try {
        if (cloudEventSource) cloudEventSource.close();
        cloudEventSource = new EventSource(`${CLOUD_URL}/sse`);

        cloudEventSource.onopen = () => {
            const netText = document.getElementById("netStatusText");
            if (netText) {
                netText.textContent = PORTAL_TYPE === "cskh"
                    ? "Máy chủ: minhhoang (Đa thiết bị Online)"
                    : "Đường truyền ổn định 100%";
            }
            flushOutboxQueue();
        };

        cloudEventSource.onmessage = (event) => {
            try {
                const outer = JSON.parse(event.data);
                if (outer && outer.event === "message" && outer.message) {
                    const innerPacket = JSON.parse(outer.message);
                    handleIncomingPacket(innerPacket);
                }
            } catch (e) {}
        };

        cloudEventSource.onerror = () => {
            // Tự động kết nối lại sau 4 giây nếu mạng chập chờn
            setTimeout(initMultiMachineCloudStream, 4000);
        };
    } catch (e) {}
}

if (PORTAL_TYPE !== "auth") {
    initMultiMachineCloudStream();

    // Quét kiểm tra định kỳ mỗi 1 giây đảm bảo không bỏ sót gói tin nào
    setInterval(() => {
        try {
            const rawMeta = localStorage.getItem(META_SYNC_KEY);
            if (rawMeta) {
                const parsedMeta = JSON.parse(rawMeta);
                if (parsedMeta.timestamp > lastProcessedEventTime) {
                    handleIncomingPacket(parsedMeta);
                }
            }
        } catch (e) {}
    }, 1000);

    window.addEventListener("online", () => {
        flushOutboxQueue();
        initMultiMachineCloudStream();
    });
}

function showIncomingBannerOnCSKH(ticket) {
    const banner = document.getElementById("realtime-incoming-banner");
    if (!banner) return;
    banner.hidden = false;
    banner.innerHTML = `
        <div>
            <strong><i class="fa-solid fa-bell"></i> YÊU CẦU MỚI TỪ CỔNG KHÁCH HÀNG: ${escapeHTML(ticket.id)}</strong>
            <div style="font-size:13px;margin-top:2px;">
                Khách hàng: <b>${escapeHTML(ticket.customer)}</b> • Vận đơn: <code>${escapeHTML(ticket.waybill)}</code> •
                Sự cố: <b>${escapeHTML(ticket.categoryName)}</b> &rarr; Đã phân luồng tự động về: <b>${escapeHTML(ticket.department)}</b>
            </div>
        </div>
        <div style="display:flex;gap:8px;">
            <button type="button" class="btn-advance" onclick="openStatusModal('${ticket.id}')">
                <i class="fa-solid fa-pen"></i> Tiếp nhận &amp; Xử lý ngay
            </button>
            <button type="button" class="btn-secondary" onclick="document.getElementById('realtime-incoming-banner').hidden = true;">
                Đóng
            </button>
        </div>
    `;
}

// ============================================================================
// 4. NÉN ẢNH TỰ ĐỘNG BẰNG CANVAS (ĐẢM BẢO TRUYỀN NHANH & KHÔNG TRÀN BỘ NHỚ)
// ============================================================================
function compressImageToDataUrl(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 460;
            let w = img.width;
            let h = img.height;
            if (w > MAX_WIDTH) {
                h = Math.round((h * MAX_WIDTH) / w);
                w = MAX_WIDTH;
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, w, h);
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.68);
            callback(compressedDataUrl);
        };
        img.onerror = () => callback(null);
        img.src = e.target.result;
    };
    reader.onerror = () => callback(null);
    reader.readAsDataURL(file);
}

// ============================================================================
// 5. ĐIỀU HƯỚNG CÁC LIÊN KẾT CON TRONG TỪNG CỔNG
// ============================================================================
function activatePageByHash() {
    if (PORTAL_TYPE === "auth") return;
    const rawHash = window.location.hash.replace("#", "");
    const targetPage = VALID_PAGES.includes(rawHash) ? rawHash : VALID_PAGES[0];

    document.querySelectorAll(".page-view").forEach(sec => {
        sec.classList.toggle("active", sec.id === `page-${targetPage}`);
    });

    document.querySelectorAll(".nav-item").forEach(link => {
        link.classList.toggle("active", link.getAttribute("data-page") === targetPage);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
    renderAll();
}

window.addEventListener("hashchange", activatePageByHash);

// ============================================================================
// 6. NGHIỆP VỤ TRANG KHÁCH HÀNG (khachhang.html)
// ============================================================================
if (PORTAL_TYPE === "customer") {
    let activeCustomer = null;
    try {
        activeCustomer = JSON.parse(sessionStorage.getItem(CUST_SESSION_KEY));
        if (!activeCustomer) {
            const remembered = JSON.parse(localStorage.getItem(CUST_REMEMBER_KEY));
            if (remembered && remembered.profile) activeCustomer = remembered.profile;
        }
    } catch (e) {}

    if (activeCustomer) {
        const badgeName = document.getElementById("loggedCustName");
        if (badgeName) badgeName.textContent = activeCustomer.companyName || activeCustomer.username;
        const nameInp = document.getElementById("customerName");
        const contactInp = document.getElementById("customerContact");
        if (nameInp && activeCustomer.companyName) nameInp.value = activeCustomer.companyName;
        if (contactInp && activeCustomer.contact) contactInp.value = activeCustomer.contact;
    }

    const incidentForm = document.getElementById("incident-form");
    const incidentTypeSelect = document.getElementById("incidentType");
    const routingPreviewBox = document.getElementById("routing-preview");
    const routingTargetText = document.getElementById("routing-target");
    const uploadZone = document.getElementById("upload-zone");
    const fileInput = document.getElementById("fileInput");
    const fileListEl = document.getElementById("file-list");
    const fileCountLabel = document.getElementById("file-count-label");
    const formTimerText = document.getElementById("formTimerText");
    const createdTicketAlert = document.getElementById("created-ticket-alert");

    let formTimerSeconds = 0;
    let formTimerInterval = null;
    let isSubmittingLock = false;

    const REQUIRED_FIELDS = [
        { id: "customerName", errId: "err-customerName", msg: "Vui lòng nhập tên doanh nghiệp / khách hàng." },
        { id: "customerContact", errId: "err-customerContact", msg: "Vui lòng nhập số điện thoại hoặc email." },
        { id: "incidentType", errId: "err-incidentType", msg: "Vui lòng chọn phân loại sự cố." },
        { id: "waybillCode", errId: "err-waybillCode", msg: "Vui lòng nhập Mã vận đơn (B/L)." },
        { id: "bookingCode", errId: "err-bookingCode", msg: "Vui lòng nhập Mã Booking." },
        { id: "incidentDesc", errId: "err-incidentDesc", msg: "Vui lòng mô tả chi tiết sự cố." }
    ];

    REQUIRED_FIELDS.forEach(f => {
        const el = document.getElementById(f.id);
        const err = document.getElementById(f.errId);
        if (el && err) {
            const clearErr = () => {
                el.classList.remove("input-error");
                err.classList.remove("visible");
            };
            el.addEventListener("input", clearErr);
            el.addEventListener("change", clearErr);
        }
    });

    incidentForm.addEventListener("focusin", () => {
        if (!formTimerInterval) {
            formTimerInterval = setInterval(() => {
                formTimerSeconds++;
                const mins = String(Math.floor(formTimerSeconds / 60)).padStart(2, "0");
                const secs = String(formTimerSeconds % 60).padStart(2, "0");
                formTimerText.textContent = `${mins}:${secs}`;
            }, 1000);
        }
    });

    incidentTypeSelect.addEventListener("change", function () {
        const val = this.value;
        if (ROUTING_RULES[val]) {
            const rule = ROUTING_RULES[val];
            routingPreviewBox.classList.add("active-route");
            routingTargetText.innerHTML = `${escapeHTML(rule.actionNote)} (Đơn vị xử lý: <span style="text-decoration:underline;">${escapeHTML(rule.department)}</span>)`;
        } else {
            routingPreviewBox.classList.remove("active-route");
            routingTargetText.textContent = 'Chọn "Phân loại sự cố" để xem bộ phận chuyên trách tiếp nhận...';
        }
    });

    document.getElementById("btnFillSample").addEventListener("click", () => {
        if (!document.getElementById("customerName").value) {
            document.getElementById("customerName").value = "Công ty TNHH Xuất Nhập Khẩu Minh Phát";
        }
        if (!document.getElementById("customerContact").value) {
            document.getElementById("customerContact").value = "0909 888 777 | ops@minhphat.vn";
        }
        incidentTypeSelect.value = "document";
        incidentTypeSelect.dispatchEvent(new Event("change"));
        document.getElementById("priorityLevel").value = "Khẩn cấp";
        document.getElementById("waybillCode").value = "UIL-BL" + Math.floor(100000 + Math.random() * 900000);
        document.getElementById("bookingCode").value = "BK-" + Math.floor(100000 + Math.random() * 900000);
        document.getElementById("incidentDesc").value = "Phát hiện sai tên cảng dỡ hàng (Port of Discharge) trên Draft B/L, đề nghị chỉnh sửa gấp trước giờ đóng manifest.";
        showToast("Đã điền thông tin mẫu! Nhấn 'Gửi Yêu Cầu Trực Tiếp Về Hệ Thống CSKH' ngay.");
    });

    uploadZone.addEventListener("click", () => fileInput.click());
    uploadZone.addEventListener("dragover", (e) => { e.preventDefault(); uploadZone.classList.add("drag-active"); });
    uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("drag-active"));
    uploadZone.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadZone.classList.remove("drag-active");
        handleCustomerFiles(Array.from(e.dataTransfer.files));
    });
    fileInput.addEventListener("change", (e) => {
        handleCustomerFiles(Array.from(e.target.files));
        fileInput.value = "";
    });

    function handleCustomerFiles(files) {
        files.forEach(file => {
            if (file.size > 25 * 1024 * 1024) {
                showToast(`File "${file.name}" vượt quá 25MB!`, true);
                return;
            }
            const isImage = file.type.startsWith("image/");
            const fileObj = {
                name: file.name,
                size: file.size < 1048576 ? (file.size / 1024).toFixed(1) + " KB" : (file.size / 1048576).toFixed(2) + " MB",
                isImage,
                previewUrl: null
            };
            if (isImage) {
                compressImageToDataUrl(file, (compressedUrl) => {
                    fileObj.previewUrl = compressedUrl;
                    renderUploadedFiles();
                });
            }
            uploadedFiles.push(fileObj);
        });
        renderUploadedFiles();
    }

    function renderUploadedFiles() {
        fileCountLabel.textContent = `Đã đính kèm: ${uploadedFiles.length} file`;
        fileListEl.innerHTML = uploadedFiles.map((f, idx) => `
            <div class="file-card">
                ${f.isImage && f.previewUrl
                    ? `<img src="${f.previewUrl}" class="file-thumb" alt="preview">`
                    : `<div class="file-thumb"><i class="fa-solid ${f.isImage ? 'fa-file-image' : 'fa-file-lines'}"></i></div>`
                }
                <div class="file-meta">
                    <strong>${escapeHTML(f.name)}</strong>
                    <small>${escapeHTML(f.size)}</small>
                </div>
                <i class="fa-solid fa-circle-xmark" style="color:#ef4444;cursor:pointer;" onclick="removeCustomerFile(${idx})"></i>
            </div>
        `).join("");
    }

    window.removeCustomerFile = function (idx) {
        uploadedFiles.splice(idx, 1);
        renderUploadedFiles();
    };

    // Sinh mã Ticket chống trùng lặp tuyệt đối khi nhiều máy tạo cùng lúc
    function generateCollisionFreeTicketId() {
        const latest = loadTicketsFromStorage();
        let candidate = "";
        do {
            const timeTail = String(Date.now()).slice(-2);
            const randPart = String(Math.floor(10 + Math.random() * 90));
            candidate = `#UIL-${timeTail}${randPart}`;
        } while (latest.some(t => t.id === candidate));
        return candidate;
    }

    incidentForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (isSubmittingLock) return;

        let valid = true;
        REQUIRED_FIELDS.forEach(f => {
            const el = document.getElementById(f.id);
            const err = document.getElementById(f.errId);
            if (!el.value.trim()) {
                valid = false;
                el.classList.add("input-error");
                err.textContent = f.msg;
                err.classList.add("visible");
            }
        });
        if (!valid) {
            showToast("Vui lòng điền đầy đủ các trường thông tin bắt buộc (*)!", true);
            return;
        }

        isSubmittingLock = true;
        const typeKey = incidentTypeSelect.value;
        const rule = ROUTING_RULES[typeKey];
        const newTicketId = generateCollisionFreeTicketId();
        const nowMs = Date.now();
        const timeStr = `${getCurrentTimeStr()} - Hôm nay`;

        const newTicket = {
            id: newTicketId,
            createdAtMs: nowMs,
            lastModified: nowMs,
            customer: document.getElementById("customerName").value.trim(),
            contact: document.getElementById("customerContact").value.trim(),
            waybill: document.getElementById("waybillCode").value.trim().toUpperCase(),
            booking: document.getElementById("bookingCode").value.trim().toUpperCase(),
            typeKey,
            categoryName: rule.categoryName,
            department: rule.department,
            priority: document.getElementById("priorityLevel").value,
            description: document.getElementById("incidentDesc").value.trim(),
            attachments: [...uploadedFiles],
            statusIndex: 0,
            stepTimestamps: [timeStr, "Đang chờ xử lý", "Chưa hoàn tất"],
            stepNotes: [
                `Hệ thống đã khởi tạo mã Ticket duy nhất ${newTicketId} và chuyển trực tiếp đến ${rule.department}.`,
                "",
                ""
            ],
            slaDuration: "Tức thì (< 01 phút)"
        };

        // Hợp nhất nguyên tử không ghi đè và phát sóng đa thiết bị
        atomicUpsertTicket(newTicket);
        selectedTicketId = newTicket.id;
        broadcastSyncPacket("NEW_TICKET", newTicket);

        createdTicketAlert.hidden = false;
        createdTicketAlert.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                <i class="fa-solid fa-circle-check" style="font-size:24px;color:#059669;"></i>
                <div>
                    <h4 style="color:#065f46;font-size:15px;">Đã Gửi Thành Công — Mã Ticket: ${escapeHTML(newTicket.id)}</h4>
                    <small style="color:#047857;">Đã chuyển thẳng về Máy chủ CSKH &amp; <strong>${escapeHTML(newTicket.department)}</strong></small>
                </div>
            </div>
            <p style="font-size:12.5px;color:#065f46;margin-bottom:12px;">
                Vận đơn: <b>${escapeHTML(newTicket.waybill)}</b> • Booking: <b>${escapeHTML(newTicket.booking)}</b>
            </p>
            <a href="#tracking" class="btn-advance" style="text-decoration:none;">
                <i class="fa-solid fa-route"></i> Theo dõi tiến độ xử lý của Ticket này
            </a>
        `;

        document.getElementById("waybillCode").value = "";
        document.getElementById("bookingCode").value = "";
        document.getElementById("incidentDesc").value = "";
        incidentTypeSelect.value = "";
        uploadedFiles = [];
        renderUploadedFiles();
        routingPreviewBox.classList.remove("active-route");
        routingTargetText.textContent = 'Chọn "Phân loại sự cố" để xem bộ phận chuyên trách tiếp nhận...';

        if (formTimerInterval) {
            clearInterval(formTimerInterval);
            formTimerInterval = null;
        }
        formTimerSeconds = 0;
        formTimerText.textContent = "00:00";

        renderAll();
        showToast(`Đã khởi tạo Ticket ${newTicketId} và truyền trực tiếp về Máy chủ CSKH!`);
        setTimeout(() => { isSubmittingLock = false; }, 400);
    });

    const searchInput = document.getElementById("searchTicketInput");
    const clearBtn = document.getElementById("btnClearSearch");

    function runCustomerSearch() {
        currentSearchQuery = searchInput.value.trim();
        clearBtn.hidden = !currentSearchQuery;
        renderCustomerPortal();
    }

    document.getElementById("btnSearchTicket").addEventListener("click", runCustomerSearch);
    searchInput.addEventListener("input", runCustomerSearch);
    clearBtn.addEventListener("click", () => {
        searchInput.value = "";
        currentSearchQuery = "";
        clearBtn.hidden = true;
        renderCustomerPortal();
    });

    document.querySelectorAll("#tracking-status-chips .status-chip").forEach(chip => {
        chip.addEventListener("click", function () {
            currentStatusFilter = this.getAttribute("data-status");
            document.querySelectorAll("#tracking-status-chips .status-chip").forEach(c => c.classList.remove("active"));
            this.classList.add("active");
            renderCustomerPortal();
        });
    });

    document.getElementById("download-guide-btn").addEventListener("click", () => {
        const guideHTML = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>Hướng Dẫn Sử Dụng Cổng Tiếp Nhận Số Hóa - U&I Logistics</title></head><body style="font-family:Arial,sans-serif;line-height:1.6;max-width:800px;margin:40px auto;padding:20px;"><h2>U&I LOGISTICS - TÀI LIỆU HƯỚNG DẪN KHÁCH HÀNG</h2><p>1. Báo cáo sự cố tức thì trong 1-2 phút với đầy đủ phân loại lỗi, mã vận đơn, booking và chứng từ đính kèm.</p><p>2. Nhận mã Ticket duy nhất, hệ thống tự động định tuyến đến đúng bộ phận chuyên trách dưới 05 phút.</p><p>3. Theo dõi công khai 03 trạng thái: Đã tiếp nhận -> Đang xử lý -> Đã giải quyết hoàn tất.</p></body></html>`;
        const blob = new Blob([guideHTML], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Huong_Dan_Su_Dung_Cong_Khach_Hang_UI_Logistics.html";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Đã tải về máy: Huong_Dan_Su_Dung_Cong_Khach_Hang_UI_Logistics.html");
    });
}

function renderCustomerPortal() {
    if (PORTAL_TYPE !== "customer") return;

    document.getElementById("cust-ticket-count").textContent = tickets.length;
    document.getElementById("count-status-all").textContent = tickets.length;
    document.getElementById("count-status-0").textContent = tickets.filter(t => t.statusIndex === 0).length;
    document.getElementById("count-status-1").textContent = tickets.filter(t => t.statusIndex === 1).length;
    document.getElementById("count-status-2").textContent = tickets.filter(t => t.statusIndex === 2).length;

    const filtered = tickets.filter(t => {
        const matchStatus = currentStatusFilter === "all" || String(t.statusIndex) === currentStatusFilter;
        if (!matchStatus) return false;
        if (!currentSearchQuery) return true;
        const q = currentSearchQuery.toUpperCase();
        return (
            t.id.toUpperCase().includes(q) ||
            t.waybill.toUpperCase().includes(q) ||
            t.booking.toUpperCase().includes(q) ||
            t.customer.toUpperCase().includes(q)
        );
    });

    const listEl = document.getElementById("ticket-list-container");
    if (filtered.length === 0) {
        listEl.innerHTML = `<div style="text-align:center;padding:24px;color:#64748b;font-size:13px;">Không tìm thấy hồ sơ sự cố nào phù hợp.</div>`;
    } else {
        if (!filtered.some(t => t.id === selectedTicketId)) {
            selectedTicketId = filtered[0].id;
        }
        listEl.innerHTML = filtered.map(t => `
            <div class="ticket-mini-item ${t.id === selectedTicketId ? 'selected' : ''}" onclick="selectCustomerTicket('${t.id}')">
                <div>
                    <strong style="color:#0f3d7a;">${escapeHTML(t.id)}</strong> — <strong>${escapeHTML(t.customer)}</strong>
                    <div style="font-size:12px;color:#64748b;">Vận đơn: <code>${escapeHTML(t.waybill)}</code> • ${escapeHTML(t.categoryName)}</div>
                </div>
                <span class="status-badge status-step-${t.statusIndex + 1}">${STATUS_STEPS[t.statusIndex]}</span>
            </div>
        `).join("");
    }

    const detailEl = document.getElementById("active-ticket-card");
    const ticket = tickets.find(t => t.id === selectedTicketId) || tickets[0];
    if (!ticket) return;

    const getStepClass = (idx) => idx < ticket.statusIndex ? "completed" : (idx === ticket.statusIndex ? "active" : "");
    const attachHTML = (ticket.attachments && ticket.attachments.length > 0)
        ? ticket.attachments.map((a, i) => `
            <button type="button" class="attachment-chip" onclick="previewAttachment('${ticket.id}', ${i})">
                <i class="fa-solid ${a.isImage ? 'fa-file-image' : 'fa-file-pdf'}"></i> ${escapeHTML(a.name)}
            </button>
        `).join("")
        : `<span style="color:#94a3b8;">Không có đính kèm</span>`;

    const notes = ticket.stepNotes || ["Đã tiếp nhận.", "", ""];
    let logsHTML = "";
    for (let i = 0; i <= ticket.statusIndex; i++) {
        logsHTML += `
            <div class="step-log-item ${i === 2 ? 'done' : ''}">
                <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                    <strong>${STATUS_STEPS[i]} — ${escapeHTML(ticket.department)}</strong>
                    <small style="color:#64748b;">${escapeHTML(ticket.stepTimestamps[i])}</small>
                </div>
                <div>${escapeHTML(notes[i] || "Đã cập nhật trạng thái xử lý.")}</div>
            </div>
        `;
    }

    detailEl.innerHTML = `
        <div class="ticket-top">
            <div>
                <span class="ticket-id-badge">${escapeHTML(ticket.id)}</span>
                <span style="font-size:12px;color:#64748b;margin-left:8px;">
                    <i class="fa-solid fa-bolt text-warning"></i> Thời gian tiếp nhận: <strong>${escapeHTML(ticket.slaDuration)}</strong>
                </span>
            </div>
            <span class="dept-pill"><i class="fa-solid fa-building-user"></i> ${escapeHTML(ticket.department)}</span>
        </div>

        <div class="ticket-meta-grid">
            <div><strong>Khách hàng:</strong> ${escapeHTML(ticket.customer)}</div>
            <div><strong>Liên hệ:</strong> ${escapeHTML(ticket.contact)}</div>
            <div><strong>Vận Đơn / Booking:</strong> <code>${escapeHTML(ticket.waybill)}</code> / <code>${escapeHTML(ticket.booking)}</code></div>
            <div><strong>Phân loại sự cố:</strong> ${escapeHTML(ticket.categoryName)} (${escapeHTML(ticket.priority)})</div>
            <div style="grid-column:span 2;"><strong>Chứng từ đính kèm:</strong> <div style="margin-top:4px;">${attachHTML}</div></div>
        </div>

        <p style="font-size:13px;background:#fff;padding:10px;border-radius:6px;border:1px solid #e2e8f0;margin-bottom:12px;">
            <strong>Nội dung sự cố:</strong> ${escapeHTML(ticket.description)}
        </p>

        <div class="stepper-wrapper">
            <div class="step-item ${getStepClass(0)}">
                <div class="step-circle"><i class="fa-solid fa-check"></i></div>
                <div class="step-label">Đã tiếp nhận</div>
                <div class="step-time">${escapeHTML(ticket.stepTimestamps[0])}</div>
            </div>
            <div class="step-item ${getStepClass(1)}">
                <div class="step-circle">${ticket.statusIndex >= 1 ? '<i class="fa-solid fa-gears"></i>' : '2'}</div>
                <div class="step-label">Đang xử lý</div>
                <div class="step-time">${escapeHTML(ticket.stepTimestamps[1])}</div>
            </div>
            <div class="step-item ${getStepClass(2)}">
                <div class="step-circle">${ticket.statusIndex === 2 ? '<i class="fa-solid fa-flag-checkered"></i>' : '3'}</div>
                <div class="step-label">Đã giải quyết hoàn tất</div>
                <div class="step-time">${escapeHTML(ticket.stepTimestamps[2])}</div>
            </div>
        </div>

        <div class="step-log-list">${logsHTML}</div>
    `;
}

window.selectCustomerTicket = function (id) {
    selectedTicketId = id;
    renderCustomerPortal();
};

// ============================================================================
// 7. NGHIỆP VỤ TRANG HỆ THỐNG MÁY CHỦ CSKH (cskh.html)
// ============================================================================
if (PORTAL_TYPE === "cskh") {
    const hasSession = sessionStorage.getItem(SERVER_SESSION_KEY);
    const hasRemember = localStorage.getItem(SERVER_REMEMBER_KEY);
    if (!hasSession && !hasRemember) {
        window.location.href = "index.html";
    }

    const cskhSearchInput = document.getElementById("cskhSearchInput");
    if (cskhSearchInput) {
        cskhSearchInput.addEventListener("input", function () {
            cskhSearchQuery = this.value.trim();
            renderCSKHPortal();
        });
    }

    const statusModal = document.getElementById("statusModal");
    const modalSummary = document.getElementById("modalTicketSummary");
    const modalStatusSelect = document.getElementById("modalStatusSelect");
    const modalNoteInput = document.getElementById("modalNoteInput");

    window.openStatusModal = function (ticketId) {
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) return;
        pendingModalTicketId = ticketId;

        modalSummary.innerHTML = `
            <strong>Mã Ticket: ${escapeHTML(ticket.id)}</strong> — Khách hàng: <strong>${escapeHTML(ticket.customer)}</strong><br>
            Vận đơn: <code>${escapeHTML(ticket.waybill)}</code> • Đơn vị xử lý: <strong>${escapeHTML(ticket.department)}</strong>
        `;

        const nextStep = ticket.statusIndex < 2 ? ticket.statusIndex + 1 : 2;
        modalStatusSelect.value = String(nextStep);
        modalNoteInput.value = nextStep === 1
            ? `${ticket.department} đã tiếp nhận hồ sơ vận đơn ${ticket.waybill} và đang triển khai phương án xử lý.`
            : `Sự cố của vận đơn ${ticket.waybill} đã được ${ticket.department} giải quyết hoàn tất và nghiệm thu cùng khách hàng.`;

        statusModal.hidden = false;
        modalNoteInput.focus();
    };

    function closeCSKHModal() {
        statusModal.hidden = true;
        pendingModalTicketId = null;
    }

    document.getElementById("btnCloseModal").addEventListener("click", closeCSKHModal);
    document.getElementById("btnCancelModal").addEventListener("click", closeCSKHModal);

    document.getElementById("btnConfirmModal").addEventListener("click", () => {
        if (!pendingModalTicketId) return;
        const ticket = tickets.find(t => t.id === pendingModalTicketId);
        if (ticket) {
            const newIdx = parseInt(modalStatusSelect.value, 10);
            ticket.statusIndex = newIdx;
            ticket.lastModified = Date.now();
            ticket.stepTimestamps[newIdx] = `${getCurrentTimeStr()} - Đã xác nhận`;
            if (!Array.isArray(ticket.stepNotes)) ticket.stepNotes = ["Đã tiếp nhận.", "", ""];
            ticket.stepNotes[newIdx] = modalNoteInput.value.trim() || `Đã chuyển sang trạng thái "${STATUS_STEPS[newIdx]}".`;

            atomicUpsertTicket(ticket);
            broadcastSyncPacket("STATUS_UPDATED", ticket);
            renderAll();
            showToast(`Đã cập nhật Ticket ${ticket.id} sang "${STATUS_STEPS[newIdx]}" và đồng bộ tới mọi máy khách!`);
        }
        closeCSKHModal();
    });

    document.getElementById("btnResetDemo").addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEY);
        tickets = JSON.parse(JSON.stringify(DEFAULT_TICKETS));
        writeTicketsToLocalStorage(tickets);
        broadcastSyncPacket("RESET", null);
        renderAll();
        showToast("Đã khôi phục dữ liệu mẫu mặc định!");
    });
}

function renderCSKHPortal() {
    if (PORTAL_TYPE !== "cskh") return;

    const total = tickets.length;
    const newCount = tickets.filter(t => t.statusIndex === 0).length;
    const procCount = tickets.filter(t => t.statusIndex === 1).length;
    const doneCount = tickets.filter(t => t.statusIndex === 2).length;

    document.getElementById("cskh-pending-badge").textContent = newCount + procCount;
    document.getElementById("cskh-total-count").textContent = total;
    document.getElementById("cskh-new-count").textContent = newCount;
    document.getElementById("cskh-processing-count").textContent = procCount;
    document.getElementById("cskh-resolved-count").textContent = doneCount;

    const inboxBody = document.getElementById("crm-inbox-body");
    const inboxFiltered = tickets.filter(t => {
        if (!cskhSearchQuery) return true;
        const q = cskhSearchQuery.toUpperCase();
        return (
            t.id.toUpperCase().includes(q) ||
            t.waybill.toUpperCase().includes(q) ||
            t.booking.toUpperCase().includes(q) ||
            t.customer.toUpperCase().includes(q) ||
            t.department.toUpperCase().includes(q)
        );
    });

    inboxBody.innerHTML = inboxFiltered.map(t => {
        const attachBtns = (t.attachments && t.attachments.length > 0)
            ? t.attachments.map((a, i) => `
                <button type="button" class="attachment-chip" onclick="previewAttachment('${t.id}', ${i})">
                    <i class="fa-solid fa-paperclip"></i> ${escapeHTML(a.name)}
                </button>
            `).join("")
            : `<small style="color:#94a3b8;">Không có</small>`;

        const highlightClass = t.id === latestHighlightedTicketId ? "new-row-highlight" : "";

        return `
            <tr class="${highlightClass}">
                <td><strong style="color:#0f3d7a;">${escapeHTML(t.id)}</strong></td>
                <td>
                    <div>${escapeHTML(t.stepTimestamps[0])}</div>
                    <small style="color:#10b981;font-weight:600;"><i class="fa-solid fa-bolt"></i> ${escapeHTML(t.slaDuration)}</small>
                </td>
                <td>
                    <strong>${escapeHTML(t.customer)}</strong><br>
                    <small style="color:#64748b;">${escapeHTML(t.contact)}</small>
                </td>
                <td><code>${escapeHTML(t.waybill)}</code><br><small>${escapeHTML(t.booking)}</small></td>
                <td style="max-width:260px;">
                    <strong>${escapeHTML(t.categoryName)}</strong> <span style="font-size:11px;color:#dc2626;">(${escapeHTML(t.priority)})</span>
                    <div style="font-size:12px;color:#475569;margin-top:2px;">${escapeHTML(t.description)}</div>
                </td>
                <td><span class="dept-pill">${escapeHTML(t.department)}</span></td>
                <td>${attachBtns}</td>
                <td><span class="status-badge status-step-${t.statusIndex + 1}">${STATUS_STEPS[t.statusIndex]}</span></td>
                <td>
                    <button type="button" class="btn-advance" onclick="openStatusModal('${t.id}')">
                        <i class="fa-solid fa-pen-to-square"></i> Xử lý / Phản hồi
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    const filterContainer = document.getElementById("dept-filters");
    const labels = {
        "all": "Tất cả bộ phận",
        "Đội Điều Độ Vận Tải": "🚛 Đội Điều Độ Vận Tải",
        "Bộ Phận Hải Quan": "🛃 Bộ Phận Hải Quan",
        "Ban Quản Lý Kho": "📦 Ban Quản Lý Kho",
        "Bộ Phận Chứng Từ & CSKH": "📄 Bộ Phận Chứng Từ & CSKH"
    };

    filterContainer.innerHTML = DEPARTMENTS_LIST.map(dept => {
        const count = dept === "all" ? tickets.length : tickets.filter(t => t.department === dept).length;
        return `
            <button type="button" class="filter-btn ${currentFilterDept === dept ? 'active' : ''}" onclick="setCSKHDeptFilter('${dept}')">
                ${labels[dept]} <span class="count-pill">${count}</span>
            </button>
        `;
    }).join("");

    const deptBody = document.getElementById("crm-dept-body");
    const deptFiltered = currentFilterDept === "all"
        ? tickets
        : tickets.filter(t => t.department === currentFilterDept);

    if (deptFiltered.length === 0) {
        deptBody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:24px;color:#64748b;">Hiện không có hồ sơ sự cố nào tại bộ phận này.</td></tr>`;
    } else {
        deptBody.innerHTML = deptFiltered.map(t => {
            const latestNote = (t.stepNotes && t.stepNotes[t.statusIndex]) ? t.stepNotes[t.statusIndex] : "Đã tiếp nhận.";
            return `
                <tr>
                    <td><strong style="color:#0f3d7a;">${escapeHTML(t.id)}</strong></td>
                    <td>${escapeHTML(t.stepTimestamps[0])}</td>
                    <td><strong>${escapeHTML(t.customer)}</strong></td>
                    <td><code>${escapeHTML(t.waybill)}</code> / <small>${escapeHTML(t.booking)}</small></td>
                    <td>${escapeHTML(t.categoryName)}</td>
                    <td><span class="dept-pill">${escapeHTML(t.department)}</span></td>
                    <td style="max-width:250px;font-size:12px;color:#334155;">${escapeHTML(latestNote)}</td>
                    <td><span class="status-badge status-step-${t.statusIndex + 1}">${STATUS_STEPS[t.statusIndex]}</span></td>
                    <td>
                        <button type="button" class="btn-advance" onclick="openStatusModal('${t.id}')">
                            <i class="fa-solid fa-pen"></i> Cập nhật
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    const barsEl = document.getElementById("dept-stats-bars");
    barsEl.innerHTML = DEPARTMENTS_LIST.filter(d => d !== "all").map(dept => {
        const count = tickets.filter(t => t.department === dept).length;
        const done = tickets.filter(t => t.department === dept && t.statusIndex === 2).length;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return `
            <div class="dept-bar-item">
                <div class="dept-bar-top">
                    <span>${escapeHTML(dept)}</span>
                    <span>${count} Ticket (${done} hoàn tất)</span>
                </div>
                <div class="dept-bar-track"><div class="dept-bar-fill" style="width:${pct}%;"></div></div>
            </div>
        `;
    }).join("");
}

window.setCSKHDeptFilter = function (dept) {
    currentFilterDept = dept;
    renderCSKHPortal();
};

// ============================================================================
// 8. XEM ĐÍNH KÈM (DÙNG CHUNG CHO KHACHHANG.HTML & CSKH.HTML)
// ============================================================================
const previewModal = document.getElementById("previewModal");
if (previewModal) {
    const previewModalTitle = document.getElementById("previewModalTitle");
    const previewModalBody = document.getElementById("previewModalBody");

    window.previewAttachment = function (ticketId, idx) {
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket || !ticket.attachments || !ticket.attachments[idx]) return;
        const att = ticket.attachments[idx];

        previewModalTitle.innerHTML = `<i class="fa-solid fa-paperclip"></i> ${escapeHTML(att.name)} (${escapeHTML(att.size)})`;
        if (att.isImage && att.previewUrl) {
            previewModalBody.innerHTML = `<div style="text-align:center;"><img src="${att.previewUrl}" style="max-width:100%;max-height:360px;border-radius:8px;"></div>`;
        } else {
            previewModalBody.innerHTML = `
                <div style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #cbd5e1;font-size:13px;">
                    <p><strong>Thuộc mã Ticket:</strong> ${escapeHTML(ticket.id)}</p>
                    <p><strong>Tên tập tin:</strong> ${escapeHTML(att.name)} (${escapeHTML(att.size)})</p>
                    <p><strong>Khách hàng:</strong> ${escapeHTML(ticket.customer)} — <strong>Vận đơn:</strong> ${escapeHTML(ticket.waybill)}</p>
                    <p style="color:#059669;font-weight:600;margin-top:6px;"><i class="fa-solid fa-shield-check"></i> Đã xác thực bảo mật trên hệ thống CRM U&amp;I Logistics</p>
                </div>
            `;
        }
        previewModal.hidden = false;
    };

    document.getElementById("btnClosePreviewModal").addEventListener("click", () => previewModal.hidden = true);
    document.getElementById("btnDonePreviewModal").addEventListener("click", () => previewModal.hidden = true);
}

function renderAll() {
    if (PORTAL_TYPE === "customer") {
        renderCustomerPortal();
    } else if (PORTAL_TYPE === "cskh") {
        renderCSKHPortal();
    }
}

if (PORTAL_TYPE !== "auth") {
    activatePageByHash();
}