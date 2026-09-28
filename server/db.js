const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'database.json');

const initialData = {
  admin: {
    username: "admin_iot",
    password: "iotlabtelkom2026",
    name: "Laboran / Asisten Lab IoT",
    role: "Laboran Utama"
  },
  inventory: [
    {
      id: "INV-001",
      name: "ESP32-WROOM-32 Development Board",
      category: "Mikrokontroler",
      location: "Rak Komponen A - Boks 01",
      totalStock: 15,
      availableStock: 12,
      borrowedStock: 3,
      unit: "Unit",
      condition: "Baik",
      loanable: "all", 
      loanPolicyText: "Boleh Dipinjam (Umum & Internal)",
      description: "Dual-core 240MHz, WiFi & BLE 4.2 integrasi, 38 pin GPIO."
    },
    {
      id: "INV-002",
      name: "Raspberry Pi 4 Model B (4GB RAM)",
      category: "Single Board Computer",
      location: "Rak Komponen A - Boks 02",
      totalStock: 5,
      availableStock: 3,
      borrowedStock: 2,
      unit: "Unit",
      condition: "Baik",
      loanable: "internal_only",
      loanPolicyText: "Khusus Internal Lab IoT",
      description: "Broadcom BCM2711 quad-core Cortex-A72, Gigabit Ethernet, 2x Micro HDMI."
    },
    {
      id: "INV-003",
      name: "Arduino Uno R3 DIP ATmega328P",
      category: "Mikrokontroler",
      location: "Rak Komponen A - Boks 03",
      totalStock: 10,
      availableStock: 8,
      borrowedStock: 2,
      unit: "Unit",
      condition: "Baik",
      loanable: "all",
      loanPolicyText: "Boleh Dipinjam (Umum & Internal)",
      description: "Development board standard untuk prototipe mikrokontroler 16MHz."
    },
    {
      id: "INV-004",
      name: "Rigol DS1054Z Digital Oscilloscope 50MHz 4CH",
      category: "Alat Ukur & Instrumentasi",
      location: "Meja Kerja Riset 02 - Workbench",
      totalStock: 2,
      availableStock: 2,
      borrowedStock: 0,
      unit: "Unit",
      condition: "Baik",
      loanable: "restricted",
      loanPolicyText: "Aset Tetap Lab (Hanya Digunakan di Ruang Lab)",
      description: "Osiloskop digital 4-channel, 1GSa/s real-time sample rate. Tidak diizinkan dibawa keluar lab."
    },
    {
      id: "INV-005",
      name: "Quick 936A ESD Safe Soldering Station",
      category: "Perkakas & Solder",
      location: "Meja Fabrikasi Solder - Station 1",
      totalStock: 3,
      availableStock: 3,
      borrowedStock: 0,
      unit: "Unit",
      condition: "Baik",
      loanable: "restricted",
      loanPolicyText: "Aset Tetap Lab (Hanya Digunakan di Ruang Lab)",
      description: "Stasiun solder suhu terkontrol 200°C - 480°C dengan grounding anti-statis."
    },
    {
      id: "INV-006",
      name: "Sanwa CD800a Digital Multimeter True RMS",
      category: "Alat Ukur & Instrumentasi",
      location: "Lemari Instrumen L-01",
      totalStock: 4,
      availableStock: 3,
      borrowedStock: 1,
      unit: "Unit",
      condition: "Baik",
      loanable: "all",
      loanPolicyText: "Boleh Dipinjam (Umum & Internal)",
      description: "Multimeter presisi tinggi, 4000 count, pengukuran tegangan, arus, resistansi, kontinuitas."
    },
    {
      id: "INV-007",
      name: "LoRa SX1278 Ra-02 433MHz Transceiver Module",
      category: "Sensor & Modul Nirkabel",
      location: "Rak Komponen B - Boks Modul 04",
      totalStock: 12,
      availableStock: 10,
      borrowedStock: 2,
      unit: "Pcs",
      condition: "Baik",
      loanable: "all",
      loanPolicyText: "Boleh Dipinjam (Umum & Internal)",
      description: "Modul komunikasi nirkabel jarak jauh berbasis Semtech SX1278 SPI interface."
    },
    {
      id: "INV-008",
      name: "Sensor Suhu & Kelembaban DHT22 (AM2302)",
      category: "Sensor & Modul Nirkabel",
      location: "Rak Komponen B - Boks Sensor 01",
      totalStock: 18,
      availableStock: 16,
      borrowedStock: 2,
      unit: "Pcs",
      condition: "Baik",
      loanable: "all",
      loanPolicyText: "Boleh Dipinjam (Umum & Internal)",
      description: "Sensor digital presisi tinggi, rentang -40 hingga 80°C dan 0-100% RH."
    },
    {
      id: "INV-009",
      name: "Ultrasonic Distance Sensor HC-SR04",
      category: "Sensor & Modul Nirkabel",
      location: "Rak Komponen B - Boks Sensor 02",
      totalStock: 20,
      availableStock: 18,
      borrowedStock: 2,
      unit: "Pcs",
      condition: "Baik",
      loanable: "all",
      loanPolicyText: "Boleh Dipinjam (Umum & Internal)",
      description: "Sensor jarak ultrasonik 2cm - 400cm untuk navigasi robotik dan level air."
    },
    {
      id: "INV-010",
      name: "Atten ST-862D Hot Air Rework Station 1000W",
      category: "Perkakas & Solder",
      location: "Meja Fabrikasi Solder - Station 2",
      totalStock: 1,
      availableStock: 1,
      borrowedStock: 0,
      unit: "Unit",
      condition: "Baik",
      loanable: "restricted",
      loanPolicyText: "Aset Tetap Lab (Hanya Digunakan di Ruang Lab)",
      description: "Hot air gun digital untuk desoldering SMD. Khusus operasional lab."
    }
  ],
  loans: [],
  cashMembers: [
    { id: "MBR-01", nim: "1101220012", name: "Muhammad Fadhil", role: "Koordinator Lab IoT", active: true },
    { id: "MBR-02", nim: "1101220034", name: "Aisyah Putri Rahmawati", role: "Bendahara Lab", active: true },
    { id: "MBR-03", nim: "1101220055", name: "Bagus Tri Wicaksono", role: "Divisi Hardware & IoT", active: true },
    { id: "MBR-04", nim: "1101220078", name: "Daffa Ramadhan", role: "Divisi Software & Cloud", active: true },
    { id: "MBR-05", nim: "1101220092", name: "Nabila Zahra", role: "Divisi Riset & Proyek", active: true },
    { id: "MBR-06", nim: "1101220110", name: "Rizky Pratama", role: "Asisten Lab", active: true },
    { id: "MBR-07", nim: "1101220124", name: "Farhan Maulana", role: "Asisten Lab", active: true },
    { id: "MBR-08", nim: "1101220140", name: "Siti Nurhaliza", role: "Asisten Lab", active: true }
  ],

  monthlyTargets: {
    "2026-07": { targetAmount: 0, notes: "Libur Semester Genap (Bebas Kas)" },
    "2026-08": { targetAmount: 15000, notes: "Awal Semester Ganjil" },
    "2026-09": { targetAmount: 20000, notes: "Pengadaan Alat Solder & Restock Komponen IoT" },
    "2026-10": { targetAmount: 25000, notes: "Persiapan Workshop IoT Telkom University" },
    "2026-11": { targetAmount: 20000, notes: "Operasional Reguler Lab" },
    "2026-12": { targetAmount: 15000, notes: "Evaluasi Akhir Periode" }
  },
  cashTransactions: [
    {
      id: "CASH-TRX-001",
      date: "2026-08-05",
      type: "income_dues", 
      memberId: "MBR-01",
      memberName: "Muhammad Fadhil",
      period: "2026-08",
      amount: 15000,
      paymentMethod: "Transfer Bank",
      notes: "Kas Agustus lunas",
      receiptFile: null
    },
    {
      id: "CASH-TRX-002",
      date: "2026-08-06",
      type: "income_dues",
      memberId: "MBR-02",
      memberName: "Aisyah Putri Rahmawati",
      period: "2026-08",
      amount: 15000,
      paymentMethod: "Cash",
      notes: "Kas Agustus lunas",
      receiptFile: null
    },
    {
      id: "CASH-TRX-003",
      date: "2026-08-12",
      type: "income_other",
      memberId: null,
      memberName: "Hibah Riset IoT Capstone",
      period: "2026-08",
      amount: 500000,
      paymentMethod: "Transfer",
      notes: "Dana dukungan pengadaan komponen mikrokontroler dari dosen pembina",
      receiptFile: null
    },
    {
      id: "CASH-TRX-004",
      date: "2026-08-20",
      type: "expense",
      category: "Komponen & Alat Lab",
      amount: 285000,
      paymentMethod: "Transfer",
      description: "Pembelian 5x ESP32 DevKit & 10x Kabel Jumper Male-Female untuk restock",
      receiptFile: null,
      recordedBy: "Aisyah Putri (Bendahara)"
    },
    {
      id: "CASH-TRX-005",
      date: "2026-09-02",
      type: "income_dues",
      memberId: "MBR-01",
      memberName: "Muhammad Fadhil",
      period: "2026-09",
      amount: 20000,
      paymentMethod: "Transfer",
      notes: "Iuran kas September lunas",
      receiptFile: null
    },
    {
      id: "CASH-TRX-006",
      date: "2026-09-03",
      type: "income_dues",
      memberId: "MBR-03",
      memberName: "Bagus Tri Wicaksono",
      period: "2026-09",
      amount: 20000,
      paymentMethod: "Cash",
      notes: "Iuran kas September lunas",
      receiptFile: null
    }
  ]
};

function initDb() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readDb() {
  initDb();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Gagal membaca basis data:", err);
    return initialData;
  }
}

function writeDb(data) {
  initDb();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = {
  readDb,
  writeDb
};
